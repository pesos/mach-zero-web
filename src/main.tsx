import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, Providers } from './App';
import './index.css';
import { makeEventKit } from './lib/eventkit';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers ek={makeEventKit()}>
      <App />
    </Providers>
  </StrictMode>,
);
