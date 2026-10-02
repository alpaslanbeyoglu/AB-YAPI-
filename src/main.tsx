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

// Detect Home Screen Standalone Mini Web App (PWA) mode and apply safe-area classes
if (typeof window !== 'undefined') {
  const isIosStandalone = (window.navigator as any)?.standalone === true;
  const isDisplayStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches === true;
  if (isIosStandalone) {
    document.documentElement.classList.add('is-ios-standalone', 'is-standalone-pwa');
  } else if (isDisplayStandalone) {
    document.documentElement.classList.add('is-standalone-pwa');
  }

  // Automatic one-time cache busting for older Service Worker caches on mobile Home Screen apps
  const PWA_BUILD_VERSION = '2026.09.26.v4';
  try {
    const currentVersion = localStorage.getItem('ab_yapi_pwa_version');
    if (currentVersion !== PWA_BUILD_VERSION) {
      localStorage.setItem('ab_yapi_pwa_version', PWA_BUILD_VERSION);
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            if (key !== 'app-assets-v4') {
              caches.delete(key).catch(() => {});
            }
          });
        }).catch(() => {});
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => {
            reg.update().catch(() => {});
          });
        }).catch(() => {});
      }
    }
  } catch (e) {}
}

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


