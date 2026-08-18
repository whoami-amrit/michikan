import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import awsConfig from '@config/aws.config';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';

@Injectable()
export class SesService {
  constructor(
    private readonly sesClient: SESClient,
    @Inject(awsConfig.KEY)
    private readonly config: ConfigType<typeof awsConfig>,
  ) {}

  async sendVerificationOtp(to: string, otp: number) {
    const command = new SendEmailCommand({
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Body: {
          Text: {
            Data: `Please enter the following otp to verify your email address: ${otp}`,
          },
        },
        Subject: {
          Data: 'Email Verification',
        },
      },
      ConfigurationSetName: this.config.sesConfigurationSet,
      Source: 'verify.tracker@michikan.dev',
    });

    await this.sesClient.send(command);
  }
}
