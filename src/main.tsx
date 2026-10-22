import '@fontsource-variable/inter';
import '@epam/ai-dial-ui-kit/styles.css';
import '@epam/ai-dial-react-file-manager/styles.css';
import '@epam/ai-dial-chat-shared/styles.css';
import '@epam/ai-dial-catalog/styles.css';
import './index.css';
import './monaco-setup';
import '@/i18n/config';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';

import App from '@/App';
import AuthContextProvider from '@/context/AuthContext';
import ThemeProvider from '@/context/ThemeContext';
import SignInCompletePage from '@/pages/SignInCompletePage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthContextProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/signin/complete" element={<SignInCompletePage />} />
          </Routes>
        </BrowserRouter>
      </AuthContextProvider>
    </ThemeProvider>
  </StrictMode>,
);
