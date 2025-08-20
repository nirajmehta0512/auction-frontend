"use client"

import React, { useState, useEffect, useRef } from 'react'
import { FileText, Download, Truck, ArrowLeft, Eye, Plus, Search, Filter, Calendar, User, Gavel } from 'lucide-react'
import InvoicePDF from '../../components/invoices/InvoicePDF'
import LogisticsForm from '../../components/invoices/LogisticsForm'
import { createInvoice as saveInvoice, updateInvoice as updateInvoiceApi, getInvoices as fetchSavedInvoices, deleteInvoice as deleteSavedInvoice, type InternalInvoice } from '@/lib/invoices-api'
import { Invoice, InvoiceItem } from '../../types/invoice'
import { Copy } from 'lucide-react'
import { useBrand } from '@/lib/brand-context'
import { ArtworksAPI } from '@/lib/artworks-api'
import { fetchClients } from '@/lib/clients-api'

interface Auction {
  id: number
  short_name: string
  long_name: string
  settlement_date?: string
}

interface GeneratedInvoice {
  invoice: Invoice
}

export default function InvoicesPage() {
  const [currentView, setCurrentView] = useState<'list' | 'preview' | 'logistics'>('list')
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [selectedAuctionId, setSelectedAuctionId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedInvoices, setGeneratedInvoices] = useState<GeneratedInvoice[]>([])
  const { brand } = useBrand()
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showingLogisticsForm, setShowingLogisticsForm] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(false);
  const [savedInvoices, setSavedInvoices] = useState<InternalInvoice[]>([])
  const savedIdByInvoiceNumberRef = useRef<Record<string, number>>({})

  // invoiceRef no longer needed - PDF generation is handled by InvoicePDF component

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          console.error('No token found - redirecting to login')
          window.location.href = '/auth/login'
          return
        }

        // Include brand_code so backend can authorize properly when auctions are not public
        const params = new URLSearchParams()
        if (brand) params.set('brand_code', brand)

        const response = await fetch(`/api/auctions${params.toString() ? `?${params.toString()}` : ''}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.status === 401) {
          console.error('Authentication failed - redirecting to login')
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/auth/login'
          return
        }
        
        if (response.ok) {
          const data = await response.json()
          console.log('✅ Loaded auctions:', data.auctions?.length || 0)
          setAuctions(data.auctions || [])
        } else {
          const text = await response.text().catch(() => '')
          console.error('Failed to fetch auctions:', text || response.statusText)
          setError(text || 'Failed to fetch auctions')
        }
      } catch (err) {
        console.error('Error fetching auctions:', err)
        setError(err instanceof Error ? err.message : 'Error fetching auctions')
      }
    }

    fetchAuctions()
    // Load saved invoices snapshots
    ;(async () => {
      try {
        const res = await fetchSavedInvoices({ limit: 200 })
        setSavedInvoices(res.invoices || [])
        const map: Record<string, number> = {}
        ;(res.invoices || []).forEach((inv: InternalInvoice) => { if (inv.invoice_number) map[inv.invoice_number] = inv.id })
        savedIdByInvoiceNumberRef.current = map
      } catch (e) {
        console.error('Failed to load saved invoices', e)
      }
    })()
  }, [brand])

  const generateInvoiceNumber = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const time = String(now.getTime()).slice(-6)
    const prefix = brand === 'MSABER' ? 'MSA' : brand === 'AURUM' ? 'AUR' : 'MTS'
    return `${prefix}-INV-${year}${month}${day}-${time}`
  }

  const generateBasicInvoice = async () => {
    if (!selectedAuctionId) {
      alert('Please select an auction')
      return
    }

    try {
      setGenerating(true)
      setError(null)
      
      const selectedAuction = auctions.find(a => a.id.toString() === selectedAuctionId)
      if (!selectedAuction) {
        throw new Error('Selected auction not found')
      }

      // Fetch auction items and client data
      const [itemsResponse, clientResponse] = await Promise.all([
        fetch(`/api/items?auction_id=${encodeURIComponent(selectedAuction.id.toString())}&limit=1000`, {
        // fetch(`/api/items?auction_id=${encodeURIComponent(selectedAuction.id.toString())}&brand_code=${encodeURIComponent(brand)}&limit=1000`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        // Get the first available client as fallback
        fetch('/api/clients?limit=1', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ])

      if (!itemsResponse.ok) {
        const itemsError = await itemsResponse.text()
        console.error('Items API error:', itemsError)
        throw new Error(`Failed to fetch items: ${itemsResponse.status} ${itemsError}`)
      }
      
      if (!clientResponse.ok) {
        const clientError = await clientResponse.text()
        console.error('Client API error:', clientError)
        throw new Error(`Failed to fetch client: ${clientResponse.status} ${clientError}`)
      }

      const [itemsData, clientsData] = await Promise.all([
        itemsResponse.json(),
        clientResponse.json()
      ])

      console.log('Items response structure:', itemsData)
      console.log('Clients response structure:', clientsData)

      // Extract items array from response data - check multiple possible structures
      const items = itemsData.data || itemsData.items || itemsData || []
      const client = clientsData.data?.[0] || clientsData.clients?.[0] || clientsData[0] || null

      if (!client) {
        throw new Error('No clients found. Please add clients before generating invoices.')
      }

      if (items.length === 0) {
        throw new Error(`No items found for auction "${selectedAuction.short_name}". Please add items to this auction first.`)
      }

      // Create invoice items with proper pricing
      const invoiceItems: InvoiceItem[] = items.map((item: any) => ({
        id: item.id,
        lot_num: item.lot_num,
        title: item.title,
        description: item.description,
        hammer_price: parseFloat(item.low_est) || 100, // Using low estimate as hammer price for demo
        buyers_premium: 0, // Will be calculated
        buyers_premium_vat: 0, // Will be calculated
        vat_code: 'M' as const, // Margin scheme
        vat_rate: 0,
        dimensions: item.dimensions,
        weight: item.weight
      }))

      // Create the invoice
      const invoice: Invoice = {
        id: Date.now().toString(),
        invoice_number: generateInvoiceNumber(),
        invoice_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        brand_code: brand as any,
        client: {
          id: client.id,
          display_id: `${((client.brand_code || client.brand || 'MSABER')).toUpperCase().slice(0,3)}-${String(client.id).padStart(3,'0')}`,
          first_name: client.first_name,
          last_name: client.last_name,
          email: client.email,
          phone_number: client.phone_number,
          company_name: client.company_name,
          vat_number: client.vat_number,
          billing_address1: client.billing_address1,
          billing_address2: client.billing_address2,
          billing_city: client.billing_city,
          billing_post_code: client.billing_post_code,
          billing_country: client.billing_country
        },
        auction: {
          id: selectedAuction.id,
          short_name: selectedAuction.short_name,
          long_name: selectedAuction.long_name,
          settlement_date: selectedAuction.settlement_date || new Date().toISOString(),
          vat_number: '478646141',
          eori_number: 'GB478646141000'
        },
        items: invoiceItems,
        subtotal: invoiceItems.reduce((sum, item) => sum + item.hammer_price, 0),
        total_buyers_premium: 0, // Will be calculated in PDF component
        total_vat: 0,
        shipping_cost: 0,
        insurance_cost: 0,
        total_amount: 0, // Will be calculated in PDF component
        amount_due: 0, // Will be calculated in PDF component
        total_net_payments: 0,
        status: 'draft',
        logistics_added: false
      }

      setGeneratedInvoices(prev => [...prev, { invoice }])
      setSelectedInvoice(invoice)
      setCurrentView('preview')
      
    } catch (err: any) {
      console.error('Error generating invoice:', err)
      setError(err.message || 'Failed to generate invoice')
    } finally {
      setGenerating(false)
    }
  }

  // PDF generation is now handled by the InvoicePDF component

  const handleAddLogistics = (invoice: Invoice) => {
    setShowingLogisticsForm(invoice)
    setCurrentView('logistics')
  }

  const handleLogisticsSubmit = (logisticsInfo: any) => {
    if (!showingLogisticsForm) return

    // Update the invoice with logistics information
    const updatedInvoice: Invoice = {
      ...showingLogisticsForm,
      logistics_added: true,
      shipping_cost: logisticsInfo.shipping_cost || 0,
      insurance_cost: logisticsInfo.insurance_cost || 0
    }

    setGeneratedInvoices(prev => 
      prev.map(gi => 
        gi.invoice.id === updatedInvoice.id 
          ? { invoice: updatedInvoice }
          : gi
      )
    )
    
    if (selectedInvoice?.id === updatedInvoice.id) {
      setSelectedInvoice(updatedInvoice)
    }
    
    setShowingLogisticsForm(null)
    setCurrentView('preview')

    // Persist to saved invoice if exists
    const savedId = savedIdByInvoiceNumberRef.current[updatedInvoice.invoice_number]
    if (savedId) {
      updateInvoiceApi(String(savedId), {
        shipping_charge: updatedInvoice.shipping_cost,
        insurance_charge: updatedInvoice.insurance_cost,
        total_shipping_amount: (updatedInvoice.shipping_cost || 0) + (updatedInvoice.insurance_cost || 0),
        logistics: logisticsInfo,
      }).then(async () => {
        try {
          const res = await fetchSavedInvoices({ limit: 200 })
          setSavedInvoices(res.invoices || [])
        } catch {}
      }).catch(err => console.error('Failed to update saved invoice logistics', err))
    }
  }

  const handleLogisticsCancel = () => {
    setShowingLogisticsForm(null)
    setCurrentView('preview')
  }

  const generatePaymentLink = async (invoice: any) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/xero/payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceNumber: invoice.invoice_number,
          amount: invoice.total_amount || 0,
                     customerName: invoice.client?.first_name && invoice.client?.last_name 
             ? `${invoice.client.first_name} ${invoice.client.last_name}`
             : 'Unknown Client',
          customerEmail: invoice.client?.email || '',
          dueDate: invoice.due_date,
          lineItems: invoice.items?.map((item: any) => ({
            description: `${item.title} (Lot ${item.lot_num})`,
            quantity: 1,
            unitAmount: item.hammer_price || 0,
            accountCode: '200',
            taxType: 'NONE'
          })) || []
        })
      });

      if (response.ok) {
        const data = await response.json();
        const paymentUrl = data.paymentLink?.onlineInvoiceUrl || data.paymentLink?.paymentUrl;
        
        if (paymentUrl) {
          // Copy to clipboard
          await navigator.clipboard.writeText(paymentUrl);
          alert(`Payment link copied to clipboard!\n\n${paymentUrl}`);
          
          // Optionally open in new tab
          window.open(paymentUrl, '_blank');
        } else {
          alert('Failed to generate payment link');
        }
      } else {
        alert('Failed to generate payment link');
      }
    } catch (error) {
      console.error('Error generating payment link:', error);
      alert('Error generating payment link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Invoice Management</h1>
              <p className="text-gray-600">Generate, manage, and track auction invoices</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {currentView === 'list' && (
          <div className="space-y-6">
            {/* Generate Invoice Card */}
            <div className="card card-hover">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Generate New Invoice</h2>
                    <p className="text-sm text-gray-600 mt-1">Select an auction to create a professional invoice</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="form-group">
                      <label htmlFor="auction-select" className="form-label">
                        Select Auction
                      </label>
                      <div className="relative">
                        <select
                          id="auction-select"
                          value={selectedAuctionId}
                          onChange={(e) => setSelectedAuctionId(e.target.value)}
                          className="form-select pl-10"
                        >
                          <option value="">Choose an auction...</option>
                          {auctions.map((auction) => (
                            <option key={auction.id} value={auction.id.toString()}>
                              {auction.long_name} - {auction.short_name}
                            </option>
                          ))}
                        </select>
                        <Gavel className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={generateBasicInvoice}
                      disabled={!selectedAuctionId || generating}
                      className="btn btn-primary btn-lg w-full"
                    >
                      {generating ? (
                        <>
                          <div className="loading mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-5 w-5 mr-2" />
                          Generate Invoice
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Saved Invoices */}
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Saved Invoices</h2>
                    <p className="text-sm text-gray-600 mt-1">Invoices saved to database</p>
                  </div>
                </div>
              </div>
              <div className="overflow-hidden">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Client</th>
                      <th>Auction</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="font-mono text-sm">{inv.invoice_number}</td>
                        <td className="text-sm">{(inv as any).client_name || inv.client_id || '-'}</td>
                        <td className="text-sm">{(inv as any).auction_name || inv.auction_id || '-'}</td>
                        <td>
                          <span className={`badge ${inv.is_international ? 'badge-secondary' : 'badge-ghost'}`}>{inv.payment_status || 'pending'}</span>
                        </td>
                        <td className="font-semibold">£{Number(inv.total_amount || 0).toFixed(2)}</td>
                        <td>
                          <div className="flex items-center justify-end space-x-2">
                            <div className="dropdown dropdown-end">
                              <button className="btn btn-ghost btn-sm">⋯</button>
                              <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-56">
                                <li>
                                  <button
                                    onClick={async () => {
                                      try {
                                        const itemsRes = await ArtworksAPI.getArtworks({ auction_id: String(inv.auction_id || ''), limit: 1000, brand_code: brand as any })
                                        const clientsRes = await fetchClients({ limit: 1 })
                                        const client = clientsRes.data?.[0]
                                        const invoice: Invoice = {
                                          id: String(inv.id),
                                          invoice_number: inv.invoice_number,
                                          invoice_date: inv.invoice_date,
                                          due_date: inv.due_date || new Date().toISOString(),
                                          brand_code: brand as any,
                                          client: client ? {
                                            id: client.id,
                                            display_id: `${((client.brand_code || client.brand || 'MSABER')).toUpperCase().slice(0,3)}-${String(client.id).padStart(3,'0')}`,
                                            first_name: client.first_name,
                                            last_name: client.last_name,
                                            email: client.email,
                                            phone_number: client.phone_number,
                                            company_name: client.company_name,
                                            vat_number: client.vat_number,
                                            billing_address1: client.billing_address1,
                                            billing_address2: client.billing_address2,
                                            billing_city: client.billing_city,
                                            billing_post_code: client.billing_post_code,
                                            billing_country: client.billing_country,
                                          } : { id: 0, display_id: 'N/A', first_name: 'Client', last_name: 'Unknown' } as any,
                                          auction: {
                                            id: Number(inv.auction_id || 0),
                                            short_name: 'Auction',
                                            long_name: 'Auction',
                                            settlement_date: new Date().toISOString(),
                                            vat_number: '478646141',
                                            eori_number: 'GB478646141000',
                                          },
                                          items: (itemsRes.data || []).map((it: any) => ({
                                            id: it.id,
                                            lot_num: it.lot_num,
                                            title: it.title,
                                            description: it.description,
                                            hammer_price: Number(it.low_est || 0),
                                            buyers_premium: 0,
                                            buyers_premium_vat: 0,
                                            vat_code: 'M',
                                            vat_rate: 0,
                                            dimensions: it.dimensions,
                                            weight: it.weight,
                                          })),
                                          subtotal: Number(inv.hammer_price || 0),
                                          total_buyers_premium: Number(inv.buyers_premium || 0),
                                          total_vat: Number(inv.vat_amount || 0),
                                          shipping_cost: Number(inv.shipping_charge || 0),
                                          insurance_cost: Number(inv.insurance_charge || 0),
                                          total_amount: Number(inv.total_amount || 0),
                                          amount_due: Number(inv.total_amount || 0),
                                          total_net_payments: 0,
                                          status: 'draft',
                                          logistics_added: !!((inv.shipping_charge || 0) + (inv.insurance_charge || 0)),
                                        }
                                        setSelectedInvoice(invoice)
                                        setCurrentView('preview')
                                      } catch (e) {
                                        console.error('Failed to reconstruct invoice', e)
                                      }
                                    }}
                                  >Edit logistics / Generate PDFs</button>
                                </li>
                                <li>
                                  <button
                                    onClick={() => {
                                      const client: any = { first_name: (inv as any).client_name || 'Client', last_name: '', display_id: String(inv.client_id || '') }
                                      const invoice: Invoice = {
                                        id: String(inv.id),
                                        invoice_number: inv.invoice_number,
                                        invoice_date: inv.invoice_date,
                                        due_date: inv.due_date || new Date().toISOString(),
                                        brand_code: brand as any,
                                        client,
                                        auction: { id: Number(inv.auction_id || 0), short_name: (inv as any).auction_name || 'Auction', long_name: (inv as any).auction_name || 'Auction', settlement_date: new Date().toISOString(), vat_number: '478646141', eori_number: 'GB478646141000' },
                                        items: [],
                                        subtotal: Number((inv as any).hammer_price || 0),
                                        total_buyers_premium: Number((inv as any).buyers_premium || 0),
                                        total_vat: Number((inv as any).vat_amount || 0),
                                        shipping_cost: Number((inv as any).shipping_charge || 0),
                                        insurance_cost: Number((inv as any).insurance_charge || 0),
                                        total_amount: Number((inv as any).total_amount || 0),
                                        amount_due: Number((inv as any).total_amount || 0),
                                        total_net_payments: 0,
                                        status: 'draft',
                                        logistics_added: true,
                                      }
                                      setSelectedInvoice(invoice)
                                      setCurrentView('preview')
                                    }}
                                  >Generate final PDF</button>
                                </li>
                                <li>
                                  <button
                                    onClick={async () => {
                                      if (!confirm('Delete this saved invoice?')) return
                                      try {
                                        await deleteSavedInvoice(String(inv.id))
                                        setSavedInvoices(prev => prev.filter(s => s.id !== inv.id))
                                      } catch (e) {
                                        alert('Failed to delete invoice')
                                      }
                                    }}
                                  >Delete</button>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Generated Invoices */}
            {generatedInvoices.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Recent Invoices</h2>
                      <p className="text-sm text-gray-600 mt-1">Manage your generated invoices</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="btn btn-ghost btn-sm">
                        <Search className="h-4 w-4 mr-2" />
                        Search
                      </button>
                      <button className="btn btn-ghost btn-sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                      </button>
                    </div>
                  </div>
                </div>
                <div className="overflow-hidden">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Client</th>
                        <th>Auction</th>
                        <th>Status</th>
                        <th>Total</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedInvoices.map((gi, index) => (
                        <tr key={index}>
                          <td className="font-mono text-sm">{gi.invoice.invoice_number}</td>
                          <td>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-gray-600" />
                              </div>
                              <div>
                                <div className="font-medium">{gi.invoice.client.first_name} {gi.invoice.client.last_name}</div>
                                <div className="text-sm text-gray-500">{gi.invoice.client.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-secondary">{gi.invoice.auction.short_name}</span>
                          </td>
                          <td>
                            <span className={`badge ${
                              gi.invoice.logistics_added
                                ? 'badge-success'
                                : 'badge-warning'
                            }`}>
                              {gi.invoice.logistics_added ? 'With Logistics' : 'Basic'}
                            </span>
                          </td>
                          <td className="font-semibold">£{gi.invoice.subtotal.toFixed(2)}</td>
                          <td>
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedInvoice(gi.invoice)
                                  setCurrentView('preview')
                                }}
                                className="btn btn-ghost btn-sm"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </button>
                              {!gi.invoice.logistics_added && (
                                <button
                                  onClick={() => handleAddLogistics(gi.invoice)}
                                  className="btn btn-primary btn-sm"
                                >
                                  <Truck className="h-4 w-4 mr-1" />
                                  Add Logistics
                                </button>
                              )}
                              <div className="dropdown dropdown-end">
                                <button className="btn btn-ghost btn-sm">⋯</button>
                                <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                                  <li>
                                    <button
                                      onClick={async () => {
                                        try {
                                          const saved = await saveInvoice({
                                            brand_code: brand as any,
                                            client_id: gi.invoice.client.id,
                                            auction_id: gi.invoice.auction.id,
                                            invoice_date: gi.invoice.invoice_date,
                                            due_date: gi.invoice.due_date,
                                            is_international: false,
                                            hammer_price: gi.invoice.subtotal,
                                            buyers_premium: 0,
                                            vat_amount: 0,
                                            total_amount: gi.invoice.subtotal,
                                            shipping_charge: gi.invoice.shipping_cost,
                                            insurance_charge: gi.invoice.insurance_cost,
                                            handling_charge: 0,
                                            international_surcharge: 0,
                                            total_shipping_amount: (gi.invoice.shipping_cost || 0) + (gi.invoice.insurance_cost || 0),
                                          })
                                          savedIdByInvoiceNumberRef.current[saved.invoice_number] = saved.id
                                          setSavedInvoices(prev => [saved as any, ...prev])
                                          alert(`Invoice saved: ${saved.invoice_number}`)
                                        } catch (e: any) {
                                          alert(`Failed to save invoice: ${e.message}`)
                                        }
                                      }}
                                    >Save</button>
                                  </li>
                                  <li>
                                    <button onClick={() => handleAddLogistics(gi.invoice)}>Edit logistics</button>
                                  </li>
                                  <li>
                                    <button
                                      onClick={() => {
                                        const savedId = savedIdByInvoiceNumberRef.current[gi.invoice.invoice_number]
                                        if (savedId) {
                                          window.location.href = `/refunds/new-invoice?invoice_id=${savedId}`
                                        } else {
                                          alert('Please save the invoice first to create a refund.')
                                        }
                                      }}
                                    >Create refund from invoice</button>
                                  </li>
                                  <li>
                                    <button onClick={() => { setSelectedInvoice(gi.invoice); setCurrentView('preview') }}>Generate invoice PDF</button>
                                  </li>
                                  <li>
                                    <button onClick={() => { setSelectedInvoice({ ...gi.invoice, logistics_added: true }); setCurrentView('preview') }}>Generate final invoice PDF</button>
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Available Auctions */}
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Available Auctions</h2>
                    <p className="text-sm text-gray-600 mt-1">Select an auction to generate invoices</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {auctions.length} auctions available
                  </div>
                </div>
              </div>
              
              {auctions.length > 0 ? (
                <div className="overflow-hidden">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Auction Name</th>
                        <th>Short Name</th>
                        <th>Settlement Date</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auctions.map((auction) => (
                        <tr key={auction.id}>
                          <td className="font-medium">{auction.long_name}</td>
                          <td>
                            <span className="badge badge-primary">{auction.short_name}</span>
                          </td>
                          <td>
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>
                                {auction.settlement_date ? new Date(auction.settlement_date).toLocaleDateString() : 'Not set'}
                              </span>
                            </div>
                          </td>
                          <td className="text-right">
                            <button
                              onClick={() => {
                                setSelectedAuctionId(auction.id.toString())
                                generateBasicInvoice()
                              }}
                              disabled={generating}
                              className="btn btn-primary btn-sm"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Generate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card-body text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Gavel className="h-16 w-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No auctions available</h3>
                  <p className="text-gray-500 mb-4">No auctions have been created yet. Contact your administrator to create auctions.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invoice Preview */}
        {currentView === 'preview' && selectedInvoice && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Invoice Preview</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Invoice #{selectedInvoice.invoice_number} • {selectedInvoice.items.length} items
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {!selectedInvoice.logistics_added ? (
                      <button
                        onClick={() => handleAddLogistics(selectedInvoice)}
                        className="btn btn-success btn-md"
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Add Logistics
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddLogistics(selectedInvoice)}
                        className="btn btn-secondary btn-md"
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Edit Logistics
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        setCurrentView('list')
                        setSelectedInvoice(null)
                        setShowingLogisticsForm(null)
                      }}
                      className="btn btn-ghost btn-md"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to List
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <InvoicePDF 
              invoice={selectedInvoice} 
              includeShipping={selectedInvoice.logistics_added}
            />
          </div>
        )}

        {/* Logistics Form */}
        {currentView === 'logistics' && showingLogisticsForm && (
          <LogisticsForm
            invoice={showingLogisticsForm}
            onSubmit={handleLogisticsSubmit}
            onCancel={handleLogisticsCancel}
          />
        )}

        {/* Help Section */}
        <div className="mt-16">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-bold text-sm">?</span>
                </div>
                How to use Invoice Management
              </h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Generate Invoice</h4>
                      <p className="text-sm text-gray-600">Select an auction and click "Generate Invoice" to create a new professional invoice with all auction details.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Add Logistics</h4>
                      <p className="text-sm text-gray-600">Include shipping, handling, and insurance costs to create comprehensive invoices for your clients.</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Download PDF</h4>
                      <p className="text-sm text-gray-600">Professional PDF invoices with selectable text, proper formatting, and company branding.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">4</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Track & Manage</h4>
                      <p className="text-sm text-gray-600">Monitor invoice status, track payments, and manage your auction business efficiently.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 