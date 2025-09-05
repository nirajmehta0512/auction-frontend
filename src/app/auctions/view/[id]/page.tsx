// frontend/src/app/auctions/view/[id]/page.tsx
"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Calendar, Clock, MapPin, Trophy, Download, Upload,
  FileText, Package, Edit, ExternalLink, ChevronDown, Eye
} from 'lucide-react'
import { getAuctions } from '@/lib/auctions-api'
import { getBrands, type Brand } from '@/lib/brands-api'
import { ArtworksAPI } from '@/lib/items-api'
import { useBrand } from '@/lib/brand-context'
import AuctionExportDialog from '@/components/auctions/AuctionExportDialog'
import EOAImportDialog from '@/components/auctions/EOAImportDialog'

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
  const [showEOADialog, setShowEOADialog] = useState(false)
  const [showUrlMenu, setShowUrlMenu] = useState(false)
  const [brands, setBrands] = useState<Brand[]>([])

  // Get brand ID from brand code
  const getBrandId = useCallback((brandCode: string): number | undefined => {
    const foundBrand = brands.find(b => b.code === brandCode)
    return foundBrand?.id
  }, [brands])

  const loadAuctionDetails = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Load auction details
      const brandId = getBrandId(brand)
      const auctionsResponse = await getAuctions({
        page: 1,
        limit: 100, // Get all auctions to find the one we want
        brand_id: brandId
      })

      const foundAuction = auctionsResponse.auctions.find(a => a.id.toString() === auctionId)

      if (!foundAuction) {
        setError('Auction not found')
        return
      }

      setAuction(foundAuction)

      // Load artworks for this auction using the auction's artwork_ids array
      if (foundAuction.artwork_ids && Array.isArray(foundAuction.artwork_ids) && foundAuction.artwork_ids.length > 0) {
        const artworksResponse = await ArtworksAPI.getArtworks({
          item_ids: foundAuction.artwork_ids.map(id => id.toString()),
          page: 1,
          limit: 1000,
          status: 'all',
          brand_code: brand as 'MSABER' | 'AURUM' | 'METSAB' || 'MSABER'
        })

        if (artworksResponse && artworksResponse.data && Array.isArray(artworksResponse.data)) {
          const auctionArtworks = artworksResponse.data
            .filter(artwork => artwork.id)
            .map(artwork => ({
              ...artwork,
              id: artwork.id!
            }))
          setArtworks(auctionArtworks)
        } else {
          setArtworks([])
        }
      } else {
        setArtworks([])
      }

    } catch (err: any) {
      console.error('Error loading auction details:', err)
      setError(err.message || 'Failed to load auction details')
    } finally {
      setLoading(false)
    }
  }, [auctionId, brand, getBrandId])

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

  useEffect(() => {
    if (auctionId && brands.length > 0) {
      loadAuctionDetails()
    }
  }, [auctionId, loadAuctionDetails, brands.length])

  // Close URL menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUrlMenu && !(event.target as Element).closest('.url-menu-container')) {
        setShowUrlMenu(false)
      }
    }

    if (showUrlMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUrlMenu])

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

  const getDynamicStatusLabel = (auction: Auction) => {
    const today = new Date()
    const catalogueLaunchDate = auction.catalogue_launch_date ? new Date(auction.catalogue_launch_date) : null
    const settlementDate = new Date(auction.settlement_date)

    if (today > settlementDate) {
      return 'Past'
    } else if (catalogueLaunchDate && today >= catalogueLaunchDate && today <= settlementDate) {
      return 'Present'
    } else {
      return 'Future'
    }
  }

  const getDynamicStatusColor = (auction: Auction) => {
    const today = new Date()
    const catalogueLaunchDate = auction.catalogue_launch_date ? new Date(auction.catalogue_launch_date) : null
    const settlementDate = new Date(auction.settlement_date)

    if (today > settlementDate) {
      return 'bg-red-500 text-white'
    } else if (catalogueLaunchDate && today >= catalogueLaunchDate && today <= settlementDate) {
      return 'bg-green-500 text-white'
    } else {
      return 'bg-blue-500 text-white'
    }
  }

  const handleImportEOA = () => {
    setShowEOADialog(true)
  }

  const handleGenerateInvoice = () => {
    router.push(`/auctions/${auctionId}/invoices`)
  }

  // Get available auction URLs
  const getAvailableUrls = useCallback(() => {
    if (!auction) return []

    const urls = [
      { platform: 'LiveAuctioneers', url: auction.liveauctioneers_url, key: 'liveauctioneers_url' },
      { platform: 'EasyLive', url: auction.easy_live_url, key: 'easy_live_url' },
      { platform: 'Invaluable', url: auction.invaluable_url, key: 'invaluable_url' },
      { platform: 'The Saleroom', url: auction.the_saleroom_url, key: 'the_saleroom_url' }
    ].filter(item => item.url && item.url.trim() !== '')

    return urls
  }, [auction])

  // Handle viewing auction URLs
  const handleViewAuction = useCallback(() => {
    const availableUrls = getAvailableUrls()

    if (availableUrls.length === 0) {
      // No URLs available
      alert('No auction URLs have been configured for this auction.')
      return
    }

    if (availableUrls.length === 1) {
      // Only one URL, navigate directly
      window.open(availableUrls[0].url, '_blank')
    } else {
      // Multiple URLs, show menu
      setShowUrlMenu(!showUrlMenu)
    }
  }, [getAvailableUrls, showUrlMenu])

  // Handle selecting a specific URL from menu
  const handleUrlSelect = useCallback((url: string) => {
    window.open(url, '_blank')
    setShowUrlMenu(false)
  }, [])

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
      {/* Header with Compact Actions */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            {/* Title Section */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/auctions')}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{auction.long_name || auction.short_name}</h1>
                  <p className="text-gray-600 mt-1">{auction.short_name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium shadow-sm ${getDynamicStatusColor(auction)}`}>
                  <div className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse"></div>
                  {getDynamicStatusLabel(auction)}
                </span>
              </div>
            </div>

            {/* Compact Actions Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
              </div>

              {/* Primary Actions */}
              <div className="relative url-menu-container">
                <button
                  onClick={handleViewAuction}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Auction
                  {getAvailableUrls().length > 1 && (
                    <ChevronDown className="h-4 w-4 ml-2" />
                  )}
                </button>

                {/* URL Selection Menu */}
                {showUrlMenu && getAvailableUrls().length > 1 && (
                  <div className="absolute top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-2">
                      {getAvailableUrls().map((urlItem, index) => (
                        <button
                          key={urlItem.key}
                          onClick={() => handleUrlSelect(urlItem.url!)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center space-x-3"
                        >
                          <ExternalLink className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="font-medium text-gray-900">{urlItem.platform}</div>
                            <div className="text-xs text-gray-500 truncate max-w-48">{urlItem.url}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => router.push(`/auctions/edit/${auctionId}`)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Auction
              </button>

              <button
                onClick={() => router.push('/items')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-sm border border-gray-300"
              >
                <Package className="h-4 w-4 mr-2" />
                Manage Items
              </button>

              {/* Secondary Actions */}
              <div className="border-l border-gray-300 pl-3 ml-2 flex items-center space-x-2">
                <button
                  onClick={handleImportEOA}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Import EOA
                </button>

                <button
                  onClick={handleGenerateInvoice}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Invoice
                </button>

                <button
                  onClick={() => setShowExportDialog(true)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">

          {/* Auction Information and Quick Stats - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Auction Information */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="bg-white border-b border-gray-100 px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Auction Information</h2>
                    <p className="text-sm text-gray-500">Event details and timeline</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Catalogue Launch */}
                  <div className="group hover:bg-white hover:shadow-sm rounded-lg p-4 transition-all duration-200">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <Calendar className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">Catalogue Launch</h3>
                        <p className="text-gray-600 text-sm mb-2">When bidding opens</p>
                        <p className="text-lg font-medium text-gray-900">
                          {formatDate(auction.catalogue_launch_date || auction.settlement_date)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Settlement Date */}
                  <div className="group hover:bg-white hover:shadow-sm rounded-lg p-4 transition-all duration-200">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-200 transition-colors">
                        <Clock className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">Settlement Date</h3>
                        <p className="text-gray-600 text-sm mb-2">Final bidding deadline</p>
                        <p className="text-lg font-medium text-gray-900">
                          {formatDate(auction.settlement_date)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Preview Date */}
                  <div className="group hover:bg-white hover:shadow-sm rounded-lg p-4 transition-all duration-200">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <MapPin className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">Preview Date</h3>
                        <p className="text-gray-600 text-sm mb-2">Physical viewing starts</p>
                        <p className="text-lg font-medium text-gray-900">
                          {formatDate(auction.shipping_date || auction.catalogue_launch_date)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Auction Type */}
                  <div className="group hover:bg-white hover:shadow-sm rounded-lg p-4 transition-all duration-200">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                        <Trophy className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">Auction Type</h3>
                        <p className="text-gray-600 text-sm mb-2">Category of sale</p>
                        <p className="text-lg font-medium text-gray-900 capitalize">
                          {auction.type}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {auction.description && (
                  <div className="mt-8 p-4 bg-white rounded-lg border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-gray-500" />
                      Description
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{auction.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Quick Stats</h3>
                    <p className="text-sm text-slate-300">Auction overview</p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="p-6 space-y-4">
                {/* Status Badge */}
                <div className="mb-4">
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium shadow-sm ${getDynamicStatusColor(auction)}`}>
                    <div className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse"></div>
                    {getDynamicStatusLabel(auction)} Auction
                  </span>
                </div>

                {/* Total Lots */}
                <div className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <Package className="h-4 w-4 text-emerald-400" />
                      </div>
                      <span className="text-slate-300 font-medium">Total Lots</span>
                    </div>
                    <span className="text-2xl font-bold text-white">
                      {auction.artwork_ids?.length || 0}
                    </span>
                  </div>
                </div>

                {/* Available Items */}
                <div className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        {/* <Eye className="h-4 w-4 text-blue-400" /> */}
                        <Package className="h-4 w-4 text-blue-400" />
                      </div>
                      <span className="text-slate-300 font-medium">Available Items</span>
                    </div>
                    <span className="text-2xl font-bold text-white">
                      {artworks.length}
                    </span>
                  </div>
                </div>

                {/* Catalog Coverage */}
                <div className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <Trophy className="h-4 w-4 text-purple-400" />
                      </div>
                      <span className="text-slate-300 font-medium">Catalog Coverage</span>
                    </div>
                    <span className="text-2xl font-bold text-white">
                      {auction.artwork_ids?.length ? Math.round((artworks.length / auction.artwork_ids.length) * 100) : 0}%
                    </span>
                  </div>
                </div>

                {/* Publication Status */}
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-orange-400" />
                    </div>
                    <span className="text-slate-300 font-medium">Publication Status</span>
                  </div>
                  <div className="ml-11">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getDynamicStatusLabel(auction) === 'Present' ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                      <span className="text-white font-semibold">
                        {getDynamicStatusLabel(auction) === 'Present' ? 'Live & Published' : 'Not Published'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {getDynamicStatusLabel(auction) === 'Present'
                        ? 'Catalog is live and accepting bids'
                        : 'Catalog will be published soon'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Featured Artworks - Full Width */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Featured Artworks</h2>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {artworks.length} items in catalog
                </span>
                {getAvailableUrls().length > 0 && (
                  <button
                    onClick={handleViewAuction}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    {getAvailableUrls().length === 1 ? 'View Auction' : `View on ${getAvailableUrls()[0].platform}`}
                  </button>
                )}
              </div>
            </div>

            {artworks.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No artworks assigned to this auction yet.</p>
                <p className="text-gray-500 text-sm mt-2">Items will appear here once they're added to the catalog.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {artworks.map((artwork) => (
                  <div key={artwork.id} className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-gray-300">
                    {/* Artwork Image */}
                    <div className="aspect-square bg-gray-50 overflow-hidden relative">
                      {artwork.image_file_1 ? (
                        <img
                          src={artwork.image_file_1}
                          alt={artwork.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100">
                          <Trophy className="h-16 w-16" />
                        </div>
                      )}

                      {/* Lot Number Badge */}
                      <div className="absolute top-3 left-3 bg-black bg-opacity-75 text-white px-2 py-1 rounded-md text-xs font-medium">
                        Lot {artwork.lot_num}
                      </div>

                      {/* Live Auction Link Overlay - Commented out for now */}
                      {/* <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                        <button
                          onClick={() => window.open(`https://liveauctioneers.com/lot/${artwork.id}`, '_blank')}
                          className="opacity-0 group-hover:opacity-100 bg-white text-gray-900 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all duration-200 flex items-center space-x-1 shadow-lg"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View Live</span>
                        </button>
                      </div> */}
                    </div>

                    {/* Artwork Details */}
                    <div className="p-4">
                      <div className="space-y-3">
                        {/* Title */}
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                          {artwork.title}
                        </h3>

                        {/* Artist */}
                        {artwork.artist_maker && (
                          <p className="text-sm text-gray-600 font-medium">
                            {artwork.artist_maker}
                          </p>
                        )}

                        {/* Estimates */}
                        {(artwork.low_est || artwork.high_est) && (
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 font-medium">Estimate</p>
                            <p className="text-sm font-bold text-gray-900">
                              {formatCurrency(artwork.low_est)} - {formatCurrency(artwork.high_est)}
                            </p>
                          </div>
                        )}

                        {/* Additional Details */}
                        <div className="space-y-1">
                          {artwork.dimensions && (
                            <p className="text-xs text-gray-500">
                              {artwork.dimensions}
                            </p>
                          )}
                          {artwork.condition && (
                            <p className="text-xs text-gray-500">
                              Condition: {artwork.condition}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {/* EOA Import Dialog */}
      {showEOADialog && (
        <EOAImportDialog
          auctionId={parseInt(auctionId)}
          onClose={() => setShowEOADialog(false)}
          onImportComplete={(importedCount) => {
            console.log(`Imported ${importedCount} EOA records`)
          }}
        />
      )}
    </div>
  )
}
