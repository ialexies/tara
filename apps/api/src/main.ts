import 'reflect-metadata';
import crypto from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';

const PORT = Number(process.env.API_PORT ?? 4000);
const HOST = process.env.API_HOST ?? '0.0.0.0';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 1_048_576, // 1 MB body limit
      genReqId: (req: { headers: Record<string, string | string[] | undefined> }) => {
        const upstream = req.headers['x-request-id'];
        if (typeof upstream === 'string' && upstream.length > 0) return upstream;
        return crypto.randomUUID();
      },
    }),
    { bufferLogs: true },
  );
  app.useLogger(app.get(Logger));

  // Security headers — API serves JSON only, no HTML, so CSP is omitted
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (app as any).register(helmet, { contentSecurityPolicy: false });

  // CORS — restrict to the web origin only
  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(PORT, HOST);
  app.get(Logger).log(`API listening on http://${HOST}:${PORT}`, 'Bootstrap');
}

void bootstrap();
