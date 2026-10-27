import { useEventKit, usePortalInfo } from '@eventkit/sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Backdrop } from '@/components/Backdrop';
import { Button } from '@/components/ui/button';
import { basePath } from '@/lib/paths';
import { forgetSession, useWho } from '@/lib/staff';
import { cn } from '@/lib/utils';

export function Layout() {
  const ek = useEventKit();
  const info = usePortalInfo().data!;
  const who = useWho();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  // Escape closes the phone menu, wherever focus is.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);
  const links: [string, string][] = [];
  if (who.kind === 'participant') links.push([basePath(info.paths.me), 'My registration']);
  if (who.canScan) links.push(['/scan', 'Scan']);
  if (who.canJudge) links.push(['/judge', 'Judge']);
  if (who.kind) links.push([info.paths.notifications, 'Notifications']);
  const current = links.find(([to]) => to === pathname)?.[1];
  const signOut = () => {
    setMenuOpen(false);
    ek.portal.logout();
    forgetSession(queryClient);
    void navigate('/');
  };

  return (
    <div className="relative isolate min-h-svh pb-[30svh]">
      <Backdrop />
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <NavLink
            to="/"
            className="font-display text-lg leading-none tracking-wider text-ink"
            onClick={() => setMenuOpen(false)}
          >
            {info.event.name}
          </NavLink>
          {who.kind ? (
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="portal-menu"
              aria-label={current ? `Menu: ${current}` : 'Menu'}
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1.5 text-sm md:hidden"
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
              {current ?? 'Menu'}
            </button>
          ) : (
            <nav aria-label="Portal" className="text-sm">
              <NavLink
                to="/login"
                className="rounded-full border border-lavender/50 px-3 py-1.5 font-display text-xs tracking-wider text-lavender uppercase hover:bg-secondary"
              >
                Staff sign in
              </NavLink>
            </nav>
          )}
        </div>
      </header>
      <div
        className={cn(
          'mx-auto max-w-5xl px-4 py-6',
          who.kind && 'md:grid md:grid-cols-[12rem_minmax(0,1fr)] md:gap-6',
        )}
      >
        {/* Signed in: a menu on phones, a sticky sidebar from md up. */}
        {who.kind && (
          <nav
            id="portal-menu"
            aria-label="Portal"
            className={cn(
              'glass mb-4 flex-col gap-0.5 rounded-lg border p-2 md:sticky md:top-20 md:mb-0 md:flex md:self-start',
              menuOpen ? 'flex' : 'hidden',
            )}
          >
            {links.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-3 py-2 text-sm md:py-1.5',
                    isActive
                      ? 'bg-primary font-medium text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
            <div className="mt-2 border-t pt-2">
              <Button size="sm" variant="outline" className="w-full" onClick={signOut}>
                Sign out
              </Button>
            </div>
          </nav>
        )}
        <main className="mx-auto grid w-full max-w-3xl min-w-0 gap-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const MenuIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="size-4"
    aria-hidden
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="size-4"
    aria-hidden
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
