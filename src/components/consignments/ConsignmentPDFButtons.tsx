// frontend/src/components/consignments/ConsignmentPDFButtons.tsx
"use client"

import React, { useState } from 'react'
import { Download, Eye, FileText, Receipt, ClipboardList, Package } from 'lucide-react'
import { 
  generateConsignmentReceiptPDF, 
  generatePreSaleInvoicePDF, 
  generateCollectionReceiptPDF,
  previewConsignmentPDF,
  SaleDetails,
  ReturnedItem
} from '@/lib/consignment-pdf-api'

interface ConsignmentPDFButtonsProps {
  consignment: {
    id: string | number
    consignment_number: string
    created_at: string
    specialist_name?: string
  }
  client: {
    id: number
    first_name: string
    last_name: string
    company_name?: string
    email?: string
    phone_number?: string
  }
  items?: any[]
  className?: string
}

interface PDFButtonProps {
  onClick: () => void
  onPreview: () => void
  isLoading: boolean
  icon: React.ReactNode
  title: string
  description: string
  disabled?: boolean
}

const PDFButton: React.FC<PDFButtonProps> = ({ 
  onClick, 
  onPreview, 
  isLoading, 
  icon, 
  title, 
  description, 
  disabled = false 
}) => (
  <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 text-blue-600">
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-gray-900 mb-1">{title}</h4>
        <p className="text-sm text-gray-600 mb-3">{description}</p>
        <div className="flex space-x-2">
          <button
            onClick={onClick}
            disabled={disabled || isLoading}
            className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-1" />
            {isLoading ? 'Generating...' : 'Download'}
          </button>
          <button
            onClick={onPreview}
            disabled={disabled || isLoading}
            className="flex items-center px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </button>
        </div>
      </div>
    </div>
  </div>
)

export default function ConsignmentPDFButtons({
  consignment,
  client,
  items = [],
  className = ''
}: ConsignmentPDFButtonsProps) {
  const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>({})

  const setLoading = (type: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [type]: loading }))
  }

  // Consignment Receipt PDF
  const handleConsignmentReceipt = async () => {
    setLoading('receipt', true)
    try {
      await generateConsignmentReceiptPDF(consignment.id)
    } catch (error) {
      console.error('Error generating consignment receipt:', error)
      alert('Failed to generate consignment receipt PDF')
    } finally {
      setLoading('receipt', false)
    }
  }

  const handleConsignmentReceiptPreview = async () => {
    setLoading('receipt', true)
    try {
      await previewConsignmentPDF('receipt', {
        consignmentId: consignment.id
      })
    } catch (error) {
      console.error('Error previewing consignment receipt:', error)
      alert('Failed to preview consignment receipt PDF')
    } finally {
      setLoading('receipt', false)
    }
  }

  // Pre-Sale Invoice PDF
  const handlePreSaleInvoice = async () => {
    // Mock sale details - in a real app, you'd get this from props or a modal
    const saleDetails: SaleDetails = {
      sale_name: 'Fine Art Auction',
      sale_date: new Date().toISOString(),
      sale_location: 'London',
      viewing_dates: [
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()  // 1 day ago
      ]
    }

    setLoading('presale', true)
    try {
      await generatePreSaleInvoicePDF(consignment.id, saleDetails)
    } catch (error) {
      console.error('Error generating pre-sale invoice:', error)
      alert('Failed to generate pre-sale invoice PDF')
    } finally {
      setLoading('presale', false)
    }
  }

  const handlePreSaleInvoicePreview = async () => {
    const saleDetails: SaleDetails = {
      sale_name: 'Fine Art Auction',
      sale_date: new Date().toISOString(),
      sale_location: 'London',
      viewing_dates: [
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      ]
    }

    setLoading('presale', true)
    try {
      await previewConsignmentPDF('presale', {
        consignmentId: consignment.id,
        saleDetails
      })
    } catch (error) {
      console.error('Error previewing pre-sale invoice:', error)
      alert('Failed to preview pre-sale invoice PDF')
    } finally {
      setLoading('presale', false)
    }
  }

  // Collection Receipt PDF
  const handleCollectionReceipt = async () => {
    if (!items || items.length === 0) {
      alert('No items available for collection receipt')
      return
    }

    // Convert items to returned items format
    const returnedItems: ReturnedItem[] = items.map(item => ({
      id: item.id,
      lot_number: item.lot_number,
      title: item.title,
      description: item.description,
      artist_name: item.artist_name,
      school_name: item.school_name,
      dimensions: item.dimensions,
      condition: item.condition,
      return_reason: 'Unsold',
      return_date: new Date().toISOString(),
      location: 'A Store Shelf L3'
    }))

    setLoading('collection', true)
    try {
      await generateCollectionReceiptPDF(
        consignment.id, 
        returnedItems,
        {
          collectionDate: new Date().toISOString(),
        }
      )
    } catch (error) {
      console.error('Error generating collection receipt:', error)
      alert('Failed to generate collection receipt PDF')
    } finally {
      setLoading('collection', false)
    }
  }

  const handleCollectionReceiptPreview = async () => {
    if (!items || items.length === 0) {
      alert('No items available for collection receipt')
      return
    }

    const returnedItems: ReturnedItem[] = items.map(item => ({
      id: item.id,
      lot_number: item.lot_number,
      title: item.title,
      description: item.description,
      artist_name: item.artist_name,
      school_name: item.school_name,
      dimensions: item.dimensions,
      condition: item.condition,
      return_reason: 'Unsold',
      return_date: new Date().toISOString(),
      location: 'A Store Shelf L3'
    }))

    setLoading('collection', true)
    try {
      await previewConsignmentPDF('collection', {
        consignmentId: consignment.id,
        returnedItems,
        options: {
          collectionDate: new Date().toISOString(),
        }
      })
    } catch (error) {
      console.error('Error previewing collection receipt:', error)
      alert('Failed to preview collection receipt PDF')
    } finally {
      setLoading('collection', false)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate PDF Documents</h3>
      
      <div className="grid gap-4">
        <PDFButton
          onClick={handleConsignmentReceipt}
          onPreview={handleConsignmentReceiptPreview}
          isLoading={loadingStates.receipt || false}
          icon={<Receipt className="h-6 w-6" />}
          title="Consignment Receipt"
          description="Generate receipt for consigned items with client details and commission information"
        />

        <PDFButton
          onClick={handlePreSaleInvoice}
          onPreview={handlePreSaleInvoicePreview}
          isLoading={loadingStates.presale || false}
          icon={<FileText className="h-6 w-6" />}
          title="Pre-Sale Invoice"
          description="Generate pre-sale advice document with auction details and terms"
        />

        <PDFButton
          onClick={handleCollectionReceipt}
          onPreview={handleCollectionReceiptPreview}
          isLoading={loadingStates.collection || false}
          icon={<Package className="h-6 w-6" />}
          title="Collection Receipt"
          description="Generate receipt for items being returned or collected from consignment"
          disabled={!items || items.length === 0}
        />
      </div>

      {(!items || items.length === 0) && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Collection receipt is disabled because no items are associated with this consignment.
          </p>
        </div>
      )}
    </div>
  )
}

// Individual button components for more flexible usage
export const ConsignmentReceiptButton: React.FC<{
  consignmentId: string | number
  className?: string
  children?: React.ReactNode
}> = ({ consignmentId, className = '', children }) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)
    try {
      await generateConsignmentReceiptPDF(consignmentId)
    } catch (error) {
      console.error('Error generating consignment receipt:', error)
      alert('Failed to generate consignment receipt PDF')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Receipt className="h-4 w-4 mr-2" />
      {isLoading ? 'Generating...' : (children || 'Consignment Receipt')}
    </button>
  )
}

export const PreSaleInvoiceButton: React.FC<{
  consignmentId: string | number
  saleDetails: SaleDetails
  className?: string
  children?: React.ReactNode
}> = ({ consignmentId, saleDetails, className = '', children }) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)
    try {
      await generatePreSaleInvoicePDF(consignmentId, saleDetails)
    } catch (error) {
      console.error('Error generating pre-sale invoice:', error)
      alert('Failed to generate pre-sale invoice PDF')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <FileText className="h-4 w-4 mr-2" />
      {isLoading ? 'Generating...' : (children || 'Pre-Sale Invoice')}
    </button>
  )
}

export const CollectionReceiptButton: React.FC<{
  consignmentId: string | number
  returnedItems: ReturnedItem[]
  options?: {
    collectionDate?: string
    collectedBy?: string
    releasedBy?: string
  }
  className?: string
  children?: React.ReactNode
}> = ({ consignmentId, returnedItems, options = {}, className = '', children }) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)
    try {
      await generateCollectionReceiptPDF(consignmentId, returnedItems, options)
    } catch (error) {
      console.error('Error generating collection receipt:', error)
      alert('Failed to generate collection receipt PDF')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || returnedItems.length === 0}
      className={`inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Package className="h-4 w-4 mr-2" />
      {isLoading ? 'Generating...' : (children || 'Collection Receipt')}
    </button>
  )
}
