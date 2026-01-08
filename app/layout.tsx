import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ToasterProvider from './components/ToasterProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Murang'a County E-Service Portal",
  description: 'Permit Management System',
  icons: {
    icon: 'https://eservices.muranga.go.ke/images/favicon/favicon-32x32.png',
    shortcut: 'https://eservices.muranga.go.ke/images/favicon/favicon-32x32.png',
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
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
        <link rel="shortcut icon" type='image/x-icon' href="https://eservices.muranga.go.ke/images/favicon/favicon-32x32.png" />
        <link rel="icon" type="image/png" href="https://eservices.muranga.go.ke/images/favicon/favicon-32x32.png" />
      </head>
      <body className={inter.className}>
        <ToasterProvider />
        {children}
      </body>
    </html>
  );
}
