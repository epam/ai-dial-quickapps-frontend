import type { Metadata } from 'next';
import { I18nProvider } from '@/components/I18nProvider';
import ThemeProvider from '@/context/ThemeContext';
import './globals.css';
// Relative path bypasses the package exports field (no "style" condition exported)
import '../../node_modules/@epam/ai-dial-ui-kit/dist/index.css';

export const metadata: Metadata = {
  title: 'AI DIAL Quick Apps',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <I18nProvider>{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
