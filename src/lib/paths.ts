import type { Schemas } from '@eventkit/sdk';

/** A portal path template ("/me/{token}") as a router path ("/me/:token"). */
export const routePath = (template: string) => template.replace('{token}', ':token');

/** The path before the token: where a personal-link page lives once the token is stripped. */
export const basePath = (template: string) =>
  template.split('{token}')[0]!.replace(/\/+$/, '') || '/';

export type Paths = Schemas['PortalPaths'];
