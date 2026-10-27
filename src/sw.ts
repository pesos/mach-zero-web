/// <reference lib="webworker" />
import { registerPushHandlers } from '@eventkit/sdk/sw';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

// The app shell only; API responses are never cached (scanning is online-only).
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//] }),
);

// Urgent notifications: the API's payload carries this portal's notifications URL.
registerPushHandlers(self, { icon: '/pwa-192.png' });
