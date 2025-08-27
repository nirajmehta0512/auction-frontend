"use client"

import React from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Header from './Header'
import AuthGuard from './AuthGuard'
import FloatingChat from './FloatingChat'

interface LayoutWrapperProps {
  children: React.ReactNode
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname()

  // Check if current path is an auth route
  const isAuthRoute = pathname?.startsWith('/auth')

  // Check if current path is a public invoice route
  const isPublicInvoiceRoute = pathname?.startsWith('/invoice/') && pathname?.split('/').length === 3

  // If it's an auth route or public invoice route, render without sidebar/header and without auth guard
  if (isAuthRoute || isPublicInvoiceRoute) {
    return <>{children}</>
  }

  // For all other routes, use AuthGuard and render with sidebar/header
  return (
    <AuthGuard>
      <div className="layout-wrapper">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 bg-gray-50 overflow-auto">
            {children}
          </main>
        </div>
        {/* Floating Chat Widget - Available on all authenticated pages */}
        <FloatingChat />
      </div>
    </AuthGuard>
  )
} 