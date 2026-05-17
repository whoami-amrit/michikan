import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IHealthCheck } from '@common/types/health-check.interface';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ReadStream } from 'fs';
import awsConfig from 'src/config/aws.config';

@Injectable()
export class S3Service implements OnModuleInit {
  constructor(
    private readonly s3Client: S3Client,
    @Inject(awsConfig.KEY)
    private readonly config: ConfigType<typeof awsConfig>,
  ) {}

  async healthCheck(): Promise<IHealthCheck> {
    try {
      const sts = new STSClient({ region: this.config.s3Region });
      await sts.send(new GetCallerIdentityCommand({}));
      return {
        status: 'up',
      };
    } catch (error) {
      // TODO: log better
      console.error('S3 health check failed:', error);

      return {
        status: 'down',
        error: 'S3 health check failed',
      };
    }
  }

  async onModuleInit() {
    const { status } = await this.healthCheck();
    if (status === 'down') {
      throw new Error('Failed to initialize S3 service');
    }
    // TODO: log success and failure
  }

  async uploadFile(key: string, fileStream: ReadStream): Promise<{ bucket: string; key: string }> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: fileStream,
    });

    await this.s3Client.send(command);

    return { bucket: this.config.bucket, key };
  }

  async getObjectSignedUrl(
    key: string,
    responseDisposition: 'filename' | 'attachment',
    expiresInSeconds = 600, // 10 minutes
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ResponseContentDisposition: responseDisposition,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
  }
}
