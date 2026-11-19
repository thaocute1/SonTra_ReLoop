import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'

export function getHomePathForRole(role) {
  const normalized = (role || '').toLowerCase()
  if (normalized === 'system_admin') return '/admin/dashboard'
  if (normalized === 'staff') return '/staff/dashboard'
  if (normalized === 'vendor_admin' || normalized === 'vendor' || normalized === 'guide') {
    return '/vendor/dashboard'
  }
  if (normalized === 'customer') return '/dashboard/home'
  return null
}

function decodeJwtPayload(token) {
  try {
    const parts = token?.split('.')
    if (!parts || parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}

function clearStoredAuth() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user_info')
  localStorage.removeItem('user_role')
  localStorage.removeItem('user_name')
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
  const tokenPayload = decodeJwtPayload(token)

  if (!token || !tokenPayload || (tokenPayload.exp && tokenPayload.exp * 1000 <= Date.now())) {
    clearStoredAuth()
    return <Navigate to={redirectTo} replace />
  }

  const role = user?.role || tokenPayload?.role
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase())
  if (normalizedAllowed.length > 0 && (!role || !normalizedAllowed.includes(role.toLowerCase()))) {
    const fallbackHome = getHomePathForRole(role)
    if (!fallbackHome) {
      clearStoredAuth()
      return <Navigate to={redirectTo} replace />
    }
    return <Navigate to={fallbackHome} replace />
  }

  return <Outlet />
}
