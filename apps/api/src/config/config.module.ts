import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import path from 'path';

import aiConfig from './ai.config';
import appConfig from './app.config';
import awsConfig from './aws.config';
import databaseConfig from './database.config';
import valkeyConfig from './valkey.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.join(__dirname, '../../../../../.env'),
      load: [awsConfig, appConfig, databaseConfig, valkeyConfig, aiConfig],
    }),
  ],
})
export class AppConfigModule {}
