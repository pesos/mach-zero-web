/// <reference lib="webworker" />
import { registerPushHandlers } from '@eventkit/sdk/sw';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

// Each deploy takes over at once instead of waiting until every tab of the
// site is closed (phones rarely close them, so users kept the old build).
self.addEventListener('install', () => void self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// The app shell only; API responses are never cached (scanning is online-only).
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//] }),
);

// Urgent notifications: the API's payload carries this portal's notifications URL.
registerPushHandlers(self, { icon: '/pwa-192.png' });
