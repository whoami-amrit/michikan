import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { AuthGuard } from '@common/guards/auth.guard';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ZodValidationPipe } from 'nestjs-zod';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './infra/database/database.module';
import { QueueModule } from './infra/queue/queue.module';
import { StorageModule } from './infra/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { ResumeModule } from './modules/resumes/resumes.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [appConfig.KEY],
      global: true,
      useFactory: (config: ConfigType<typeof appConfig>) => ({
        secret: config.jwtSecret,
      }),
    }),
    DatabaseModule,
    QueueModule,
    StorageModule,
    AuthModule,
    UsersModule,
    ResumeModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    { provide: APP_GUARD, useClass: AuthGuard },
    AppService,
  ],
})
export class AppModule {}
