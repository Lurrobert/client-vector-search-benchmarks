import './globals.css'
import { Inter } from 'next/font/google'
import {Providers} from "./providers";
import { Analytics } from '@vercel/analytics/react';



const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({children}) {
  return (
    <html lang="en" className='white'>
          <body className={inter.className}><Providers>{children}<Analytics /></Providers></body>
    </html>
  );
}

