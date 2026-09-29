import type { Metadata, Viewport } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { PaletteProvider } from '../context/PaletteContext';
import { ThemeWrapper } from '../theme/ThemeWrapper';

export const metadata: Metadata = {
  title: 'Sunfade 1971',
  description: 'A warm, retro-inspired color palette playground.',
};

export const viewport: Viewport = {
  themeColor: '#28201b',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <PaletteProvider>
            <ThemeWrapper>{children}</ThemeWrapper>
          </PaletteProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
