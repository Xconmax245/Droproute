import type { Metadata } from 'next';
import AosInit from './AosInit';
import './globals.css';

export const metadata: Metadata = {
  title: 'DropRoute — Referral Attribution Dashboard',
  description:
    'Live referral attribution dashboard. See which acquisition sources produce activated users.',
  keywords: ['referral', 'attribution', 'mobile growth', 'expo', 'analytics'],
  openGraph: {
    title: 'DropRoute Dashboard',
    description: 'Which channels actually activate users?',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=archivo@400,500,600&f[]=pilcrow-rounded@900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="ambient-mesh" aria-hidden="true" />
        <AosInit />
        {children}
      </body>
    </html>
  );
}
