// frontend/src/components/consignments/CollectionReceiptPDF.tsx
"use client"

import React from 'react'
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer'
import { getBrandDetails, BrandCode } from '@/lib/brand-context'

// Register fonts for better typography
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 700 },
  ]
})

interface ReturnedItem {
  id: string
  lot_number?: string
  title: string
  description: string
  artist_name?: string
  school_name?: string
  dimensions?: string
  condition?: string
  return_reason?: string
  return_date: string
  location?: string
}

interface CollectionReceiptProps {
  consignment: {
    id: string
    consignment_number: string
    receipt_no?: string
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
    billing_address1?: string
    billing_address2?: string
    billing_address3?: string
    billing_city?: string
    billing_post_code?: string
    billing_region?: string
    billing_country?: string
  }
  returnedItems: ReturnedItem[]
  brand_code?: BrandCode
  collectionDate?: string
  collectedBy?: string
  releasedBy?: string
}

// Define comprehensive styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 30,
    paddingLeft: 30,
    paddingRight: 30,
    paddingBottom: 30,
    color: '#333333',
    lineHeight: 1.4,
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    marginBottom: 25,
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  companyTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 2,
  },
  establishment: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  contactInfo: {
    fontSize: 9,
    color: '#666666',
    lineHeight: 1.3,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  receiptDate: {
    fontSize: 11,
    color: '#666666',
  },
  
  // Client section
  clientSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  clientName: {
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 2,
  },
  clientAddress: {
    fontSize: 10,
    color: '#555555',
    lineHeight: 1.3,
  },
  clientDetails: {
    marginTop: 8,
    flexDirection: 'row',
  },
  clientDetailItem: {
    marginRight: 20,
    fontSize: 9,
    color: '#666666',
  },
  
  // Reference section
  referenceSection: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  referenceRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  referenceLabel: {
    fontSize: 9,
    fontWeight: 600,
    width: 120,
    color: '#555555',
  },
  referenceValue: {
    fontSize: 9,
    color: '#333333',
    flex: 1,
  },
  
  // Items table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
    minHeight: 40,
  },
  colUniqueId: { width: '12%' },
  colSaleNo: { width: '12%' },
  colLotNo: { width: '12%' },
  colDescription: { width: '44%' },
  colLocation: { width: '20%' },
  
  headerText: {
    fontSize: 8,
    fontWeight: 600,
    color: '#444444',
    textAlign: 'center',
  },
  cellText: {
    fontSize: 8,
    color: '#333333',
    textAlign: 'left',
    lineHeight: 1.3,
  },
  cellTextCenter: {
    fontSize: 8,
    color: '#333333',
    textAlign: 'center',
  },
  
  // Description styling
  itemTitle: {
    fontSize: 8,
    fontWeight: 600,
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 7,
    color: '#555555',
    lineHeight: 1.2,
  },
  returnReason: {
    fontSize: 7,
    color: '#d32f2f',
    fontStyle: 'italic',
    marginTop: 2,
  },
  
  // Summary section
  summarySection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#cccccc',
  },
  summaryText: {
    fontSize: 10,
    fontWeight: 600,
    textAlign: 'center',
  },
  
  // Signature section
  signatureSection: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#cccccc',
    padding: 8,
  },
  signatureLabel: {
    fontSize: 9,
    fontWeight: 600,
    marginBottom: 30,
  },
  signatureName: {
    fontSize: 8,
    color: '#666666',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    marginBottom: 5,
    minHeight: 20,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 8,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 1.3,
  },
  disclaimer: {
    fontSize: 8,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
})

// Main PDF Document Component
const CollectionReceiptDocument: React.FC<CollectionReceiptProps> = ({
  consignment,
  client,
  returnedItems,
  brand_code = 'MSABER',
  collectionDate,
  collectedBy,
  releasedBy
}) => {
  const brandDetails = getBrandDetails(brand_code)
  
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    })
  }
  
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyTitle}>{brandDetails.name}</Text>
            <View style={styles.contactInfo}>
              <Text>{brandDetails.address}</Text>
              <Text>{brandDetails.city} {brandDetails.postcode}</Text>
              <Text>{brandDetails.country}</Text>
              <Text>VAT Reg. No. {brandDetails.vatNumber}</Text>
            </View>
          </View>
          
          <View style={styles.headerRight}>
            <Text style={styles.receiptTitle}>Collection Receipt CL{consignment.consignment_number}</Text>
            <Text style={styles.receiptDate}>Date: {collectionDate || today}</Text>
          </View>
        </View>

        {/* Client Information */}
        <View style={styles.clientSection}>
          <Text style={styles.clientName}>
            {client.first_name} {client.last_name}
          </Text>
          {client.company_name && (
            <Text style={[styles.clientName, { fontSize: 10, fontWeight: 400 }]}>
              {client.company_name}
            </Text>
          )}
          <View style={styles.clientAddress}>
            {client.billing_address1 && <Text>{client.billing_address1}</Text>}
            {client.billing_address2 && <Text>{client.billing_address2}</Text>}
            {client.billing_address3 && <Text>{client.billing_address3}</Text>}
            {client.billing_city && <Text>{client.billing_city} {client.billing_post_code}</Text>}
            {client.billing_country && <Text>{client.billing_country}</Text>}
          </View>
          
          <View style={styles.clientDetails}>
            {client.phone_number && (
              <Text style={styles.clientDetailItem}>Phone No.: {client.phone_number}</Text>
            )}
            {client.email && (
              <Text style={styles.clientDetailItem}>Email: {client.email}</Text>
            )}
          </View>
        </View>

        {/* Reference Information */}
        <View style={styles.referenceSection}>
          <View style={styles.referenceRow}>
            <Text style={styles.referenceLabel}>Client Id</Text>
            <Text style={styles.referenceValue}>{client.id.toString().padStart(6, '0')}</Text>
          </View>
          <View style={styles.referenceRow}>
            <Text style={styles.referenceLabel}>Receipt</Text>
            <Text style={styles.referenceValue}>{consignment.receipt_no || consignment.consignment_number}</Text>
          </View>
          <View style={styles.referenceRow}>
            <Text style={styles.referenceLabel}>Collection Date</Text>
            <Text style={styles.referenceValue}>{collectionDate || today}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.tableHeader}>
          <View style={styles.colUniqueId}>
            <Text style={styles.headerText}>Unique ID</Text>
          </View>
          <View style={styles.colSaleNo}>
            <Text style={styles.headerText}>Sale No./Sale Date</Text>
          </View>
          <View style={styles.colLotNo}>
            <Text style={styles.headerText}>Lot No.</Text>
          </View>
          <View style={styles.colDescription}>
            <Text style={styles.headerText}>Description</Text>
          </View>
          <View style={styles.colLocation}>
            <Text style={styles.headerText}>Location</Text>
          </View>
        </View>

        {returnedItems.map((item, index) => (
          <View key={item.id} style={styles.tableRow}>
            <View style={styles.colUniqueId}>
              <Text style={styles.cellTextCenter}>{item.id}</Text>
            </View>
            <View style={styles.colSaleNo}>
              <Text style={styles.cellTextCenter}>RETURNED</Text>
              <Text style={styles.cellTextCenter}>{formatDate(item.return_date)}</Text>
            </View>
            <View style={styles.colLotNo}>
              <Text style={styles.cellTextCenter}>{item.lot_number || '-'}</Text>
            </View>
            <View style={styles.colDescription}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDetails}>{item.description}</Text>
              {item.artist_name && (
                <Text style={styles.itemDetails}>By: {item.artist_name}</Text>
              )}
              {item.school_name && (
                <Text style={styles.itemDetails}>School: {item.school_name}</Text>
              )}
              {item.dimensions && (
                <Text style={styles.itemDetails}>Size: {item.dimensions}</Text>
              )}
              {item.condition && (
                <Text style={styles.itemDetails}>Condition: {item.condition}</Text>
              )}
              {item.return_reason && (
                <Text style={styles.returnReason}>Return Reason: {item.return_reason}</Text>
              )}
            </View>
            <View style={styles.colLocation}>
              <Text style={styles.cellTextCenter}>
                {item.location || 'A Store Shelf L3'}
              </Text>
            </View>
          </View>
        ))}

        {/* Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryText}>
            Total Number of returned items: {returnedItems.length}
          </Text>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Collected by</Text>
            <View style={styles.signatureLine}></View>
            <Text style={styles.signatureName}>
              {collectedBy || `Transfer to ${client.first_name} ${client.last_name}`}
            </Text>
          </View>
          
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Released by</Text>
            <View style={styles.signatureLine}></View>
            <Text style={styles.signatureName}>
              {releasedBy || consignment.specialist_name || 'Specialist'}{'\n'}
              for & on behalf of {brandDetails.name}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Please inspect your lot(s) to satisfy yourself as to present condition and content upon collection, as we take no responsibility for 
            loss or damage after they leave our premises.
          </Text>
          <Text style={styles.disclaimer}>
            Collection receipt for items returned from consignment
          </Text>
          <Text style={styles.footerText}>
            {brandDetails.name}. REGISTERED IN ENGLAND AND WALES, NO. {brandDetails.registrationNumber || '12345678'}{'\n'}
            REGISTERED OFFICE: {brandDetails.address}, {brandDetails.city} | {brandDetails.postcode} | {brandDetails.country}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

// Download Link Component
interface CollectionReceiptPDFProps extends CollectionReceiptProps {
  fileName?: string
  children: React.ReactNode
}

const CollectionReceiptPDF: React.FC<CollectionReceiptPDFProps> = ({
  fileName = 'collection-receipt.pdf',
  children,
  ...props
}) => {
  return (
    <PDFDownloadLink
      document={<CollectionReceiptDocument {...props} />}
      fileName={fileName}
    >
      {({ loading, error }) => {
        if (loading) return 'Generating PDF...'
        if (error) return 'Error generating PDF'
        return children
      }}
    </PDFDownloadLink>
  )
}

export default CollectionReceiptPDF
export { CollectionReceiptDocument }
