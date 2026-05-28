import { Injectable, Logger } from '@nestjs/common';
import { db } from '@tara/db/client';
import { webhooks } from '@tara/db';
import { and, eq } from 'drizzle-orm';
import { createHmac, randomBytes } from 'crypto';
import type { AuthedUser } from '../auth/firebase.guard.js';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  async listForOwner(user: AuthedUser) {
    return db.select().from(webhooks).where(eq(webhooks.ownerUid, user.uid));
  }

  async create(url: string, events: string[], user: AuthedUser) {
    const secret = 'whsec_' + randomBytes(24).toString('hex');
    const [row] = await db
      .insert(webhooks)
      .values({ ownerUid: user.uid, url, secret, events })
      .returning();
    return row;
  }

  async remove(id: string, user: AuthedUser) {
    await db.delete(webhooks).where(and(eq(webhooks.id, id), eq(webhooks.ownerUid, user.uid)));
  }

  /** Dispatches an event to all webhooks registered by the property's owner. */
  async dispatch(ownerUid: string, event: string, payload: unknown) {
    const hooks = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.ownerUid, ownerUid), eq(webhooks.isActive, true)));

    for (const hook of hooks) {
      if (!hook.events.includes(event)) continue;
      const body = JSON.stringify({ event, ts: Date.now(), data: payload });
      const sig = createHmac('sha256', hook.secret).update(body).digest('hex');
      fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tara-Signature': sig },
        body,
        signal: AbortSignal.timeout(5000),
      }).catch((err: Error) => {
        this.logger.warn({
          event: 'webhook.dispatch_failed',
          webhookId: hook.id,
          error: err.message,
        });
      });
    }
  }
}
