import type { Metadata } from 'next'
import { Providers } from '@/components/providers'
import './globals.css'
import { AnimatedBackground } from '@/components/layout/AnimatedBackground'

export const metadata: Metadata = {
  title: 'Deep Knowledge AI Platform',
  description: 'Nền tảng học tập AI thông minh với phản biện và tư duy phê phán',
  generator: 'Deep Knowledge AI',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          {children}
          {/* <div className="fixed inset-0 z-0">
            <AnimatedBackground />
          </div> */}
        </Providers>
      </body>
    </html>
  )
}
