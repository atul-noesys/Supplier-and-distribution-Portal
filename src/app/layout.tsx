import { Outfit } from 'next/font/google';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { PageTransitionProvider } from '@/context/PageTransitionContext';
import { I18nProvider } from '@/i18n/I18nProvider';
import { Metadata } from 'next';
import { StoreProvider } from '@/store/store-context';
import { QueryProvider } from '@/providers/QueryProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import PageTransitionOverlay from '@/components/common/PageTransitionOverlay';
import RouteTransitionManager from '@/components/common/RouteTransitionManager';

export const metadata: Metadata = {
  title: "Infoveave - Supplier and Distributor Portal",
  description:
    "Infoveave - Supplier and Distributor Portal in Nooms",
};

const outfit = Outfit({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} dark:bg-gray-900`} suppressHydrationWarning>
        <PageTransitionProvider>
          <RouteTransitionManager />
          <I18nProvider>
            <ThemeProvider>
              <StoreProvider>
                <QueryProvider>
                  <SidebarProvider>{children}</SidebarProvider>
                  <ToastProvider />
                </QueryProvider>
              </StoreProvider>
            </ThemeProvider>
          </I18nProvider>
          <PageTransitionOverlay />
        </PageTransitionProvider>
      </body>
    </html>
  );
}
