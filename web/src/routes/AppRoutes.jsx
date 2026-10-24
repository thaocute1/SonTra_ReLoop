import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage, RegisterPage, ForgotPasswordPage } from '../features/auth'
import { LandingPage } from '../features/trekking'
import { DashboardPage, TrekkingPage, MissionsPage, MarketplacePage, CommunityPage, ProfilePage, UserTripChatPage } from '../features/dashboard'

import AdminLoginPage from '../pages/admin/AdminLoginPage'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import AdminIncidentsPage from '../pages/admin/AdminIncidentsPage'
import FundAllocationPage from '../pages/admin/FundAllocationPage'
import VendorApprovalsPage from '../pages/admin/VendorApprovalsPage'
import AdminPayoutsPage from '../pages/admin/AdminPayoutsPage'
import AdminReportsPage from '../pages/admin/AdminReportsPage'
import AdminContentPage from '../pages/admin/AdminContentPage'
import CampaignListPage from '../pages/admin/CampaignListPage'
import UserManagementPage from '../pages/admin/UserManagementPage'
import StaffDashboardPage from '../pages/staff/StaffDashboardPage'

import PartnerLandingPage from '../pages/partner/PartnerLandingPage'
import VendorOnboardingPage from '../pages/partner/VendorOnboardingPage'
import PartnerLoginPage from '../pages/partner/PartnerLoginPage'
import VendorDashboardPage from '../pages/vendor/VendorDashboardPage'
import VendorBookingsPage from '../pages/vendor/VendorBookingsPage'
import VendorExperiencesPage from '../pages/vendor/VendorExperiencesPage'
import VendorInboxPage from '../pages/vendor/VendorInboxPage'

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

      {/* Partner / Vendor Domain Routes */}
      <Route path="/partner" element={<PartnerLandingPage />} />
      <Route path="/partner/onboarding" element={<VendorOnboardingPage />} />
      <Route path="/partner/login" element={<PartnerLoginPage />} />
      <Route path="/vendor/login" element={<Navigate to="/partner/login" replace />} />
      <Route path="/vendor/dashboard" element={<VendorDashboardPage />} />
      <Route path="/partner/dashboard" element={<VendorDashboardPage />} />
      <Route path="/vendor/bookings" element={<VendorBookingsPage />} />
      <Route path="/partner/bookings" element={<VendorBookingsPage />} />
      <Route path="/vendor/experiences" element={<VendorExperiencesPage />} />
      <Route path="/partner/experiences" element={<VendorExperiencesPage />} />
      <Route path="/vendor/inbox" element={<VendorInboxPage />} />
      <Route path="/partner/inbox" element={<VendorInboxPage />} />
      <Route path="/vendor/routes" element={<Navigate to="/vendor/experiences?view=routes" replace />} />
      <Route path="/partner/routes" element={<Navigate to="/partner/experiences?view=routes" replace />} />
      <Route path="/partner/register" element={<Navigate to="/partner/onboarding" replace />} />
      <Route path="/vendor/register" element={<Navigate to="/partner/onboarding" replace />} />
      <Route path="/vendor" element={<Navigate to="/vendor/dashboard" replace />} />

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
          <Route path="/dashboard/inbox" element={<UserTripChatPage />} />
          <Route path="/dashboard" element={<Navigate to="/dashboard/home" replace />} />
        </Route>
        
        {/* Admin Pages Wrapped inside AdminLayout (100% SRS AD-01 to AD-08) */}
        <Route element={<AdminLayout />}>
          {/* 1. TỔNG QUAN & BẢO TỒN */}
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/incidents" element={<AdminIncidentsPage />} />
          <Route path="/admin/fund-allocation" element={<FundAllocationPage />} />
          
          {/* 2. ĐỐI TÁC & DOANH THU */}
          <Route path="/admin/vendors" element={<VendorApprovalsPage />} />
          <Route path="/admin/approvals" element={<Navigate to="/admin/vendors" replace />} />
          <Route path="/admin/payouts" element={<AdminPayoutsPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />

          {/* 3. NỘI DUNG & TÀI KHOẢN */}
          <Route path="/admin/content" element={<AdminContentPage />} />
          <Route path="/admin/campaigns" element={<CampaignListPage />} />
          <Route path="/admin/users" element={<UserManagementPage />} />

          {/* Fallbacks for legacy routes */}
          <Route path="/admin/tours" element={<Navigate to="/admin/reports" replace />} />
          <Route path="/admin/bookings" element={<Navigate to="/admin/reports" replace />} />
          <Route path="/admin/orders" element={<Navigate to="/admin/payouts" replace />} />
          <Route path="/admin/cms" element={<Navigate to="/admin/content" replace />} />
          <Route path="/admin/settings" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>

        {/* Staff Dashboard */}
        <Route path="/staff/dashboard" element={<StaffDashboardPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
