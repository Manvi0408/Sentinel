import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// Split deploy support: when the frontend is hosted separately from the backend,
// set VITE_API_BASE (e.g. https://sentinel-api.onrender.com) at build time and
// every `/api/*` request is routed to it. Empty (default) = same-origin, so the
// single-origin build is unchanged.
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
if (API_BASE) {
  const _fetch = window.fetch.bind(window);
  window.fetch = (input, init) =>
    typeof input === 'string' && input.startsWith('/api')
      ? _fetch(API_BASE + input, init)
      : _fetch(input, init);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
