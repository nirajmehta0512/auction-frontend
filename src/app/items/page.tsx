// frontend/src/app/items/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Download, Upload, Filter, MoreVertical, Eye, Sparkles, RefreshCw, FileText, Share2, Printer, Check, Trophy } from 'lucide-react'
import { Artwork, ArtworksAPI, ArtworksResponse } from '@/lib/items-api'
import { useBrand } from '@/lib/brand-context'
import ItemsTable from '@/components/items/ItemsTable'
import ItemsFilter from '@/components/items/ItemsFilter'
import CSVUpload from '@/components/items/CSVUpload'
import AIImageUpload from '@/components/items/AIImageUpload'
import AIBulkGenerationModal from '@/components/items/AIBulkGenerationModal'
import ArtworkSelection from '@/components/items/ArtworkSelection'
import PDFCatalogGenerator from '@/components/items/PDFCatalogGenerator'
import ImportExportDialog from '@/components/items/ImportExportDialog'
import { 
  loadBrandGoogleSheetUrl,
  syncArtworksFromGoogleSheet 
} from '@/lib/google-sheets-api'
import GoogleSheetsSyncModal from '@/components/items/GoogleSheetsSyncModal'
import GenerateAuctionModal from '@/components/items/GenerateAuctionModal'

interface FilterState {
  status: string;
  category: string;
  search: string;
  brand?: string;
}

export default function ItemsPage() {
  const router = useRouter()
  const { brand } = useBrand()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [showFilters, setShowFilters] = useState(true)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [showAIBulkModal, setShowAIBulkModal] = useState(false)
  const [showAdvancedSelection, setShowAdvancedSelection] = useState(false)
  const [showPDFGenerator, setShowPDFGenerator] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false)
  const [showGenerateAuctionModal, setShowGenerateAuctionModal] = useState(false)
  
  // Pagination and filtering state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    category: '',
    search: ''
  })
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [counts, setCounts] = useState({
    draft: 0,
    active: 0,
    sold: 0,
    withdrawn: 0,
    passed: 0
  })



  // Load artworks
  const loadItems = async () => {
    try {
      setLoading(true)
      
      // Determine brand for filtering
      const effectiveBrand = filters.brand || brand
      
      // Only include brand_code if not "ALL" or "all"
      const queryParams: any = {
        ...filters,
        page,
        limit,
        sort_field: sortField,
        sort_direction: sortDirection
      }
      
      // Only add brand_code if a specific brand is selected (not "ALL")
      if (effectiveBrand && effectiveBrand.toLowerCase() !== 'all') {
        queryParams.brand_code = effectiveBrand
      }
      
      const response: ArtworksResponse = await ArtworksAPI.getArtworks(queryParams)

      if (response.success) {
        setArtworks(response.data)
        setTotal(response.pagination.total)
        setCounts(response.counts)
      } else {
        setError('Failed to load artworks')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load artworks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [page, limit, filters, sortField, sortDirection, brand])

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPage(1) // Reset to first page when filtering
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to withdraw this artwork?')) return

    try {
      await ArtworksAPI.deleteArtwork(itemId)
      loadItems() // Reload the list
    } catch (err: any) {
      setError(err.message || 'Failed to delete artwork')
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedItems.length === 0) return

    try {
      let confirmMessage = ''
      switch (action) {
        case 'delete':
          confirmMessage = `Are you sure you want to withdraw ${selectedItems.length} artwork(s)?`
          break
        case 'activate':
          confirmMessage = `Are you sure you want to activate ${selectedItems.length} artwork(s)?`
          break
        case 'draft':
          confirmMessage = `Are you sure you want to set ${selectedItems.length} artwork(s) to draft?`
          break
      }

      if (!confirm(confirmMessage)) return

      if (action === 'delete') {
        await ArtworksAPI.bulkAction('delete', selectedItems)
      } else {
        await ArtworksAPI.bulkAction('update_status', selectedItems, { status: action === 'activate' ? 'active' : 'draft' })
      }

      setSelectedItems([])
      setShowBulkActions(false)
      loadItems()
    } catch (err: any) {
      setError(err.message || 'Failed to perform bulk action')
    }
  }

  const handleAIUploadComplete = async (result: any) => {
    try {
      setShowAIModal(false)
      setLoading(true)
      
      // Extract selectedBrand from result (passed from AI modal)
      const { selectedBrand, ...artworkData } = result
      
      // Create the artwork directly in the database
      const finalArtworkData = {
        ...artworkData,
        status: 'draft'
      }
      
      // Use the selected brand from the AI modal
      const targetBrand = selectedBrand || 'MSABER'
      
      // Create artwork using items API (which has auto-sync)
      await ArtworksAPI.createArtwork(finalArtworkData, targetBrand)
      
      // Reload items to show the new artwork
      await loadItems()
      
      alert(`AI-generated artwork saved successfully to ${targetBrand}!`)
    } catch (err: any) {
      console.error('Failed to save AI-generated artwork:', err)
      setError(err.message || 'Failed to save AI-generated artwork')
    } finally {
      setLoading(false)
    }
  }

  const handleAIBulkComplete = (results: any[]) => {
    setShowAIBulkModal(false)
    // Reload items to show the new artworks
    loadItems()
    alert(`Successfully generated and saved ${results.length} artworks!`)
  }

  const handlePDFAction = (action: 'generate' | 'share' | 'print') => {
    if (selectedItems.length === 0) {
      alert('Please select artworks first')
      return
    }
    setShowPDFGenerator(true)
  }

  const handleSelectionAction = (action: string) => {
    switch (action) {
      case 'advanced':
        setShowAdvancedSelection(true)
        break
      case 'all':
        setSelectedItems(artworks.map(a => a.id!).filter(id => id))
        break
      case 'none':
        setSelectedItems([])
        break
    }
    setShowBulkActions(false)
  }

  const getSelectedArtworks = (): Artwork[] => {
    return artworks.filter(artwork => selectedItems.includes(artwork.id!))
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="h-screen flex flex-col p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600 mt-1">Manage your auction items and export to major bidding platforms</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/items/new')}
            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Artwork
          </button>

          <button
            onClick={() => setShowAIBulkModal(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Bulk Generate
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowImportDialog(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </button>

            <button
              onClick={() => setShowExportDialog(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>

            <button
              onClick={() => setShowGoogleSheetsModal(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              title="Sync with Google Sheets"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Sheets
            </button>
          </div>
          
          <button
            onClick={() => router.push('/preview')}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
            <span className="text-sm text-gray-600">Draft</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{counts.draft}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-sm text-gray-600">Active</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{counts.active}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <span className="text-sm text-gray-600">Sold</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{counts.sold}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span className="text-sm text-gray-600">Withdrawn</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{counts.withdrawn}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
            <span className="text-sm text-gray-600">Passed</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{counts.passed}</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Selection and Catalog Actions */}
      {selectedItems.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-blue-800 font-medium">
                {selectedItems.length} artwork(s) selected
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePDFAction('generate')}
                  className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Generate Catalog
                </button>
                <button
                  onClick={() => setShowGenerateAuctionModal(true)}
                  className="flex items-center px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                >
                  <Trophy className="h-3 w-3 mr-1" />
                  Add to Auction
                </button>
                <button
                  onClick={() => handlePDFAction('share')}
                  className="flex items-center px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  Share
                </button>
                <button
                  onClick={() => handlePDFAction('print')}
                  className="flex items-center px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                >
                  <Printer className="h-3 w-3 mr-1" />
                  Print
                </button>
              </div>
            </div>
            <button
              onClick={() => setSelectedItems([])}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg border mb-6 flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                showFilters 
                  ? 'bg-teal-100 text-teal-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Select:</span>
              <button
                onClick={() => handleSelectionAction('advanced')}
                className="text-sm text-teal-600 hover:text-teal-700 underline"
              >
                Advanced
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => handleSelectionAction('all')}
                className="text-sm text-teal-600 hover:text-teal-700 underline"
              >
                All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => handleSelectionAction('none')}
                className="text-sm text-teal-600 hover:text-teal-700 underline"
              >
                None
              </button>
            </div>

            {selectedItems.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedItems.length} selected
                </span>
                <div className="relative">
                  <button
                    onClick={() => setShowBulkActions(!showBulkActions)}
                    className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <MoreVertical className="h-4 w-4 mr-2" />
                    Actions
                  </button>
                  
                  {showBulkActions && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <button
                        onClick={() => handleBulkAction('activate')}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                      >
                        Set to Active
                      </button>
                      <button
                        onClick={() => handleBulkAction('draft')}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                      >
                        Set to Draft
                      </button>
                      <button
                        onClick={() => handleBulkAction('delete')}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-red-600"
                      >
                        Withdraw Items
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total}
            </span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value))
                setPage(1)
              }}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="px-6 py-4 border-b border-gray-200">
            <ItemsFilter
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading items...</p>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              <ItemsTable
                items={artworks}
                selectedItems={selectedItems}
                onSelectionChange={setSelectedItems}
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
                onDelete={handleDeleteItem}
              />
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex items-center space-x-2">
              {[...Array(Math.min(5, totalPages))].map((_, index) => {
                const pageNum = Math.max(1, Math.min(totalPages, page - 2 + index))
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      page === pageNum
                        ? 'bg-teal-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="max-w-4xl max-h-[90vh] overflow-auto">
            <CSVUpload
              onUploadComplete={(count) => {
                setShowUploadModal(false)
                loadItems() // Reload the items list
              }}
              onClose={() => setShowUploadModal(false)}
            />
          </div>
        </div>
      )}

      {/* AI Image Upload Modal */}
      {showAIModal && (
        <AIImageUpload
          onUploadComplete={handleAIUploadComplete}
          onClose={() => setShowAIModal(false)}
          currentBrand={brand}
        />
      )}

      {/* AI Bulk Generation Modal */}
      {showAIBulkModal && (
        <AIBulkGenerationModal
          onComplete={handleAIBulkComplete}
          onClose={() => setShowAIBulkModal(false)}
        />
      )}

      {/* Advanced Selection Modal */}
      {showAdvancedSelection && (
        <ArtworkSelection
          artworks={artworks}
          selectedItems={selectedItems}
          onSelectionChange={setSelectedItems}
          onClose={() => setShowAdvancedSelection(false)}
        />
      )}

      {/* PDF Catalog Generator */}
      {showPDFGenerator && (
        <PDFCatalogGenerator
          selectedArtworks={getSelectedArtworks()}
          onClose={() => setShowPDFGenerator(false)}
        />
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <ImportExportDialog
          mode="import"
          onClose={() => setShowImportDialog(false)}
          onComplete={(result) => {
            setShowImportDialog(false)
            loadItems()
          }}
          brand={brand}
        />
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <ImportExportDialog
          mode="export"
          onClose={() => setShowExportDialog(false)}
          selectedItems={selectedItems}
          brand={brand}
        />
      )}

      {/* Google Sheets Sync Modal */}
      {showGoogleSheetsModal && (
        <GoogleSheetsSyncModal
          onClose={() => setShowGoogleSheetsModal(false)}
          onSyncComplete={(result) => {
            setShowGoogleSheetsModal(false)
            loadItems() // Reload items after sync
          }}
          selectedItems={selectedItems}
          allItems={artworks}
          currentBrand={brand}
        />
      )}

      {/* Add to Auction Modal */}
      {showGenerateAuctionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <GenerateAuctionModal
            onClose={() => setShowGenerateAuctionModal(false)}
            selectedArtworks={selectedItems}
            onComplete={(auctionId) => {
              setShowGenerateAuctionModal(false)
              setSelectedItems([]) // Clear selection after adding to auction
            }}
          />
        </div>
      )}
    </div>
  )
}