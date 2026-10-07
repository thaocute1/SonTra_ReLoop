import React from 'react'
import { SiteHeader } from '../components/SiteHeader'
import { SiteFooter } from '../components/SiteFooter'

export default function AuthLayout({ children }) {
  return (
    <div className="auth-shell">
      <SiteHeader />
      <main className="auth-shell__content">
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
