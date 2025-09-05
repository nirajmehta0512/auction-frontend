// frontend/src/components/items/AIImageUpload.tsx
"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Upload, Sparkles, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { ArtistsAPI } from '../../lib/artists-api'
import { autoSyncArtworkToGoogleSheet } from '../../lib/google-sheets-api'
import { getBrands, Brand } from '../../lib/brands-api'

interface AIUploadResult {
  title: string;
  description: string;
  category: string;
  materials: string;
  height_inches?: string;
  width_inches?: string;
  height_cm?: string;
  width_cm?: string;
  height_with_frame_inches?: string;
  width_with_frame_inches?: string;
  height_with_frame_cm?: string;
  width_with_frame_cm?: string;
  weight?: string;
  period_age: string;
  condition: string;
  low_est: number;
  high_est: number;
  artist_id?: number;
  imageUrl?: string; // Uploaded image URL
  // Artist information inclusion flags
  include_artist_description?: boolean;
  include_artist_key_description?: boolean;
  include_artist_biography?: boolean;
  include_artist_notable_works?: boolean;
  include_artist_major_exhibitions?: boolean;
  include_artist_awards_honors?: boolean;
  include_artist_market_value_range?: boolean;
  include_artist_signature_style?: boolean;
}

interface AIImageUploadProps {
  onUploadComplete: (result: AIUploadResult & { selectedBrand: string }) => void;
  onClose: () => void;
  currentBrand?: string;
}

export default function AIImageUpload({ onUploadComplete, onClose, currentBrand = 'MSABER' }: AIImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AIUploadResult | null>(null)
  const [artistInfo, setArtistInfo] = useState<any>(null)
  const [selectedBrand, setSelectedBrand] = useState(currentBrand === 'ALL' ? 'MSABER' : currentBrand)
  const [brands, setBrands] = useState<Brand[]>([])
  const [loadingBrands, setLoadingBrands] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch brands on component mount
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await getBrands()
        if (response.success) {
          setBrands(response.data.filter(brand => brand.is_active !== false))
          // Set default brand if currentBrand is not in the list
          if (currentBrand && response.data.some(brand => brand.code === currentBrand)) {
            setSelectedBrand(currentBrand)
          } else if (response.data.length > 0) {
            setSelectedBrand(response.data[0].code)
          }
        } else {
          console.error('Failed to fetch brands:', response.message)
          // Fallback to hardcoded brands
          setBrands([
            { id: 1, name: 'MSaber', code: 'MSABER', is_active: true },
            { id: 2, name: 'Aurum', code: 'AURUM', is_active: true },
            { id: 3, name: 'Metsab', code: 'METSAB', is_active: true }
          ])
        }
      } catch (error) {
        console.error('Error fetching brands:', error)
        // Fallback to hardcoded brands
        setBrands([
          { id: 1, name: 'MSaber', code: 'MSABER', is_active: true },
          { id: 2, name: 'Aurum', code: 'AURUM', is_active: true },
          { id: 3, name: 'Metsab', code: 'METSAB', is_active: true }
        ])
      } finally {
        setLoadingBrands(false)
      }
    }

    fetchBrands()
  }, [currentBrand])

  // Fetch artist information when result changes
  useEffect(() => {
    const fetchArtistInfo = async () => {
      if (result?.artist_id) {
        try {
          const response = await ArtistsAPI.getArtist(result.artist_id.toString())
          setArtistInfo(response.data)
        } catch (error) {
          console.warn('Failed to fetch artist info:', error)
          setArtistInfo(null)
        }
      } else {
        setArtistInfo(null)
      }
    }

    fetchArtistInfo()
  }, [result?.artist_id])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleImageSelect(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageSelect(file)
    }
  }

  const handleImageSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB')
      return
    }

    setSelectedImage(file)
    setError(null)

    // Create preview with multiple fallback methods
    try {
      // Try blob URL first
      const blobUrl = URL.createObjectURL(file)
      
      // Test if blob URL works
      const testImg = new Image()
      testImg.onload = () => {
        setImagePreview(blobUrl)
      }
      testImg.onerror = () => {
        // Fallback to FileReader
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result) {
            setImagePreview(e.target.result as string)
          }
        }
        reader.onerror = () => {
          setError('Failed to create image preview')
        }
        reader.readAsDataURL(file)
      }
      testImg.src = blobUrl
    } catch (blobError) {
      // Direct fallback to FileReader
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreview(e.target.result as string)
        }
      }
      reader.onerror = () => {
        setError('Failed to create image preview')
      }
      reader.readAsDataURL(file)
    }
  }

  const handleGenerateDetails = async () => {
    if (!selectedImage) return

    try {
      setLoading(true)
      setError(null)

      // Create FormData to send the image
      const formData = new FormData()
      formData.append('image', selectedImage)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/items/ai-analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      if (!response.ok) {
        let errorMessage = 'Failed to analyze image'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          // If we can't parse the error response, use the status text
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        throw new Error('Invalid response from server. Please check if the backend is running.')
      }
      
      if (data.success) {
        setResult(data.result)
      } else {
        throw new Error(data.error || 'Failed to analyze image')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze image')
    } finally {
      setLoading(false)
    }
  }

  const handleUseResults = async () => {
    if (result) {
      // Pass the result to the parent component with selected brand and image URL
      onUploadComplete({
        ...result,
        selectedBrand,
        imageUrl: imagePreview || undefined // Include the uploaded image URL
      })
      
      // Auto-sync to Google Sheets if brand is configured
      try {
        if (selectedBrand && selectedBrand !== 'ALL') {
          // Create a mock artwork object for sync (since the actual artwork will be created by parent)
          const artworkForSync = {
            ...result,
            status: 'draft',
            created_at: new Date().toISOString()
          }
          
          // Attempt auto-sync (non-blocking)
          await autoSyncArtworkToGoogleSheet(artworkForSync, selectedBrand)
        }
      } catch (error) {
        console.warn('Auto-sync to Google Sheets failed (non-critical):', error)
        // Don't block the main flow if sync fails
      }
    }
  }

  const handleClearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setResult(null)
    setArtistInfo(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Sparkles className="h-6 w-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI Item Generator</h2>
              <p className="text-sm text-gray-600">Upload an image to automatically generate item details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Brand Selection */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">
              Target Brand:
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              disabled={loadingBrands}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {loadingBrands ? (
                <option>Loading brands...</option>
              ) : (
                brands.map(brand => (
                  <option key={brand.id} value={brand.code}>
                    {brand.name}
                  </option>
                ))
              )}
            </select>
            <span className="text-xs text-gray-500">
              Generated artwork will be saved to this brand
            </span>
          </div>
        </div>

        <div className="p-6">
          {!selectedImage ? (
            // Upload area
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-purple-400 bg-purple-50'
                  : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload an artwork image
              </h3>
              <p className="text-gray-600 mb-4">
                Drag and drop an image file or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supports JPG, PNG, WEBP (max 10MB)
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            // Image preview and analysis
            <div className="space-y-6">
              {/* Image Preview */}
              <div className="flex items-start space-x-6">
                <div className="relative">
                  <img
                    src={imagePreview!}
                    alt="Uploaded artwork"
                    className="w-64 h-64 object-cover rounded-lg border"
                    onError={(e) => {
                      console.error('Image preview error:', e)
                      // Try to recreate preview if blob URL fails
                      if (selectedImage && imagePreview?.startsWith('blob:')) {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setImagePreview(event.target.result as string)
                          }
                        }
                        reader.readAsDataURL(selectedImage)
                      }
                    }}
                    style={{
                      backgroundColor: '#f3f4f6',
                      minHeight: '256px',
                      minWidth: '256px'
                    }}
                  />
                  <button
                    onClick={handleClearImage}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Image Analysis</h3>
                  
                  {!result && !loading && (
                    <button
                      onClick={handleGenerateDetails}
                      className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate Item Details
                    </button>
                  )}

                  {loading && (
                    <div className="flex items-center space-x-3 text-purple-600">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Analyzing image with AI...</span>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center space-x-3 text-red-600 bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="h-5 w-5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {result && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 text-green-600 bg-green-50 p-3 rounded-lg">
                        <CheckCircle className="h-5 w-5" />
                        <span>AI analysis complete!</span>
                      </div>

                      {/* Generated Results Preview */}
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <h4 className="font-medium text-gray-900">Generated Details:</h4>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Title:</span>
                            <p className="text-gray-900">{result.title}</p>
                          </div>
                          
                          <div>
                            <span className="font-medium text-gray-600">Category:</span>
                            <p className="text-gray-900">{result.category}</p>
                          </div>
                          
                          <div>
                            <span className="font-medium text-gray-600">Estimate:</span>
                            <p className="text-gray-900">£{result.low_est.toLocaleString()} - £{result.high_est.toLocaleString()}</p>
                          </div>
                          
                          <div>
                            <span className="font-medium text-gray-600">Materials:</span>
                            <p className="text-gray-900">{result.materials}</p>
                          </div>

                          {artistInfo && (
                            <div className="col-span-2">
                              <span className="font-medium text-gray-600">Artist:</span>
                              <p className="text-gray-900">
                                {artistInfo.name}
                                {(artistInfo.birth_year || artistInfo.death_year) && (
                                  <span className="text-gray-600">
                                    {' '}({artistInfo.birth_year || '?'}{artistInfo.death_year ? `-${artistInfo.death_year}` : '-'})
                                  </span>
                                )}
                                {artistInfo.nationality && (
                                  <span className="text-gray-600 text-sm ml-2">({artistInfo.nationality})</span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="font-medium text-gray-600">Description:</span>
                          <p className="text-gray-900 text-sm mt-1">{result.description}</p>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={handleUseResults}
                          className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Use These Details
                        </button>
                        
                        <button
                          onClick={handleClearImage}
                          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                          Try Another Image
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 