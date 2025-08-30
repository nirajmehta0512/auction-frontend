// frontend/src/components/consignments/ArtworkCreationDialog.tsx
"use client"

import React, { useState } from 'react'
import { ArtworksAPI } from '@/lib/items-api'
import { ArtistsAPI, Artist } from '@/lib/artists-api'
import SearchableSelect from '@/components/ui/SearchableSelect'
import AIImageUpload from '@/components/items/AIImageUpload'
import AIBulkGenerationModal from '@/components/items/AIBulkGenerationModal'

interface ArtworkCreationDialogProps {
  artists: Artist[]
  onSave: (artwork: any | any[]) => void
  onCancel: () => void
}

export default function ArtworkCreationDialog({ artists, onSave, onCancel }: ArtworkCreationDialogProps) {
  const [loading, setLoading] = useState(false)
  const [showAIUpload, setShowAIUpload] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    low_est: '',
    high_est: '',
    start_price: '',
    artist_id: '',
    artist_maker: '',
    height_inches: '',
    width_inches: '',
    height_cm: '',
    width_cm: '',
    height_with_frame_inches: '',
    width_with_frame_inches: '',
    height_with_frame_cm: '',
    width_with_frame_cm: '',
    weight: '',
    materials: '',
    condition: '',
    category: '',
    subcategory: '',
    status: 'draft' as const
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Auto-calculate start price when low estimate changes
    if (field === 'low_est' && value) {
      const lowEst = parseFloat(value)
      if (!isNaN(lowEst)) {
        setFormData(prev => ({
          ...prev,
          start_price: Math.round(lowEst * 0.5).toString()
        }))
      }
    }
  }

  const handleArtistChange = (artistId: string) => {
    const selectedArtist = artists.find(a => a.id?.toString() === artistId)
    if (selectedArtist) {
      setFormData(prev => ({
        ...prev,
        artist_id: artistId,
        artist_maker: selectedArtist.name
      }))
    }
  }

  const handleAIUploadComplete = async (result: any) => {
    if (result) {
      setLoading(true)
      try {
        // Create artwork with AI analysis result and uploaded images
        const artworkData = {
          title: result.title,
          description: result.description,
          lot_num: Date.now().toString(), // Generate a temporary lot number
          low_est: result.low_est || 0,
          high_est: result.high_est || 0,
          start_price: Math.round((result.low_est || 0) * 0.5),
          artist_id: result.artist_id ? parseInt(result.artist_id.toString()) : undefined,
          artist_maker: result.artist_name || result.artist_maker,
          height_inches: result.height_inches || '',
          width_inches: result.width_inches || '',
          height_cm: result.height_cm || '',
          width_cm: result.width_cm || '',
          height_with_frame_inches: result.height_with_frame_inches || '',
          width_with_frame_inches: result.width_with_frame_inches || '',
          height_with_frame_cm: result.height_with_frame_cm || '',
          width_with_frame_cm: result.width_with_frame_cm || '',
          weight: result.weight || '',
          materials: result.materials,
          condition: result.condition,
          category: result.category,
          status: 'draft' as const
        }

        const artworkResult = await ArtworksAPI.createArtwork(artworkData)
        
        // If artwork was created successfully, return it to the parent
        onSave(artworkResult.data)
        setShowAIUpload(false)
      } catch (error) {
        console.error('Error creating artwork from AI analysis:', error)
        alert('Failed to create artwork from AI analysis. Please try again.')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleBulkUploadComplete = (results: any[]) => {
    if (results && results.length > 0) {
      // For bulk upload, return all artworks created
      onSave(results)
      setShowBulkUpload(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const artworkData = {
        title: formData.title,
        description: formData.description,
        lot_num: Date.now().toString(), // Generate a temporary lot number
        low_est: parseFloat(formData.low_est) || 0,
        high_est: parseFloat(formData.high_est) || 0,
        start_price: parseFloat(formData.start_price) || 0,
        artist_id: formData.artist_id ? parseInt(formData.artist_id) : undefined,
        artist_maker: formData.artist_maker,
        height_inches: formData.height_inches,
        width_inches: formData.width_inches,
        height_cm: formData.height_cm,
        width_cm: formData.width_cm,
        height_with_frame_inches: formData.height_with_frame_inches,
        width_with_frame_inches: formData.width_with_frame_inches,
        height_with_frame_cm: formData.height_with_frame_cm,
        width_with_frame_cm: formData.width_with_frame_cm,
        weight: formData.weight,
        materials: formData.materials,
        condition: formData.condition,
        category: formData.category,
        subcategory: formData.subcategory,
        status: formData.status
      }

      const result = await ArtworksAPI.createArtwork(artworkData)
      onSave(result.data)
    } catch (error) {
      console.error('Error creating artwork:', error)
      alert('Failed to create artwork. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {!showAIUpload && !showBulkUpload && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* AI Upload Options */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-lg font-medium text-blue-900 mb-3">AI-Powered Artwork Analysis</h4>
            <p className="text-sm text-blue-700 mb-4">
              Let AI automatically generate artwork details from images.
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowAIUpload(true)}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <span>📷</span>
                <span className="ml-2">Single Image Analysis</span>
              </button>
              <button
                type="button"
                onClick={() => setShowBulkUpload(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <span>📁</span>
                <span className="ml-2">Bulk Folder Upload</span>
              </button>
            </div>
          </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Artist
          </label>
          <SearchableSelect
            value={formData.artist_id}
            onChange={handleArtistChange}
            options={artists.map(artist => ({
              value: artist.id?.toString() || '',
              label: artist.name
            }))}
            placeholder="Select or search artist"
          />
          {!formData.artist_id && (
            <input
              type="text"
              value={formData.artist_maker}
              onChange={(e) => handleInputChange('artist_maker', e.target.value)}
              placeholder="Or enter artist name manually"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
            />
          )}
        </div>

        {/* New Dimensions with inch/cm conversion */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dimensions
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Height (inches)</label>
                <input
                  type="text"
                  value={formData.height_inches}
                  onChange={(e) => handleInputChange('height_inches', e.target.value)}
                  placeholder='e.g., 24"'
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Width (inches)</label>
                <input
                  type="text"
                  value={formData.width_inches}
                  onChange={(e) => handleInputChange('width_inches', e.target.value)}
                  placeholder='e.g., 36"'
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Height (cm)</label>
                <input
                  type="text"
                  value={formData.height_cm}
                  onChange={(e) => handleInputChange('height_cm', e.target.value)}
                  placeholder="e.g., 61 cm"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Width (cm)</label>
                <input
                  type="text"
                  value={formData.width_cm}
                  onChange={(e) => handleInputChange('width_cm', e.target.value)}
                  placeholder="e.g., 91 cm"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weight
            </label>
            <input
              type="text"
              value={formData.weight}
              onChange={(e) => handleInputChange('weight', e.target.value)}
              placeholder="e.g., 2.5kg"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Low Estimate (£) *
          </label>
          <input
            type="number"
            value={formData.low_est}
            onChange={(e) => handleInputChange('low_est', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            High Estimate (£) *
          </label>
          <input
            type="number"
            value={formData.high_est}
            onChange={(e) => handleInputChange('high_est', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Materials
          </label>
          <input
            type="text"
            value={formData.materials}
            onChange={(e) => handleInputChange('materials', e.target.value)}
            placeholder="e.g., Oil on canvas"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Condition
          </label>
          <select
            value={formData.condition}
            onChange={(e) => handleInputChange('condition', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select condition</option>
            <option value="Excellent">Excellent</option>
            <option value="Very Good">Very Good</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select category</option>
            <option value="Paintings">Paintings</option>
            <option value="Sculptures">Sculptures</option>
            <option value="Prints">Prints</option>
            <option value="Drawings">Drawings</option>
            <option value="Photography">Photography</option>
            <option value="Textiles">Textiles</option>
            <option value="Ceramics">Ceramics</option>
            <option value="Jewelry">Jewelry</option>
            <option value="Furniture">Furniture</option>
            <option value="Books">Books</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Price (£)
          </label>
          <input
            type="number"
            value={formData.start_price}
            onChange={(e) => handleInputChange('start_price', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
          />
          <p className="text-xs text-gray-500 mt-1">Auto-calculated as 50% of low estimate</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Artwork'}
        </button>
      </div>
        </form>
      )}

      {/* AI Upload Modal */}
      {showAIUpload && (
        <AIImageUpload
          onUploadComplete={handleAIUploadComplete}
          onClose={() => setShowAIUpload(false)}
          currentBrand="MSABER"
        />
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <AIBulkGenerationModal
          onClose={() => setShowBulkUpload(false)}
          onComplete={handleBulkUploadComplete}
        />
      )}
    </div>
  )
}
