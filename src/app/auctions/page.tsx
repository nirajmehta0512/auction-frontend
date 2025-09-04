"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuctionsTable from '@/components/auctions/AuctionsTable'
import CSVUpload from '@/components/auctions/CSVUpload'
import { Plus, Download, Upload, RefreshCw } from 'lucide-react'

import { getAuctions, exportAuctionsCSV, deleteAuction, getAuctionStatusCounts } from '@/lib/auctions-api'
import { getBrands, type Brand } from '@/lib/brands-api'
import { useBrand } from '@/lib/brand-context'
import type { Auction } from '@/lib/auctions-api'
import AuctionExportDialog from '@/components/auctions/AuctionExportDialog'
import AuctionGoogleSheetsSync from '@/components/auctions/AuctionGoogleSheetsSync'
import AuctionsFilter from '@/components/auctions/AuctionsFilter'
import EOAImportDialog from '@/components/auctions/EOAImportDialog'

// Convert API auction to component auction format
const convertAuctionFormat = (auction: Auction) => ({
  id: auction.id,
  number: auction.id.toString().slice(-3),
  short_name: auction.short_name,
  long_name: auction.long_name || auction.short_name,
  type: auction.type === 'timed' ? 'Timed' : auction.type === 'live' ? 'Live' : 'Private Sale',
  lots: auction.artwork_ids?.length || 0,
  endingDate: auction.settlement_date ? new Date(auction.settlement_date).toLocaleDateString() : '',
  catalogue_launch_date: auction.catalogue_launch_date,
  settlement_date: auction.settlement_date,
  upload_status: auction.upload_status
})

interface FilterState {
  status: string
  type: string
  search: string
  specialist: string
  dateRange: string
}

export default function AuctionsPage() {
  const router = useRouter()
  const { brand } = useBrand()

  const [selectedAuctions, setSelectedAuctions] = useState<number[]>([])
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [auctions, setAuctions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12, // Show only 12 items as requested
    total: 0,
    pages: 0
  })

  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showGoogleSheetsSync, setShowGoogleSheetsSync] = useState(false)
  const [showEOADialog, setShowEOADialog] = useState(false)
  const [selectedAuctionForEOA, setSelectedAuctionForEOA] = useState<number | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])

  // Get brand ID from brand code
  const getBrandId = (brandCode: string): number | undefined => {
    const foundBrand = brands.find(b => b.code === brandCode)
    return foundBrand?.id
  }

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    type: 'all',
    search: '',
    specialist: 'all',
    dateRange: 'all'
  })
  const [statusCounts, setStatusCounts] = useState({
    future: 0,
    present: 0,
    past: 0
  })

  // Sort state
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    const loadAuctions = async () => {
      try {
        setLoading(true)
        setError(null)

        // Prepare backend filters - let backend handle all filtering and sorting
        const brandId = getBrandId(brand)
        const backendFilters: any = {
          page: pagination.page,
          limit: pagination.limit,
          sort_field: sortField,
          sort_direction: sortDirection,
          brand_id: brandId
        }

        // Apply filters to backend request
        if (filters.type !== 'all') {
          backendFilters.type = filters.type
        }

        if (filters.search) {
          backendFilters.search = filters.search
        }

        // Note: specialist and dateRange filters will be applied client-side for now
        // since the backend doesn't support them yet
        
        const response = await getAuctions(backendFilters)
        
        let filteredAuctions = response.auctions

        // Apply remaining client-side filters that backend doesn't support
        if (filters.status !== 'all') {
          filteredAuctions = filteredAuctions.filter(auction => {
            const today = new Date()
            const catalogueLaunchDate = auction.catalogue_launch_date ? new Date(auction.catalogue_launch_date) : null
            const settlementDate = new Date(auction.settlement_date)

            let auctionStatus = 'future'
            if (today > settlementDate) {
              auctionStatus = 'past'
            } else if (catalogueLaunchDate && today >= catalogueLaunchDate && today <= settlementDate) {
              auctionStatus = 'present'
            }

            return auctionStatus === filters.status
          })
        }

        if (filters.specialist !== 'all') {
          filteredAuctions = filteredAuctions.filter(auction => auction.specialist_id === parseInt(filters.specialist))
        }

        // Apply date range filter
        if (filters.dateRange !== 'all') {
          filteredAuctions = applyDateRangeFilter(filteredAuctions, filters.dateRange)
        }
        
        // Convert API auctions to component format
        const convertedAuctions = filteredAuctions.map(convertAuctionFormat)
        setAuctions(convertedAuctions)
        
        // Update pagination state
        if (response.pagination) {
          setPagination(response.pagination)
        }
        
        // Calculate status counts using dedicated endpoint
        try {
          const brandId = getBrandId(brand)
          const countsResponse = await getAuctionStatusCounts(brandId);
          if (countsResponse.success) {
            setStatusCounts(countsResponse.counts);
          }
        } catch (error) {
          console.warn('Failed to fetch status counts:', error);
          // Fallback to calculating from current page data
          calculateStatusCounts(filteredAuctions);
        }
      } catch (err: any) {
        console.error('Error loading auctions:', err)
        const msg = err?.message || 'Failed to load auctions'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }

    loadAuctions()
  }, [brand, filters, sortField, sortDirection, pagination.page, pagination.limit])

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

  // Handle sort changes
  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field)
    setSortDirection(direction)
  }

  // Helper function to apply date range filters
  const applyDateRangeFilter = (auctions: any[], dateRange: string) => {
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const startOfPastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    return auctions.filter(auction => {
      if (!auction.settlement_date) return false
      const auctionDate = new Date(auction.settlement_date)

      switch (dateRange) {
        case 'this_week':
          return auctionDate >= startOfWeek
        case 'this_month':
          return auctionDate >= startOfMonth && auctionDate < startOfNextMonth
        case 'next_month':
          return auctionDate >= startOfNextMonth
        case 'past_month':
          return auctionDate >= startOfPastMonth && auctionDate < startOfMonth
        default:
          return true
      }
    })
  }

  // Helper function to calculate status counts
  const calculateStatusCounts = (auctions: any[]) => {
    const counts = {
      future: 0,
      present: 0,
      past: 0
    }

    const today = new Date()

    auctions.forEach(auction => {
      const catalogueLaunchDate = auction.catalogue_launch_date ? new Date(auction.catalogue_launch_date) : null
      const settlementDate = new Date(auction.settlement_date)

      if (today > settlementDate) {
        counts.past++
      } else if (catalogueLaunchDate && today >= catalogueLaunchDate && today <= settlementDate) {
        counts.present++
      } else {
        counts.future++
      }
    })

    setStatusCounts(counts)
  }

  // Filter change handler
  const handleFilterChange = (filterUpdates: Partial<FilterState>) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...filterUpdates
    }))
  }

  const handleExportCSV = async () => {
    try {
      const blob = await exportAuctionsCSV()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'auctions.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting auctions:', error)
    }
  }

  const handleCSVUploadComplete = async (importedCount: number) => {
    setShowCSVUpload(false)
    console.log(`Imported ${importedCount} auctions`)
    
    // Refresh auctions list
    try {
      const response = await getAuctions({
        page: 1,
        limit: 25,
        sort_field: 'id',
        sort_direction: 'asc'
      })
      
      const convertedAuctions = response.auctions.map(convertAuctionFormat)
      setAuctions(convertedAuctions)
    } catch (err) {
      console.error('Error refreshing auctions:', err)
    }
  }

  const handleViewAuction = (auctionId: number) => {
    router.push(`/auctions/view/${auctionId}`)
  }

  const handleEditAuction = (auctionId: number) => {
    router.push(`/auctions/edit/${auctionId}`)
  }

  const handleDeleteAuction = async (auctionId: number) => {
    if (!confirm('Are you sure you want to delete this auction? This action cannot be undone.')) {
      return
    }

    try {
      await deleteAuction(String(auctionId))
      
      // Refresh auctions list
      const brandId = getBrandId(brand)
      const response = await getAuctions({
        page: 1,
        limit: 25,
        sort_field: 'id',
        sort_direction: 'asc',
        brand_id: brandId
      })
      
      const convertedAuctions = response.auctions.map(convertAuctionFormat)
      setAuctions(convertedAuctions)
      
      setError(null)
    } catch (err: any) {
      console.error('Error deleting auction:', err)
      setError(`Failed to delete auction: ${err.message}`)
    }
  }

  const handleImportEOA = (auctionId: number) => {
    setSelectedAuctionForEOA(auctionId)
    setShowEOADialog(true)
  }

  const handleGenerateInvoice = (auctionId: number) => {
    // Navigate to auction invoice view page
    router.push(`/auctions/${auctionId}/invoices`)
  }

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="bg-slate-700 px-2 py-3 sm:px-4 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 w-full">
        <h1 className="text-lg sm:text-2xl font-semibold text-white">Auctions</h1>
        <button 
          onClick={() => router.push('/auctions/new')}
          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-md flex items-center justify-center sm:justify-start space-x-2 transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add New Auction</span>
          <span className="sm:hidden">Add Auction</span>
        </button>
      </div>

      {/* Filters */}
      <AuctionsFilter 
        filters={filters}
        onFilterChange={handleFilterChange}
        statusCounts={statusCounts}
      />

      {/* Table Actions */}
      <div className="bg-white px-2 sm:px-4 py-3 border-b border-gray-200 w-full">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full max-w-full">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1 sm:space-x-2 text-gray-600 hover:text-gray-700 text-xs sm:text-sm"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
          <button
            onClick={() => setShowExportDialog(true)}
            className="flex items-center space-x-1 sm:space-x-2 text-blue-600 hover:text-blue-700 text-xs sm:text-sm"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Export to Platforms</span>
            <span className="sm:hidden">Platforms</span>
          </button>
          <button
            onClick={() => setShowCSVUpload(true)}
            className="flex items-center space-x-1 sm:space-x-2 text-gray-600 hover:text-gray-700 text-xs sm:text-sm"
          >
            <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Import CSV</span>
            <span className="sm:hidden">Import</span>
          </button>
          <button
            onClick={() => setShowGoogleSheetsSync(true)}
            className="flex items-center space-x-1 sm:space-x-2 text-indigo-600 hover:text-indigo-700 text-xs sm:text-sm"
          >
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Sync Sheets</span>
            <span className="sm:hidden">Sheets</span>
          </button>

          <button className="text-gray-600 hover:text-gray-700 text-xs sm:text-sm">
            <span className="hidden sm:inline">Show/Hide</span>
            <span className="sm:hidden">View</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-2 sm:mx-4 mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg w-auto max-w-full">
          <p className="text-red-800 text-sm">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-800 underline text-xs sm:text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Auctions Table */}
      <div className="flex-1 overflow-auto bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading auctions...</span>
          </div>
        ) : (
          <AuctionsTable 
            auctions={auctions}
            selectedAuctions={selectedAuctions}
            onSelectionChange={setSelectedAuctions}
            onView={handleViewAuction}
            onEdit={handleEditAuction}
            onDelete={handleDeleteAuction}
            onImportEOA={handleImportEOA}
            onGenerateInvoice={handleGenerateInvoice}
            onSort={handleSort}
            currentSortField={sortField}
            currentSortDirection={sortDirection}
          />
        )}
      </div>

      {/* Footer with Status Indicators and Pagination */}
      <div className="bg-white border-t border-gray-200 px-2 sm:px-4 py-3 sm:py-4 w-full">
        <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 w-full max-w-full">
          {/* Status Indicators */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 lg:gap-6 text-xs sm:text-sm">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-100 border border-blue-300 rounded-full"></div>
              <span className="text-gray-600">Future ({statusCounts.future})</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-100 border border-green-300 rounded-full"></div>
              <span className="text-gray-600">Present ({statusCounts.present})</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-100 border border-red-300 rounded-full"></div>
              <span className="text-gray-600">Past ({statusCounts.past})</span>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col space-y-2 sm:space-y-3 lg:space-y-0 lg:flex-row lg:items-center lg:space-x-4">
            <span className="text-xs sm:text-sm text-gray-600 text-center lg:text-left">
              Items: {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} - {Math.min(pagination.page * pagination.limit, pagination.total)} from {pagination.total}
            </span>
            <div className="text-xs sm:text-sm text-gray-600 text-center lg:text-left">
              * Times are shown in UTC timezone.
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <select 
                value={pagination.limit}
                onChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
                className="border border-gray-300 rounded text-xs sm:text-sm px-2 py-1 w-fit"
              >
                <option value={12}>12</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              {pagination.pages > 1 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="px-2 py-1 sm:px-3 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-xs sm:text-sm text-gray-600 px-2">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                    disabled={pagination.page >= pagination.pages}
                    className="px-2 py-1 sm:px-3 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CSV Upload Modal */}
      {showCSVUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <CSVUpload
            onUploadComplete={handleCSVUploadComplete}
            onClose={() => setShowCSVUpload(false)}
            className="max-w-2xl w-full mx-4"
          />
        </div>
      )}

      {/* Export to Platforms Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <AuctionExportDialog
            onClose={() => setShowExportDialog(false)}
            selectedAuctions={selectedAuctions}
            brand={brand}
          />
        </div>
      )}

      {/* Google Sheets Sync Modal */}
      {showGoogleSheetsSync && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <AuctionGoogleSheetsSync
            onClose={() => setShowGoogleSheetsSync(false)}
            onSyncComplete={() => {
              setShowGoogleSheetsSync(false)
              // Reload auctions after sync
              const loadAuctions = async () => {
                try {
                  const brandId = getBrandId(brand)
                  const response = await getAuctions({
                    page: 1,
                    limit: 25,
                    sort_field: 'id',
                    sort_direction: 'asc',
                    brand_id: brandId
                  })
                  const convertedAuctions = response.auctions.map(convertAuctionFormat)
                  setAuctions(convertedAuctions)
                } catch (err) {
                  console.error('Error refreshing auctions:', err)
                }
              }
              loadAuctions()
            }}
            selectedAuctions={selectedAuctions}
          />
        </div>
      )}



      {/* EOA Import Dialog */}
      {showEOADialog && selectedAuctionForEOA && (
        <EOAImportDialog
          auctionId={selectedAuctionForEOA}
          onClose={() => {
            setShowEOADialog(false)
            setSelectedAuctionForEOA(null)
          }}
          onImportComplete={(importedCount) => {
            console.log(`Imported ${importedCount} EOA records`)
            // Optionally refresh the auctions list or show a success message
          }}
        />
      )}
    </div>
  )
} 