// frontend/src/components/invoices/InvoiceTemplate.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Printer, Download, Mail } from 'lucide-react'

interface InvoiceData {
  id: string
  invoice_number: string
  client_name: string
  client_address: string
  invoice_date: string
  due_date: string
  items: Array<{
    description: string
    quantity: number
    price: number
    total: number
  }>
  subtotal: number
  tax_amount: number
  total_amount: number
  brand_id?: number
}

interface Brand {
  id: number
  code: string
  name: string
  logo_url?: string
}

interface InvoiceTemplateProps {
  invoiceData: InvoiceData
  onPrint?: () => void
  onDownload?: () => void
  onEmail?: () => void
  className?: string
}

export default function InvoiceTemplate({
  invoiceData,
  onPrint,
  onDownload,
  onEmail,
  className = ''
}: InvoiceTemplateProps) {
  const [brand, setBrand] = useState<Brand | null>(null)
  const [logoLoading, setLogoLoading] = useState(false)

  useEffect(() => {
    if (invoiceData.brand_id) {
      loadBrandData(invoiceData.brand_id)
    }
  }, [invoiceData.brand_id])

  const loadBrandData = async (brandId: number) => {
    try {
      setLogoLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/brand-logos/${brandId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        setBrand(data.data)
      }
    } catch (err) {
      console.warn('Failed to load brand data:', err)
    } finally {
      setLogoLoading(false)
    }
  }

  return (
    <div className={`bg-white ${className}`}>
      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 mb-6 print:hidden">
        {onPrint && (
          <button
            onClick={onPrint}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </button>
        )}
        {onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </button>
        )}
        {onEmail && (
          <button
            onClick={onEmail}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email
          </button>
        )}
      </div>

      {/* Invoice Content */}
      <div className="p-8 border border-gray-200 rounded-lg">
        {/* Header with Brand Logo */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center space-x-6">
            {/* Brand Logo */}
            {brand?.logo_url && (
              <div className="flex-shrink-0">
                <img
                  src={brand.logo_url}
                  alt={`${brand.name} logo`}
                  className="h-16 w-auto object-contain"
                  onError={(e) => {
                    // Hide logo if it fails to load
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              </div>
            )}
            
            {/* Company Info */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {brand?.name || 'MSaber Auctions'}
              </h1>
              <div className="text-sm text-gray-600 mt-2">
                <p>123 Auction Street</p>
                <p>London, UK SW1A 1AA</p>
                <p>Phone: +44 20 1234 5678</p>
                <p>Email: info@msaber.com</p>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">INVOICE</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Invoice #:</span>
                <span className="ml-2">{invoiceData.invoice_number}</span>
              </div>
              <div>
                <span className="font-semibold">Date:</span>
                <span className="ml-2">{new Date(invoiceData.invoice_date).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="font-semibold">Due Date:</span>
                <span className="ml-2">{new Date(invoiceData.due_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Bill To:</h3>
          <div className="text-sm text-gray-700">
            <p className="font-semibold">{invoiceData.client_name}</p>
            <div className="whitespace-pre-line">{invoiceData.client_address}</div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Description
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">
                  Qty
                </th>
                <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">
                  Price
                </th>
                <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.items.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                    {item.description}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                    £{item.price.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                    £{item.total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>£{invoiceData.subtotal.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (VAT):</span>
                <span>£{invoiceData.tax_amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-t border-gray-300 pt-2 font-bold text-lg">
                <span>Total:</span>
                <span>£{invoiceData.total_amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Payment Terms:</strong> Payment is due within 30 days of invoice date.</p>
            <p><strong>Payment Methods:</strong> Bank transfer, Credit card, or Cheque.</p>
            <p className="text-xs">
              This invoice was generated electronically and is valid without signature.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Sample usage component
export function SampleInvoice() {
  const sampleInvoiceData: InvoiceData = {
    id: '1',
    invoice_number: 'INV-2024-001',
    client_name: 'John Smith',
    client_address: '456 Art Lane\nLondon, UK\nW1A 0AX',
    invoice_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        description: 'Contemporary Painting - "Abstract Vision" by Jane Doe',
        quantity: 1,
        price: 5000,
        total: 5000
      },
      {
        description: 'Buyer\'s Premium (25%)',
        quantity: 1,
        price: 1250,
        total: 1250
      },
      {
        description: 'Shipping & Handling',
        quantity: 1,
        price: 150,
        total: 150
      }
    ],
    subtotal: 6400,
    tax_amount: 1280,
    total_amount: 7680,
    brand_id: 1 // This will load the brand logo
  }

  return (
    <InvoiceTemplate
      invoiceData={sampleInvoiceData}
      onPrint={() => window.print()}
      onDownload={() => console.log('Download PDF')}
      onEmail={() => console.log('Email invoice')}
    />
  )
}
