import type { Metadata } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import './globals.css';
import { themeInitScript } from '@/components/theme-toggle';

const body = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

// Serifada só para títulos — é o que dá o ar editorial que diferencia do
// concorrente, que usa a mesma sans em tudo.
const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  axes: ['SOFT', 'WONK'],
});

export const metadata: Metadata = {
  title: 'Liberdade Academy',
  description:
    'Catálogo de produtos virais, comunidade e missões para afiliados da Liberdade Academy.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${body.variable} ${display.variable}`}>{children}</body>
    </html>
  );
}
