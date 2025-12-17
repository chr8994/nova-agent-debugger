'use client'

import { TooltipProvider } from '@newhomestar/chat-ui'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      {children}
    </TooltipProvider>
  )
}
