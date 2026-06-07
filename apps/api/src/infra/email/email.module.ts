import { SESClient } from '@aws-sdk/client-ses';
import awsConfig from '@config/aws.config';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';

import { SesService } from './ses.service';

@Global()
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
