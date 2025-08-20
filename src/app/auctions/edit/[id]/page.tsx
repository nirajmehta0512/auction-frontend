// frontend/src/app/auctions/edit/[id]/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

interface AuctionData {
  id?: string
  title: string
  description: string
  start_date: string
  end_date: string
  location?: string
  type?: string
  status?: string
  platform?: string
  created_at?: string
  updated_at?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function EditAuctionPage() {
  const router = useRouter()
  const params = useParams()
  const auctionId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [auction, setAuction] = useState<AuctionData>({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    type: 'live',
    status: 'draft',
    platform: 'internal'
  })

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

      const response = await fetch(`${API_BASE_URL}/api/auctions/${auctionId}`, {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to load auction')
      }

      const data = await response.json()
      if (data.success && data.data) {
        setAuction(data.data)
      } else {
        throw new Error('Auction not found')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load auction')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // Basic validation
      if (!auction.title.trim()) {
        throw new Error('Title is required')
      }
      if (!auction.start_date) {
        throw new Error('Start date is required')
      }
      if (!auction.end_date) {
        throw new Error('End date is required')
      }

      const response = await fetch(`${API_BASE_URL}/api/auctions/${auctionId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(auction)
      })

      if (!response.ok) {
        throw new Error('Failed to update auction')
      }

      const data = await response.json()
      if (data.success) {
        // Success feedback
        alert('Auction updated successfully!')
        router.push('/auctions')
      } else {
        throw new Error(data.error || 'Failed to update auction')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save auction')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof AuctionData, value: string) => {
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
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={auction.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter auction title"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={auction.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter auction description"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="datetime-local"
                  value={auction.start_date ? new Date(auction.start_date).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="datetime-local"
                  value={auction.end_date ? new Date(auction.end_date).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={auction.location || ''}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Auction location"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={auction.type || 'live'}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="live">Live Auction</option>
                  <option value="online">Online Only</option>
                  <option value="timed">Timed Auction</option>
                  <option value="hybrid">Hybrid (Live + Online)</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={auction.status || 'draft'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Platform */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform
                </label>
                <select
                  value={auction.platform || 'internal'}
                  onChange={(e) => handleInputChange('platform', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="internal">Internal</option>
                  <option value="liveauctioneers">LiveAuctioneers</option>
                  <option value="invaluable">Invaluable</option>
                  <option value="the_saleroom">The Saleroom</option>
                  <option value="easy_live">Easy Live</option>
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


