import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'))
const RegisterPage = lazy(() => import('../features/auth/pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('../features/auth/pages/ForgotPasswordPage'))
const LandingPage = lazy(() => import('../features/trekking/pages/LandingPage').then(module => ({ default: module.LandingPage })))
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardFigmaPage'))
const TrekkingPage = lazy(() => import('../features/dashboard/pages/TrekkingFigmaPage'))
const FlashSalePage = lazy(() => import('../features/dashboard/pages/FlashSaleFigmaPage'))
const MissionsPage = lazy(() => import('../features/dashboard/pages/MissionsFigmaPage'))
const MarketplacePage = lazy(() => import('../features/dashboard/pages/MarketplaceFigmaPage'))
const CommunityPage = lazy(() => import('../features/dashboard/pages/CommunityFigmaPage'))
const ProfilePage = lazy(() => import('../features/dashboard/pages/ProfileFigmaPage'))
const UserTripChatPage = lazy(() => import('../features/dashboard/pages/UserTripChatPage'))
const ReLoopAssistantPage = lazy(() => import('../features/dashboard/pages/ReLoopAssistantPage'))

const AdminLoginPage = lazy(() => import('../pages/admin/AdminLoginPage'))
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'))
const AdminIncidentsPage = lazy(() => import('../pages/admin/AdminIncidentsPage'))
const FundAllocationPage = lazy(() => import('../pages/admin/FundAllocationPage'))
const VendorApprovalsPage = lazy(() => import('../pages/admin/VendorApprovalsPage'))
const AdminPayoutsPage = lazy(() => import('../pages/admin/BusinessPayoutsPage'))
const AdminReportsPage = lazy(() => import('../pages/admin/BusinessReportsPage'))
const AdminContentPage = lazy(() => import('../pages/admin/AdminContentPage'))
const CampaignListPage = lazy(() => import('../pages/admin/CampaignListPage'))
const UserManagementPage = lazy(() => import('../pages/admin/UserManagementPage'))
const MissionReviewPage = lazy(() => import('../pages/admin/MissionReviewPage'))
const StaffDashboardPage = lazy(() => import('../pages/staff/StaffDashboardPage'))

const PartnerLandingPage = lazy(() => import('../pages/partner/PartnerLandingPage'))
const VendorOnboardingPage = lazy(() => import('../pages/partner/VendorOnboardingPage'))
const PartnerLoginPage = lazy(() => import('../pages/partner/PartnerLoginPage'))
const VendorDashboardPage = lazy(() => import('../pages/vendor/VendorDashboardPage'))
const VendorBookingsPage = lazy(() => import('../pages/vendor/VendorBookingsPage'))
const VendorExperiencesPage = lazy(() => import('../pages/vendor/VendorExperiencesPage'))
const VendorInboxPage = lazy(() => import('../pages/vendor/VendorInboxPage'))
const VendorAssistantPage = lazy(() => import('../pages/vendor/VendorAssistantPage'))

import MainLayout from '../layouts/MainLayout'
import AdminLayout from '../layouts/AdminLayout'
import UserDashboardLayout from '../layouts/UserDashboardLayout'
import ProtectedRoute from './ProtectedRoute'

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="route-loading" role="status">Đang tải trang…</div>}>
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
      <Route path="/vendor/assistant" element={<VendorAssistantPage />} />
      <Route path="/partner/assistant" element={<VendorAssistantPage />} />
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
          <Route path="/dashboard/trekking/:tourId" element={<TrekkingPage />} />
          <Route path="/dashboard/flash-sale" element={<FlashSalePage />} />
          <Route path="/dashboard/tasks" element={<MissionsPage />} />
          <Route path="/dashboard/missions" element={<Navigate to="/dashboard/tasks" replace />} />
          <Route path="/dashboard/marketplace" element={<MarketplacePage />} />
          <Route path="/dashboard/community" element={<CommunityPage />} />
          <Route path="/dashboard/profile" element={<ProfilePage />} />
          <Route path="/dashboard/inbox" element={<UserTripChatPage />} />
          <Route path="/dashboard/assistant" element={<ReLoopAssistantPage />} />
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
          <Route path="/admin/missions/review" element={<MissionReviewPage />} />
          <Route path="/admin/assistant" element={<ReLoopAssistantPage />} />

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
    </Suspense>
  )
}
