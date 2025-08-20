// frontend/src/components/items/GenerateAuctionModal.tsx
"use client"

import React, { useState } from 'react'
import { X, Trophy, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface GenerateAuctionModalProps {
  onClose: () => void
  selectedArtworks: string[]
  onComplete?: (auctionId: string) => void
}

export default function GenerateAuctionModal({
  onClose,
  selectedArtworks,
  onComplete
}: GenerateAuctionModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form state
  const [auctionName, setAuctionName] = useState('')
  const [auctionDescription, setAuctionDescription] = useState('')
  const [auctionType, setAuctionType] = useState<'live' | 'timed' | 'sealed'>('timed')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [previewDate, setPreviewDate] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('MSABER')

  // Brand options
  const brandOptions = [
    { value: 'MSABER', label: 'MSaber' },
    { value: 'AURUM', label: 'Aurum' },
    { value: 'METSAB', label: 'Metsab' }
  ]

  const handleCreateAuction = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      // Validation
      if (!auctionName.trim()) {
        setError('Auction name is required')
        return
      }

      if (!startDate) {
        setError('Start date is required')
        return
      }

      if (!endDate) {
        setError('End date is required')
        return
      }

      if (new Date(endDate) <= new Date(startDate)) {
        setError('End date must be after start date')
        return
      }

      // Create auction data
      const auctionData = {
        name: auctionName.trim(),
        short_name: auctionName.trim().substring(0, 50),
        description: auctionDescription.trim(),
        type: auctionType,
        status: 'planned',
        start_date: startDate,
        end_date: endDate,
        preview_date: previewDate || null,
        settlement_date: null,
        lots_count: selectedArtworks.length,
        registrations_count: 0,
        is_published: false,
        brand_code: selectedBrand
      }

      // Create the auction
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auctions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(auctionData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create auction')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create auction')
      }

      const auctionId = result.data.id

      setSuccess(`Auction "${auctionName}" created successfully! (${selectedArtworks.length} artworks selected)`)
      
      // Call completion callback
      if (onComplete) {
        onComplete(auctionId.toString())
      }

      // Redirect to auction view after a short delay
      setTimeout(() => {
        router.push(`/auctions/view/${auctionId}`)
      }, 2000)

    } catch (err: any) {
      console.error('Error creating auction:', err)
      setError(err.message || 'Failed to create auction')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold">Generate Auction</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">
          Create a new auction with {selectedArtworks.length} selected artwork(s).
        </p>
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          Selected artworks: {selectedArtworks.slice(0, 3).join(', ')}
          {selectedArtworks.length > 3 && ` and ${selectedArtworks.length - 3} more...`}
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4 mb-6">
        {/* Brand Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand *
          </label>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            {brandOptions.map((brand) => (
              <option key={brand.value} value={brand.value}>
                {brand.label}
              </option>
            ))}
          </select>
        </div>

        {/* Auction Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Auction Name *
          </label>
          <input
            type="text"
            value={auctionName}
            onChange={(e) => setAuctionName(e.target.value)}
            placeholder="Enter auction name..."
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>

        {/* Auction Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={auctionDescription}
            onChange={(e) => setAuctionDescription(e.target.value)}
            placeholder="Enter auction description..."
            rows={3}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>

        {/* Auction Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Auction Type *
          </label>
          <select
            value={auctionType}
            onChange={(e) => setAuctionType(e.target.value as 'live' | 'timed' | 'sealed')}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="timed">Timed Auction</option>
            <option value="live">Live Auction</option>
            <option value="sealed">Sealed Bid</option>
          </select>
        </div>

        {/* Date Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date & Time *
            </label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preview Date & Time
          </label>
          <input
            type="datetime-local"
            value={previewDate}
            onChange={(e) => setPreviewDate(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
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

      {/* Preview */}
      {auctionName && startDate && endDate && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Auction Preview:</h4>
          <div className="text-xs text-blue-700 space-y-1">
            <p><strong>Name:</strong> {auctionName}</p>
            <p><strong>Type:</strong> {auctionType.charAt(0).toUpperCase() + auctionType.slice(1)}</p>
            <p><strong>Brand:</strong> {brandOptions.find(b => b.value === selectedBrand)?.label}</p>
            <p><strong>Start:</strong> {formatDate(startDate)}</p>
            <p><strong>End:</strong> {formatDate(endDate)}</p>
            <p><strong>Lots:</strong> {selectedArtworks.length} artworks</p>
            {previewDate && <p><strong>Preview:</strong> {formatDate(previewDate)}</p>}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          onClick={handleCreateAuction}
          disabled={loading || !auctionName.trim() || !startDate || !endDate}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating...
            </>
          ) : (
            <>
              <Trophy className="h-4 w-4 mr-2" />
              Create Auction
            </>
          )}
        </button>
      </div>
    </div>
  )
}
