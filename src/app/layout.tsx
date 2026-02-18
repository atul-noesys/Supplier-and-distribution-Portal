import { Outfit } from 'next/font/google';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Metadata } from 'next';
import { StoreProvider } from '@/store/store-context';
import { QueryProvider } from '@/providers/QueryProvider';
import { ToastProvider } from '@/providers/ToastProvider';

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
        <ThemeProvider>
          <StoreProvider>
            <QueryProvider>
              <SidebarProvider>{children}</SidebarProvider>
              <ToastProvider />
            </QueryProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
