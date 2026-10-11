import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import CustomerSidebar from '../components/layout/customer/CustomerSidebar'
import CustomerHeader from '../components/layout/customer/CustomerHeader'
import CustomerFooter from '../components/layout/customer/CustomerFooter'
export default function CustomerLayout({ account, user, role }) { const [open, setOpen] = useState(false); return <div className="dashboard-shell customer-shell"><CustomerSidebar role={role} account={account} open={open} onClose={() => setOpen(false)} /><div className="dashboard-main"><CustomerHeader role={role} account={account} onMenu={() => setOpen(true)} /><main className="dashboard-content"><Outlet context={{ account, user, role }} /></main><CustomerFooter /></div></div> }
