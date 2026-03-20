import type { Metadata } from 'next';
import { Instrument_Serif, Montserrat } from 'next/font/google';

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-instrument',
  style: ['normal', 'italic'],
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: 'TNC Agents',
  description: 'AI Agent System for The Neighbourhood Collective',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${montserrat.variable}`}>
      <body style={{ margin: 0, padding: 0, background: '#FCFAF8', fontFamily: 'var(--font-montserrat), sans-serif', color: '#2D2D2D' }}>
        {children}
      </body>
    </html>
  );
}
