import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RegisterSchema, LoginSchema, RefreshSchema } from '@tara/schemas';
import type { TokenPayload } from '@tara/auth';
import { AuthService } from './auth.service.js';
import { JwtGuard } from './jwt.guard.js';
import { CurrentUser } from './current-user.decorator.js';

@Throttle({ auth: {} })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() body: unknown) {
    const input = RegisterSchema.parse(body);
    const { accessToken, refreshToken, user } = await this.auth.register(input);
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown) {
    const input = LoginSchema.parse(body);
    const { accessToken, refreshToken, user } = await this.auth.login(input);
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: unknown) {
    const { refreshToken } = RefreshSchema.parse(body);
    return this.auth.refresh(refreshToken);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  me(@CurrentUser() user: TokenPayload) {
    return { id: user.sub, email: user.email, role: user.role };
  }
}
