import '@fontsource-variable/inter';
// Relative path bypasses the package exports field (no "style" condition exported)
import '../node_modules/@epam/ai-dial-ui-kit/dist/index.css';
import '../node_modules/@epam/ai-dial-react-file-manager/dist/index.css';
import './index.css';
import './monaco-setup';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';

import App from '@/App';
import AuthContextProvider from '@/context/AuthContext';
import { I18nProvider } from '@/components/I18nProvider';
import ThemeProvider from '@/context/ThemeContext';
import SignInCompletePage from '@/pages/SignInCompletePage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthContextProvider>
        <I18nProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/signin/complete" element={<SignInCompletePage />} />
            </Routes>
          </BrowserRouter>
        </I18nProvider>
      </AuthContextProvider>
    </ThemeProvider>
  </StrictMode>,
);
