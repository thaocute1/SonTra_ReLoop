import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage, RegisterPage, ForgotPasswordPage } from '../features/auth'
import { LandingPage } from '../features/trekking'
import { DashboardPage, TrekkingPage, MissionsPage, MarketplacePage, CommunityPage, ProfilePage } from '../features/dashboard'

import AdminLoginPage from '../pages/admin/AdminLoginPage'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import CampaignListPage from '../pages/admin/CampaignListPage'
import FundAllocationPage from '../pages/admin/FundAllocationPage'
import UserManagementPage from '../pages/admin/UserManagementPage'
import StaffDashboardPage from '../pages/staff/StaffDashboardPage'

import MainLayout from '../layouts/MainLayout'
import AdminLayout from '../layouts/AdminLayout'
import UserDashboardLayout from '../layouts/UserDashboardLayout'
import ProtectedRoute from './ProtectedRoute'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Single BQL Portal Login Entry Point (Both Admin & BQL Staff Login Here) */}
      <Route path="/bql-portal/login" element={<AdminLoginPage />} />
      <Route path="/bql-portal" element={<Navigate to="/bql-portal/login" replace />} />
      <Route path="/admin/login" element={<Navigate to="/bql-portal/login" replace />} />
      <Route path="/admin" element={<Navigate to="/bql-portal/login" replace />} />
      <Route path="/staff/login" element={<Navigate to="/bql-portal/login" replace />} />
      <Route path="/staff" element={<Navigate to="/bql-portal/login" replace />} />

      {/* Public Pages Wrapper */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>

      {/* Protected Domain Dashboards */}
      <Route element={<ProtectedRoute />}>
        <Route element={<UserDashboardLayout />}>
          <Route path="/dashboard/home" element={<DashboardPage />} />
          <Route path="/dashboard/trekking" element={<TrekkingPage />} />
          <Route path="/dashboard/tasks" element={<MissionsPage />} />
          <Route path="/dashboard/missions" element={<Navigate to="/dashboard/tasks" replace />} />
          <Route path="/dashboard/marketplace" element={<MarketplacePage />} />
          <Route path="/dashboard/community" element={<CommunityPage />} />
          <Route path="/dashboard/profile" element={<ProfilePage />} />
          <Route path="/dashboard" element={<Navigate to="/dashboard/home" replace />} />
        </Route>
        
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
