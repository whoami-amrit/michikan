import { IProblemDetails } from '@common/types/problem-detail.interface';
import { Prisma } from '@db/client';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, title, detail } = this.resolveException(exception);

    this.logger.debug(
      `[${request.method}] ${request.url} → ${status}: ${title}\n${exception}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      status,
      title: title,
      detail,
      instance: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolveException(exception: unknown): Omit<IProblemDetails, 'timestamp' | 'instance'> {
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError() as ZodError;

      return {
        status: HttpStatus.BAD_REQUEST,
        title: 'Invalid data provided',
        detail: zodError.issues.map((err) => `${err.path.join('.')} - ${err.message}`),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaKnownError(exception);
    }

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      const message = typeof res === 'string' ? res : ((res as Error).message ?? exception.message);
      return { status: exception.getStatus(), title: message };
    }

    this.logger.error(
      `Unhandled exception type: ${typeof exception}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      title: 'Internal server error',
    };
  }

  private handlePrismaKnownError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): Omit<IProblemDetails, 'timestamp' | 'instance'> {
    switch (exception.code) {
      case 'P2025': // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          title: 'Record not found',
        };

      case 'P2002': // Unique constraint violation
        return {
          status: HttpStatus.CONFLICT,
          title: `A record with the same unique field already exists`,
        };

      case 'P2003': // Foreign key constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          title: 'Related record does not exist',
        };

      case 'P2000': // Value too long for column
        return {
          status: HttpStatus.BAD_REQUEST,
          title: 'Provided value is too long for this field',
        };

      default:
        this.logger.warn(`Unhandled Prisma error code: ${exception.code}`);

        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          title: 'A database error occurred',
        };
    }
  }
}
