import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import awsConfig from '@config/aws.config';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';

import { buildOtpVerificationEmail } from './templates/otp-verification.template';

@Injectable()
export class SesService {
  constructor(
    private readonly sesClient: SESClient,
    @Inject(awsConfig.KEY)
    private readonly config: ConfigType<typeof awsConfig>,
  ) {}

  async sendVerificationOtp(to: string, otp: number, expiryMinutes: number) {
    const { subject, html, text } = buildOtpVerificationEmail(otp, expiryMinutes);

    const command = new SendEmailCommand({
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Body: {
          Html: {
            Data: html,
          },
          Text: {
            Data: text,
          },
        },
        Subject: {
          Data: subject,
        },
      },
      ConfigurationSetName: this.config.sesConfigurationSet,
      Source: 'verify.tracker@michikan.dev',
    });

    await this.sesClient.send(command);
  }
}
