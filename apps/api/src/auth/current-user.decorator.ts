import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { TokenPayload } from '@tara/auth';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TokenPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: TokenPayload }>();
    return request.user;
  },
);
