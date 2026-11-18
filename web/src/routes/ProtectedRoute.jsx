import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'

function getHomePathForRole(role) {
  const normalized = (role || '').toLowerCase()
  if (normalized === 'system_admin') return '/admin/dashboard'
  if (normalized === 'staff') return '/staff/dashboard'
  if (normalized === 'vendor_admin' || normalized === 'guide') return '/vendor/dashboard'
  return '/dashboard'
}

export default function ProtectedRoute({ allowedRoles = [], redirectTo = '/login' }) {
  const token = localStorage.getItem('access_token')
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user_info') || 'null')
    } catch {
      localStorage.removeItem('user_info')
      return null
    }
  })()
  const tokenPayload = (() => {
    try {
      const parts = token?.split('.')
      if (!parts || parts.length !== 3) return null
      const encoded = parts[1]
      return encoded ? JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))) : null
    } catch { return null }
  })()

  if (!token || !tokenPayload || (tokenPayload.exp && tokenPayload.exp * 1000 <= Date.now())) {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_info')
    return <Navigate to={redirectTo} replace />
  }

  const role = user?.role || tokenPayload?.role
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase())
  if (normalizedAllowed.length > 0 && (!role || !normalizedAllowed.includes(role.toLowerCase()))) {
    return <Navigate to={getHomePathForRole(role)} replace />
  }

  return <Outlet />
}
