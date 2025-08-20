// frontend/src/app/logistics/new/page.tsx
"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import LogisticsForm from '@/components/logistics/LogisticsForm'
import type { LogisticsEntry } from '@/lib/logistics-api'

export default function NewLogisticsPage() {
  const router = useRouter()

  const handleSave = (logistics: LogisticsEntry) => {
    // Redirect back to logistics list with success message
    router.push('/logistics?created=true')
  }

  const handleCancel = () => {
    router.push('/logistics')
  }

  return (
    <LogisticsForm 
      onSave={handleSave}
      onCancel={handleCancel}
    />
  )
} 