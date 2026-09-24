import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'

export default function ProtectedRoute({ allowedRoles = [] }) {
  const token = localStorage.getItem('access_token')
  const user = JSON.parse(localStorage.getItem('user_info') || 'null')
  const tokenPayload = (() => {
    try {
      const encoded = token?.split('.')[1]
      return encoded ? JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))) : null
    } catch { return null }
  })()

  if (!token || (tokenPayload?.exp && tokenPayload.exp * 1000 <= Date.now())) {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_info')
    return <Navigate to="/login" replace />
  }

  const role = String(user?.role || tokenPayload?.role || '').trim().toUpperCase()
  if (allowedRoles.length > 0 && (!role || !allowedRoles.map((item) => String(item).toUpperCase()).includes(role))) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet context={{ role, user }} />
}
