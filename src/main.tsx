import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import AuthFlow from './auth/AuthFlow'
import CompleteProfile from './auth/CompleteProfile'
import ResetPassword from './auth/ResetPassword'
import RequireSession from './auth/RequireSession'
import Marketplace from './marketplace/Marketplace'

const router = createBrowserRouter([
  { path: '/', element: <AuthFlow /> },
  { path: '/onboarding', element: <CompleteProfile /> },
  { path: '/reset-password', element: <ResetPassword /> },
  {
    path: '/app',
    element: (
      <RequireSession>
        <Marketplace />
      </RequireSession>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
