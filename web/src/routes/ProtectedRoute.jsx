import React, { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export function getHomePathForRole(role) {
  const normalized = (role || '').toLowerCase()
  if (normalized === 'system_admin') return '/admin/dashboard'
  if (normalized === 'staff') return '/staff/dashboard'
  if (normalized === 'vendor_admin' || normalized === 'vendor') {
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
  localStorage.removeItem('user_eco_stats')
}

export default function ProtectedRoute({ allowedRoles = [], redirectTo = '/login' }) {
  const [refreshStatus, setRefreshStatus] = useState('idle') // 'idle' | 'refreshing' | 'failed'
  const token = localStorage.getItem('access_token')
  const refreshToken = localStorage.getItem('refresh_token')
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user_info') || 'null')
    } catch {
      localStorage.removeItem('user_info')
      return null
    }
  })()
  const tokenPayload = decodeJwtPayload(token)
  const refreshPayload = decodeJwtPayload(refreshToken)
  const accessExpired = !token || !tokenPayload || Boolean(tokenPayload.exp && tokenPayload.exp * 1000 <= Date.now())
  const hasValidRefresh = Boolean(
    refreshToken && refreshPayload && (!refreshPayload.exp || refreshPayload.exp * 1000 > Date.now())
  )

  useEffect(() => {
    if (!accessExpired || !hasValidRefresh || refreshStatus !== 'idle') return undefined
    let active = true
    setRefreshStatus('refreshing')
    axios
      .post(`${API_BASE_URL}/accounts/token/refresh/`, { refresh: refreshToken })
      .then((res) => {
        if (!active) return
        const newAccess = res.data?.access
        if (!newAccess) throw new Error('Missing access token')
        localStorage.setItem('access_token', newAccess)
        setRefreshStatus('idle')
      })
      .catch(() => {
        if (!active) return
        clearStoredAuth()
        setRefreshStatus('failed')
      })
    return () => {
      active = false
    }
  }, [accessExpired, hasValidRefresh, refreshToken, refreshStatus])

  if (accessExpired) {
    if (!hasValidRefresh || refreshStatus === 'failed') {
      clearStoredAuth()
      return <Navigate to={redirectTo} replace />
    }
    return (
      <div className="route-loading" role="status">
        Đang xác thực phiên đăng nhập…
      </div>
    )
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
