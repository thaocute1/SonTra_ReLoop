import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import ErrorBoundary from './components/common/ErrorBoundary'
import AppRoutes from './routes/AppRoutes'

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppRoutes />
      </Router>
    </ErrorBoundary>
  )
}
