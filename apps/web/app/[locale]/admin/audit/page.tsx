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

type AuditRow = {
  id: string;
  event: string;
  actorEmail: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
};

const col = createColumnHelper<AuditRow>();

export default function AdminAuditPage(): React.ReactElement {
  const [data, setData] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);

  useEffect(() => {
    api.admin
      .listAuditLog(500)
      .then((r) => setData(r.data as AuditRow[]))
      .finally(() => setLoading(false));
  }, []);

  const columns = useMemo(
    () => [
      col.accessor('event', {
        header: 'Event',
        cell: (i) => (
          <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{i.getValue()}</span>
        ),
      }),
      col.accessor('actorEmail', {
        header: 'Actor',
        cell: (i) => <span className="text-xs text-zinc-500">{i.getValue() ?? '—'}</span>,
      }),
      col.accessor('entityType', {
        header: 'Entity',
        cell: (i) => (
          <span className="text-xs text-zinc-400">
            {i.getValue() && i.row.original.entityId
              ? `${i.getValue()}:${i.row.original.entityId.slice(0, 8)}`
              : '—'}
          </span>
        ),
      }),
      col.accessor('createdAt', {
        header: 'Time',
        cell: (i) => (
          <span className="text-xs text-zinc-400">
            {new Date(i.getValue()).toLocaleString('en-PH', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
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
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Audit Log</h1>
      <input
        type="search"
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        placeholder="Filter by event, actor…"
        className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      {loading && <div className="py-16 text-center text-sm text-zinc-400">Loading…</div>}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[500px] text-left text-xs">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className={`px-3 py-2.5 font-medium ${h.column.getCanSort() ? 'cursor-pointer select-none' : ''}`}
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
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
