import { lazy, Suspense } from 'react';
import { Loading } from '@/components/Loading';

// Staff-only pages load on demand: visitors never download the camera scanner.
const ScanPage = lazy(() => import('./Scan').then((m) => ({ default: m.Scan })));
const JudgePage = lazy(() => import('./Judge').then((m) => ({ default: m.Judge })));
const loading = <Loading />;

export function LazyScan() {
  return (
    <Suspense fallback={loading}>
      <ScanPage />
    </Suspense>
  );
}

export function LazyJudge() {
  return (
    <Suspense fallback={loading}>
      <JudgePage />
    </Suspense>
  );
}
