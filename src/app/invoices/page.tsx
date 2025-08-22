// frontend/src/app/invoices/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Plus, MoreVertical, Download, Edit, Trash2, FileText, Eye, Package } from 'lucide-react'
import { InvoicesAPI } from '@/lib/invoices-api'
import { getAuctions } from '@/lib/auctions-api'
import InvoiceTemplate from '@/components/invoices/InvoiceTemplate'
import InvoicePDF from '@/components/invoices/InvoicePDF'
import LogisticsForm from '@/components/invoices/LogisticsForm'
import type { Invoice } from '@/types/api'
import type { Auction } from '@/lib/auctions-api'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showLogisticsModal, setShowLogisticsModal] = useState(false)
  const [showInvoicePreview, setShowInvoicePreview] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null)
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null)
  const [includeShipping, setIncludeShipping] = useState(false)

  useEffect(() => {
    loadInvoices()
    loadAuctions()
  }, [])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const response = await InvoicesAPI.getInvoices()
      setInvoices(response.data || [])
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAuctions = async () => {
    try {
      const auctionsData = await getAuctions()
      setAuctions(auctionsData.auctions || [])
    } catch (error) {
      console.error('Error loading auctions:', error)
    }
  }

  const handleGenerateInvoice = async () => {
    if (!selectedAuction) return

    try {
      const newInvoice = await InvoicesAPI.generateFromAuction({
        auction_id: selectedAuction.id,
      })
      setInvoices(prev => [newInvoice, ...prev])
      setShowGenerateModal(false)
      setSelectedAuction(null)
      alert('Invoice generated successfully!')
    } catch (error) {
      console.error('Error generating invoice:', error)
      alert('Failed to generate invoice. Please try again.')
    }
  }

  const handleEditLogistics = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowLogisticsModal(true)
    setActionMenuOpen(null)
  }

  const handleLogisticsSubmit = async (logisticsInfo: any) => {
    if (!selectedInvoice) return

    try {
      // Calculate new total amount including logistics costs
      const baseAmount = (selectedInvoice.hammer_price || 0) + (selectedInvoice.buyers_premium || 0) + (selectedInvoice.vat_amount || 0)
      const newTotalAmount = baseAmount + (logisticsInfo.total_cost || 0)

      const updatedInvoice = await InvoicesAPI.updateInvoice(selectedInvoice.id!, {
        logistics: logisticsInfo,
        shipping_charge: logisticsInfo.shipping_cost,
        insurance_charge: logisticsInfo.insurance_cost,
        handling_charge: logisticsInfo.handling_charge || 0,
        international_surcharge: logisticsInfo.international_surcharge || 0,
        total_shipping_amount: logisticsInfo.total_cost,
        total_amount: newTotalAmount,
      })
      
      setInvoices(prev => prev.map(inv => 
        inv.id === selectedInvoice.id ? updatedInvoice : inv
      ))
      setShowLogisticsModal(false)
      setSelectedInvoice(null)
      alert('Logistics information updated successfully!')
    } catch (error) {
      console.error('Error updating logistics:', error)
      alert('Failed to update logistics. Please try again.')
    }
  }

  const handleViewInvoice = async (invoice: Invoice, withShipping = false) => {
    // Load invoice with items from backend (which computes items using auction.artwork_ids)
    try {
      const token = localStorage.getItem('token')
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const resp = await fetch(`${base}/api/invoices/${invoice.id}`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      })
      const full = await resp.json()
      const formattedInvoice = {
        ...invoice,
        ...full,
        items: full.items || [],
        due_date: invoice.invoice_date ? new Date(Date.parse(invoice.invoice_date) + 30 * 24 * 60 * 60 * 1000).toISOString() : new Date().toISOString(),
        subtotal: invoice.hammer_price || 0,
        total_buyers_premium: invoice.buyers_premium || 0,
        total_vat: invoice.vat_amount || 0,
        shipping_cost: invoice.shipping_charge || 0,
        insurance_cost: invoice.insurance_charge || 0,
        brand_code: (invoice as any).brand_code || undefined
      }
      setSelectedInvoice(formattedInvoice as any)
    } catch (e) {
      // Fallback to current invoice without items
      setSelectedInvoice(invoice as any)
    }
    setIncludeShipping(withShipping)
    setShowInvoicePreview(true)
    setActionMenuOpen(null)
  }

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return
    }

    try {
      await InvoicesAPI.deleteInvoice(invoice.id!)
      setInvoices(prev => prev.filter(inv => inv.id !== invoice.id))
      setActionMenuOpen(null)
      alert('Invoice deleted successfully!')
    } catch (error) {
      console.error('Error deleting invoice:', error)
      alert('Failed to delete invoice. Please try again.')
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB')
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return '£0.00'
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
  }

  const getStatusBadge = (status?: string) => {
    const statusClasses = {
      draft: 'bg-gray-100 text-gray-800',
      generated: 'bg-blue-100 text-blue-800',
      sent: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    const className = statusClasses[status as keyof typeof statusClasses] || statusClasses.draft
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
        {status || 'draft'}
      </span>
    )
  }

  if (showInvoicePreview && selectedInvoice) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setShowInvoicePreview(false)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Invoices
            </button>
            <div className="text-sm text-gray-500">
              Invoice #{selectedInvoice.invoice_number} 
              {includeShipping && ' (With Logistics)'}
            </div>
          </div>
          <InvoicePDF 
            invoice={selectedInvoice as any} 
            includeShipping={includeShipping} 
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Internal Invoices</h1>
              <p className="text-gray-600 mt-2">Manage and generate invoices for auction sales</p>
            </div>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Plus className="h-5 w-5 mr-2" />
              Generate Invoice
            </button>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">All Saved Invoices</h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading invoices...</p>
                  </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
              <p className="text-gray-500 mb-6">Get started by generating your first invoice from an auction.</p>
                    <button
                onClick={() => setShowGenerateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                          Generate Invoice
                    </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Auction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Logistics
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                    </tr>
                  </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.auction_id ? `Auction #${invoice.auction_id}` : 'N/A'}
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.client ? 
                          `${invoice.client.first_name} ${invoice.client.last_name}` : 
                          invoice.client_id ? `Client #${invoice.client_id}` : 'N/A'
                        }
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.invoice_date)}
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invoice.status)}
                          </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(invoice.total_amount)}
                          </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {invoice.logistics ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Package className="h-3 w-3 mr-1" />
                            Added
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Not Added
                            </span>
                        )}
                          </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuOpen(actionMenuOpen === invoice.id ? null : invoice.id!)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                          
                          {actionMenuOpen === invoice.id && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                              <div className="py-1">
                              <button
                                  onClick={() => handleEditLogistics(invoice)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Edit className="h-4 w-4 mr-3" />
                                  Edit Logistics
                              </button>
                                <button
                                  onClick={() => handleViewInvoice(invoice, false)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Download className="h-4 w-4 mr-3" />
                                  Generate Invoice PDF
                                </button>
                                    <button
                                  onClick={() => handleViewInvoice(invoice, true)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Package className="h-4 w-4 mr-3" />
                                  Generate Final Invoice PDF
                                </button>
                                    <button
                                  onClick={() => handleDeleteInvoice(invoice)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-3" />
                                  Delete
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
            )}
                  </div>

        {/* Generate Invoice Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Generate Invoice from Auction</h3>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Auction
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                      {auctions.map((auction) => (
                      <div
                        key={auction.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedAuction?.id === auction.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedAuction(auction)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{auction.short_name}</h4>
                            <p className="text-sm text-gray-500">{auction.long_name}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>Status: {auction.status}</span>
                              <span>Lots: {auction.lots_count}</span>
                              <span>Brand ID: {auction.brand_id}</span>
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            auction.status === 'ended' ? 'bg-green-100 text-green-800' :
                            auction.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {auction.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                      setShowGenerateModal(false)
                      setSelectedAuction(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateInvoice}
                    disabled={!selectedAuction}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Generate Invoice
                    </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logistics Modal */}
        {showLogisticsModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Edit Logistics - Invoice #{selectedInvoice.invoice_number}
              </h3>
            </div>
              <div className="p-6">
                <LogisticsForm
                  invoice={{
                    ...selectedInvoice,
                    items: [], // Will be loaded from auction data
                    due_date: selectedInvoice.invoice_date ? new Date(Date.parse(selectedInvoice.invoice_date) + 30 * 24 * 60 * 60 * 1000).toISOString() : new Date().toISOString(),
                    subtotal: selectedInvoice.hammer_price || 0,
                    total_buyers_premium: selectedInvoice.buyers_premium || 0,
                    total_vat: selectedInvoice.vat_amount || 0,
                    shipping_cost: selectedInvoice.shipping_charge || 0,
                    insurance_cost: selectedInvoice.insurance_charge || 0,
                    client: selectedInvoice.client || null,
                    auction: selectedInvoice.auction || null,
                    brand_code: selectedInvoice.brand_id?.toString() || null
                  } as any}
                  onSubmit={handleLogisticsSubmit}
                  onCancel={() => {
                    setShowLogisticsModal(false)
                    setSelectedInvoice(null)
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 