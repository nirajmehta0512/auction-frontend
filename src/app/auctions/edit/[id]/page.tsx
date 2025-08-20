// frontend/src/app/auctions/edit/[id]/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

interface AuctionData {
  id?: string
  short_name: string
  long_name: string
  description: string
  settlement_date: string
  catalogue_launch_date?: string
  type: 'timed' | 'live' | 'sealed_bid'
  status: 'planned' | 'in_progress' | 'ended' | 'aftersale' | 'archived'
  target_reserve?: number
  specialist_id?: string
  created_at?: string
  updated_at?: string
}

interface AuctionArtwork {
  id: string
  lot_num: string
  title: string
  description: string
  low_est: number
  high_est: number
  status: string
  category?: string
  image_file_1?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function EditAuctionPage() {
  const router = useRouter()
  const params = useParams()
  const auctionId = params.id as string

  const [loading, setLoading] = useState(true)
  const [artworksLoading, setArtworksLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [auction, setAuction] = useState<AuctionData>({
    short_name: '',
    long_name: '',
    description: '',
    settlement_date: '',
    catalogue_launch_date: '',
    type: 'live',
    status: 'planned',
    target_reserve: 0
  })
  const [artworks, setArtworks] = useState<AuctionArtwork[]>([])
  const [platforms] = useState([
    { value: 'internal', label: 'Internal' },
    { value: 'liveauctioneers', label: 'LiveAuctioneers' },
    { value: 'invaluable', label: 'Invaluable' },
    { value: 'thesaleroom', label: 'The Saleroom' },
    { value: 'easylive', label: 'Easy Live' }
  ])

  useEffect(() => {
    if (auctionId) {
      loadAuction()
    }
  }, [auctionId])

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  const loadAuction = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load auction data
      const response = await fetch(`${API_BASE_URL}/api/auctions/${auctionId}`, {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Auction not found')
        }
        throw new Error('Failed to load auction')
      }

      const auctionData = await response.json()
      if (auctionData && auctionData.id) {
        setAuction(auctionData)
        
        // Load artworks for this auction
        await loadAuctionArtworks()
      } else {
        throw new Error('Auction not found')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load auction')
    } finally {
      setLoading(false)
    }
  }

  const loadAuctionArtworks = async () => {
    try {
      setArtworksLoading(true)
      
      const response = await fetch(`${API_BASE_URL}/api/auctions/${auctionId}/artworks`, {
        headers: getAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.artworks) {
          setArtworks(data.artworks)
        }
      }
    } catch (err) {
      console.warn('Failed to load auction artworks:', err)
    } finally {
      setArtworksLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // Basic validation
      if (!auction.short_name.trim()) {
        throw new Error('Short name is required')
      }
      if (!auction.long_name.trim()) {
        throw new Error('Long name is required')
      }
      if (!auction.settlement_date) {
        throw new Error('Settlement date is required')
      }

      const response = await fetch(`${API_BASE_URL}/api/auctions/${auctionId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(auction)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update auction' }))
        throw new Error(errorData.error || 'Failed to update auction')
      }

      const data = await response.json()
      // Backend returns the updated auction directly
      if (data && data.id) {
        // Success feedback
        alert('Auction updated successfully!')
        router.push('/auctions')
      } else {
        throw new Error('Failed to update auction')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save auction')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof AuctionData, value: string | number) => {
    setAuction(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading auction...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => router.push('/auctions')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Auctions
            </button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Auction</h1>
          <p className="text-gray-600 mt-1">Update auction details and settings</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Short Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Short Name *
                </label>
                <input
                  type="text"
                  value={auction.short_name}
                  onChange={(e) => handleInputChange('short_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter auction short name"
                />
              </div>

              {/* Target Reserve */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Reserve
                </label>
                <input
                  type="number"
                  value={auction.target_reserve || 0}
                  onChange={(e) => handleInputChange('target_reserve', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="0"
                />
              </div>

              {/* Long Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Long Name *
                </label>
                <input
                  type="text"
                  value={auction.long_name}
                  onChange={(e) => handleInputChange('long_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter auction long name"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={auction.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter auction description"
                />
              </div>

              {/* Settlement Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Settlement Date *
                </label>
                <input
                  type="datetime-local"
                  value={auction.settlement_date ? new Date(auction.settlement_date).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleInputChange('settlement_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Catalogue Launch Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catalogue Launch Date
                </label>
                <input
                  type="datetime-local"
                  value={auction.catalogue_launch_date ? new Date(auction.catalogue_launch_date).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleInputChange('catalogue_launch_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={auction.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="live">Live Auction</option>
                  <option value="timed">Timed Auction</option>
                  <option value="sealed_bid">Sealed Bid</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={auction.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="ended">Ended</option>
                  <option value="aftersale">Aftersale</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => router.push('/auctions')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Auction Artworks */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Auction Artworks</h3>
              <div className="text-sm text-gray-600">
                {artworks.length} artwork(s)
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {artworksLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
                <p className="text-gray-600">Loading artworks...</p>
              </div>
            ) : artworks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No artworks assigned to this auction yet.</p>
                <p className="text-sm text-gray-400 mt-1">
                  Use the "Generate Auction" feature from the Items page to add artworks.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {artworks.map((artwork) => (
                  <div key={artwork.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    {artwork.image_file_1 && (
                      <div className="mb-3">
                        <img
                          src={artwork.image_file_1}
                          alt={artwork.title}
                          className="w-full h-32 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-600">
                          Lot {artwork.lot_num}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          artwork.status === 'active' ? 'bg-green-100 text-green-800' :
                          artwork.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          artwork.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {artwork.status}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                        {artwork.title}
                      </h4>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {artwork.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>Est: ${artwork.low_est} - ${artwork.high_est}</span>
                        {artwork.category && (
                          <span className="bg-gray-100 px-2 py-1 rounded">
                            {artwork.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Auction Info */}
        {auction.created_at && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Auction Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Created:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(auction.created_at).toLocaleString()}
                </span>
              </div>
              {auction.updated_at && (
                <div>
                  <span className="font-medium text-gray-600">Last Updated:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(auction.updated_at).toLocaleString()}
                  </span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-600">Auction ID:</span>
                <span className="ml-2 text-gray-900 font-mono">{auction.id}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


