import React from 'react';
import ReactDOM from 'react-dom/client';
import flagsmith from 'flagsmith';
import { FlagsmithProvider } from 'flagsmith/react';
import './styles/globals.css';
import App from './App';

const flagsmithApiUrl =
  import.meta.env.VITE_FLAGSMITH_API_URL || 'http://localhost:8000/api/v1/';
const flagsmithEnvironmentId = import.meta.env.VITE_FLAGSMITH_DEV_KEY || '';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in document.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <FlagsmithProvider
      flagsmith={flagsmith}
      options={{
        environmentID: flagsmithEnvironmentId,
        api: flagsmithApiUrl,
        cacheFlags: false,
      }}
    >
      <App />
    </FlagsmithProvider>
  </React.StrictMode>,
);
