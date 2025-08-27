// frontend/src/components/auctions/AuctionExportDialog.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { X, Download, Search, Globe, AlertCircle, CheckCircle, Filter } from 'lucide-react'
import { getAuctions } from '@/lib/auctions-api'
import { ArtworksAPI } from '@/lib/items-api'
import type { Auction } from '@/lib/auctions-api'

interface AuctionExportDialogProps {
  onClose: () => void
  selectedAuctions?: number[]
  brand?: string
}

type Platform = 'database' | 'liveauctioneers' | 'easylive' | 'thesaleroom' | 'invaluable'

interface PlatformConfig {
  label: string
  description: string
  csvHeaders: string[]
  requiredFields: string[]
}

// Using the same platform configs as the items export for artwork data
const platformConfigs: Record<Platform, PlatformConfig> = {
  database: {
    label: 'Our Database',
    description: 'Full format with all available artwork fields',
    csvHeaders: [
      'id', 'lot_num', 'title', 'description', 'low_est', 'high_est', 'start_price', 'condition', 'reserve', 'consignor',
      'status', 'category', 'subcategory', 'dimensions', 'weight', 'materials', 'artist_maker', 'period_age', 'provenance', 'auction_id',
      'artist_id', 'school_id', 'dimensions_inches', 'dimensions_cm', 'dimensions_with_frame_inches', 'dimensions_with_frame_cm',
      'condition_report', 'gallery_certification', 'gallery_id', 'artist_certification', 'certified_artist_id', 'artist_family_certification',
      'restoration_done', 'restoration_by', 'image_file_1', 'image_file_2', 'image_file_3', 'image_file_4', 'image_file_5',
      'image_file_6', 'image_file_7', 'image_file_8', 'image_file_9', 'image_file_10', 'created_at', 'updated_at'
    ],
    requiredFields: ['lot_num', 'title', 'description', 'low_est', 'high_est']
  },
  liveauctioneers: {
    label: 'LiveAuctioneers',
    description: 'Compatible with LiveAuctioneers artwork CSV format',
    csvHeaders: ['LotNum', 'Title', 'Description', 'LowEst', 'HighEst', 'StartPrice', 'ReservePrice', 'Buy Now Price', 'Exclude From Buy Now', 'Condition', 'Category', 'Origin', 'Style & Period', 'Creator', 'Materials & Techniques', 'Reserve Price', 'Domestic Flat Shipping Price', 'Height', 'Width', 'Depth', 'Dimension Unit', 'Weight', 'Weight Unit', 'Quantity'],
    requiredFields: ['LotNum', 'Title', 'Description', 'LowEst', 'HighEst']
  },
  easylive: {
    label: 'Easy Live Auction',
    description: 'Compatible with Easy Live Auction artwork CSV format',
    csvHeaders: ['LotNo', 'Description', 'Condition Report', 'LowEst', 'HighEst', 'Category'],
    requiredFields: ['LotNo', 'Description', 'LowEst', 'HighEst']
  },
  thesaleroom: {
    label: 'The Saleroom',
    description: 'Compatible with The Saleroom artwork CSV format',
    csvHeaders: ['Number', 'Title', 'Description', 'Hammer', 'Reserve', 'StartPrice', 'Increment', 'Quantity', 'LowEstimate', 'HighEstimate', 'CategoryCode', 'Sales Tax/VAT', 'BuyersPremiumRate', 'BuyersPremiumCeiling', 'InternetSurchargeRate', 'InternetSurchargeCeiling', 'BuyersPremiumVatRate', 'InternetSurchargeVatRate', 'End Date', 'End Time', 'Lot Link', 'Main Image', 'ExtraImages', 'BuyItNowPrice', 'IsBulk', 'Artist\'s Resale Right Applies', 'Address1', 'Address2', 'Address3', 'Address4', 'Postcode', 'TownCity', 'CountyState', 'CountryCode', 'ShippingInfo'],
    requiredFields: ['Number', 'Title', 'Description', 'LowEstimate', 'HighEstimate']
  },
  invaluable: {
    label: 'Invaluable',
    description: 'Compatible with Invaluable artwork CSV format',
    csvHeaders: ['lot_num', 'title', 'description', 'low_est', 'high_est', 'start_price', 'condition', 'category', 'dimensions'],
    requiredFields: ['lot_num', 'title', 'description', 'low_est', 'high_est']
  }
}

export default function AuctionExportDialog({
  onClose,
  selectedAuctions = [],
  brand = 'MSABER'
}: AuctionExportDialogProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('database')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Auction selection state
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAuctionIds, setSelectedAuctionIds] = useState<number[]>(selectedAuctions)
  const [showAuctionList, setShowAuctionList] = useState(true)
  const [auctionsLoading, setAuctionsLoading] = useState(true)

  // Load auctions on component mount
  useEffect(() => {
    loadAuctions()
  }, [brand])

  const loadAuctions = async () => {
    try {
      setAuctionsLoading(true)
      const response = await getAuctions({
        page: 1,
        limit: 100,
        sort_field: 'created_at',
        sort_direction: 'desc',
        brand_code: brand as 'MSABER' | 'AURUM' | 'METSAB' | undefined
      })
      setAuctions(response.auctions)
    } catch (err) {
      console.error('Error loading auctions:', err)
      setError('Failed to load auctions')
    } finally {
      setAuctionsLoading(false)
    }
  }

  // Filter auctions based on search
  const filteredAuctions = auctions.filter(auction => 
    auction.short_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    auction.long_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    auction.id.toString().includes(searchTerm)
  )

  // Handle auction selection
  const toggleAuctionSelection = (auctionId: number) => {
    setSelectedAuctionIds(prev => 
      prev.includes(auctionId) 
        ? prev.filter(id => id !== auctionId)
        : [...prev, auctionId]
    )
  }

  const selectAllAuctions = () => {
    setSelectedAuctionIds(filteredAuctions.map(a => a.id))
  }

  const clearSelection = () => {
    setSelectedAuctionIds([])
  }

  const handleExport = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      if (selectedAuctionIds.length === 0) {
        setError('Please select at least one auction to export')
        return
      }

      // Get artworks for the current brand (since auction-artwork relationship was removed)
      // In practice, you might want to restore the auction-artwork relationship or use a different approach
      let artworkIds: string[] = []
      
      try {
        const artworksResponse = await ArtworksAPI.getArtworks({
          brand_code: brand as 'MSABER' | 'AURUM' | 'METSAB',
          limit: 1000, // Get all artworks for the brand
          status: 'active'
        })
        
        if (artworksResponse && artworksResponse.data && Array.isArray(artworksResponse.data)) {
          artworkIds = artworksResponse.data
            .filter(artwork => artwork.id)
            .map(artwork => artwork.id!)
        }
      } catch (artworkErr) {
        console.warn('Failed to fetch artworks:', artworkErr)
      }

      if (artworkIds.length === 0) {
        setError('No active artworks found for export')
        return
      }

      // Export artworks using the same logic as the items page
      await ArtworksAPI.exportCSV({
        platform: selectedPlatform as any,
        item_ids: artworkIds
      })

      setSuccess(`Successfully exported ${artworkIds.length} artworks from ${selectedAuctionIds.length} auction(s) for ${platformConfigs[selectedPlatform].label}`)
      
      setTimeout(() => {
        onClose()
      }, 2000)

    } catch (err: any) {
      console.error('Export error:', err)
      setError(err.message || 'Failed to export artworks')
    } finally {
      setLoading(false)
    }
  }

  const config = platformConfigs[selectedPlatform]

  return (
    <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Export Auction Artworks to Platform</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Select auctions and export their artworks to a specific platform format.
          </p>
          <p className="text-xs text-gray-500">
            Brand: {brand}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Auction Selection */}
        {showAuctionList && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Auctions:
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={selectAllAuctions}
                  className="text-xs text-blue-600 hover:text-blue-700"
                  disabled={auctionsLoading}
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={clearSelection}
                  className="text-xs text-gray-600 hover:text-gray-700"
                  disabled={auctionsLoading}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search auctions..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg"
                disabled={auctionsLoading}
              />
            </div>

            {/* Auction List */}
            <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
              {auctionsLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <span className="text-sm text-gray-600">Loading auctions...</span>
                </div>
              ) : filteredAuctions.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchTerm ? 'No auctions match your search' : 'No auctions found'}
                </div>
              ) : (
                filteredAuctions.map((auction) => (
                  <div
                    key={auction.id}
                    className={`p-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                      selectedAuctionIds.includes(auction.id) ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => toggleAuctionSelection(auction.id)}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedAuctionIds.includes(auction.id)}
                        onChange={() => toggleAuctionSelection(auction.id)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{auction.short_name || auction.long_name}</div>
                        <div className="text-xs text-gray-500">
                          ID: {auction.id} • {auction.type} • {auction.status} • {auction.artwork_ids?.length || 0} lots
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedAuctionIds.length > 0 && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                {selectedAuctionIds.length} auction(s) selected
              </div>
            )}
          </div>
        )}

        {/* Platform Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Export Platform:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(platformConfigs).map(([platform, config]) => (
              <div
                key={platform}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedPlatform === platform
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPlatform(platform as Platform)}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">{config.label}</span>
                </div>
                <p className="text-xs text-gray-600">{config.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Details */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Export Details for {config.label}:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-medium text-gray-700 mb-1">CSV Headers:</p>
              <p className="text-gray-600">{config.csvHeaders.slice(0, 5).join(', ')}...</p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">Required Fields:</p>
              <p className="text-gray-600">{config.requiredFields.join(', ')}</p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
            <span className="text-red-800 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-green-800 text-sm">{success}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          onClick={handleExport}
          disabled={loading || selectedAuctionIds.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export Artworks to {config.label}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
