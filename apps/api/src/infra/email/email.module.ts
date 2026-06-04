import { SESClient } from '@aws-sdk/client-ses';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import awsConfig from 'src/config/aws.config';

import { SesService } from './ses.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SESClient,
      inject: [awsConfig.KEY],
      useFactory: (config: ConfigType<typeof awsConfig>) =>
        new SESClient({ region: config.sesRegion }),
    },
    SesService,
  ],
  exports: [SesService],
})
export class EmailModule {}
