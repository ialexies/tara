import type { Params } from 'nestjs-pino';
import type { IncomingMessage } from 'http';
import { RequestMethod } from '@nestjs/common';

type FastifyRequestLike = IncomingMessage & {
  id?: string | number;
  ip?: string;
};

export function buildLoggerConfig(): Params {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    // Exclude health checks from the logger middleware entirely.
    // Docker healthchecks would otherwise dominate the log stream.
    exclude: [{ method: RequestMethod.ALL, path: 'health' }],
    pinoHttp: {
      level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
      transport: isProd
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: false,
              translateTime: 'SYS:HH:MM:ss.l',
              ignore: 'pid,hostname',
            },
          },
      customProps: () => ({ context: 'HTTP' }),
      serializers: {
        req: (req: FastifyRequestLike) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.ip,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["set-cookie"]',
          'res.headers["set-cookie"]',
          '*.password',
          '*.passwordHash',
          '*.token',
          '*.accessToken',
          '*.refreshToken',
          '*.idToken',
          '*.firebaseToken',
          '*.jwt',
          '*.secret',
          '*.apiKey',
        ],
        censor: '[REDACTED]',
      },
    },
  };
}
