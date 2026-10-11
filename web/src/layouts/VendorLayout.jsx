import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import VendorSidebar from '../components/layout/vendor/VendorSidebar'
import VendorHeader from '../components/layout/vendor/VendorHeader'
import VendorFooter from '../components/layout/vendor/VendorFooter'
export default function VendorLayout({ account, user, role = 'VENDOR' }) { const [open, setOpen] = useState(false); return <div className="dashboard-shell vendor-shell"><VendorSidebar role={role} account={account} open={open} onClose={() => setOpen(false)} /><div className="dashboard-main"><VendorHeader role={role} account={account} onMenu={() => setOpen(true)} /><main className="dashboard-content"><Outlet context={{ account, user, role }} /></main><VendorFooter /></div></div> }
