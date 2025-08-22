// frontend/src/components/consignments/ConsignmentReceiptPDF.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font, Image } from '@react-pdf/renderer'
import { getBrandDetails, BrandCode } from '@/lib/brand-context'

// Register fonts for better typography
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 700 },
  ]
})

interface ConsignmentItem {
  id: string
  lot_number?: string
  title: string
  description: string
  artist_name?: string
  school_name?: string
  dimensions?: string
  condition?: string
  low_est: number
  high_est: number
  reserve?: number
  vendor_commission?: number
  goods_received?: boolean
}

interface ConsignmentReceiptProps {
  consignment: {
    id: string
    consignment_number: string
    receipt_no?: string
    created_at: string
    signing_date?: string
    specialist_name?: string
    items_count?: number
    total_estimated_value?: number
    released_by_staff?: string
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
  items: ConsignmentItem[]
  brand_code?: BrandCode
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
    marginBottom: 30,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  brandLogo: {
    width: 48,
    height: 48,
    marginRight: 15,
    marginBottom: 8,
  },
  headerLeft: {
    width: '65%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerLeftContent: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  headerRight: {
    width: '35%',
    alignItems: 'flex-end',
    paddingLeft: 10,
  },
  companyTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 10,
  },
  establishment: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  contactInfo: {
    fontSize: 8,
    color: '#666666',
    lineHeight: 1.3,
  },
  receiptTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 4,
    textAlign: 'right',
  },
  receiptDate: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'right',
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
  referenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  referenceItem: {
    width: '50%',
    marginBottom: 6,
    flexDirection: 'row',
  },
  referenceLabel: {
    fontSize: 9,
    fontWeight: 600,
    width: 80,
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
  colReceiptNo: { width: '8%' },
  colLotNo: { width: '8%' },
  colDescription: { width: '44%' },
  colItemComm: { width: '8%' },
  colIllus: { width: '6%' },
  colReserve: { width: '10%' },
  colEstimate: { width: '16%' },

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
  cellTextRight: {
    fontSize: 8,
    color: '#333333',
    textAlign: 'right',
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
    maxLines: 2,
  },

  // Summary section
  summarySection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#cccccc',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: 600,
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 600,
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
  vatNotice: {
    fontSize: 8,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Specialist signature section
  signatureSection: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#cccccc',
    padding: 8,
  },
  signatureLabel: {
    fontSize: 9,
    fontWeight: 600,
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 8,
    color: '#666666',
  },
})

// Main PDF Document Component
const ConsignmentReceiptDocument: React.FC<ConsignmentReceiptProps> = ({
  consignment,
  client,
  items,
  brand_code = 'MSABER'
}) => {
  const [brandDetails, setBrandDetails] = useState(getBrandDetails(brand_code))
  const [brandLogo, setBrandLogo] = useState<string | null>(null)

  // Load brand compliance data including logo
  useEffect(() => {
    const loadBrandData = async () => {
      try {
        const token = localStorage.getItem('token')
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

        // First try to get brand compliance data
        const complianceResponse = await fetch(`${API_BASE_URL}/api/brands`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        })

        if (complianceResponse.ok) {
          const complianceData = await complianceResponse.json()
          if (complianceData.success) {
            const compliance = complianceData.data
            // console.log('compliance', compliance)
            // console.log('compliance.company_name', compliance.company_name)
            // console.log('brandDetails.name', compliance.logo_url)
            // console.log('brandDetails.name', compliance.vat_number)

            // Update brand details with compliance data
            setBrandDetails({
              code: brand_code,
              name: compliance.company_name || brandDetails.name,
              companyName: compliance.company_name || brandDetails.companyName,
              email: compliance.email || brandDetails.email,
              vatNumber: compliance.vat_number || brandDetails.vatNumber,
              address: compliance.address || brandDetails.address,
              city: compliance.city || brandDetails.city,
              postcode: compliance.postal_code || brandDetails.postcode,
              country: compliance.country || brandDetails.country,
              establishedYear: compliance.established_year || brandDetails.establishedYear,
              registrationNumber: compliance.registration_number || brandDetails.registrationNumber
            })

            // Set logo from compliance data
            if (compliance.logo_url) {
              setBrandLogo(compliance.logo_url)
            }
          }
        }

        // Fallback: try to get brand logo from brand-logos API
        if (!brandLogo) {
          const brandResponse = await fetch(`${API_BASE_URL}/api/brands/by-code/${brand_code}`, {
            headers: {
              'Authorization': token ? `Bearer ${token}` : ''
            }
          })
          if (brandResponse.ok) {
            const brandData = await brandResponse.json()
            if (brandData.success && brandData.data) {
              // If we have brand ID, try to get logo from brand-logos API
              if (brandData.data.id) {
                const logoResponse = await fetch(`${API_BASE_URL}/api/brand-logos/${brandData.data.id}`, {
                  headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                  }
                })
                if (logoResponse.ok) {
                  const logoData = await logoResponse.json()
                  if (logoData.success && logoData.data.logo_url) {
                    setBrandLogo(logoData.data.logo_url)
                  }
                }
              }
              // Fallback to direct logo_url if available
              else if (brandData.data.logo_url) {
                setBrandLogo(brandData.data.logo_url)
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load brand data:', error)
      }
    }
    loadBrandData()
  }, [brand_code, brandDetails.name])

  const formatCurrency = (amount: number): string => {
    return `£${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const totalEstimate = items.reduce((sum, item) => sum + ((item.low_est + item.high_est) / 2), 0)
  const totalReserve = items.reduce((sum, item) => sum + (item.reserve || 0), 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {brandLogo && (
              <Image
                style={styles.brandLogo}
                src={brandLogo}
                cache={false}
              />
            )}
            <View style={styles.headerLeftContent}>
              <Text style={styles.companyTitle}>{brandDetails.name}</Text>
              <View style={styles.contactInfo}>
                <Text>{brandDetails.address}</Text>
                <Text>{brandDetails.city} {brandDetails.postcode}</Text>
                <Text>{brandDetails.country}</Text>
                <Text>VAT Reg. No. {brandDetails.vatNumber}</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.receiptTitle}>Consignment Receipt {consignment.receipt_no || consignment.consignment_number}</Text>
            <Text style={styles.receiptDate}>Date: {formatDate(consignment.created_at)}</Text>
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
          <Text style={[styles.clientName, { fontSize: 9, fontWeight: 600, color: '#666666', marginBottom: 8 }]}>
            Client ID: {(() => {
              const prefix = brand_code?.slice(0, 3) || 'MSA';
              return `${prefix}-${client.id.toString().padStart(3, '0')}`;
            })()}
          </Text>
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
          <View style={styles.referenceGrid}>
            <View style={styles.referenceItem}>
              <Text style={styles.referenceLabel}>REFERENCE:</Text>
              <Text style={styles.referenceValue}></Text>
            </View>
            
            <View style={styles.referenceItem}>
              <Text style={styles.referenceLabel}>COMMISSION</Text>
              <Text style={styles.referenceValue}>{items[0].vendor_commission || '15'}% of hammer price. Minimum £15 per lot.</Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.tableHeader}>
          <View style={styles.colReceiptNo}>
            <Text style={styles.headerText}>Receipt No.</Text>
          </View>
          <View style={styles.colLotNo}>
            <Text style={styles.headerText}>Lot No.</Text>
          </View>
          <View style={styles.colDescription}>
            <Text style={styles.headerText}>Description</Text>
          </View>
          <View style={styles.colItemComm}>
            <Text style={styles.headerText}>Commission %</Text>
          </View>
          <View style={styles.colReserve}>
            <Text style={styles.headerText}>Reserve</Text>
          </View>
          <View style={styles.colEstimate}>
            <Text style={styles.headerText}>Estimate</Text>
          </View>
        </View>

        {items.map((item, index) => (
          <View key={item.id} style={styles.tableRow}>
            <View style={styles.colReceiptNo}>
              <Text style={styles.cellTextCenter}>{(index + 1).toString().padStart(3, '0')}</Text>
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
            </View>
            <View style={styles.colItemComm}>
              <Text style={styles.cellTextCenter}>{item.vendor_commission || '15'}%</Text>
            </View>

            <View style={styles.colReserve}>
              <Text style={styles.cellTextRight}>
                {item.reserve ? formatCurrency(item.reserve) : '-'}
              </Text>
            </View>
            <View style={styles.colEstimate}>
              <Text style={styles.cellTextRight}>
                {formatCurrency(item.low_est)} - {formatCurrency(item.high_est)}
              </Text>
            </View>
          </View>
        ))}

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Number of lines: {items.length}</Text>
            <Text style={styles.summaryValue}>Total Estimate: {formatCurrency(totalEstimate)}</Text>
          </View>
          {totalReserve > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}></Text>
              <Text style={styles.summaryValue}>Total Reserve: {formatCurrency(totalReserve)}</Text>
            </View>
          )}
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Collected by</Text>
            <Text style={styles.signatureName}>Transfer to {brandDetails.name}</Text>
          </View>

          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Released by</Text>
            <Text style={styles.signatureName}>
              {consignment.released_by_staff || consignment.specialist_name || 'Staff Member'}{'\n'}
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
          <Text style={styles.vatNotice}>
            The above charges are subject to VAT
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
interface ConsignmentReceiptPDFProps extends ConsignmentReceiptProps {
  fileName?: string
  children: React.ReactNode
}

const ConsignmentReceiptPDF: React.FC<ConsignmentReceiptPDFProps> = ({
  fileName = 'consignment-receipt.pdf',
  children,
  ...props
}) => {
  return (
    <PDFDownloadLink
      document={<ConsignmentReceiptDocument {...props} />}
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

export default ConsignmentReceiptPDF
export { ConsignmentReceiptDocument }
