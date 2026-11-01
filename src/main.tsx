import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, Providers } from './App';
import './index.css';
import { makeEventKit } from './lib/eventkit';

// A tab still on an older build asks for page chunks the new deploy no longer
// has: reload into the new build (at most once a minute, so a real outage
// can't loop).
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem('preloadReloadAt'));
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem('preloadReloadAt', String(Date.now()));
  } catch {
    return; // storage blocked: no loop guard, so let the error surface
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers ek={makeEventKit()}>
      <App />
    </Providers>
  </StrictMode>,
);
