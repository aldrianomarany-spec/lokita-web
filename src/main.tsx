import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import AuthFlow from './auth/AuthFlow'
import Marketplace from './marketplace/Marketplace'

const router = createBrowserRouter([
  { path: '/', element: <AuthFlow /> },
  { path: '/app', element: <Marketplace /> },
  { path: '*', element: <Navigate to="/" replace /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
