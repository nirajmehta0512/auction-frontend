// frontend/src/app/invoices/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { FileText, Import, Plus, Download } from 'lucide-react'
import { getAuctions, getAuctionInvoices, exportEOACsv, type Auction, type Invoice } from '@/lib/auctions-api'
import { getBrands, type Brand } from '@/lib/brands-api'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { useBrand } from '@/lib/brand-context'
import EOAImportDialog from '@/components/auctions/EOAImportDialog'
import InvoiceTable from '@/components/invoices/InvoiceTable'

interface InvoicesPageState {
  auctions: Auction[]
  selectedAuctionId: number | null
  selectedAuction: Auction | null
  invoices: Invoice[]
  loading: boolean
  auctionsLoading: boolean
  page: number
  totalPages: number
  showEOADialog: boolean
}

export default function InvoicesPage() {
  const { brand } = useBrand()
  const [state, setState] = useState<InvoicesPageState>({
    auctions: [],
    selectedAuctionId: null,
    selectedAuction: null,
    invoices: [],
    loading: false,
    auctionsLoading: true,
    page: 1,
    totalPages: 1,
    showEOADialog: false
  })

  // Brand selection state
  const [selectedBrandId, setSelectedBrandId] = useState<number | 'all'>('all')
  const [brands, setBrands] = useState<Brand[]>([])

  // Separate state for buyer and vendor invoices
  const [buyerInvoices, setBuyerInvoices] = useState<Invoice[]>([])
  const [vendorInvoices, setVendorInvoices] = useState<Invoice[]>([])
  const [buyerLoading, setBuyerLoading] = useState(false)
  const [vendorLoading, setVendorLoading] = useState(false)

  // Load brands on component mount
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const response = await getBrands()
        if (response.success) {
          setBrands(response.data)
        }
      } catch (err: any) {
        console.error('Error loading brands:', err)
      }
    }
    loadBrands()
  }, [])

  // Load auctions when brands are loaded or brand selection changes
  useEffect(() => {
    if (brands.length > 0) {
      loadAuctions()
    }
  }, [brands.length, selectedBrandId])

  // Load invoices when auction is selected
  useEffect(() => {
    if (state.selectedAuctionId) {
      loadBuyerInvoices(state.selectedAuctionId, 1)
      loadVendorInvoices(state.selectedAuctionId, 1)
    } else {
      setBuyerInvoices([])
      setVendorInvoices([])
    }
  }, [state.selectedAuctionId, brand])

  // Get brand ID from brand code
  const getBrandId = (brandCode: string): number | undefined => {
    const foundBrand = brands.find(b => b.code === brandCode)
    return foundBrand?.id
  }

  const loadAuctions = async () => {
    try {
      setState(prev => ({ ...prev, auctionsLoading: true }))

      // Prepare auction query parameters
      const auctionParams: any = {
        page: 1,
        limit: 100
      }

      // Only add brand_id filter if a specific brand is selected (not 'all')
      if (selectedBrandId !== 'all') {
        auctionParams.brand_id = selectedBrandId
      }

      const response = await getAuctions(auctionParams)
      setState(prev => ({
        ...prev,
        auctions: response.auctions || [],
        auctionsLoading: false
      }))
    } catch (error) {
      console.error('Failed to load auctions:', error)
      setState(prev => ({ ...prev, auctionsLoading: false }))
    }
  }

  const loadBuyerInvoices = async (auctionId: number, page: number = 1) => {
    try {
      setBuyerLoading(true)

      const invoiceParams: any = {
        page,
        limit: 50,
        type: 'buyer'
      }

      // Only add brand_id filter if a specific brand is selected (not 'all')
      if (selectedBrandId !== 'all') {
        invoiceParams.brand_id = selectedBrandId
      }

      const response = await getAuctionInvoices(auctionId.toString(), invoiceParams)

      setBuyerInvoices(response.data.invoices || [])
      setBuyerLoading(false)
    } catch (error) {
      console.error('Failed to load buyer invoices:', error)
      setBuyerInvoices([])
      setBuyerLoading(false)
    }
  }

  const loadVendorInvoices = async (auctionId: number, page: number = 1) => {
    try {
      setVendorLoading(true)

      const invoiceParams: any = {
        page,
        limit: 50,
        type: 'vendor'
      }

      // Only add brand_id filter if a specific brand is selected (not 'all')
      if (selectedBrandId !== 'all') {
        invoiceParams.brand_id = selectedBrandId
      }

      const response = await getAuctionInvoices(auctionId.toString(), invoiceParams)

      setVendorInvoices(response.data.invoices || [])
      setVendorLoading(false)
    } catch (error) {
      console.error('Failed to load vendor invoices:', error)
      setVendorInvoices([])
      setVendorLoading(false)
    }
  }

  const handleAuctionSelect = (auctionId: string | null) => {
    const selectedId = auctionId ? parseInt(auctionId) : null
    const auction = selectedId ? state.auctions.find(a => a.id === selectedId) : null

    setState(prev => ({
      ...prev,
      selectedAuctionId: selectedId,
      selectedAuction: auction || null
    }))
  }

  const handleBrandSelect = (brandId: string | null) => {
    const selectedId = brandId === 'all' ? 'all' : (brandId ? parseInt(brandId) : 'all')
    setSelectedBrandId(selectedId)

    // Clear selected auction when brand changes
    setState(prev => ({
      ...prev,
      selectedAuctionId: null,
      selectedAuction: null
    }))

    // Clear invoices when brand changes
    setBuyerInvoices([])
    setVendorInvoices([])
  }



  const handleImportEOA = () => {
    if (!state.selectedAuctionId) {
      alert('Please select an auction first')
      return
    }
    setState(prev => ({ ...prev, showEOADialog: true }))
  }

  const handleExportEOA = async () => {
    if (!state.selectedAuctionId) {
      alert('Please select an auction first')
      return
    }

    try {
      const csvBlob = await exportEOACsv(state.selectedAuctionId.toString())

      // Create download link
      const url = window.URL.createObjectURL(csvBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `eoa-export-${state.selectedAuctionId}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export EOA CSV:', error)
      alert('Failed to export CSV. Please try again.')
    }
  }

  const handleEOAImportSuccess = () => {
    setState(prev => ({ ...prev, showEOADialog: false }))
    if (state.selectedAuctionId) {
      loadBuyerInvoices(state.selectedAuctionId, 1)
      loadVendorInvoices(state.selectedAuctionId, 1)
    }
  }

  const handleRefreshBuyer = () => {
    if (state.selectedAuctionId) {
      loadBuyerInvoices(state.selectedAuctionId, 1)
    }
  }

  const handleRefreshVendor = () => {
    if (state.selectedAuctionId) {
      loadVendorInvoices(state.selectedAuctionId, 1)
    }
  }

  const handleBuyerPageChange = (newPage: number) => {
    if (state.selectedAuctionId) {
      loadBuyerInvoices(state.selectedAuctionId, newPage)
    }
  }

  const handleVendorPageChange = (newPage: number) => {
    if (state.selectedAuctionId) {
      loadVendorInvoices(state.selectedAuctionId, newPage)
    }
  }

  // Convert auctions to SearchableSelect format
  const auctionOptions = state.auctions.map(auction => ({
    value: auction.id.toString(),
    label: `${auction.short_name} - ${auction.long_name}`,
    searchableText: `${auction.short_name} ${auction.long_name} ${auction.description || ''}`.toLowerCase()
  }))

  // Convert brands to SearchableSelect format
  const brandOptions = [
    { value: 'all', label: 'All Brands', searchableText: 'all brands' },
    ...brands.map(brand => ({
      value: brand.id.toString(),
      label: `${brand.name} (${brand.code})`,
      searchableText: `${brand.name} ${brand.code}`.toLowerCase()
    }))
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Invoice Management</h1>
          <p className="text-gray-600">
            Select an auction to view and manage its invoices. Import EOA data or generate PDFs for individual invoices.
          </p>
        </div>

        {/* Brand Selection */}
        <div className="bg-white rounded-lg shadow-sm border mb-6 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Brand</h2>
          <div className="max-w-md">
            <SearchableSelect
              options={brandOptions}
              value={selectedBrandId === 'all' ? 'all' : selectedBrandId?.toString() || 'all'}
              onChange={handleBrandSelect}
              placeholder="Search and select a brand..."
              isLoading={false}
            />
          </div>
        </div>

        {/* Auction Selection */}
        <div className="bg-white rounded-lg shadow-sm border mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Select Auction</h2>
            {state.selectedAuctionId && (
              <div className="flex space-x-3">
                <button
                  onClick={handleImportEOA}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
                >
                  <Import className="h-4 w-4 mr-2" />
                  Import EOA Data
                </button>
                <button
                  onClick={handleExportEOA}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer hover:underline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </button>
              </div>
            )}
          </div>

          <div className="max-w-md">
            <SearchableSelect
              options={auctionOptions}
              value={state.selectedAuctionId?.toString() || null}
              onChange={handleAuctionSelect}
              placeholder="Search and select an auction..."
              isLoading={state.auctionsLoading}
            />
          </div>

          {state.selectedAuction && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900">{state.selectedAuction.long_name}</h3>
              <p className="text-sm text-gray-600 mt-1">
                Status: <span className="capitalize">
                  {(() => {
                    const today = new Date()
                    const catalogueLaunchDate = state.selectedAuction.catalogue_launch_date ? new Date(state.selectedAuction.catalogue_launch_date) : null
                    const settlementDate = new Date(state.selectedAuction.settlement_date)

                    if (today > settlementDate) return 'Past'
                    else if (catalogueLaunchDate && today >= catalogueLaunchDate && today <= settlementDate) return 'Present'
                    else return 'Future'
                  })()}
                </span>
                {state.selectedAuction.settlement_date && (
                  <span className="ml-4">
                    Settlement: {new Date(state.selectedAuction.settlement_date).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Buyer Invoices Section */}
        {state.selectedAuctionId && (
          <div className="space-y-6">
            {/* Buyer Invoices */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Buyer Invoices - {state.selectedAuction?.short_name}
                  </h3>
                  <div className="text-sm text-gray-500">
                    {buyerInvoices.length} invoice{buyerInvoices.length !== 1 ? 's' : ''} found
                  </div>
                </div>
              </div>

              <InvoiceTable
                invoices={buyerInvoices}
                loading={buyerLoading}
                onRefresh={handleRefreshBuyer}
                invoiceType="buyer"
              />
            </div>

            {/* Vendor Invoices */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Vendor Invoices - {state.selectedAuction?.short_name}
                  </h3>
                  <div className="text-sm text-gray-500">
                    {vendorInvoices.length} invoice{vendorInvoices.length !== 1 ? 's' : ''} found
                  </div>
                </div>
              </div>

              <InvoiceTable
                invoices={vendorInvoices}
                loading={vendorLoading}
                onRefresh={handleRefreshVendor}
                invoiceType="vendor"
              />
            </div>
          </div>
        )}

        {/* EOA Import Dialog */}
        {state.showEOADialog && state.selectedAuctionId && (
          <EOAImportDialog
            auctionId={state.selectedAuctionId}
            onClose={() => setState(prev => ({ ...prev, showEOADialog: false }))}
            onImportComplete={(count) => {
              console.log(`Imported ${count} invoices`)
              handleEOAImportSuccess()
            }}
          />
        )}


      </div>
    </div>
  )
}