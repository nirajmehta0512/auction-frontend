"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuctionsTable from '@/components/auctions/AuctionsTable'
import CSVUpload from '@/components/auctions/CSVUpload'
import { Plus, Download, Upload, RefreshCw } from 'lucide-react'
import { ArtworksAPI } from '@/lib/artworks-api'
import { getAuctions, exportAuctionsCSV, bulkActionAuctions, deleteAuction } from '@/lib/auctions-api'
import { useBrand } from '@/lib/brand-context'
import type { Auction } from '@/lib/auctions-api'
import { getGoogleSheetsUrlForModule } from '@/lib/app-settings-api'
import AuctionExportDialog from '@/components/auctions/AuctionExportDialog'
import AuctionGoogleSheetsSync from '@/components/auctions/AuctionGoogleSheetsSync'
import AuctionsFilter from '@/components/auctions/AuctionsFilter'

// Convert API auction to component auction format
const convertAuctionFormat = (auction: Auction) => ({
  id: auction.id,
  number: auction.id.toString().slice(-3),
  status: auction.status as 'planned' | 'inProgress' | 'ended' | 'aftersale' | 'archived',
  name: auction.short_name,
  type: auction.type === 'timed' ? 'Timed' : auction.type === 'live' ? 'Live' : 'Sealed Bid',
  lots: auction.lots_count || 0,
  regs: auction.registrations_count || 0,
  endingDate: auction.settlement_date ? new Date(auction.settlement_date).toLocaleDateString() : ''
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
  const [showLAImageModal, setShowLAImageModal] = useState(false)
  const [auctionIdForImages, setAuctionIdForImages] = useState('')
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showGoogleSheetsSync, setShowGoogleSheetsSync] = useState(false)
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    type: 'all',
    search: '',
    specialist: 'all',
    dateRange: 'all'
  })
  const [statusCounts, setStatusCounts] = useState({
    planned: 0,
    in_progress: 0,
    ended: 0,
    aftersale: 0,
    archived: 0
  })

  useEffect(() => {
    const loadAuctions = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await getAuctions({
          page: 1,
          limit: 100, // Increased to handle filtering
          sort_field: 'created_at',
          sort_direction: 'desc',
          brand_code: brand as 'MSABER' | 'AURUM' | 'METSAB' | undefined as 'MSABER' | 'AURUM' | 'METSAB' | undefined
        })
        
        let filteredAuctions = response.auctions

        // Apply filters
        if (filters.status !== 'all') {
          filteredAuctions = filteredAuctions.filter(auction => auction.status === filters.status)
        }
        
        if (filters.type !== 'all') {
          filteredAuctions = filteredAuctions.filter(auction => auction.type === filters.type)
        }
        
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          filteredAuctions = filteredAuctions.filter(auction => 
            auction.short_name?.toLowerCase().includes(searchLower) ||
            auction.long_name?.toLowerCase().includes(searchLower)
          )
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
        
        // Calculate status counts from all auctions (not filtered)
        calculateStatusCounts(response.auctions)
      } catch (err: any) {
        console.error('Error loading auctions:', err)
        const msg = err?.message || 'Failed to load auctions'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }

    loadAuctions()
  }, [brand, filters])

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
      planned: 0,
      in_progress: 0,
      ended: 0,
      aftersale: 0,
      archived: 0
    }

    auctions.forEach(auction => {
      if (auction.status && counts.hasOwnProperty(auction.status)) {
        counts[auction.status as keyof typeof counts]++
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
        sort_field: 'created_at',
        sort_direction: 'desc'
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
      const response = await getAuctions({
        page: 1,
        limit: 25,
        sort_field: 'created_at',
        sort_direction: 'desc',
        brand_code: brand as 'MSABER' | 'AURUM' | 'METSAB' | undefined
      })
      
      const convertedAuctions = response.auctions.map(convertAuctionFormat)
      setAuctions(convertedAuctions)
      
      setError(null)
    } catch (err: any) {
      console.error('Error deleting auction:', err)
      setError(`Failed to delete auction: ${err.message}`)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="bg-slate-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Auctions</h1>
        <button 
          onClick={() => router.push('/auctions/new')}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Auction</span>
        </button>
      </div>

      {/* Filters */}
      <AuctionsFilter 
        filters={filters}
        onFilterChange={handleFilterChange}
        statusCounts={statusCounts}
      />

      {/* Table Actions */}
      <div className="bg-white px-6 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 text-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowExportDialog(true)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export to Platforms</span>
          </button>
          <button
            onClick={() => setShowCSVUpload(true)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 text-sm"
          >
            <Upload className="h-4 w-4" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setShowGoogleSheetsSync(true)}
            className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Sync Sheets</span>
          </button>
          <button
            onClick={() => setShowLAImageModal(true)}
            className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 text-sm"
          >
            <Upload className="h-4 w-4" />
            <span>Upload LA Images</span>
          </button>
          <button className="text-gray-600 hover:text-gray-700 text-sm">
            Show/Hide
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Auctions Table */}
      <div className="flex-1 overflow-hidden bg-white">
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
          />
        )}
      </div>

      {/* Footer with Status Indicators and Pagination */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Status Indicators */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
              <span className="text-gray-600">Planned</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">In Progress</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Ended</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-600">Aftersale</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">Archived</span>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Items: 1 - 2 from 2
            </span>
            <div className="text-sm text-gray-600">
              * Times are shown in UTC timezone.
            </div>
            <select className="border border-gray-300 rounded text-sm px-2 py-1">
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
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
                  const response = await getAuctions({
                    page: 1,
                    limit: 25,
                    sort_field: 'created_at',
                    sort_direction: 'desc',
                    brand_code: brand as 'MSABER' | 'AURUM' | 'METSAB' | undefined
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

      {/* LiveAuctioneers Image Upload Modal */}
      {showLAImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Upload Images to LiveAuctioneers</h3>
            <p className="text-sm text-gray-600 mb-4">Provide an Auction ID to upload images for all items in this auction. Credentials come from Settings → Platforms.</p>
            <label className="block text-sm text-gray-700 mb-1">Auction ID</label>
            <input
              value={auctionIdForImages}
              onChange={(e) => setAuctionIdForImages(e.target.value)}
              placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
              className="w-full border rounded px-3 py-2 mb-4"
            />
            {uploadMsg && <div className="mb-3 text-xs text-gray-600">{uploadMsg}</div>}
            <div className="flex items-center justify-end space-x-2">
              <button onClick={() => setShowLAImageModal(false)} className="px-3 py-2 text-gray-700">Cancel</button>
              <button
                onClick={async () => {
                  try {
                    setUploadMsg('Uploading images...')
                    const resp = await ArtworksAPI.uploadImagesViaFTPFromItems({
                      brand_code: brand as 'MSABER' | 'AURUM' | 'METSAB' | undefined || 'MSABER',
                      platform: 'liveauctioneers',
                      auction_id: auctionIdForImages || undefined,
                    })
                    if (resp.success) {
                      setUploadMsg(`Uploaded ${resp.uploaded || 0} image(s). ${resp.errors && resp.errors.length ? `Errors: ${resp.errors.length}` : ''}`)
                    } else {
                      setUploadMsg(`Error: ${resp.error || resp.details || 'Unknown error'}`)
                    }
                  } catch (e: any) {
                    setUploadMsg(e.message || 'Error during upload')
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Start Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 