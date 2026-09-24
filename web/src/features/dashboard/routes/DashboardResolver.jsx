import { Route, Routes, useOutletContext } from 'react-router-dom'
import CustomerLayout from '../../../layouts/CustomerLayout'
import VendorLayout from '../../../layouts/VendorLayout'
import AdminLayout from '../../../layouts/AdminLayout'
import CustomerDashboardPage from '../pages/CustomerDashboardPage'
import VendorDashboardPage from '../pages/VendorDashboardPage'
import AdminDashboardPage from '../pages/AdminDashboardPage'
import UnsupportedDashboardPage from '../pages/UnsupportedDashboardPage'

export default function DashboardResolver() {
  const { role, user } = useOutletContext() || {}
  const account = {
    name: user?.name || user?.email || 'Eco-Explorer',
    points: user?.total_eco_points ?? 350,
    avatarUrl: user?.avatar_url || '',
  }
  account.initials = account.name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase() || 'TH'
  const pageByRole = { CUSTOMER: CustomerDashboardPage, VENDOR: VendorDashboardPage, ADMIN: AdminDashboardPage }
  const layoutByRole = { CUSTOMER: CustomerLayout, VENDOR: VendorLayout, ADMIN: AdminLayout }
  const Page = pageByRole[role]
  const Layout = layoutByRole[role]

  if (!Layout) return <UnsupportedDashboardPage role={role} />
  return <Routes><Route element={<Layout account={account} user={user} role={role} />}><Route index element={<Page />} /><Route path="*" element={<Page />} /></Route></Routes>
}
