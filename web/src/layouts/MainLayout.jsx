import React from 'react'
import { Outlet } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import { SiteFooter } from '../components/SiteFooter'

export default function MainLayout() {
  return (
    <div className="main-layout">
      <SiteHeader />

      <main className="main-layout__content">
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  )
}
