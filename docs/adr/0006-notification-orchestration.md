# ADR-0006: Notification orchestration — n8n in Phase B, NestJS module later

- **Status:** Accepted
- **Date:** 2026-05-24
- **Deciders:** Founder

## Context

Tara needs to notify multiple parties about multiple event types across multiple channels:

- **Recipients:** guests, owners, founder (internal)
- **Channels:** email, WhatsApp, web push, in-app, (SMS deferred)
- **Events:** booking created, payment verified, check-in reminders, disputes, system alerts, etc.

We're solo, on a free-tier budget, in PH. WhatsApp is more reliable than email for owner reach. SMS costs money per send. PostHog/Sentry already handle their own delivery — this ADR is about transactional user notifications.

The user's home server already runs **n8n** (workflow automation tool). For Phase B's low volume, this is a perfect orchestration tool — visual workflows, no deploys to change them, free to run.

See [`notifications_and_chat.md`](../../../C--Users-alexi/memory/notifications_and_chat.md) for the full strategy memory.

## Decision

**Phase B (Months 0-12):** Use **n8n on the home server** as the notification orchestrator.

- App emits a domain event (e.g. `BookingConfirmed`)
- Event handler POSTs to a dedicated n8n webhook with the event payload + recipient context
- n8n workflow:
  1. Looks up the recipient's notification preferences from Tara's DB (read-only)
  2. Picks the appropriate template + locale
  3. Fans out to enabled channels in parallel
  4. Writes an audit row back to Tara's `notification` table per channel

**Channels for Phase B (all free tier):**

| Channel | Provider | Free limit | Notes |
| --- | --- | --- | --- |
| Email | Resend | 3,000/mo + 100/day | React Email templates |
| WhatsApp | Meta Cloud API (direct) | 1,000 conversations/mo | Templates need 24-48h Meta approval |
| Web Push | `web-push` npm library | Unlimited | Browser-native, requires VAPID keys |
| In-app | Postgres + WebSocket/SSE | Free | Own implementation |

**SMS is deferred.** WhatsApp covers ~95% of PH owners; SMS adds cost without proportional reach.

**Phase C/D migration:** Move critical flows (booking confirmation, payment notifications) into a NestJS `NotificationModule` with BullMQ. Keep n8n for non-critical automations (daily reports, internal alerts, marketing).

## Alternatives considered

- **Build everything in NestJS from day 1** — Cleaner architecture, transactional guarantees. Rejected for Phase B: slower to iterate on notification logic (every change = deploy), and we don't yet know the exact flows we need. n8n lets us evolve fast.
- **Use a third-party notification service** (Knock, Courier, OneSignal) — Good products. Rejected: most are paid, some are expensive, and we already have n8n on the server. Revisit in Phase D if our needs outgrow n8n.
- **Use Twilio for WhatsApp** — Simpler integration but adds Twilio's markup (~30-50%) on top of Meta's costs. Rejected: direct Meta Cloud API is cheaper and the integration is straightforward.
- **Include SMS via Semaphore in Phase B** — Considered. Rejected: SMS costs add up fast (~₱0.50/message), and WhatsApp covers the same use case for free at our scale. Reintroduce in Phase C if real gaps appear.
- **Native push notifications (mobile app)** — Deferred. No mobile app yet. Web Push is enough for browser-based use.

## Consequences

**Positive**

- Fast iteration on notification flows (visual workflow, no app redeploys)
- Free at Phase B scale (₱0/mo for all channels)
- Reuses existing infrastructure (n8n already running)
- Audit log preserved in Tara's DB (single source of truth)
- WhatsApp coverage gives high PH owner reach

**Negative / trade-offs**

- n8n is a SPOF (single point of failure) for notifications — if n8n goes down, notifications stall
  - *Mitigation:* Tara DB queues events; n8n re-processes on recovery. Uptime Kuma monitors n8n.
- Visual workflows are harder to version-control than code
  - *Mitigation:* n8n exports workflows as JSON; commit them to `infra/n8n/workflows/`
- Template logic is in two places (n8n nodes + React Email components) — risk of drift
  - *Mitigation:* React Email files are source of truth; n8n calls Tara's API to render them
- Transactional guarantees are weaker than BullMQ — n8n retries are configurable but not as battle-tested
  - *Mitigation:* For Phase B's volume this is acceptable; migrate critical flows to BullMQ in Phase C

**Neutral / things to watch**

- Meta's WhatsApp Business pricing model evolves — track the conversation pricing changes
- Resend's free tier may shift — if so, fall back to Brevo or AWS SES
- n8n's licensing model (currently fair-code, free for self-hosting) — track changes

## Implementation notes

### Event emission pattern

```ts
// In a NestJS service after booking is confirmed
this.eventBus.publish(new BookingConfirmed({
  bookingId, guestId, ownerId, propertyId, ...
}));

// Event handler
@EventsHandler(BookingConfirmed)
class NotifyOnBookingConfirmed {
  async handle(event: BookingConfirmed) {
    await fetch(`${N8N_WEBHOOK_URL}/booking-confirmed`, {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }
}
```

### n8n workflow structure

One workflow per event type, named to match (`booking-confirmed`, `payment-verified`, etc.). Each workflow:

1. Webhook trigger (entry)
2. HTTP request to Tara API to fetch recipient preferences
3. Switch node — branches by enabled channels
4. Parallel channel adapter nodes (Resend, WhatsApp Cloud API, Web Push)
5. HTTP request to Tara API to record audit log

Workflows export to JSON; committed to `infra/n8n/workflows/` for version control.

### Data model

```ts
notification {
  id, user_id, type, channel, status,
  payload jsonb, template_id, scheduled_for,
  sent_at, delivered_at, read_at, error,
  provider_message_id, created_at
}

notification_preference {
  user_id, notification_type,
  email_enabled, sms_enabled, whatsapp_enabled, push_enabled
}

web_push_subscription {
  user_id, endpoint, p256dh, auth, user_agent, created_at
}
```

### Rules

- Critical notifications cannot be fully disabled (must have ≥1 channel)
- Quiet hours 10pm-7am suppress non-critical SMS/WhatsApp/push
- Promotional notifications are opt-in only (PH RA 10173 compliance)
- All sends logged to `notification` table for audit + debugging

## References

- Memory: `notifications_and_chat.md`
- [n8n docs](https://docs.n8n.io/)
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Resend docs](https://resend.com/docs)
