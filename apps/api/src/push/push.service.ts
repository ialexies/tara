import { Injectable, Logger } from '@nestjs/common';
import { db } from '@tara/db/client';
import { deviceTokens } from '@tara/db';
import { and, eq, inArray } from 'drizzle-orm';
import { getFirebaseAdmin } from '../auth/firebase-admin.js';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  async registerToken(uid: string, token: string): Promise<void> {
    await db.insert(deviceTokens).values({ userUid: uid, token }).onConflictDoNothing();
  }

  async removeToken(uid: string, token: string): Promise<void> {
    await db
      .delete(deviceTokens)
      .where(and(eq(deviceTokens.userUid, uid), eq(deviceTokens.token, token)));
  }

  async sendToUser(
    uid: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const rows = await db
      .select({ token: deviceTokens.token })
      .from(deviceTokens)
      .where(eq(deviceTokens.userUid, uid));

    if (rows.length === 0) return;

    const tokens = rows.map((r) => r.token);
    let response;
    try {
      response = await getFirebaseAdmin()
        .messaging()
        .sendEachForMulticast({
          tokens,
          notification: { title, body },
          ...(data && { data }),
        });
    } catch (err) {
      this.logger.warn({ event: 'push.send_failed', uid, err });
      return;
    }

    // Clean up expired/invalid tokens
    const invalidTokens: string[] = [];
    response.responses.forEach((resp, i) => {
      if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
        invalidTokens.push(tokens[i]!);
      }
    });

    if (invalidTokens.length > 0) {
      await db.delete(deviceTokens).where(inArray(deviceTokens.token, invalidTokens));
    }

    this.logger.log({
      event: 'push.sent',
      uid,
      title,
      sent: response.successCount,
      failed: response.failureCount,
    });
  }
}
