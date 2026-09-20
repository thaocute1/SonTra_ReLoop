import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage, RegisterPage } from '../features/auth'
import MainLayout from '../layouts/MainLayout'
import ProtectedRoute from './ProtectedRoute'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Auth Domain Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<LoginPage />} />

      {/* Public Pages Wrapper */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Route>

      {/* Protected Domain Routes (Trekker, Guide, Vendor, Admin) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<div className="p-10 text-xl font-bold">Welcome to Sơn Trà REloop Dashboard</div>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
