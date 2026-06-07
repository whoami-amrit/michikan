import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import awsConfig from '@config/aws.config';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ReadStream } from 'fs';

@Injectable()
export class S3Service {
  constructor(
    private readonly s3Client: S3Client,
    @Inject(awsConfig.KEY)
    private readonly config: ConfigType<typeof awsConfig>,
  ) {}

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
