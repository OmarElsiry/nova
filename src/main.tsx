import './polyfills/node-globals';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { tonConnectManifest } from '@/lib/tonconnect';

createRoot(document.getElementById("root")!).render(
  <TonConnectUIProvider manifestUrl={tonConnectManifest.url}>
    <App />
  </TonConnectUIProvider>
);
