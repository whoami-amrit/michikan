import { S3Client } from '@aws-sdk/client-s3';
import { Global, Module } from '@nestjs/common';

import { S3Service } from './s3.service';

@Global()
@Module({
  providers: [
    { provide: S3Client, useFactory: () => new S3Client({ region: process.env.AWS_REGION }) },
    S3Service,
  ],
  exports: [S3Service],
})
export class StorageModule {}
