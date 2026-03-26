import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const htmlMode = document.documentElement.getAttribute('data-app-mode');
const hostMode =
  typeof window !== 'undefined' && /^admin(\.|$)/i.test(window.location.hostname)
    ? 'admin'
    : 'storefront';
const appMode = htmlMode === 'admin' ? 'admin' : hostMode;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App appMode={appMode} />
  </StrictMode>,
);
