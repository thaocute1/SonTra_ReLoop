import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage, RegisterPage, ForgotPasswordPage } from '../features/auth'
import { LandingPage } from '../features/trekking'
import { DashboardPage } from '../features/dashboard'
import MainLayout from '../layouts/MainLayout'
import ProtectedRoute from './ProtectedRoute'

export default function AppRoutes() { return <Routes>
  <Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} />
  <Route element={<MainLayout />}><Route path="/" element={<LandingPage />} /></Route>
  <Route element={<ProtectedRoute />}><Route path="/dashboard" element={<DashboardPage />} /></Route>
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes> }
