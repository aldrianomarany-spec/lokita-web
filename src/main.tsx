import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import AuthFlow from './auth/AuthFlow'
import CompleteProfile from './auth/CompleteProfile'
import ResetPassword from './auth/ResetPassword'
import RequireSession from './auth/RequireSession'
import Marketplace from './marketplace/Marketplace'
import { Terms, Privacy } from './pages/Legal'
import { MASCOT_URL, BRAND_LOGO_URL } from './brand'

// browser-tab icon: use our mascot (fallback: the logo) instead of the default
const faviconUrl = MASCOT_URL || BRAND_LOGO_URL
if (faviconUrl) {
  const link = (document.querySelector("link[rel~='icon']") as HTMLLinkElement) || document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/png'
  link.href = faviconUrl
  document.head.appendChild(link)
}

const router = createBrowserRouter([
  { path: '/', element: <AuthFlow /> },
  { path: '/onboarding', element: <CompleteProfile /> },
  { path: '/reset-password', element: <ResetPassword /> },
  { path: '/terms', element: <Terms /> },
  { path: '/privacy', element: <Privacy /> },
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
    {/* privacy-friendly page analytics (only active on Vercel with Analytics enabled) */}
    <Analytics />
  </React.StrictMode>,
)
