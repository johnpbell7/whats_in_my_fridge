import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

// If anything in the app throws, show a simple reload screen rather than a
// blank page — and never get stuck on a stale state.
function Fallback() {
  return (
    <div className="crash">
      <h1>
        Fridge<span style={{ color: 'var(--accent)' }}>.</span>
      </h1>
      <p>Something went wrong loading the app.</p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary fallback={<Fallback />}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
