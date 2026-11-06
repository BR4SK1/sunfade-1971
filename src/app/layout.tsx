import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { PaletteProvider } from '../context/PaletteContext';
import { ThemeWrapper } from '../theme/ThemeWrapper';

// Self-hosted Montserrat (SIL OFL 1.1 — see src/fonts/LICENSE-Montserrat.txt),
// variable weight 100–900. The UI-chrome face: headings, subtitles, captions,
// labels, buttons and other ordinary controls. Exposed as a CSS variable so
// the shared theme options can reference it portably: on the site the variable
// resolves to the self-hosted face; standalone theme consumers fall back to
// the installed "Montserrat" family, then to the system sans-serif stack.
const sunfadeMontserrat = localFont({
  src: '../fonts/Montserrat-Variable.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-sunfade-montserrat',
  fallback: ['Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
});

// Self-hosted Caskaydia Cove Nerd Font (Cascadia Code with the Nerd Fonts
// patch, SIL OFL 1.1 — see src/fonts/LICENSE-CaskaydiaCove.txt). The
// body-text face: paragraphs, general body copy, and monospaced code,
// terminal and data readouts.
const sunfadeCaskaydia = localFont({
  src: [
    { path: '../fonts/CaskaydiaCoveNerdFont-Regular.woff2', weight: '400' },
    { path: '../fonts/CaskaydiaCoveNerdFont-SemiBold.woff2', weight: '600' },
    { path: '../fonts/CaskaydiaCoveNerdFont-Bold.woff2', weight: '700' },
  ],
  display: 'swap',
  variable: '--font-sunfade-caskaydia',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'monospace'],
});

export const metadata: Metadata = {
  title: 'Sunfade 1971',
  description: 'A warm, retro-inspired color palette playground.',
};

export const viewport: Viewport = {
  themeColor: '#1b1816',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sunfadeMontserrat.variable} ${sunfadeCaskaydia.variable}`}>
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
