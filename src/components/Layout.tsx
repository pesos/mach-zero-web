import { useEventKit, usePortalInfo } from '@eventkit/sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  BellIcon,
  GavelIcon,
  LogOutIcon,
  type LucideIcon,
  MenuIcon,
  ScanLineIcon,
  UserRoundIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Backdrop } from '@/components/Backdrop';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { basePath } from '@/lib/paths';
import { forgetSession, useWho } from '@/lib/staff';
import { cn } from '@/lib/utils';

type Section = { to: string; label: string; icon: LucideIcon };

export function Layout() {
  const ek = useEventKit();
  const info = usePortalInfo().data!;
  const who = useWho();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const sections: Section[] = [];
  if (who.kind === 'participant')
    sections.push({ to: basePath(info.paths.me), label: 'My registration', icon: UserRoundIcon });
  if (who.canScan) sections.push({ to: '/scan', label: 'Scan', icon: ScanLineIcon });
  if (who.canJudge) sections.push({ to: '/judge', label: 'Judge', icon: GavelIcon });
  if (who.kind)
    sections.push({ to: info.paths.notifications, label: 'Notifications', icon: BellIcon });
  const current = sections.find((s) => s.to === pathname)?.label;
  const signOut = () => {
    setMenuOpen(false);
    ek.portal.logout();
    forgetSession(queryClient);
    void navigate('/');
  };
  const menu = (
    <nav aria-label="Portal" className="grid gap-1">
      {sections.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )
          }
        >
          <Icon className="size-4" />
          {label}
        </NavLink>
      ))}
      <Separator className="my-2" />
      <Button variant="ghost" className="justify-start gap-3 px-3" onClick={signOut}>
        <LogOutIcon />
        Sign out
      </Button>
    </nav>
  );

  return (
    <div className="relative isolate flex min-h-svh flex-col">
      <Backdrop scene={pathname === '/' ? 'base' : who.kind ? 'outpost' : 'plan'} />
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/75 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-lg tracking-wider text-ink"
            onClick={() => setMenuOpen(false)}
          >
            <img src="/favicon.svg" alt="" className="size-7" />
            {info.event.name}
          </Link>
          {who.kind ? (
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card/80 md:hidden"
                  aria-label={current ? `Menu: ${current}` : 'Menu'}
                >
                  <MenuIcon />
                  {current ?? 'Menu'}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 gap-0 p-4 pt-12">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                {menu}
              </SheetContent>
            </Sheet>
          ) : null}
        </div>
      </header>
      <div
        className={cn(
          'mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-[min(45svh,24rem)] sm:pt-8',
          who.kind && 'md:grid md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8',
        )}
      >
        {/* Signed in: the sections in a sidebar from md up (a sheet on phones). */}
        {who.kind && (
          <aside className="hidden md:block">
            <div className="sticky top-20 rounded-xl border bg-card/85 p-2 shadow-sm backdrop-blur-md">
              {menu}
            </div>
          </aside>
        )}
        <main className="mx-auto grid w-full max-w-3xl min-w-0 content-start gap-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
