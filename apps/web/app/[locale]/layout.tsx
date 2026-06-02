import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Script from 'next/script';
import { routing } from '@/i18n/routing';
import { PushInit } from '@/components/push-init';
import '../globals.css';
import 'leaflet/dist/leaflet.css';

const PLAUSIBLE_DOMAIN = process.env['NEXT_PUBLIC_PLAUSIBLE_DOMAIN'] ?? '';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Tara — Hostels in the Philippines',
    template: '%s | Tara',
  },
  description:
    'Tara, na! Book beds, dorms, and private rooms at handpicked hostels across the Philippines.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tara',
  },
  openGraph: {
    siteName: 'Tara',
    type: 'website',
    locale: 'en_PH',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'Tara' }],
  },
  twitter: {
    card: 'summary',
    title: 'Tara — Hostels in the Philippines',
    description:
      'Book beds, dorms, and private rooms at handpicked hostels across the Philippines.',
    images: ['/icons/icon-512.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export function generateStaticParams(): Array<{ locale: string }> {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}): Promise<React.ReactElement> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const nonce = (await headers()).get('x-nonce') ?? '';

  // nonce is available here for <Script nonce={nonce}> when adding third-party scripts.
  void nonce;

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <PushInit />
        {PLAUSIBLE_DOMAIN && (
          <Script
            defer
            data-domain={PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
          }
        `}</Script>
      </body>
    </html>
  );
}
