import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage, RegisterPage } from '../features/auth'
import AdminLoginPage from '../pages/admin/AdminLoginPage'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import CampaignListPage from '../pages/admin/CampaignListPage'
import FundAllocationPage from '../pages/admin/FundAllocationPage'
import UserManagementPage from '../pages/admin/UserManagementPage'
import StaffDashboardPage from '../pages/staff/StaffDashboardPage'
import MainLayout from '../layouts/MainLayout'
import AdminLayout from '../layouts/AdminLayout'
import ProtectedRoute from './ProtectedRoute'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Auth Domain Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<LoginPage />} />

      {/* Single BQL Portal Login Entry Point (Both Admin & Staff Login Here) */}
      <Route path="/bql-portal/login" element={<AdminLoginPage />} />
      <Route path="/bql-portal" element={<Navigate to="/bql-portal/login" replace />} />
      <Route path="/admin/login" element={<Navigate to="/bql-portal/login" replace />} />
      <Route path="/admin" element={<Navigate to="/bql-portal/login" replace />} />
      <Route path="/staff/login" element={<Navigate to="/bql-portal/login" replace />} />
      <Route path="/staff" element={<Navigate to="/bql-portal/login" replace />} />

      {/* Public Pages Wrapper */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Route>

      {/* Protected Domain Dashboards */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<div className="p-10 text-xl font-bold">Welcome to Sơn Trà REloop Dashboard</div>} />
        
        {/* Admin Pages Wrapped inside AdminLayout (Matching Figma Design) */}
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/campaigns" element={<CampaignListPage />} />
          <Route path="/admin/fund-allocation" element={<FundAllocationPage />} />
          <Route path="/admin/users" element={<UserManagementPage />} />
          <Route path="/admin/vendors" element={<AdminDashboardPage />} />
          <Route path="/admin/approvals" element={<AdminDashboardPage />} />
          <Route path="/admin/tours" element={<AdminDashboardPage />} />
          <Route path="/admin/bookings" element={<AdminDashboardPage />} />
          <Route path="/admin/orders" element={<AdminDashboardPage />} />
          <Route path="/admin/cms" element={<AdminDashboardPage />} />
          <Route path="/admin/settings" element={<AdminDashboardPage />} />
        </Route>

        {/* Staff Dashboard */}
        <Route path="/staff/dashboard" element={<StaffDashboardPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}




