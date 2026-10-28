/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EVENTKIT_API_URL?: string;
  readonly VITE_EVENTKIT_API_KEY?: string;
  readonly VITE_EVENTKIT_EVENT_ID?: string;
  /** The event's registration link, for the Register buttons. */
  readonly VITE_REGISTER_URL?: string;
}
