import React from 'react'
import { NavLink } from 'react-router-dom'
import * as Icons from 'lucide-react'
import AppLogo from './AppLogo'
import UserAvatar from './UserAvatar'
import { navigationByRole, roleLabels } from '../../../routes/navigation'

export default function DashboardSidebar({ role, account, open, onClose }) {
  const items = navigationByRole[role] || []
  let lastSection = null
  return <aside className={`dashboard-sidebar dashboard-sidebar--${role.toLowerCase()} ${open ? 'is-open' : ''}`}>
    <AppLogo subtitle={roleLabels[role]} />
    <nav className="dashboard-nav">
      {items.map((item) => {
        const Icon = Icons[item.icon.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('')] || Icons.Circle
        const section = item.section && item.section !== lastSection ? <div className="dashboard-nav__section" key={`${item.path}-section`}>{item.section}</div> : null
        lastSection = item.section || lastSection
        return <React.Fragment key={item.path}>{section}<NavLink onClick={onClose} to={item.path} className={({ isActive }) => `dashboard-nav__item ${isActive ? 'active' : ''}`}><Icon size={16} strokeWidth={1.7} /><span>{item.label}</span></NavLink></React.Fragment>
      })}
    </nav>
    <div className="dashboard-account"><UserAvatar initials={account?.initials || (role === 'CUSTOMER' ? 'TH' : 'ST')} avatarUrl={account?.avatarUrl} /><div><strong>{role === 'CUSTOMER' ? (account?.name || 'Eco-Explorer') : `Tài khoản ${role === 'VENDOR' ? 'Vendor' : role[0] + role.slice(1).toLowerCase()}`}</strong><span>{role === 'CUSTOMER' ? `${account?.points ?? 350} RE-Points` : 'Đối tác đã xác minh'}</span></div></div>
  </aside>
}
