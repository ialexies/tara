import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { db } from '@tara/db/client';
import { users } from '@tara/db/schema';
import { signTokens, verifyRefreshToken, type TokenPair } from '@tara/auth';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

type RegisterInput = {
  email: string;
  password: string;
  fullName?: string;
  role: 'guest' | 'owner';
};
type LoginInput = { email: string; password: string };

@Injectable()
export class AuthService {
  private get jwtSecret(): string {
    const s = process.env['JWT_SECRET'];
    if (!s) throw new Error('JWT_SECRET not set');
    return s;
  }

  async register(input: RegisterInput): Promise<TokenPair & { user: typeof users.$inferSelect }> {
    const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (existing.length > 0) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(input.password, 12);
    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        passwordHash,
        fullName: input.fullName ?? null,
        role: input.role,
      })
      .returning();

    if (!user) throw new Error('Failed to create user');

    const tokens = await signTokens(
      { sub: user.id, email: user.email, role: user.role, tenantId: user.id },
      this.jwtSecret,
    );
    return { ...tokens, user };
  }

  async login(input: LoginInput): Promise<TokenPair & { user: typeof users.$inferSelect }> {
    const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

    if (!user?.passwordHash) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    const tokens = await signTokens(
      { sub: user.id, email: user.email, role: user.role, tenantId: user.id },
      this.jwtSecret,
    );
    return { ...tokens, user };
  }

  async refresh(refreshToken: string): Promise<Pick<TokenPair, 'accessToken'>> {
    const userId = await verifyRefreshToken(refreshToken, this.jwtSecret).catch(() => {
      throw new UnauthorizedException('Invalid or expired refresh token');
    });

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new UnauthorizedException('User not found');

    const { accessToken } = await signTokens(
      { sub: user.id, email: user.email, role: user.role, tenantId: user.id },
      this.jwtSecret,
    );
    return { accessToken };
  }
}
