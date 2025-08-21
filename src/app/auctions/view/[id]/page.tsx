// frontend/src/app/auctions/view/[id]/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, Clock, MapPin, Users, Trophy, ExternalLink, Download } from 'lucide-react'
import { getAuctions } from '@/lib/auctions-api'
import { ArtworksAPI } from '@/lib/artworks-api'
import { useBrand } from '@/lib/brand-context'
import AuctionExportDialog from '@/components/auctions/AuctionExportDialog'
import { getAuctionStatusColor } from '@/lib/constants'
import type { Auction } from '@/lib/auctions-api'

interface AuctionArtwork {
  id: string
  lot_num: string
  title: string
  artist_maker?: string
  low_est?: number
  high_est?: number
  image_file_1?: string
  image_file_2?: string
  condition?: string
  dimensions?: string
}

export default function AuctionViewPage() {
  const router = useRouter()
  const params = useParams()
  const { brand } = useBrand()
  const auctionId = params.id as string
  
  const [auction, setAuction] = useState<Auction | null>(null)
  const [artworks, setArtworks] = useState<AuctionArtwork[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)

  useEffect(() => {
    if (auctionId) {
      loadAuctionDetails()
    }
  }, [auctionId, brand])

  const loadAuctionDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load auction details
      const auctionsResponse = await getAuctions({
        page: 1,
        limit: 100, // Get all auctions to find the one we want
        brand_code: brand as 'MSABER' | 'AURUM' | 'METSAB' | undefined
      })
      
      const foundAuction = auctionsResponse.auctions.find(a => a.id.toString() === auctionId)
      
      if (!foundAuction) {
        setError('Auction not found')
        return
      }
      
      setAuction(foundAuction)

      // Load artworks for this auction using the auction's artwork_ids array
      console.log('Loading artworks for auction ID:', auctionId)
      
      if (foundAuction.artwork_ids && Array.isArray(foundAuction.artwork_ids) && foundAuction.artwork_ids.length > 0) {
        console.log('Found artwork IDs in auction:', foundAuction.artwork_ids)
        
        const artworksResponse = await ArtworksAPI.getArtworks({
          item_ids: foundAuction.artwork_ids.join(','), // Use the artwork_ids from auction
          page: 1,
          limit: 1000,
          status: 'all', // Include all statuses
          brand_code: brand as 'MSABER' | 'AURUM' | 'METSAB' || 'MSABER'
        })

        console.log('Auction artworks response:', artworksResponse)
        if (artworksResponse && artworksResponse.data && Array.isArray(artworksResponse.data)) {
          // Filter artworks with valid IDs and convert to the expected type
          const auctionArtworks = artworksResponse.data
            .filter(artwork => artwork.id) // Filter out items without IDs
            .map(artwork => ({
              ...artwork,
              id: artwork.id! // Assert that id exists since we filtered for it
            }))
          setArtworks(auctionArtworks)
        } else {
          console.warn('No artworks found or invalid response format:', artworksResponse)
          setArtworks([])
        }
      } else {
        console.log('No artwork_ids found in auction:', foundAuction)
        setArtworks([])
      }

    } catch (err: any) {
      console.error('Error loading auction details:', err)
      setError(err.message || 'Failed to load auction details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not set'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Using the constants helper function
  const getStatusColor = getAuctionStatusColor

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading auction details...</span>
      </div>
    )
  }

  if (error || !auction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Auction not found'}</p>
          <button
            onClick={() => router.push('/auctions')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Auctions
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/auctions')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{auction.long_name || auction.short_name}</h1>
                <p className="text-gray-600">{auction.short_name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(auction.status || 'unknown')}`}>
                {auction.status ? auction.status.charAt(0).toUpperCase() + auction.status.slice(1) : 'Unknown'}
              </span>
              <button
                onClick={() => setShowExportDialog(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Auction
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Auction Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Auction Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Start Date</p>
                    <p className="text-sm text-gray-600">{formatDate(auction.catalogue_launch_date || auction.settlement_date)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">End Date</p>
                    <p className="text-sm text-gray-600">{formatDate(auction.settlement_date)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Preview Date</p>
                    <p className="text-sm text-gray-600">{formatDate(auction.shipping_date || auction.catalogue_launch_date)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Trophy className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Settlement Date</p>
                    <p className="text-sm text-gray-600">{formatDate(auction.settlement_date)}</p>
                  </div>
                </div>
              </div>
              
              {auction.description && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                  <p className="text-sm text-gray-600">{auction.description}</p>
                </div>
              )}
            </div>

            {/* Auction Artworks */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Featured Artworks</h2>
                <span className="text-sm text-gray-600">
                  Showing first 2 items
                </span>
              </div>
              
              {artworks.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No artworks assigned to this auction yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {artworks.map((artwork) => (
                    <div key={artwork.id} className="border border-gray-200 rounded-lg p-4">
                      {/* Artwork Image */}
                      <div className="aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden">
                        {artwork.image_file_1 ? (
                          <img
                            src={artwork.image_file_1}
                            alt={artwork.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Trophy className="h-12 w-12" />
                          </div>
                        )}
                      </div>
                      
                      {/* Artwork Details */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h3 className="font-medium text-gray-900 text-sm">{artwork.title}</h3>
                          <span className="text-xs text-gray-500">Lot {artwork.lot_num}</span>
                        </div>
                        
                        {artwork.artist_maker && (
                          <p className="text-sm text-gray-600">{artwork.artist_maker}</p>
                        )}
                        
                        {(artwork.low_est || artwork.high_est) && (
                          <p className="text-sm font-medium text-gray-900">
                            Est: {formatCurrency(artwork.low_est)} - {formatCurrency(artwork.high_est)}
                          </p>
                        )}
                        
                        {artwork.dimensions && (
                          <p className="text-xs text-gray-500">{artwork.dimensions}</p>
                        )}
                        
                        {artwork.condition && (
                          <p className="text-xs text-gray-500">Condition: {artwork.condition}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Type</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {auction.type}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Lots</span>
                  <span className="text-sm font-medium text-gray-900">
                    {auction.lots_count || 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Registrations</span>
                  <span className="text-sm font-medium text-gray-900">
                    {auction.registrations_count || 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Published</span>
                  <span className="text-sm font-medium text-gray-900">
                    {auction.status === 'in_progress' ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Actions</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/auctions/edit/${auctionId}`)}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Auction
                </button>
                
                <button
                  onClick={() => setShowExportDialog(true)}
                  className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Export to Platform
                </button>
                
                <button
                  onClick={() => router.push('/items')}
                  className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Manage Artworks
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <AuctionExportDialog
            onClose={() => setShowExportDialog(false)}
            selectedAuctions={[parseInt(auctionId)]}
            brand={brand}
          />
        </div>
      )}
    </div>
  )
}
