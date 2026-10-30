import { lazy, Suspense } from 'react';
import { CardSkeleton } from '@/components/Skeletons';

// Staff-only pages load on demand: visitors never download the camera scanner.
const ScanPage = lazy(() => import('./Scan').then((m) => ({ default: m.Scan })));
const JudgePage = lazy(() => import('./Judge').then((m) => ({ default: m.Judge })));
const loading = <CardSkeleton />;

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
