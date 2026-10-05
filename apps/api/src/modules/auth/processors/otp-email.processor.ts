import { EMAIL_QUEUE_NAME, OTP_EMAIL_JOB_NAME } from '@common/constants';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';

import { SesService } from '../../../infra/email/ses.service';
import { IOtpEmailJobData } from '../types';

@Injectable()
@Processor(EMAIL_QUEUE_NAME)
export class OtpEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(OtpEmailProcessor.name);

  constructor(private readonly sesService: SesService) {
    super();
  }

  async process(job: Job<IOtpEmailJobData>) {
    if (job.name !== OTP_EMAIL_JOB_NAME) {
      this.logger.error(`Received email job with unknown name: ${job.name}`);
      throw new UnrecoverableError('Unknown job name');
    }

    const { to, otp, expiryMinutes } = job.data;
    await this.sesService.sendVerificationOtp(to, otp, expiryMinutes);
  }
}
