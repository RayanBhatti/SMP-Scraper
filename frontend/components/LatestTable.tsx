'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL as string;
const DEFAULTS = (process.env.NEXT_PUBLIC_TICKERS || '').split(',').map(s => s.trim()).filter(Boolean);

type Latest = {
  symbol: string;
  ts: number;
  price?: number;
  change?: number;
  change_pct?: number;
  currency?: string;
  source?: string;
};

function fmtTs(ts: number) { return new Date(ts * 1000).toLocaleString(); }
function color(n?: number) { return (n ?? 0) >= 0 ? '#86efac' : '#fca5a5'; }

export default function LatestTable() {
  const [rows, setRows] = useState<Latest[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const out: Latest[] = [];
        for (const t of DEFAULTS) {
          const r = await fetch(`${API}/latest?ticker=${encodeURIComponent(t)}`, { cache: 'no-store' });
          if (!r.ok) continue;
          out.push(await r.json());
        }
        setRows(out);
      } catch (e: any) {
        setErr(String(e));
      }
    })();
  }, []);

  if (err) return <p style={{ color: '#fca5a5' }}>Failed to load: {err}</p>;
  if (!rows.length) return <p>Loading…</p>;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Symbol','Price','Δ','Δ %','Time','Source'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #223' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.symbol}>
              <td style={{ padding: '8px 6px' }}>{r.symbol}</td>
              <td style={{ padding: '8px 6px' }}>{r.currency || 'AUD'} {r.price?.toFixed(2)}</td>
              <td style={{ padding: '8px 6px', color: color(r.change) }}>{r.change?.toFixed(2)}</td>
              <td style={{ padding: '8px 6px', color: color(r.change_pct) }}>{r.change_pct?.toFixed(2)}%</td>
              <td style={{ padding: '8px 6px', opacity: 0.7 }}>{fmtTs(r.ts)}</td>
              <td style={{ padding: '8px 6px', opacity: 0.7 }}>{r.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
