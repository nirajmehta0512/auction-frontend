// frontend/src/components/invoices/InvoiceTable.tsx
"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { MoreVertical, Edit, FileText, Package, Download, Mail, Trash2, AlertTriangle, CreditCard } from 'lucide-react'
import { useBrand } from '@/lib/brand-context'
import { generateInvoicePdf } from '@/lib/auctions-api'
import { InvoicesAPI } from '@/lib/invoices-api'
import { fetchClient, type Client } from '@/lib/clients-api'
import LogisticsEditDialog from './LogisticsEditDialog'

interface Invoice {
  id: number
  invoice_number: string
  title: string
  hammer_price?: number
  buyers_premium?: number
  buyer_first_name: string
  buyer_last_name: string
  buyer_email: string
  buyer_phone: string
  platform: string
  status: string
  paid_amount?: number
  type?: 'buyer' | 'vendor'
  created_at: string
  client_id?: number | null
  client?: {
    id: number
    first_name: string
    last_name: string
    email: string
    phone_number?: string
  }
  logistics?: any
  total_amount?: number
  item_ids?: number[]
  lot_ids?: string[]
}

interface InvoiceTableProps {
  invoices: Invoice[]
  loading?: boolean
  onRefresh?: () => void
  invoiceType?: 'buyer' | 'vendor'
}

export default function InvoiceTable({ invoices, loading = false, onRefresh, invoiceType = 'buyer' }: InvoiceTableProps) {
  const { brand } = useBrand()
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null)
  const [showLogisticsDialog, setShowLogisticsDialog] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk', invoice?: Invoice }>({ type: 'single' })
  const [isDeleting, setIsDeleting] = useState(false)
  const [showPaidAmountDialog, setShowPaidAmountDialog] = useState(false)
  const [paidAmountInput, setPaidAmountInput] = useState('')
  const [isUpdatingPaidAmount, setIsUpdatingPaidAmount] = useState(false)

  // Client data cache
  const [clientData, setClientData] = useState<Map<number, Client>>(new Map())
  const [loadingClients, setLoadingClients] = useState<Set<number>>(new Set())

  // Load client data for invoices that have client_id but no client data
  const loadClientData = async (clientId: number) => {
    if (clientData.has(clientId) || loadingClients.has(clientId)) {
      return
    }

    setLoadingClients(prev => new Set(prev).add(clientId))

    try {
      const response = await fetchClient(clientId)
      if (response.success && response.data) {
        setClientData(prev => new Map(prev).set(clientId, response.data))
      }
    } catch (error) {
      console.error(`Failed to load client data for ID ${clientId}:`, error)
    } finally {
      setLoadingClients(prev => {
        const newSet = new Set(prev)
        newSet.delete(clientId)
        return newSet
      })
    }
  }

  // Load client data for all invoices with client_id
  useEffect(() => {
    const clientIdsToLoad = invoices
      .filter(invoice => invoice.client_id && !clientData.has(invoice.client_id) && !loadingClients.has(invoice.client_id))
      .map(invoice => invoice.client_id!)
      .filter(Boolean)

    clientIdsToLoad.forEach(clientId => {
      loadClientData(clientId)
    })
  }, [invoices, clientData, loadingClients])

  const handleGeneratePdf = async (invoiceId: number, type: 'internal' | 'final') => {
    try {
      const brandCode = typeof brand === 'string' ? brand : (brand as any)?.code
      const blob = await generateInvoicePdf(invoiceId, type, brandCode)

      // Create blob URL and open in new tab
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')

      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      alert('Failed to generate PDF')
    }
  }

  const handleEditLogistics = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowLogisticsDialog(true)
    setActionMenuOpen(null)
  }

  const handleLogisticsSuccess = () => {
    setShowLogisticsDialog(false)
    setSelectedInvoice(null)
    onRefresh?.()
  }

  const handleSendAcknowledgmentEmail = async (invoice: Invoice) => {
    try {
      if (!invoice.client?.email && !invoice.buyer_email) {
        alert('No email address found for this client')
        return
      }

      await InvoicesAPI.sendAcknowledgmentEmail(invoice.id)
      alert('Acknowledgment email sent successfully!')
      setActionMenuOpen(null)
    } catch (error) {
      console.error('Failed to send acknowledgment email:', error)
      alert('Failed to send acknowledgment email')
    }
  }

  const handleDeleteSingle = (invoice: Invoice) => {
    setDeleteTarget({ type: 'single', invoice })
    setShowDeleteDialog(true)
    setActionMenuOpen(null)
  }

  const handleDeleteBulk = () => {
    if (selectedInvoices.size === 0) {
      alert('Please select invoices to delete')
      return
    }
    setDeleteTarget({ type: 'bulk' })
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    try {
      if (deleteTarget.type === 'single' && deleteTarget.invoice) {
        await InvoicesAPI.deleteInvoice(deleteTarget.invoice.id)
        alert(`Invoice "${deleteTarget.invoice.invoice_number}" has been deleted successfully!`)
      } else if (deleteTarget.type === 'bulk') {
        const deletePromises = Array.from(selectedInvoices).map(invoiceId =>
          InvoicesAPI.deleteInvoice(invoiceId)
        )
        await Promise.all(deletePromises)
        alert(`${selectedInvoices.size} invoice(s) have been deleted successfully!`)
        setSelectedInvoices(new Set()) // Clear selection after bulk delete
      }

      setShowDeleteDialog(false)
      setDeleteTarget({ type: 'single' })
      onRefresh?.()
    } catch (error) {
      console.error('Failed to delete invoice(s):', error)
      alert('Failed to delete invoice(s). Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(new Set(invoices.map(invoice => invoice.id)))
    } else {
      setSelectedInvoices(new Set())
    }
  }

  const handleSelectInvoice = (invoiceId: number, checked: boolean) => {
    const newSelected = new Set(selectedInvoices)
    if (checked) {
      newSelected.add(invoiceId)
    } else {
      newSelected.delete(invoiceId)
    }
    setSelectedInvoices(newSelected)
  }

  const handleSetPaidAmount = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setPaidAmountInput(invoice.paid_amount?.toString() || '0')
    setShowPaidAmountDialog(true)
    setActionMenuOpen(null)
  }

  const handleUpdatePaidAmount = async () => {
    if (!selectedInvoice) return

    setIsUpdatingPaidAmount(true)
    try {
      const paidAmount = parseFloat(paidAmountInput) || 0

      await InvoicesAPI.updatePaidAmount(selectedInvoice.id, paidAmount)

      setShowPaidAmountDialog(false)
      setSelectedInvoice(null)
      setPaidAmountInput('')
      onRefresh?.()
      alert('Paid amount updated successfully!')
    } catch (error) {
      console.error('Failed to update paid amount:', error)
      alert('Failed to update paid amount. Please try again.')
    } finally {
      setIsUpdatingPaidAmount(false)
    }
  }

  const isAllSelected = invoices.length > 0 && selectedInvoices.size === invoices.length
  const isPartiallySelected = selectedInvoices.size > 0 && selectedInvoices.size < invoices.length

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const getTotalAmount = (invoice: Invoice) => {
    // Use the calculated total_amount from the API response
    console.log('invoice', invoice)
    return invoice.total_amount || 0
  }

  const getBuyerPrice = (invoice: Invoice) => {
    // Use the calculated buyer_price from the API response
    return invoice.buyers_premium || 0
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading invoices...</p>
        </div>
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="p-6 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-500">No invoices have been generated yet.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedInvoices.size > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-blue-800">
                {selectedInvoices.size} invoice(s) selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDeleteBulk}
                className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedInvoices(new Set())}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isPartiallySelected
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lot Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.has(invoice.id)}
                      onChange={(e) => handleSelectInvoice(invoice.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <button
                        onClick={() => window.open(`/invoice/${invoice.id}/view?from=invoices`, '_blank')}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {invoice.invoice_number}
                      </button>
                      <div className="text-sm text-gray-500">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {(() => {
                          // Use client data from cache if available, otherwise from nested client object
                          const clientInfo = invoice.client_id && clientData.get(invoice.client_id)
                            ? clientData.get(invoice.client_id)
                            : invoice.client

                          if (clientInfo?.id || (invoice.client_id && clientData.get(invoice.client_id))) {
                            const clientId = clientInfo?.id || invoice.client_id!
                            const isLoading = invoice.client_id && loadingClients.has(invoice.client_id)

                            return (
                              <div className="flex items-center space-x-2">
                                {isLoading ? (
                                  <span className="text-gray-400 italic flex items-center">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400 mr-2"></div>
                                    Loading...
                                  </span>
                                ) : (
                                  <Link
                                    href={`/clients/${clientId}`}
                                    className="text-blue-600 hover:text-blue-800 hover:underline flex items-center group"
                                    title={`View client details for ${clientInfo?.first_name || 'Unknown'} ${clientInfo?.last_name || 'Client'}`}
                                  >
                                    {`${clientInfo?.first_name || 'Unknown'} ${clientInfo?.last_name || 'Client'}`}
                                    <svg className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.25 17h-8.5A2.25 2.25 0 011.5 14.75v-8.5A2.25 2.25 0 013.75 4.25h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                                      <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                                    </svg>
                                  </Link>
                                )}
                                {invoice.type === 'vendor' && (
                                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                    Vendor
                                  </span>
                                )}
                              </div>
                            )
                          } else {
                            // No client data available
                            return (
                              <div className="flex items-center space-x-2">
                                <span className={invoice.type === 'vendor' ? "text-purple-600 font-medium" : "text-gray-400 italic"}>
                                  {invoice.client
                                    ? `${invoice.client.first_name} ${invoice.client.last_name}`
                                    : `${invoice.buyer_first_name || ''} ${invoice.buyer_last_name || ''}`.trim()
                                  }
                                </span>
                                {invoice.type === 'vendor' && (
                                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                    Vendor
                                  </span>
                                )}
                                {!invoice.client_id && (
                                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                    No Client Record
                                  </span>
                                )}
                              </div>
                            )
                          }
                        })()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {(() => {
                          const clientInfo = invoice.client_id && clientData.get(invoice.client_id)
                            ? clientData.get(invoice.client_id)
                            : invoice.client
                          return clientInfo?.email || invoice.buyer_email || 'No email'
                        })()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {(() => {
                          const clientInfo = invoice.client_id && clientData.get(invoice.client_id)
                            ? clientData.get(invoice.client_id)
                            : invoice.client
                          return clientInfo?.phone_number || invoice.buyer_phone || 'No phone'
                        })()}
                      </div>
                      {(() => {
                        const clientInfo = invoice.client_id && clientData.get(invoice.client_id)
                          ? clientData.get(invoice.client_id)
                          : invoice.client
                        const hasClientData = clientInfo?.id || (invoice.client_id && clientData.get(invoice.client_id))
                        const hasBasicInfo = invoice.buyer_email || invoice.buyer_first_name

                        return !hasClientData && !hasBasicInfo && (
                          <div className="text-xs text-gray-400 mt-1">
                            Client info not available
                          </div>
                        )
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Lot IDs: {(invoice as any).lot_ids?.join(', ') || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Item IDs: {invoice.item_ids?.join(', ') || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(getTotalAmount(invoice))}
                      </div>
                      <div className="text-sm text-gray-500">
                        Hammer Price: {formatCurrency(invoice.hammer_price || 0)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.type === 'vendor' ? 'Vendor' : 'Buyer'} Premium: {formatCurrency(getBuyerPrice(invoice))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{invoice.platform}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${invoice.status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : invoice.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      {invoice.status === 'paid' ? 'Paid' :
                        invoice.status === 'cancelled' ? 'Cancelled' :
                          'Unpaid'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative">
                      <button
                        onClick={() => setActionMenuOpen(actionMenuOpen === invoice.id ? null : invoice.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>

                      {actionMenuOpen === invoice.id && (
                        <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                          <div className="py-1" role="menu">
                            {invoiceType === 'buyer' && (
                              <>
                                <button
                                  onClick={() => handleEditLogistics(invoice)}
                                  className="group flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 w-full text-left whitespace-normal"
                                >
                                  <Package className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500 flex-shrink-0" />
                                  <span className="leading-tight">Edit Logistics Info</span>
                                </button>
                                <button
                                  onClick={() => handleGeneratePdf(invoice.id, 'internal')}
                                  className="group flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 w-full text-left whitespace-normal"
                                >
                                  <FileText className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500 flex-shrink-0" />
                                  <span className="leading-tight">Generate Internal Invoice</span>
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleGeneratePdf(invoice.id, 'final')}
                              className="group flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 w-full text-left whitespace-normal"
                            >
                              <Download className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500 flex-shrink-0" />
                              <span className="leading-tight">Generate Final Invoice</span>
                            </button>
                            <button
                              onClick={() => handleSendAcknowledgmentEmail(invoice)}
                              className="group flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 w-full text-left whitespace-normal"
                            >
                              <Mail className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500 flex-shrink-0" />
                              <span className="leading-tight">Send Paid Acknowledgment Email</span>
                            </button>
                            <button
                              onClick={() => handleSetPaidAmount(invoice)}
                              className="group flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 w-full text-left whitespace-normal"
                            >
                              <CreditCard className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500 flex-shrink-0" />
                              <span className="leading-tight">Set Paid Amount</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSingle(invoice)}
                              className="group flex items-center px-4 py-3 text-sm text-red-700 hover:bg-red-50 w-full text-left whitespace-normal"
                            >
                              <Trash2 className="mr-3 h-4 w-4 text-red-400 group-hover:text-red-500 flex-shrink-0" />
                              <span className="leading-tight">Delete Invoice</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logistics Edit Dialog */}
      {showLogisticsDialog && selectedInvoice && (
        <LogisticsEditDialog
          isOpen={showLogisticsDialog}
          onClose={() => {
            setShowLogisticsDialog(false)
            setSelectedInvoice(null)
          }}
          invoice={selectedInvoice}
          onSuccess={handleLogisticsSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">
                Confirm Deletion
              </h3>
            </div>

            <div className="mb-6">
              {deleteTarget.type === 'single' && deleteTarget.invoice ? (
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete invoice{' '}
                  <span className="font-medium text-gray-900">
                    "{deleteTarget.invoice.invoice_number}"
                  </span>
                  ? This action cannot be undone.
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete{' '}
                  <span className="font-medium text-gray-900">
                    {selectedInvoices.size} invoice(s)
                  </span>
                  ? This action cannot be undone.
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteDialog(false)
                  setDeleteTarget({ type: 'single' })
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 flex items-center"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Paid Amount Dialog */}
      {showPaidAmountDialog && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center mb-4">
              <CreditCard className="h-6 w-6 text-blue-500 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">
                Set Paid Amount
              </h3>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Set the paid amount for invoice{' '}
                <span className="font-medium text-gray-900">
                  "{selectedInvoice.invoice_number}"
                </span>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paid Amount (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paidAmountInput}
                  onChange={(e) => setPaidAmountInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              {selectedInvoice.hammer_price && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Hammer Price:</span>
                      <span>£{selectedInvoice.hammer_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Premium:</span>
                      <span>£{selectedInvoice.buyers_premium?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-2 mt-2">
                      <span>Outstanding:</span>
                      <span>£{getTotalAmount(selectedInvoice).toFixed(2)}</span>
                    </div>
                    {selectedInvoice.buyers_premium && (
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Calculated Premium:</span>
                        <span>£{getBuyerPrice(selectedInvoice).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPaidAmountDialog(false)
                  setSelectedInvoice(null)
                  setPaidAmountInput('')
                }}
                disabled={isUpdatingPaidAmount}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePaidAmount}
                disabled={isUpdatingPaidAmount}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
              >
                {isUpdatingPaidAmount ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Update Paid Amount
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
