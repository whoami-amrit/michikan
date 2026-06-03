import { AccessDenied, NoSuchBucket } from '@aws-sdk/client-s3';
import { RENDER_PDF_JOB_NAME, RENDER_QUEUE_NAME } from '@common/constants';
import { Prisma } from '@db/client';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { spawn } from 'child_process';
import { mkdirSync, readFileSync } from 'fs';
import * as fs from 'fs/promises';
import type { TemplateDelegate } from 'handlebars';
import HandleBars from 'handlebars';
import path from 'path';
import { PrismaService } from 'src/infra/database/prisma.service';
import { S3Service } from 'src/infra/storage/s3.service';

import { IRenderPdfJob } from '../types';
import { RenderErrorEnum, RenderErrors } from './render-resume.errors';

@Injectable()
@Processor(RENDER_QUEUE_NAME)
export class RenderResumeProcessor extends WorkerHost {
  private readonly logger = new Logger(RenderResumeProcessor.name);
  private readonly template: TemplateDelegate;
  private readonly renderOutputPath = process.env.RENDER_OUTPUT_PATH || '/tmp/michikan-renders';
  private readonly TEX_FILE_NAME = 'resume.tex';
  private readonly PDF_FILE_NAME = 'resume.pdf';

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {
    super();

    this.registerHandlebarsHelpers();

    try {
      mkdirSync(this.renderOutputPath, { recursive: true });

      const resumeTemplate = readFileSync(
        path.join(process.cwd(), 'src', 'assets', 'render-resume.template.hbs'),
        'utf-8',
      );

      this.template = HandleBars.compile(resumeTemplate);
    } catch (error) {
      this.logger.error(
        'Failed to initialize resume render template',
        error instanceof Error ? error.stack : { error },
      );
      throw new UnrecoverableError('Failed to initialize resume render template');
    }
  }

  private registerHandlebarsHelpers() {
    HandleBars.registerHelper('commaJoin', (arr: string[]) => {
      this.logger.debug(`Joining array with commas: ${JSON.stringify(arr)}`);
      if (!Array.isArray(arr)) {
        return '';
      }
      return arr.join(', ');
    });

    HandleBars.registerHelper('formatDate', (date: string) => {
      if (!date) {
        return '';
      }
      const d = new Date(date);
      const month = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      return `${month} ${year}`;
    });

    HandleBars.registerHelper('getPublicProfileUrlLabel', (url: string) => {
      this.logger.debug(`Extracting label from URL: ${url}`);

      if (!url) {
        return '';
      }

      const { hostname, pathname } = new URL(url);

      if (hostname.match(/.*(github|gitlab).*/)) {
        return `${hostname.replace('www.', '')}/${pathname.split('/')[1]}`;
      }

      if (hostname.match(/.*linkedin.*/)) {
        return `${hostname.replace('www.', '')}/${pathname.split('/')[2]}`;
      }

      return hostname.replace('www.', '');
    });
  }

  async process({ name, data }: Job<IRenderPdfJob>) {
    switch (name) {
      case RENDER_PDF_JOB_NAME:
        await this.renderPdf(data);
        break;
      default:
        this.logger.warn('Received job with unknown name: ' + name);

        this.updateJobStatus(data.jobId, { status: 'FAILED', error: 'Unknown job name' });

        throw new UnrecoverableError('Unknown job name');
    }
  }

  private async renderPdf({ jobId }: IRenderPdfJob) {
    try {
      await this.updateJobStatus(jobId, { status: 'IN_PROGRESS' });

      const { jobDir, texFilePath, pdfFilePath } = await this.initTempJobDirectory(jobId);

      const job = await this.prisma.resumeRenderJob.findUnique({
        where: { id: jobId },
        include: {
          resume: true,
        },
      });

      // already checked job existence in updateJobStatus
      await this.writeLatexToFile(texFilePath, job!.resume.json);

      await this.compilePdfLatex(jobDir);

      await this.verifyPdfExists(pdfFilePath);

      const storageKey = await this.uploadPdfAndGetStorageKey(jobId, pdfFilePath);

      await this.updateJobStatus(jobId, { status: 'COMPLETED', storageKey });

      await this.cleanupLocalJobDir(jobDir);
    } catch (error) {
      if (error instanceof RenderErrors) {
        await this.updateJobStatus(jobId, { status: 'FAILED', error: String(error) });
      } else {
        await this.updateJobStatus(jobId, {
          status: 'FAILED',
          error: RenderErrors.getMessageForErrorType(RenderErrorEnum.UNKNOWN_ERROR),
        });
      }

      throw error;
    }
  }

  private async initTempJobDirectory(
    jobId: number,
  ): Promise<{ jobDir: string; texFilePath: string; pdfFilePath: string }> {
    const jobDir = path.join(this.renderOutputPath, String(jobId));

    try {
      await fs.mkdir(jobDir, { recursive: true });

      return {
        jobDir,
        texFilePath: path.join(jobDir, this.TEX_FILE_NAME),
        pdfFilePath: path.join(jobDir, this.PDF_FILE_NAME),
      };
    } catch (error) {
      throw new RenderErrors(RenderErrorEnum.FAILED_CREATE_DIRECTORY, error as Error);
    }
  }

  private async writeLatexToFile(texFilePath: string, json: unknown): Promise<void> {
    try {
      const latexSource = this.template(json);
      await fs.writeFile(texFilePath, latexSource, 'utf-8');
      this.logger.debug(`Successfully wrote LaTeX source to file: ${texFilePath}`);
    } catch (error) {
      this.logger.debug(error);
      throw new RenderErrors(RenderErrorEnum.FAILED_RENDER_LATEX, error as Error);
    }
  }

  private async verifyPdfExists(pdfFilePath: string): Promise<void> {
    try {
      await fs.access(pdfFilePath);
    } catch (error) {
      throw new RenderErrors(RenderErrorEnum.PDF_OUTPUT_NOT_FOUND, error as Error);
    }
  }

  private async uploadPdfAndGetStorageKey(jobId: number, pdfFilePath: string): Promise<string> {
    const fileBuffer = await fs.open(pdfFilePath);
    const readStream = fileBuffer.createReadStream();
    const s3Key = `${jobId}:resume.pdf`;

    try {
      await this.s3Service.uploadFile(s3Key, readStream);

      this.logger.debug(`Successfully uploaded rendered PDF to S3 with key: ${s3Key}`);

      return s3Key;
    } catch (error) {
      let errorType = RenderErrorEnum.S3_UPLOAD_FAILED;

      if (error instanceof AccessDenied) {
        errorType = RenderErrorEnum.S3_CREDENTIALS_INVALID;
      }

      if (error instanceof NoSuchBucket) {
        errorType = RenderErrorEnum.S3_BUCKET_NOT_FOUND;
      }

      throw new RenderErrors(errorType, error as Error);
    }
  }

  private async cleanupLocalJobDir(jobDir: string): Promise<void> {
    try {
      await fs.rm(jobDir, { recursive: true });
    } catch (err) {
      this.logger.warn(`Warning: Failed to delete local job directory: ${err}`);
    }
  }

  private async updateJobStatus(
    jobId: number,
    data: Prisma.ResumeRenderJobUpdateInput,
  ): Promise<void> {
    await this.prisma.resumeRenderJob.update({
      where: { id: jobId },
      data,
    });
  }

  private compilePdfLatex(jobDir: string): Promise<void> {
    const TIMEOUT_MS = 30000;

    return new Promise((resolve, reject) => {
      let timedOut = false;

      const process = spawn('pdflatex', [
        '-interaction=nonstopmode',
        `-output-directory=${jobDir}`,
        this.TEX_FILE_NAME,
      ]);

      const timer = setTimeout(() => {
        timedOut = true;
        process.kill();
      }, TIMEOUT_MS);

      process.on('close', (code) => {
        clearTimeout(timer);

        if (timedOut) {
          reject(new RenderErrors(RenderErrorEnum.PDF_COMPILATION_TIMEOUT, undefined));
          return;
        }

        if (code === 0) {
          resolve();
        } else {
          reject(new RenderErrors(RenderErrorEnum.PDF_COMPILATION_FAILED, undefined));
        }
      });

      process.on('error', (err) => {
        clearTimeout(timer);

        if ('code' in err && err.code === 'ENOENT') {
          reject(new RenderErrors(RenderErrorEnum.PDFLATEX_NOT_FOUND, err));
        }

        reject(new RenderErrors(RenderErrorEnum.PDF_COMPILATION_FAILED, err as Error));
      });
    });
  }
}
