import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { ZodError } from 'zod';
import type { FastifyReply } from 'fastify';

@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  catch(exception: ZodError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();

    void reply.status(HttpStatus.BAD_REQUEST).send({
      statusCode: 400,
      error: 'Bad Request',
      message: exception.errors[0]?.message ?? 'Validation failed',
      details: exception.errors,
    });
  }
}
