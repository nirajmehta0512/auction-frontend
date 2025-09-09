// frontend/src/components/consignments/PDFGenerator.tsx
"use client"

import React, { useState } from 'react'
import { getBrandDetails, BrandCode } from '@/lib/brand-context'

interface ConsignmentData {
  id: string
  consignment_number: string
  receipt_no?: string
  created_at: string
  signing_date?: string
  specialist_name?: string
  items_count?: number
  total_estimated_value?: number
  client_id: number
}

interface ClientData {
  id: number
  first_name: string
  last_name: string
  company_name?: string
  email?: string
  phone_number?: string
  billing_address1?: string
  billing_address2?: string
  billing_address3?: string
  billing_city?: string
  billing_post_code?: string
  billing_region?: string
  billing_country?: string
}

interface ItemData {
  id: string
  lot_number?: string
  title: string
  description: string
  artist_name?: string
  school_name?: string
  dimensions?: string
  condition?: string
  low_est?: number
  high_est?: number
  reserve?: number
  status: 'draft' | 'active' | 'sold' | 'withdrawn' | 'passed' | 'returned'
  sale_price?: number
  vendor_commission?: number
  return_reason?: string
  return_date?: string
  location?: string
}

interface PDFGeneratorProps {
  type: 'consignment' | 'collection' | 'presale' | 'public'
  consignment: ConsignmentData
  client: ClientData
  items: ItemData[]
  saleDetails?: {
    sale_name: string
    sale_date: string
    sale_location: string
    viewing_dates?: string[]
  }
  brand_code?: BrandCode
  children: React.ReactNode
  fileName?: string
}


const PDFGenerator: React.FC<PDFGeneratorProps> = ({
  type,
  consignment,
  client,
  items,
  saleDetails,
  brand_code = 'MSABER',
  children,
  fileName
}) => {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()

    if (isGenerating) return

    setIsGenerating(true)

    try {
      // Import the API functions dynamically
      const {
        generateConsignmentReceiptPDF,
        generatePreSaleInvoicePDF,
        generateCollectionReceiptPDF
      } = await import('@/lib/consignment-pdf-api')

      switch (type) {
        case 'consignment':
          await generateConsignmentReceiptPDF(
            consignment.id
          )
          break

        case 'presale':
          const defaultSaleDetails = saleDetails || {
            sale_name: 'Upcoming Auction',
            sale_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            sale_location: getBrandDetails(brand_code).address || 'TBD',
            viewing_dates: ['Two days prior to sale', 'Morning of sale']
          }

          await generatePreSaleInvoicePDF(
            consignment.id,
            defaultSaleDetails
          )
          break

        case 'collection':
          // Transform items for collection receipt
          const returnedItems = items.map(item => ({
            id: item.id,
            lot_number: item.lot_number,
            title: item.title,
            description: item.description,
            artist_name: item.artist_name,
            school_name: item.school_name,
            dimensions: item.dimensions,
            condition: item.condition,
            return_reason: item.return_reason || 'Collection',
            return_date: item.return_date || new Date().toISOString(),
            location: item.location || 'A Store Shelf L3'
          }))

          await generateCollectionReceiptPDF(
            consignment.id,
            returnedItems,
            {
              collectionDate: new Date().toLocaleDateString('en-GB')
            }
          )
          break

        case 'public':
          // For public view, redirect to the public page instead of downloading
          window.open(`/public/consignment/${consignment.id}`, '_blank')
          break

        default:
          console.warn('Unknown PDF type:', type)
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Wrap the children in a clickable element
  return (
    <div onClick={handleClick} style={{ cursor: isGenerating ? 'wait' : 'pointer' }}>
      {isGenerating ? (
        <div style={{ opacity: 0.7 }}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  )
}

export default PDFGenerator

// Export types for use in other components
export type {
  ConsignmentData,
  ClientData,
  ItemData,
  PDFGeneratorProps
}
