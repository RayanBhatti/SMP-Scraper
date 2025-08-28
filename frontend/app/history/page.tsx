import { Suspense } from 'react';
import HistoryContent from './HistoryContent';

export const dynamic = 'force-dynamic';

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-600">Loading history…</div>}>
      <HistoryContent />
    </Suspense>
  );
}
