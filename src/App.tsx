import type { EventKit } from '@eventkit/sdk';
import { EventKitProvider, usePortalInfo } from '@eventkit/sdk/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useMemo, useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { ErrorText } from '@/components/ErrorText';
import { portalRoutes } from '@/routes';

export function Providers({ ek, children }: { ek: EventKit; children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <EventKitProvider client={ek}>{children}</EventKitProvider>
    </QueryClientProvider>
  );
}

/** Loads the event's portal settings, then routes. */
export function App() {
  const info = usePortalInfo();
  const paths = info.data?.paths;
  const router = useMemo(() => (paths ? createBrowserRouter(portalRoutes(paths)) : null), [paths]);
  if (info.isError) {
    return (
      <main className="mx-auto max-w-xl p-4">
        <ErrorText error={info.error} />
      </main>
    );
  }
  if (!router) return <p className="p-4 text-muted-foreground">Loading…</p>;
  return <RouterProvider router={router} />;
}
