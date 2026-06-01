'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { api } from '@/lib/api-client';

type AdminBooking = {
  id: string;
  referenceCode: string;
  guestEmail: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  totalMinor: number;
  status: string;
  paymentMode: string;
  createdAt: string;
  propertyName: string;
};

const STATUS_LABELS: Record<string, string> = {
  stripe_pending: 'Card pending',
  manual_pending: 'Awaiting payment',
  awaiting_verification: 'Verifying',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  checked_out: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  disputed: 'Disputed',
};

const STATUS_COLOURS: Record<string, string> = {
  stripe_pending: 'bg-blue-100 text-blue-700',
  manual_pending: 'bg-amber-100 text-amber-700',
  awaiting_verification: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  checked_in: 'bg-green-100 text-green-700',
  checked_out: 'bg-zinc-100 text-zinc-600',
  cancelled: 'bg-red-100 text-red-600',
  refunded: 'bg-zinc-100 text-zinc-500',
  disputed: 'bg-orange-100 text-orange-700',
};

const col = createColumnHelper<AdminBooking>();

export default function AdminBookingsPage(): React.ReactElement {
  const [data, setData] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 100;

  async function load(newOffset = 0, append = false) {
    setLoading(true);
    try {
      const r = await api.admin.listAllBookings({
        limit: LIMIT,
        offset: newOffset,
        status: statusFilter || undefined,
      });
      const rows = r.data as AdminBooking[];
      setData((prev) => (append ? [...prev, ...rows] : rows));
      setHasMore(rows.length === LIMIT);
      setOffset(newOffset + rows.length);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(0);
  }, [statusFilter]);

  const columns = useMemo(
    () => [
      col.accessor('referenceCode', {
        header: 'Ref',
        cell: (i) => <span className="font-mono text-xs">{i.getValue()}</span>,
      }),
      col.accessor('guestName', {
        header: 'Guest',
        cell: (i) => (
          <div>
            <p className="text-sm font-medium">{i.getValue()}</p>
            <p className="text-xs text-zinc-400">{i.row.original.guestEmail}</p>
          </div>
        ),
      }),
      col.accessor('propertyName', {
        header: 'Property',
        cell: (i) => <span className="text-sm">{i.getValue()}</span>,
      }),
      col.accessor('checkIn', {
        header: 'Check-in',
        cell: (i) => (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {new Date(i.getValue() + 'T00:00:00').toLocaleDateString('en-PH', {
              month: 'short',
              day: 'numeric',
              year: '2-digit',
            })}
          </span>
        ),
      }),
      col.accessor('totalMinor', {
        header: 'Amount',
        cell: (i) => (
          <span className="text-sm font-medium">
            ₱{(i.getValue() / 100).toLocaleString('en-PH')}
          </span>
        ),
      }),
      col.accessor('status', {
        header: 'Status',
        cell: (i) => (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOURS[i.getValue()] ?? ''}`}
          >
            {STATUS_LABELS[i.getValue()] ?? i.getValue()}
          </span>
        ),
      }),
      col.accessor('paymentMode', {
        header: 'Mode',
        cell: (i) => <span className="text-xs capitalize text-zinc-500">{i.getValue()}</span>,
      }),
      col.accessor('createdAt', {
        header: 'Created',
        cell: (i) => (
          <span className="text-xs text-zinc-400">
            {new Date(i.getValue()).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
          </span>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Bookings</h1>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search ref, guest, property…"
          className="h-10 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setOffset(0);
          }}
          className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <p className="flex h-10 items-center text-sm text-zinc-400">
          {table.getFilteredRowModel().rows.length} rows
        </p>
      </div>

      {loading && data.length === 0 && (
        <div className="py-16 text-center text-sm text-zinc-400">Loading…</div>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className={`px-3 py-2.5 font-medium ${h.column.getCanSort() ? 'cursor-pointer select-none hover:text-zinc-700 dark:hover:text-zinc-300' : ''}`}
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {h.column.getIsSorted() === 'asc'
                      ? ' ↑'
                      : h.column.getIsSorted() === 'desc'
                        ? ' ↓'
                        : ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2.5 text-zinc-700 dark:text-zinc-300">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button
          onClick={() => load(offset, true)}
          disabled={loading}
          className="flex h-10 w-full items-center justify-center rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400"
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
