import { RENDER_PDF_JOB_NAME, RENDER_QUEUE_NAME } from '@common/constants';
import appConfig, { type IAppConfig } from '@config/app.config';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { spawn } from 'child_process';
import { Prisma } from 'db';
import { mkdirSync } from 'fs';
import * as fs from 'fs/promises';
import path from 'path';
import { IResumeJson, ResumeJsonSchema } from 'shared';

import { PrismaService } from '../../../infra/database/prisma.service';
import { S3Service } from '../../../infra/storage/s3.service';
import { IRenderPdfWorker } from '../types';
import { getResumeTex } from './template';

@Injectable()
@Processor(RENDER_QUEUE_NAME)
export class RenderResumeProcessor extends WorkerHost {
  private readonly logger = new Logger(RenderResumeProcessor.name);
  private readonly renderOutputPath;
  private readonly TEX_FILE_NAME = 'resume.tex';
  private readonly PDF_FILE_NAME = 'resume.pdf';

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    @Inject(appConfig.KEY) private readonly config: IAppConfig,
  ) {
    super();

    this.renderOutputPath = this.config.renderOutputPath;

    try {
      mkdirSync(this.renderOutputPath, { recursive: true });
    } catch (error) {
      this.logger.error(
        'Failed to initialize resume render template',
        error instanceof Error ? error.stack : { error },
      );
      throw new UnrecoverableError('Failed to initialize resume render template');
    }
  }

  async process({ name, data }: Job<IRenderPdfWorker>) {
    switch (name) {
      case RENDER_PDF_JOB_NAME:
        await this.renderPdf(data);
        break;
      default:
        this.logger.warn('Received job with unknown name: ' + name);

        await this.updateJobStatus(data.workerId, { status: 'FAILED' });

        throw new UnrecoverableError('Unknown job name');
    }
  }

  private async renderPdf({ workerId }: IRenderPdfWorker) {
    try {
      await this.updateJobStatus(workerId, { status: 'IN_PROGRESS' });

      const { workDir, texFilePath, pdfFilePath } = await this.initTempJobDirectory(workerId);

      const job = await this.prisma.resumeRenderWorker.findUnique({
        where: { id: workerId },
        include: {
          resume: true,
        },
      });

      const parsedJson = ResumeJsonSchema.parse(job!.resume.json);

      // already checked job existence in updateJobStatus
      await this.writeLatexToFile(texFilePath, parsedJson);

      await this.compilePdfLatex(workDir);

      await this.verifyPdfExists(pdfFilePath);

      const storageKey = await this.uploadPdfAndGetStorageKey(workerId, pdfFilePath);

      await this.updateJobStatus(workerId, { status: 'COMPLETED', storageKey });

      await this.cleanupLocalJobDir(workDir);
    } catch (error) {
      this.logger.error(error, error instanceof Error ? error.stack : { error });

      await this.updateJobStatus(workerId, {
        status: 'FAILED',
      });

      throw error;
    }
  }

  private async initTempJobDirectory(
    workerId: number,
  ): Promise<{ workDir: string; texFilePath: string; pdfFilePath: string }> {
    const workDir = path.join(this.renderOutputPath, String(workerId));

    await fs.mkdir(workDir, { recursive: true });

    return {
      workDir,
      texFilePath: path.join(workDir, this.TEX_FILE_NAME),
      pdfFilePath: path.join(workDir, this.PDF_FILE_NAME),
    };
  }

  private async writeLatexToFile(texFilePath: string, json: IResumeJson): Promise<void> {
    const latexSource = getResumeTex(json);
    await fs.writeFile(texFilePath, latexSource, 'utf-8');
    this.logger.debug(`Successfully wrote LaTeX source to file: ${texFilePath}`);
  }

  private async verifyPdfExists(pdfFilePath: string): Promise<void> {
    await fs.access(pdfFilePath);
  }

  private async uploadPdfAndGetStorageKey(workerId: number, pdfFilePath: string): Promise<string> {
    const fileBuffer = await fs.open(pdfFilePath);
    const readStream = fileBuffer.createReadStream();
    const date = new Date();
    // note: I don't expect to get more than 1000 requests per second
    // therefore (% 1000); very little chances of collision
    const s3Key = `resume-${date.getMonth()}_${date.getDate()}_${date.getFullYear()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}-${workerId % 1000}.pdf`;

    await this.s3Service.uploadFile(s3Key, readStream);

    this.logger.debug(`Successfully uploaded rendered PDF to S3 with key: ${s3Key}`);

    return s3Key;
  }

  private async cleanupLocalJobDir(workDir: string): Promise<void> {
    if (this.config.env === 'development') {
      this.logger.debug(`Skipping cleanup of local job directory in development mode: ${workDir}`);
      return;
    }

    try {
      await fs.rm(workDir, { recursive: true });
    } catch (err) {
      this.logger.warn(`Warning: Failed to delete local job directory: ${err as string}`);
    }
  }

  private async updateJobStatus(
    workerId: number,
    data: Prisma.ResumeRenderWorkerUpdateInput,
  ): Promise<void> {
    await this.prisma.resumeRenderWorker.update({
      where: { id: workerId },
      data,
    });
  }

  private compilePdfLatex(workDir: string): Promise<void> {
    const TIMEOUT_MS = 30000;

    return new Promise((resolve, reject) => {
      let timedOut = false;

      const process = spawn('pdflatex', [
        '-interaction=nonstopmode',
        `-output-directory=${workDir}`,
        this.TEX_FILE_NAME,
      ]);

      const timer = setTimeout(() => {
        timedOut = true;
        process.kill();
      }, TIMEOUT_MS);

      process.on('close', (code) => {
        clearTimeout(timer);

        if (timedOut) {
          reject(new Error('pdf render timed out'));
          return;
        }

        if (code === 0) {
          resolve();
        } else {
          reject(new Error('Failed to compile PDF'));
        }
      });

      process.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }
}
