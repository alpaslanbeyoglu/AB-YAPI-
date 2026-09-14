import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { CompanyProfileProvider } from './context/CompanyProfileContext';
import { FirebaseSyncProvider } from './context/FirebaseSyncContext';
import { LicenseGate } from './components/LicenseGate';
import { ErrorBoundary } from './components/ErrorBoundary';

// Ignore benign Firebase IndexedDB error when user clears browser data
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('Database deleted by request of the user')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <FirebaseSyncProvider>
        <CompanyProfileProvider>
          <LicenseGate>
            <App />
          </LicenseGate>
        </CompanyProfileProvider>
      </FirebaseSyncProvider>
    </ErrorBoundary>
  </StrictMode>,
);

(window as any).__APP_MOUNTED__ = true;


