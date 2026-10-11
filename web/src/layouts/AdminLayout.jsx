import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import AdminSidebar from '../components/layout/admin/AdminSidebar'
import AdminHeader from '../components/layout/admin/AdminHeader'
import AdminFooter from '../components/layout/admin/AdminFooter'
export default function AdminLayout({ account, user, role = 'ADMIN' }) { const [open, setOpen] = useState(false); return <div className="dashboard-shell"><AdminSidebar role={role} account={account} open={open} onClose={() => setOpen(false)} /><div className="dashboard-main"><AdminHeader role={role} account={account} onMenu={() => setOpen(true)} /><main className="dashboard-content"><Outlet context={{ account, user, role }} /></main><AdminFooter /></div></div> }
