'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { isFirebaseConfigured } from '@/lib/firebase-client';

type Message = {
  id: string;
  senderUid: string;
  senderName: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export function MessageThread({
  bookingId,
  guestName,
}: {
  bookingId: string;
  guestName?: string;
}): React.ReactElement {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  function load() {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    api.bookings
      .listMessages(bookingId)
      .then((res) => setMessages(res.data as Message[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 15_000);
    return () => clearInterval(iv);
  }, [bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api.bookings.sendMessage(bookingId, text.trim(), guestName ?? '');
      setText('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  if (!isFirebaseConfigured) return <></>;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Messages</h3>
        <p className="text-xs text-zinc-400">Chat with the property</p>
      </div>

      <div className="max-h-72 overflow-y-auto px-4 py-3">
        {loading && <p className="text-center text-xs text-zinc-400">Loading…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-center text-xs text-zinc-400">
            No messages yet. Ask the property anything!
          </p>
        )}
        <ul className="space-y-3">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </ul>
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Type a message…"
          rows={2}
          className="flex-1 resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {sending ? '…' : 'Send'}
        </button>
      </form>
      {error && <p className="px-4 pb-3 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }): React.ReactElement {
  const time = new Date(message.createdAt).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const date = new Date(message.createdAt).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <li className="space-y-0.5">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {message.senderName || 'Guest'}
        </span>
        <span className="text-[10px] text-zinc-400">
          {date} {time}
        </span>
      </div>
      <p className="rounded-xl rounded-tl-sm bg-zinc-100 px-3 py-2 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
        {message.body}
      </p>
    </li>
  );
}
