import { AccessDenied, NoSuchBucket } from '@aws-sdk/client-s3';
import { RENDER_PDF_JOB_NAME, RENDER_QUEUE_NAME } from '@common/constants';
import { IRenderPdfJobData } from '@common/types/render-pdf-job.interface';
import { Prisma } from '@db/client';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { spawn } from 'child_process';
import { mkdirSync, readFileSync } from 'fs';
import * as fs from 'fs/promises';
import type { TemplateDelegate } from 'handlebars';
import HandleBars from 'handlebars';
import path from 'path';
import { PrismaService } from 'src/infra/database/prisma.service';
import { S3Service } from 'src/infra/storage/s3.service';

import { RenderErrorEnum, RenderErrors } from './render-resume.errors';

@Injectable()
@Processor(RENDER_QUEUE_NAME)
export class RenderResumeProcessor extends WorkerHost {
  private readonly template: TemplateDelegate;
  private readonly renderOutputPath = process.env.RENDER_OUTPUT_PATH || '/tmp/michi-renders';
  private readonly TEX_FILE_NAME = 'resume.tex';
  private readonly PDF_FILE_NAME = 'resume.pdf';

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {
    super();
    this.registerHandlebarsHelpers();

    mkdirSync(this.renderOutputPath, { recursive: true });

    const resumeTemplate = readFileSync(
      path.join(__dirname, '..', '..', '..', '..', 'assets', 'render-resume.template.hbs'),
      'utf-8',
    );

    this.template = HandleBars.compile(resumeTemplate);
  }

  private registerHandlebarsHelpers() {
    HandleBars.registerHelper('commaJoin', (arr) => {
      if (!Array.isArray(arr)) {
        return '';
      }
      return arr.join(', ');
    });
  }

  async process({ name, data }: Job<IRenderPdfJobData>) {
    switch (name) {
      case RENDER_PDF_JOB_NAME:
        await this.renderPdf(data);
        break;
      default:
        throw new UnrecoverableError('Unknown job name');
    }
  }

  private async renderPdf({ json, jobId }: IRenderPdfJobData) {
    try {
      await this.updateJobStatus(jobId, { status: 'IN_PROGRESS' });

      const { jobDir, texFilePath, pdfFilePath } = await this.initTempJobDirectory(jobId);

      await this.writeLatexToFile(texFilePath, json);

      await this.compilePdfLatex(jobDir);

      await this.verifyPdfExists(pdfFilePath);

      const storageKey = await this.uploadPdfAndGetStorageKey(jobId, pdfFilePath);

      await this.updateJobStatus(jobId, { status: 'COMPLETED', storageKey });

      await this.cleanupLocalPdf(pdfFilePath);
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
    } catch {
      throw new RenderErrors(RenderErrorEnum.FAILED_CREATE_DIRECTORY);
    }
  }

  private async writeLatexToFile(texFilePath: string, json: unknown): Promise<void> {
    try {
      const latexSource = this.template({ json });
      await fs.writeFile(texFilePath, latexSource, 'utf-8');
    } catch (error) {
      console.error('LaTeX rendering error:', error);
      throw new RenderErrors(RenderErrorEnum.FAILED_RENDER_LATEX);
    }
  }

  private async verifyPdfExists(pdfFilePath: string): Promise<void> {
    try {
      await fs.access(pdfFilePath);
    } catch {
      throw new RenderErrors(RenderErrorEnum.PDF_OUTPUT_NOT_FOUND);
    }
  }

  private async uploadPdfAndGetStorageKey(jobId: number, pdfFilePath: string): Promise<string> {
    const fileBuffer = await fs.open(pdfFilePath);
    const readStream = fileBuffer.createReadStream();
    const s3Key = `${jobId}:resume.pdf`;

    try {
      await this.s3Service.uploadFile(s3Key, readStream);

      return s3Key;
    } catch (error) {
      if (error instanceof AccessDenied) {
        throw new RenderErrors(RenderErrorEnum.S3_CREDENTIALS_INVALID, error);
      }

      if (error instanceof NoSuchBucket) {
        throw new RenderErrors(RenderErrorEnum.S3_BUCKET_NOT_FOUND);
      }

      throw new RenderErrors(RenderErrorEnum.S3_UPLOAD_FAILED, error as Error);
    }
  }

  private async cleanupLocalPdf(pdfFilePath: string): Promise<void> {
    try {
      await fs.unlink(pdfFilePath);
    } catch (err) {
      console.warn(`Warning: Failed to delete local PDF: ${err}`);
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
          reject(new RenderErrors(RenderErrorEnum.PDF_COMPILATION_TIMEOUT));
          return;
        }

        if (code === 0) {
          resolve();
        } else {
          reject(new RenderErrors(RenderErrorEnum.PDF_COMPILATION_FAILED));
        }
      });

      process.on('error', (err) => {
        clearTimeout(timer);

        if ('code' in err && err.code === 'ENOENT') {
          reject(new RenderErrors(RenderErrorEnum.PDFLATEX_NOT_FOUND));
        }

        reject(new RenderErrors(RenderErrorEnum.PDF_COMPILATION_FAILED, err));
      });
    });
  }
}
