import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter } from './shims/react-router-dom';

// ------------------------------------------------------------------
// 1. Global Error & Diagnostic Catcher
// ------------------------------------------------------------------
window.onerror = function(message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: #fff; background: #1a1a1a; border: 2px solid #ff4444; font-family: monospace; border-radius: 8px;">
        <h1 style="color: #ff4444; margin-top: 0;">⚠️ RUNTIME ERROR</h1>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Location:</strong> ${source}:${lineno}:${colno}</p>
        <pre style="background: #000; padding: 10px; border-radius: 4px; overflow-x: auto;">${error ? error.stack : 'No stack trace available'}</pre>
        <button onclick="window.location.reload(true)" style="background: #4F46E5; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Hard Reload Page</button>
      </div>
    `;
  }
  return false;
};

// ------------------------------------------------------------------
// 3. Application Mounting
// ------------------------------------------------------------------
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
  
  console.log('🚀 Application mounted successfully in Debug Mode');
} else {
  console.error('CRITICAL: Root element not found!');
}
