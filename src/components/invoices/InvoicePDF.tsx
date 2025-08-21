// frontend/src/components/invoices/InvoicePDF.tsx
"use client"

import React from 'react'
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer'
import { Invoice } from '../../types/invoice'
import { getBrandDetails, BrandCode } from '@/lib/brand-context'
import { formatCurrency, calculateBuyersPremium, calculateVAT } from '../../lib/invoice-utils'

// Register fonts for better typography
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
})

// Define comprehensive styles for detailed invoice
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 9,
    paddingTop: 25,
    paddingLeft: 30,
    paddingRight: 30,
    paddingBottom: 70,
    color: '#333333',
    lineHeight: 1.3,
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 15,
  },
  headerLeft: {
    flex: 2,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: 10,
  },
  companyInfo: {
    textAlign: 'right',
  },
  companyName: {
    fontSize: 11,
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: 3,
  },
  companyDetails: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 1,
  },
  
  // Client section
  clientSection: {
    marginBottom: 15,
  },
  clientName: {
    fontSize: 11,
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: 3,
  },
  clientDetails: {
    fontSize: 8,
    color: '#4b5563',
    marginBottom: 1,
  },
  clientNumber: {
    fontSize: 9,
    fontWeight: 600,
    color: '#4f46e5',
    marginTop: 5,
  },
  
  // Invoice details
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    borderRadius: 3,
  },
  detailsColumn: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 7,
    color: '#6b7280',
    marginBottom: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 9,
    fontWeight: 500,
    color: '#1f2937',
  },
  
  // Table styles - more comprehensive columns
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    minHeight: 24,
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  
  // Column widths for detailed breakdown
  colLot: { width: '8%', justifyContent: 'center' },
  colDescription: { width: '25%', paddingRight: 3 },
  colHammer: { width: '11%' },
  colPremium: { width: '11%' },
  colPremiumVAT: { width: '11%' },
  colShipping: { width: '9%' },
  colInsurance: { width: '9%' },
  colVAT: { width: '8%' },
  colTotal: { width: '11%' },
  
  // Cell text styles
  headerText: {
    fontSize: 7,
    fontWeight: 600,
    color: '#ffffff',
    textAlign: 'center',
  },
  cellText: {
    fontSize: 7,
    color: '#374151',
    textAlign: 'center',
  },
  cellTextLeft: {
    fontSize: 7,
    color: '#374151',
    textAlign: 'left',
  },
  cellTextBold: {
    fontSize: 7,
    fontWeight: 600,
    color: '#1f2937',
    textAlign: 'center',
  },
  cellTextRight: {
    fontSize: 7,
    color: '#374151',
    textAlign: 'right',
  },
  
  // Summary section
  summarySection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
    paddingHorizontal: 5,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#6b7280',
    flex: 1,
  },
  summaryValue: {
    fontSize: 8,
    fontWeight: 500,
    color: '#374151',
    width: '15%',
    textAlign: 'right',
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 5,
    backgroundColor: '#1f2937',
    borderRadius: 3,
  },
  summaryTotalLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#ffffff',
    flex: 1,
  },
  summaryTotalValue: {
    fontSize: 10,
    fontWeight: 700,
    color: '#ffffff',
    width: '15%',
    textAlign: 'right',
  },
  
  // VAT breakdown section
  vatSection: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
  },
  vatTitle: {
    fontSize: 8,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 5,
  },
  vatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  vatLabel: {
    fontSize: 7,
    color: '#6b7280',
  },
  vatValue: {
    fontSize: 7,
    color: '#374151',
  },
  
  // Payment information
  paymentSection: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  paymentTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: '#92400e',
    marginBottom: 6,
    textAlign: 'center',
  },
  paymentGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentColumn: {
    flex: 1,
    paddingHorizontal: 5,
  },
  paymentMethodTitle: {
    fontSize: 8,
    fontWeight: 600,
    color: '#92400e',
    marginBottom: 4,
    textAlign: 'center',
  },
  paymentText: {
    fontSize: 7,
    color: '#7c2d12',
    marginBottom: 1,
    textAlign: 'center',
  },
  paymentLink: {
    fontSize: 8,
    color: '#2563eb',
    textDecoration: 'underline',
    textAlign: 'center',
    marginTop: 5,
  },
  
  // Terms and tracking
  trackSection: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 3,
  },
  trackTitle: {
    fontSize: 8,
    fontWeight: 600,
    color: '#1e40af',
    marginBottom: 3,
  },
  trackText: {
    fontSize: 7,
    color: '#1e3a8a',
    marginBottom: 2,
  },
  link: {
    color: '#2563eb',
    textDecoration: 'underline',
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 7,
    color: '#6b7280',
  },
  pageNumber: {
    fontSize: 7,
    color: '#6b7280',
  },
})

interface InvoicePDFProps {
  invoice: Invoice
  includeShipping?: boolean
}

// Enhanced item row component with full breakdown
const ItemRow = ({ item, index, includeShipping }: { item: any; index: number; includeShipping: boolean }) => {
  const hammerPrice = item.hammer_price || 0
  const premium = calculateBuyersPremium(hammerPrice, 0.30) // 30% buyer's premium
  const premiumVAT = premium * 0.20 // 20% VAT on buyer's premium
  const shipping = includeShipping ? (item.shipping_cost || 0) : 0
  const insurance = includeShipping ? (item.insurance_cost || 0) : 0
  
  // VAT calculation based on VAT code using utility function
  const { vatAmount } = calculateVAT(hammerPrice, item.vat_code || 'N')
  
  const total = hammerPrice + premium + premiumVAT + shipping + insurance + vatAmount

  return (
    <View style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}>
      <View style={styles.colLot}>
        <Text style={styles.cellTextBold}>{item.lot_num || 'N/A'}</Text>
      </View>
      <View style={styles.colDescription}>
        <Text style={styles.cellTextLeft}>
          {item.title || 'No description'}
          {item.dimensions && (
            <Text style={{ fontSize: 6, color: '#9ca3af' }}>
              {'\n'}Dims: {item.dimensions}
            </Text>
          )}
        </Text>
      </View>
      <View style={styles.colHammer}>
        <Text style={styles.cellTextRight}>{formatCurrency(hammerPrice)}</Text>
      </View>
      <View style={styles.colPremium}>
        <Text style={styles.cellTextRight}>
          {formatCurrency(premium)}
          <Text style={{ fontSize: 6, color: '#9ca3af' }}>{'\n'}(30%)</Text>
        </Text>
      </View>
      <View style={styles.colPremiumVAT}>
        <Text style={styles.cellTextRight}>
          {formatCurrency(premiumVAT)}
          <Text style={{ fontSize: 6, color: '#9ca3af' }}>{'\n'}(20%)</Text>
        </Text>
      </View>
      <View style={styles.colShipping}>
        <Text style={styles.cellTextRight}>
          {shipping > 0 ? formatCurrency(shipping) : '-'}
        </Text>
      </View>
      <View style={styles.colInsurance}>
        <Text style={styles.cellTextRight}>
          {insurance > 0 ? formatCurrency(insurance) : '-'}
        </Text>
      </View>
      <View style={styles.colVAT}>
        <Text style={styles.cellTextRight}>
          {vatAmount > 0 ? formatCurrency(vatAmount) : '-'}
          {vatAmount > 0 && (
            <Text style={{ fontSize: 6, color: '#9ca3af' }}>{'\n'}({item.vat_code})</Text>
          )}
        </Text>
      </View>
      <View style={styles.colTotal}>
        <Text style={styles.cellTextBold}>{formatCurrency(total)}</Text>
      </View>
    </View>
  )
}

// Table header component
const TableHeader = () => (
  <View style={styles.tableHeader}>
    <View style={styles.colLot}>
      <Text style={styles.headerText}>LOT</Text>
    </View>
    <View style={styles.colDescription}>
      <Text style={styles.headerText}>DESCRIPTION</Text>
    </View>
    <View style={styles.colHammer}>
      <Text style={styles.headerText}>HAMMER{'\n'}PRICE</Text>
    </View>
    <View style={styles.colPremium}>
      <Text style={styles.headerText}>BUYER'S{'\n'}PREMIUM</Text>
    </View>
    <View style={styles.colPremiumVAT}>
      <Text style={styles.headerText}>BP VAT{'\n'}(20%)</Text>
    </View>
    <View style={styles.colShipping}>
      <Text style={styles.headerText}>SHIPPING{'\n'}(Inc. 20% VAT)</Text>
    </View>
    <View style={styles.colInsurance}>
      <Text style={styles.headerText}>INSURANCE{'\n'}(Inc. 20% VAT)</Text>
    </View>
    <View style={styles.colVAT}>
      <Text style={styles.headerText}>VAT</Text>
    </View>
    <View style={styles.colTotal}>
      <Text style={styles.headerText}>TOTAL</Text>
    </View>
  </View>
)

// Helper component for page footer
const PageFooter = ({ pageNumber, totalPages, invoice }: { pageNumber: number; totalPages: number; invoice: Invoice }) => (
  <View style={styles.footer}>
    <Text style={styles.footerText}>
      {invoice.brand_code ? getBrandDetails(invoice.brand_code as BrandCode).companyName : 'Company'} • VAT Number: {invoice.auction?.vat_number || 'N/A'}
    </Text>
    <Text style={styles.pageNumber}>
      Page {pageNumber} of {totalPages}
    </Text>
  </View>
)

// PDF Document Component with proper pagination and detailed breakdown
const InvoicePDFDocument = ({ invoice, includeShipping = false }: InvoicePDFProps) => {
  const calculateTotals = () => {
    let subtotal = 0
    let totalBuyersPremium = 0
    let totalBuyersPremiumVAT = 0
    let totalShipping = 0
    let totalInsurance = 0
    let totalVAT = 0

    invoice.items.forEach(item => {
      const hammerPrice = item.hammer_price || 0
      subtotal += hammerPrice
      
      const premium = calculateBuyersPremium(hammerPrice, 0.30)
      totalBuyersPremium += premium
      totalBuyersPremiumVAT += premium * 0.20
      
      if (includeShipping) {
        totalShipping += item.shipping_cost || 0
        totalInsurance += item.insurance_cost || 0
      }
      
      // VAT calculation using utility function
      const { vatAmount: itemVAT } = calculateVAT(hammerPrice, item.vat_code || 'N')
      totalVAT += itemVAT
    })

    // Use invoice-level shipping and insurance costs when logistics is added
    if (includeShipping && invoice.shipping_cost) {
      totalShipping = invoice.shipping_cost
    }
    if (includeShipping && invoice.insurance_cost) {
      totalInsurance = invoice.insurance_cost
    }

    const total = subtotal + totalBuyersPremium + totalBuyersPremiumVAT + totalShipping + totalInsurance + totalVAT

    return {
      subtotal,
      totalBuyersPremium,
      totalBuyersPremiumVAT,
      totalShipping,
      totalInsurance,
      totalVAT,
      total
    }
  }

  const totals = calculateTotals()
  const itemsPerPage = 12 // Adjusted for more detailed table
  const pages = []
  
  // Split items into pages
  for (let i = 0; i < invoice.items.length; i += itemsPerPage) {
    pages.push(invoice.items.slice(i, i + itemsPerPage))
  }
  
  const totalPages = pages.length + 1 // +1 for payment info page

  const generateTrackingUrl = (invoiceNumber: string) => {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/invoice/${invoiceNumber}/track`
  }

  return (
    <Document>
      {/* Item pages */}
      {pages.map((pageItems, pageIndex) => (
        <Page key={`items-${pageIndex}`} size="A4" style={styles.page}>
          {/* Header (on all pages) */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>INVOICE</Text>
              <View style={styles.clientSection}>
                <Text style={styles.clientName}>
                  {invoice.client?.first_name} {invoice.client?.last_name}
                </Text>
                {invoice.client?.company_name && (
                  <Text style={styles.clientDetails}>{invoice.client.company_name}</Text>
                )}
                <Text style={styles.clientDetails}>
                  {invoice.client?.billing_address1}
                  {invoice.client?.billing_address2 && `, ${invoice.client.billing_address2}`}
                </Text>
                <Text style={styles.clientDetails}>
                  {invoice.client?.billing_city}, {invoice.client?.billing_post_code}
                </Text>
                <Text style={styles.clientDetails}>{invoice.client?.billing_country}</Text>
                <Text style={styles.clientNumber}>
                  Client ID: {invoice.client?.display_id}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{getBrandDetails((invoice.brand_code as BrandCode) || 'MSABER').companyName}</Text>
                <Text style={styles.companyDetails}>{getBrandDetails((invoice.brand_code as BrandCode) || 'MSABER').email}</Text>
                <Text style={styles.companyDetails}>VAT: {invoice.auction?.vat_number}</Text>
              </View>
            </View>
          </View>

          {/* Invoice details (on first page only) */}
          {pageIndex === 0 && (
            <View style={styles.invoiceDetails}>
              <View style={styles.detailsColumn}>
                <Text style={styles.detailLabel}>Invoice Number</Text>
                <Text style={styles.detailValue}>{invoice.invoice_number}</Text>
              </View>
              <View style={styles.detailsColumn}>
                <Text style={styles.detailLabel}>Invoice Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(invoice.invoice_date).toLocaleDateString('en-GB')}
                </Text>
              </View>
              <View style={styles.detailsColumn}>
                <Text style={styles.detailLabel}>Due Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(invoice.due_date).toLocaleDateString('en-GB')}
                </Text>
              </View>
              <View style={styles.detailsColumn}>
                <Text style={styles.detailLabel}>Auction</Text>
                <Text style={styles.detailValue}>{invoice.auction?.short_name}</Text>
              </View>
            </View>
          )}

          {/* Items table */}
          <View style={styles.table}>
            <TableHeader />
            {pageItems.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                index={index}
                includeShipping={includeShipping}
              />
            ))}
          </View>

          {/* Summary on last item page */}
          {pageIndex === pages.length - 1 && (
            <View style={styles.summarySection}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal (Hammer Prices):</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totals.subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Buyer's Premium (30%):</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totals.totalBuyersPremium)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>VAT on Buyer's Premium (20%):</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totals.totalBuyersPremiumVAT)}</Text>
              </View>
              {totals.totalVAT > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>VAT on Hammer:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(totals.totalVAT)}</Text>
                </View>
              )}
              {totals.totalShipping > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shipping & Handling (including VAT):</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(totals.totalShipping)}</Text>
                </View>
              )}
              {totals.totalInsurance > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Insurance (including VAT):</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(totals.totalInsurance)}</Text>
                </View>
              )}
              <View style={styles.summaryTotalRow}>
                <Text style={styles.summaryTotalLabel}>TOTAL AMOUNT DUE:</Text>
                <Text style={styles.summaryTotalValue}>{formatCurrency(totals.total)}</Text>
              </View>

              {/* VAT breakdown - Hidden per requirements */}
              {false && (
                <View style={styles.vatSection}>
                  <Text style={styles.vatTitle}>VAT BREAKDOWN SUMMARY</Text>
                  <View style={styles.vatRow}>
                    <Text style={styles.vatLabel}>Net Amount (Hammer Prices):</Text>
                    <Text style={styles.vatValue}>{formatCurrency(totals.subtotal)}</Text>
                  </View>
                  <View style={styles.vatRow}>
                    <Text style={styles.vatLabel}>VAT @ 20% (Buyer's Premium):</Text>
                    <Text style={styles.vatValue}>{formatCurrency(totals.totalBuyersPremiumVAT)}</Text>
                  </View>
                  {totals.totalVAT > 0 && (
                    <View style={styles.vatRow}>
                      <Text style={styles.vatLabel}>VAT @ 20% (Hammer Prices):</Text>
                      <Text style={styles.vatValue}>{formatCurrency(totals.totalVAT)}</Text>
                    </View>
                  )}
                  <View style={styles.vatRow}>
                    <Text style={styles.vatLabel}>Total VAT:</Text>
                    <Text style={styles.vatValue}>{formatCurrency(totals.totalBuyersPremiumVAT + totals.totalVAT)}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          <PageFooter pageNumber={pageIndex + 1} totalPages={totalPages} invoice={invoice} />
        </Page>
      ))}

      {/* Payment information page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>PAYMENT INFORMATION</Text>
            <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 5 }}>
              Invoice: {invoice.invoice_number}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{getBrandDetails((invoice.brand_code as BrandCode) || 'MSABER').companyName}</Text>
              <Text style={styles.companyDetails}>{getBrandDetails((invoice.brand_code as BrandCode) || 'MSABER').email}</Text>
            </View>
          </View>
        </View>

        {/* Payment section */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>PAYMENT OPTIONS</Text>
          <View style={styles.paymentGrid}>
            <View style={styles.paymentColumn}>
              <Text style={styles.paymentMethodTitle}>Online Payment</Text>
              <Text style={styles.paymentText}>
                View and Pay Online: Visit our website for secure online payment
              </Text>
            </View>
            <View style={styles.paymentColumn}>
              <Text style={styles.paymentMethodTitle}>Bank Transfer (UK)</Text>
              <Text style={styles.paymentText}>
                Account Name: MetSab Auctions Ltd
              </Text>
              <Text style={styles.paymentText}>
                Bank: Revolut Business
              </Text>
              <Text style={styles.paymentText}>
                Sort Code: 04-29-09
              </Text>
              <Text style={styles.paymentText}>
                Account Number: 62496255
              </Text>
              <Text style={[styles.paymentText, { fontWeight: 600, marginTop: 5 }]}>
                Reference: {invoice.invoice_number || invoice.id}
              </Text>
            </View>
            <View style={styles.paymentColumn}>
              <Text style={styles.paymentMethodTitle}>International Transfer</Text>
              <Text style={styles.paymentText}>
                IBAN: GB67REVO00996204755263
              </Text>
              <Text style={styles.paymentText}>
                BIC/SWIFT: REVOGB21
              </Text>
              <Text style={styles.paymentText}>
                Intermediary BIC: CHASGB2L
              </Text>
              <Text style={[styles.paymentText, { fontWeight: 600, marginTop: 5 }]}>
                Reference: {invoice.invoice_number || invoice.id}
              </Text>
            </View>
          </View>
        </View>

        {/* Shipping tracking (if applicable) */}
        {includeShipping && (
          <View style={styles.trackSection}>
            <Text style={styles.trackTitle}>ORDER TRACKING</Text>
            <Text style={styles.trackText}>
              You can track your order status and delivery information using the link below:
            </Text>
            <Text style={styles.trackText}>
              Track your order: {generateTrackingUrl(invoice.invoice_number || invoice.id)}
            </Text>
          </View>
        )}

        {/* Terms and conditions */}
        <View style={{ marginTop: 20, padding: 12, backgroundColor: '#f9fafb', borderRadius: 5 }}>
          <Text style={{ fontSize: 9, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
            Terms & Conditions
          </Text>
          <Text style={{ fontSize: 8, color: '#6b7280', lineHeight: 1.4, marginBottom: 3 }}>
            • Payment is due within 30 days of invoice date. Late payments may incur interest charges at 8% per annum above Bank of England base rate.
          </Text>
          <Text style={{ fontSize: 8, color: '#6b7280', lineHeight: 1.4, marginBottom: 3 }}>
            • Title does not pass until payment is received in full. Risk passes upon collection or delivery.
          </Text>
          <Text style={{ fontSize: 8, color: '#6b7280', lineHeight: 1.4, marginBottom: 3 }}>
            • All items are sold with buyer's premium of 30% plus VAT. Additional charges may apply for shipping and insurance.
          </Text>
          <Text style={{ fontSize: 8, color: '#6b7280', lineHeight: 1.4 }}>
            • All disputes subject to English law and jurisdiction. VAT registration number: {invoice.auction?.vat_number || 'N/A'}.
          </Text>
        </View>
        
        <PageFooter pageNumber={totalPages} totalPages={totalPages} invoice={invoice} />
      </Page>
    </Document>
  )
}

// Main component that provides both preview and download functionality
export default function InvoicePDF({ invoice, includeShipping = false }: InvoicePDFProps) {
  // Add more detailed fallback for missing invoice data
  if (!invoice) {
    return (
      <div className="p-8 text-center bg-white rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">No Invoice Data</h2>
        <p className="text-gray-600">Unable to generate PDF - invoice object is missing.</p>
        <p className="text-sm text-gray-500 mt-2">Please ensure an invoice is selected.</p>
      </div>
    )
  }

  if (!invoice.items) {
    return (
      <div className="p-8 text-center bg-white rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">No Invoice Items</h2>
        <p className="text-gray-600">Unable to generate PDF - invoice items are missing.</p>
        <p className="text-sm text-gray-500 mt-2">Invoice ID: {invoice.id || 'Unknown'}</p>
      </div>
    )
  }

  if (invoice.items.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Empty Invoice</h2>
        <p className="text-gray-600">Unable to generate PDF - invoice contains no items.</p>
        <p className="text-sm text-gray-500 mt-2">Invoice #{invoice.invoice_number || invoice.id}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Detailed Invoice Preview</h2>
          <p className="text-sm text-gray-600 mt-1">
            Comprehensive PDF with detailed breakdowns, VAT calculations, and payment information
          </p>
        </div>
        <PDFDownloadLink
          document={<InvoicePDFDocument invoice={invoice} includeShipping={includeShipping} />}
          fileName={`invoice-${invoice.invoice_number || invoice.id}.pdf`}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
        >
          {({ blob, url, loading, error }) =>
            loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating PDF...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Detailed PDF
              </span>
            )
          }
        </PDFDownloadLink>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="text-center text-gray-600 space-y-2">
          <div className="flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Comprehensive Auction Invoice</h3>
          <p className="text-sm">✓ Detailed breakdown with all charges</p>
          <p className="text-sm">✓ Separate columns for premiums, VAT, shipping & insurance</p>
          <p className="text-sm">✓ VAT breakdown summary section</p>
          <p className="text-sm">✓ Multiple payment options displayed</p>
          <p className="text-sm">✓ Proper A4 formatting with automatic pagination</p>
          <p className="text-sm">✓ Professional layout with consistent headers and footers</p>
          <p className="text-sm mt-3 font-medium">Click "Download Detailed PDF" to generate your comprehensive invoice</p>
        </div>
      </div>
    </div>
  )
} 