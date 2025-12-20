import { Inter } from 'next/font/google'
import dynamic from 'next/dynamic'
import './globals.css'

// Dynamic import with ssr: false to prevent "document is not defined" error
const Providers = dynamic(
  () => import('./providers').then(mod => ({ default: mod.Providers })),
  { ssr: false }
)

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Agent Debugger',
  description: 'Agent debugger project',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
