import { Layout } from '@/components/Layout';
import { basePath, type Paths, routePath } from '@/lib/paths';
import { Home } from '@/pages/Home';
import { Judge } from '@/pages/Judge';
import { Login } from '@/pages/Login';
import { Me } from '@/pages/Me';
import { NotFound } from '@/pages/NotFound';
import { Notifications } from '@/pages/Notifications';
import { Register } from '@/pages/Register';
import { Scan } from '@/pages/Scan';
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
        { path: '/login', element: <Login /> },
        { path: '/scan', element: <Scan /> },
        { path: '/judge', element: <Judge /> },
        { path: '*', element: <NotFound /> },
      ],
    },
  ];
}
