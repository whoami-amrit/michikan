import './globals.css';

import type { Metadata } from 'next';
import { Geist, Geist_Mono, IBM_Plex_Sans, Inter } from 'next/font/google';

import { cn } from '@/lib/utils';

const ibmPlexSansHeading = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-heading' });

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Michikan',
  description:
    'A simple and efficient AI job tracker with latex resume creation and resume tailoring based on job description. Follow your path, land your role.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        'h-full',
        'antialiased',
        geistSans.variable,
        geistMono.variable,
        'font-sans',
        inter.variable,
        ibmPlexSansHeading.variable,
      )}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
