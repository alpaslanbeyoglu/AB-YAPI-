import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { CompanyProfileProvider } from './context/CompanyProfileContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CompanyProfileProvider>
      <App />
    </CompanyProfileProvider>
  </StrictMode>,
);
