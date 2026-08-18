import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import AuthProvider from '@/components/AuthProvider/AuthProvider';
import { I18nProvider } from '@/components/I18nProvider';
import ThemeProvider from '@/context/ThemeContext';
import './globals.css';
// Relative path bypasses the package exports field (no "style" condition exported)
import '../../node_modules/@epam/ai-dial-ui-kit/dist/index.css';
import '../../node_modules/@epam/ai-dial-react-file-manager/dist/index.css';

// Self-hosted via next/font — matches ai-dial-chat's Inter typography without
// external requests to Google Fonts, so no CSP allowance is needed.
// Variable name matches the `var(--theme-font, var(--font-inter))` fallback
// convention used by tailwind.config.js and @epam/ai-dial-ui-kit.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'AI DIAL Quick Apps',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`}>
      <body className="min-h-full flex flex-col font">
        <ThemeProvider>
          <AuthProvider>
            <I18nProvider>{children}</I18nProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
