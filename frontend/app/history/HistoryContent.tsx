'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Item = {
  symbol: string;
  price?: number;
  change?: number;
  change_pct?: number;
  ts?: number;
  source?: string;
  meta?: Record<string, unknown>;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  'https://xy2z7y9tl0.execute-api.ap-southeast-2.amazonaws.com';

export default function HistoryContent() {
  const sp = useSearchParams();
  const symbol = sp.get('symbol') ?? 'AAPL';

  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/history?ticker=${encodeURIComponent(symbol)}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = (await res.json()) as Item[];
          setRows(
            data
              .slice()
              .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
              .slice(0, 50)
          );
        } else {
          setRows([]);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [symbol]);

  const fmt = (n?: number, d = 2) => (n == null ? '—' : n.toFixed(d));

  return (
    <main className="min-h-screen bg-white text-slate-800">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold">History — {symbol}</h1>
        <p className="text-slate-500 mt-1">Last 50 records from S3.</p>

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Timestamp</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Change</th>
                <th className="px-4 py-3 text-right">Change %</th>
                <th className="px-4 py-3 text-left">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    {loading ? 'Loading…' : 'No data yet'}
                  </td>
                </tr>
              )}
              {rows.map((r, i) => {
                const dt = r.ts ? new Date(r.ts * 1000) : null;
                const ts = dt ? dt.toLocaleString() : '—';
                const pos = (r.change ?? 0) > 0;
                const neg = (r.change ?? 0) < 0;
                const badge =
                  r.change == null
                    ? 'text-slate-600 bg-slate-100'
                    : pos
                    ? 'text-emerald-700 bg-emerald-50'
                    : neg
                    ? 'text-red-700 bg-red-50'
                    : 'text-slate-700 bg-slate-100';

                return (
                  <tr key={i} className="border-t border-slate-200">
                    <td className="px-4 py-3">{ts}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(r.price)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded-full tabular-nums ${badge}`}>
                        {r.change == null ? '—' : `${r.change > 0 ? '+' : ''}${fmt(Math.abs(r.change))}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded-full tabular-nums ${badge}`}>
                        {r.change_pct == null
                          ? '—'
                          : `${r.change_pct > 0 ? '+' : ''}${fmt(Math.abs(r.change_pct))}%`}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.source ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
