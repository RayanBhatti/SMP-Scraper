'use client';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL as string;

export default function HistoryViewer() {
  const [ticker, setTicker] = useState('BHP.AX');
  const [date, setDate] = useState<string>('');
  const [data, setData] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null); setData(null);
    try {
      const r = await fetch(`${API}/history?ticker=${encodeURIComponent(ticker)}&date=${date}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'request failed');
      setData(j);
    } catch (e: any) {
      setErr(String(e));
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={ticker}
          onChange={e => setTicker(e.target.value)}
          placeholder="Ticker (e.g., BHP.AX)"
          style={{ padding: 8, borderRadius: 8, border: '1px solid #223', background: '#0f1530', color: '#e6edf3' }}
        />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ padding: 8, borderRadius: 8, border: '1px solid #223', background: '#0f1530', color: '#e6edf3' }}
        />
        <button
          onClick={load}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2a3a66', background: '#1e2a4a', color: '#a5b4fc' }}
        >
          Load
        </button>
      </div>
      {err && <p style={{ color: '#fca5a5' }}>{err}</p>}
      {data && (
        <div style={{ fontSize: 14 }}>
          <p>Records: {data.count}</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#0f1530', padding: 12, borderRadius: 8, border: '1px solid #223' }}>
{JSON.stringify(data.records, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
