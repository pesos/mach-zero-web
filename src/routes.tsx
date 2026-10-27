import { Layout } from '@/components/Layout';
import { basePath, type Paths, routePath, STAFF_LOGIN } from '@/lib/paths';
import { Home } from '@/pages/Home';
import { LazyJudge, LazyScan } from '@/pages/lazy';
import { Login } from '@/pages/Login';
import { Me } from '@/pages/Me';
import { NotFound } from '@/pages/NotFound';
import { Notifications } from '@/pages/Notifications';
import { Register } from '@/pages/Register';
import { StaffSignup } from '@/pages/StaffSignup';

/** The pages, on the event's paths (the console can override them). */
export function portalRoutes(paths: Paths) {
  const meBase = basePath(paths.me);
  return [
    {
      element: <Layout />,
      children: [
        { index: true, element: <Home /> },
        { path: routePath(paths.register), element: <Register /> },
        { path: routePath(paths.staff), element: <StaffSignup /> },
        { path: routePath(paths.me), element: <Me /> },
        ...(meBase === '/' ? [] : [{ path: meBase, element: <Me /> }]),
        { path: paths.notifications, element: <Notifications /> },
        { path: STAFF_LOGIN, element: <Login /> },
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
