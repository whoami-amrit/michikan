import { S3Client } from '@aws-sdk/client-s3';
import awsConfig from '@config/aws.config';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';

import { S3Service } from './s3.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: S3Client,
      inject: [awsConfig.KEY],
      useFactory: (config: ConfigType<typeof awsConfig>) =>
        new S3Client({ region: config.s3Region }),
    },
    S3Service,
  ],
  exports: [S3Service],
})
export class StorageModule {}
