'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { api } from '@/lib/api-client';

export default function AdminBroadcastPage(): React.ReactElement {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSend() {
    if (!confirm(`Send this email to all owners?`)) return;
    setSending(true);
    setResult(null);
    try {
      const { sent } = await api.admin.broadcast({ subject, message });
      setResult(`✓ Sent to ${sent} owner(s).`);
      setSubject('');
      setMessage('');
    } catch (e) {
      setResult(`Error: ${e instanceof Error ? e.message : 'Failed to send'}`);
    } finally {
      setSending(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Broadcast</h1>
      <p className="text-sm text-zinc-500">
        Send an email to all active owners. Rate-limited to once per hour.
      </p>

      {result && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${result.startsWith('✓') ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400'}`}
        >
          {result}
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Important update for Tara owners"
            className={`${inputClass} h-11`}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={12}
            placeholder="Write your message here…"
            className={`${inputClass} resize-none py-3`}
          />
          <p className="text-xs text-zinc-400">Plain text. Line breaks are preserved.</p>
        </div>

        {/* Preview */}
        {message && (
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Preview
            </p>
            <p className="text-xs italic text-zinc-500">Subject: {subject || '(no subject)'}</p>
            <div
              className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
              dangerouslySetInnerHTML={{ __html: message.replace(/\n/g, '<br>') }}
            />
          </div>
        )}

        <button
          disabled={sending || !subject.trim() || !message.trim()}
          onClick={handleSend}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {sending ? 'Sending…' : 'Send to all owners'}
        </button>
      </div>
    </div>
  );
}
