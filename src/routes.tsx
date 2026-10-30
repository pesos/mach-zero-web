import { ErrorPage } from '@/components/ErrorPage';
import { Layout } from '@/components/Layout';
import { basePath, type Paths, routePath, STAFF_LOGIN } from '@/lib/paths';
import { Home } from '@/pages/Home';
import { Leaderboard } from '@/pages/Leaderboard';
import { LazyJudge, LazyScan } from '@/pages/lazy';
import { Login } from '@/pages/Login';
import { Me } from '@/pages/Me';
import { NotFound } from '@/pages/NotFound';
import { ChangePassword } from '@/pages/ChangePassword';
import { Notifications } from '@/pages/Notifications';
import { Settings } from '@/pages/Settings';
import { Polls } from '@/pages/Polls';
import { Register } from '@/pages/Register';
import { StaffSignup } from '@/pages/StaffSignup';
import { Submissions } from '@/pages/Submissions';

/** Shown when a page throws while rendering. */
function RouteError() {
  return (
    <ErrorPage
      title="Something went wrong"
      action={{ label: 'Try again', onClick: () => window.location.reload() }}
    >
      This page hit a problem. Try again, and if it keeps happening, tell the organisers.
    </ErrorPage>
  );
}

/** The pages, on the event's paths (the console can override them). */
export function portalRoutes(paths: Paths) {
  const meBase = basePath(paths.me);
  return [
    {
      element: <Layout />,
      errorElement: <RouteError />,
      children: [
        { index: true, element: <Home /> },
        { path: routePath(paths.register), element: <Register /> },
        { path: routePath(paths.staff), element: <StaffSignup /> },
        { path: routePath(paths.me), element: <Me /> },
        ...(meBase === '/' ? [] : [{ path: meBase, element: <Me /> }]),
        { path: paths.notifications, element: <Notifications /> },
        { path: '/settings', element: <Settings /> },
        { path: '/polls', element: <Polls /> },
        { path: '/leaderboard', element: <Leaderboard /> },
        { path: '/submissions', element: <Submissions /> },
        { path: STAFF_LOGIN, element: <Login /> },
        { path: '/password', element: <ChangePassword /> },
        {
          path: '/scan',
          element: <LazyScan />,
        },
        {
          path: '/judge',
          element: <LazyJudge />,
        },
        { path: '*', element: <NotFound /> },
      ],
    },
  ];
}
