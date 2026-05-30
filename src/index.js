import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);

// Service worker is intentionally DISABLED. We don't need offline support right
// now, and a stale cached bundle was causing more problems than it solved.
// This actively tears down any service worker (and its caches) that was
// previously installed on a device, so existing clients recover on next load.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
}
if (typeof caches !== 'undefined' && caches.keys) {
  caches.keys()
    .then((keys) => keys.forEach((k) => caches.delete(k)))
    .catch(() => {});
}
