import { pgTable, uuid, text, timestamp, unique, index } from 'drizzle-orm/pg-core';

export const deviceTokens = pgTable(
  'device_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userUid: text('user_uid').notNull(),
    token: text('token').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('device_tokens_uid_token_unique').on(table.userUid, table.token),
    index('device_tokens_user_uid_idx').on(table.userUid),
  ],
);
