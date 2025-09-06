// frontend/src/components/consignments/PDFGenerator.tsx
"use client"

import React from 'react'
import ConsignmentReceiptPDF from './ConsignmentReceiptPDF'
import CollectionReceiptPDF from './CollectionReceiptPDF'
import PreSaleInvoicePDF from './PreSaleInvoicePDF'
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
  type: 'consignment' | 'collection' | 'presale'
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

// Utility function to filter items based on PDF type
const filterItemsByType = (items: ItemData[], type: 'consignment' | 'collection' | 'presale'): ItemData[] => {
  switch (type) {
    case 'consignment':
      // All items in the consignment
      return items
    case 'collection':
      // Only returned items
      return items
      // return items.filter(item => item.status === 'returned')
    case 'presale':
      // Items going to auction (not sold, not returned, not withdrawn)
      return items.filter(item => !['sold', 'returned', 'withdrawn'].includes(item.status))
    default:
      return items
  }
}

// Transform items for different PDF types
const transformItemsForConsignmentReceipt = (items: ItemData[]) => {
  return items.map(item => ({
    id: item.id,
    lot_number: item.lot_number,
    title: item.title,
    description: item.description,
    artist_name: item.artist_name,
    school_name: item.school_name,
    dimensions: item.dimensions,
    condition: item.condition,
    low_est: item.low_est,
    high_est: item.high_est,
    reserve: item.reserve,
    vendor_commission: item.vendor_commission,
    goods_received: true
  }))
}

const transformItemsForCollectionReceipt = (items: ItemData[]) => {
  return items.map(item => ({
    id: item.id,
    lot_number: item.lot_number,
    title: item.title,
    description: item.description,
    artist_name: item.artist_name,
    school_name: item.school_name,
    dimensions: item.dimensions,
    condition: item.condition,
    return_reason: item.return_reason,
    return_date: item.return_date || new Date().toISOString(),
    location: item.location || 'A Store Shelf L3'
  }))
}

const transformItemsForPreSaleInvoice = (items: ItemData[]) => {
  return items.map(item => ({
    id: item.id,
    lot_number: item.lot_number || '',
    title: item.title,
    description: item.description,
    artist_name: item.artist_name,
    school_name: item.school_name,
    dimensions: item.dimensions,
    condition: item.condition,
    low_est: item.low_est,
    high_est: item.high_est,
    reserve: item.reserve,
    vendor_commission: item.vendor_commission,
    auction_date: '',
    sale_name: ''
  }))
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
  // Filter items based on PDF type
  const filteredItems = filterItemsByType(items, type)
  
  // If no items for this type, return disabled children
  if (filteredItems.length === 0 && type !== 'consignment') {
    return <span style={{ opacity: 0.5, cursor: 'not-allowed' }}>{children}</span>
  }

  // Default sale details if not provided
  const defaultSaleDetails = saleDetails || {
    sale_name: 'Upcoming Auction',
    sale_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    sale_location: getBrandDetails(brand_code).address || 'TBD',
    viewing_dates: ['Two days prior to sale', 'Morning of sale']
  }

  // Generate appropriate filename if not provided
  const defaultFileName = fileName || `${type}-${consignment.consignment_number}-${new Date().toISOString().split('T')[0]}.pdf`

  switch (type) {
    case 'consignment':
      return (
        <ConsignmentReceiptPDF
          consignment={consignment}
          client={client}
          items={transformItemsForConsignmentReceipt(filteredItems)}
          brand_code={brand_code}
          fileName={defaultFileName}
        >
          {children}
        </ConsignmentReceiptPDF>
      )
    
    case 'collection':
      return (
        <CollectionReceiptPDF
          consignment={consignment}
          client={client}
          returnedItems={transformItemsForCollectionReceipt(filteredItems)}
          brand_code={brand_code}
          fileName={defaultFileName}
          collectionDate={new Date().toLocaleDateString('en-GB')}
        >
          {children}
        </CollectionReceiptPDF>
      )
    
    case 'presale':
      const transformedItems = transformItemsForPreSaleInvoice(filteredItems)
      console.log('PreSale PDF data:', {
        consignment,
        client,
        auctionItems: transformedItems,
        saleDetails: defaultSaleDetails
      })
      return (
        <PreSaleInvoicePDF
          consignment={consignment}
          client={client}
          auctionItems={transformedItems}
          saleDetails={defaultSaleDetails}
          brand_code={brand_code}
          fileName={defaultFileName}
        >
          {children}
        </PreSaleInvoicePDF>
      )
    
    default:
      return <span>{children}</span>
  }
}

export default PDFGenerator

// Export types for use in other components
export type {
  ConsignmentData,
  ClientData,
  ItemData,
  PDFGeneratorProps
}
