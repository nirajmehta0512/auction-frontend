// frontend/src/app/invoices/sample/page.tsx
'use client'

import React from 'react'
import { FileText } from 'lucide-react'
import { SampleInvoice } from '@/components/invoices/InvoiceTemplate'

export default function SampleInvoicePage() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <FileText className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sample Invoice with Brand Logo</h1>
            <p className="text-gray-600">Demonstrates brand logo integration in invoices</p>
          </div>
        </div>
      </div>

      {/* Sample Invoice */}
      <SampleInvoice />
    </div>
  )
}
