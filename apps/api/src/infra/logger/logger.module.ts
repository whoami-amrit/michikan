import { Module, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import appConfig from 'src/config/app.config';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) => ({
        pinoHttp: {
          autoLogging: {
            ignore: (req) => {
              return req.method === 'GET' && (req.url?.endsWith('/health') ?? false);
            },
          },
          level: config.logLevel,
          genReqId: (req) => {
            return req.headers['x-request-id'] ?? createId();
          },
          redact: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
            'res.body.password',
          ],
          transport:
            config.logLevel === 'debug'
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    translateTime: 'yyyy-mm-dd HH:MM:ss.l o',
                    ignore: 'pid,hostname',
                  },
                }
              : undefined,
        },
        forRoutes: ['*path'], // NOTE: nestjs 11 uses path-to-regexp which changed wildcard patterns
        exclude: [{ method: RequestMethod.GET, path: '*path/health' }],
      }),
    }),
  ],
})
export class LoggerModule {}
