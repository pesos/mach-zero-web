import type { EventKit } from '@eventkit/sdk';
import { EventKitProvider, usePortalInfo } from '@eventkit/sdk/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WifiOffIcon } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { ErrorPage } from '@/components/ErrorPage';
import { CardSkeleton } from '@/components/Skeletons';
import { Toaster } from '@/components/ui/sonner';
import { errorText } from '@/lib/eventkit';
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
      <ErrorPage
        icon={WifiOffIcon}
        title="Could not load the event"
        action={{ label: 'Try again', onClick: () => void info.refetch() }}
      >
        {errorText(info.error)}
      </ErrorPage>
    );
  }
  if (!router) {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-xl p-4 pt-20">
        <CardSkeleton label="Loading the event" />
      </div>
    );
  }
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </>
  );
}
