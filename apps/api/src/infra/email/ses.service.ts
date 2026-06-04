import { SendEmailCommand, SESClient, VerifyEmailIdentityCommand } from '@aws-sdk/client-ses';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config/dist/types/config.type';
import awsConfig from 'src/config/aws.config';

@Injectable()
export class SesService {
  constructor(
    private readonly sesClient: SESClient,
    @Inject(awsConfig.KEY)
    private readonly config: ConfigType<typeof awsConfig>,
  ) {}

  private async validateEmailIdentity(email: string): Promise<void> {
    const command = new VerifyEmailIdentityCommand({
      EmailAddress: email,
    });

    await this.sesClient.send(command);
  }

  async sendVerificationLink(to: string, link: string) {
    await this.validateEmailIdentity(to);

    const command = new SendEmailCommand({
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Body: {
          Text: {
            Data: `Please click the following link to verify your email address: ${link}`,
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
