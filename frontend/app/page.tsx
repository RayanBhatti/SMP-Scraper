'use client';

import { useEffect, useMemo, useState } from 'react';
import './globals.css'

const API_BASE = 'https://xy2z7y9tl0.execute-api.ap-southeast-2.amazonaws.com';

const TICKERS = ['AAPL','MSFT','NVDA','AMZN','META','GOOGL','GOOG','TSLA','BRK.B','AVGO'];

const COMPANY_NAMES = {
  'AAPL': 'Apple Inc.',
  'MSFT': 'Microsoft Corp.',
  'NVDA': 'NVIDIA Corp.',
  'AMZN': 'Amazon.com Inc.',
  'META': 'Meta Platforms Inc.',
  'GOOGL': 'Alphabet Inc.',
  'GOOG': 'Alphabet Inc.',
  'TSLA': 'Tesla Inc.',
  'BRK.B': 'Berkshire Hathaway',
  'AVGO': 'Broadcom Inc.'
};

type Quote = {
  symbol: string;
  price: number | null;
  change?: number | null;
  change_pct?: number | null;
  ts?: number | null;
  source?: string;
};

function fmtNumber(n: number | null | undefined, minFrac = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: minFrac,
    maximumFractionDigits: minFrac,
    useGrouping: true,
  }).format(n);
}

function getTrendIcon(v?: number | null) {
  if (v === null || v === undefined || v === 0) return '—';
  if (v > 0) return '↗';
  return '↘';
}

function getTrendColors(v?: number | null) {
  if (v === null || v === undefined || v === 0) return 'text-slate-400 bg-slate-50';
  if (v > 0) return 'text-emerald-700 bg-emerald-50';
  return 'text-red-700 bg-red-50';
}

export default function Page() {
  const [data, setData] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        TICKERS.map(async (t) => {
          const res = await fetch(`${API_BASE}/latest?ticker=${encodeURIComponent(t)}`, {
            cache: 'no-store',
            mode: 'cors',
          });
          if (!res.ok) return [t, { symbol: t, price: null }] as const;
          const q = (await res.json()) as Quote;
          return [t, q] as const;
        })
      );
      setData(Object.fromEntries(results));
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 30_000);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    const base = TICKERS.map((t) => data[t] ?? { symbol: t, price: null });
    if (!query.trim()) return base;
    const q = query.trim().toLowerCase();
    return base.filter((r) => 
      r.symbol.toLowerCase().includes(q) || 
      COMPANY_NAMES[r.symbol as keyof typeof COMPANY_NAMES]?.toLowerCase().includes(q)
    );
  }, [data, query]);

  const marketSummary = useMemo(() => {
    const validQuotes = rows.filter(q => q.price !== null && q.change_pct !== null);
    const gainers = validQuotes.filter(q => (q.change_pct || 0) > 0).length;
    const losers = validQuotes.filter(q => (q.change_pct || 0) < 0).length;
    const avgChange = validQuotes.reduce((sum, q) => sum + (q.change_pct || 0), 0) / validQuotes.length;
    
    return { gainers, losers, avgChange, total: validQuotes.length };
  }, [rows]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100" style={{backgroundColor: '#f8fafc', color: '#1e293b'}}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
              <span className="text-2xl text-white">📊</span>
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold text-slate-800 tracking-tight">
                S&P 500 Top 10
              </h1>
              <p className="text-slate-600 mt-1">
                Real-time market data with 10- refresh
              </p>
            </div>
          </div>

          {/* Market Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200" style={{backgroundColor: 'white', color: '#1e293b'}}>
              <div className="text-2xl font-bold text-slate-800">{marketSummary.total}</div>
              <div className="text-slate-600 text-sm font-medium">Total Stocks</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
              <div className="text-2xl font-bold text-emerald-600">{marketSummary.gainers}</div>
              <div className="text-slate-600 text-sm font-medium">Gainers</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
              <div className="text-2xl font-bold text-red-600">{marketSummary.losers}</div>
              <div className="text-slate-600 text-sm font-medium">Losers</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
              <div className={`text-2xl font-bold ${marketSummary.avgChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {marketSummary.avgChange >= 0 ? '+' : ''}{fmtNumber(marketSummary.avgChange, 2)}%
              </div>
              <div className="text-slate-600 text-sm font-medium">Avg Change</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 mb-8" style={{backgroundColor: 'white', color: '#1e293b'}}>
          <div className="p-6 border-b border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-lg">🔍</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by symbol or company name..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div className="flex items-center gap-4">
                {lastUpdate && (
                  <div className="text-sm text-slate-600">
                    Last updated: {lastUpdate.toLocaleTimeString()}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button
                    onClick={fetchAll}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
                  >
                    <span className={`text-lg ${loading ? 'animate-spin' : ''}`}>🔄</span>
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </button>
                  
                  <a
                    href={`${API_BASE}/history?ticker=${encodeURIComponent(TICKERS[0])}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
                  >
                    <span className="text-lg">📈</span>
                    View History
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="px-6 py-3 bg-slate-50 text-sm text-slate-600">
            Showing {rows.length} of {TICKERS.length} stocks
          </div>
        </div>

        {/* Stock Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden" style={{backgroundColor: 'white', color: '#1e293b'}}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Rank</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Company</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Price</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Change</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Change %</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Last Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((q, i) => {
                  const dt = q.ts ? new Date(q.ts * 1000) : null;
                  const timeStr = dt
                    ? dt.toLocaleString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—';

                  return (
                    <tr key={q.symbol} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-6">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-semibold text-slate-700">
                          {i + 1}
                        </div>
                      </td>
                      
                      <td className="px-6 py-6">
                        <div>
                          <div className="text-lg font-bold text-slate-800">{q.symbol}</div>
                          <div className="text-sm text-slate-500">
                            {COMPANY_NAMES[q.symbol as keyof typeof COMPANY_NAMES] || q.symbol}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-6 text-right">
                        <div className="text-xl font-bold text-slate-800 tabular-nums">
                          ${fmtNumber(q.price)}
                        </div>
                      </td>
                      
                      <td className="px-6 py-6 text-right">
                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold tabular-nums ${getTrendColors(q.change)}`}>
                          <span>{getTrendIcon(q.change)}</span>
                          {q.change === null || q.change === undefined
                            ? '—'
                            : `${q.change > 0 ? '+' : ''}${fmtNumber(Math.abs(q.change))}`}
                        </div>
                      </td>
                      
                      <td className="px-6 py-6 text-right">
                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold tabular-nums ${getTrendColors(q.change_pct)}`}>
                          <span>{getTrendIcon(q.change_pct)}</span>
                          {q.change_pct === null || q.change_pct === undefined
                            ? '—'
                            : `${q.change_pct > 0 ? '+' : ''}${fmtNumber(Math.abs(q.change_pct), 2)}%`}
                        </div>
                      </td>
                      
                      <td className="px-6 py-6 text-right">
                        <div className="text-sm text-slate-600 tabular-nums">{timeStr}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <div className="text-xs text-slate-500 text-center">
              Data cached in DynamoDB • Real-time updates via Alpha Vantage API • Auto-refresh every 30 seconds
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}