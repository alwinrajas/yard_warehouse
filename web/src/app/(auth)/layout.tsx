import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-graphite-0">{children}</div>
}
