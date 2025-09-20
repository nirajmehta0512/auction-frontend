// frontend/src/app/items/[id]/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, Share2, ExternalLink, Eye, Maximize2, AlertCircle, Loader2, Edit3, Calendar, User, Tag, Palette, Ruler, Info } from 'lucide-react'
import { Artwork, ArtworksAPI, formatCurrency, getStatusColor, getStatusLabel } from '@/lib/items-api'
import { Artist, ArtistsAPI } from '@/lib/artists-api'
import { School, SchoolsAPI } from '@/lib/schools-api'
import MediaRenderer from '@/components/ui/MediaRenderer'

export default function ItemPreviewPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const [item, setItem] = useState<Artwork | null>(null)
  const [artist, setArtist] = useState<Artist | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showFullscreenImage, setShowFullscreenImage] = useState(false)

  const itemId = params?.id as string

  // Helper function to build edit URL with all pagination, sorting, and filter parameters
  const buildEditUrl = () => {
    const params = new URLSearchParams()

    // Add pagination parameters if they exist in the current URL
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')
    const sortField = searchParams.get('sort_field')
    const sortDirection = searchParams.get('sort_direction')

    if (page) params.set('page', page)
    if (limit) params.set('limit', limit)
    if (sortField) params.set('sort_field', sortField)
    if (sortDirection) params.set('sort_direction', sortDirection)

    // Add ALL filter parameters from ItemsFilter.tsx
    const filterKeys = [
      'status', 'category', 'search', 'brand', 'item_id',
      'low_est_min', 'low_est_max', 'high_est_min', 'high_est_max',
      'start_price_min', 'start_price_max', 'condition', 'period_age',
      'materials', 'artist_id', 'school_id', 'buyer_id', 'vendor_id'
    ]
    filterKeys.forEach(key => {
      const value = searchParams.get(key)
      if (value && value !== '' && value !== 'all') {
        params.set(key, value)
      }
    })

    const queryString = params.toString()
    return `/items/edit/${itemId}${queryString ? `?${queryString}` : ''}`
  }

  useEffect(() => {
    loadItemData()
  }, [itemId])

  const loadItemData = async () => {
    if (!itemId) {
      setError('Item ID not found')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Load item
      const itemResponse = await ArtworksAPI.getArtwork(itemId)
      if (!itemResponse.success) {
        setError('Item not found')
        return
      }

      const itemData = itemResponse.data
      setItem(itemData)

      // Load related artist or school
      if (itemData.artist_id) {
        const artistResponse = await ArtistsAPI.getArtist(itemData.artist_id.toString())
        if (artistResponse.success) {
          setArtist(artistResponse.data)
        }
      } else if (itemData.school_id) {
        const schoolResponse = await SchoolsAPI.getSchool(itemData.school_id.toString())
        if (schoolResponse.success) {
          setSchool(schoolResponse.data)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load item')
    } finally {
      setLoading(false)
    }
  }

  const getItemImages = () => {
    if (!item) return []

    // Check for new images array format (unlimited images)
    if (item.images && Array.isArray(item.images)) {
      return item.images.filter(url => url && url.trim())
    }

    // Fallback to old image_file format for backward compatibility
    const images = []
    for (let i = 1; i <= 10; i++) {
      const imageUrl = item[`image_file_${i}` as keyof Artwork] as string
      if (imageUrl && imageUrl.trim()) {
        images.push(imageUrl)
      }
    }
    return images
  }

  const handlePrevImage = () => {
    const images = getItemImages()
    setCurrentImageIndex(prev =>
      prev === 0 ? images.length - 1 : prev - 1
    )
  }

  const handleNextImage = () => {
    const images = getItemImages()
    setCurrentImageIndex(prev =>
      prev === images.length - 1 ? 0 : prev + 1
    )
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: item?.title || 'Artwork',
        text: `Check out this artwork: ${item?.title}`,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const formatDimensions = () => {
    if (!item) return null

    const dimensions = []

    // Primary dimensions
    if (item.height_inches && item.width_inches) {
      dimensions.push(`${item.height_inches}" × ${item.width_inches}"`)
    } else if (item.height_cm && item.width_cm) {
      dimensions.push(`${item.height_cm}cm × ${item.width_cm}cm`)
    }

    // With frame dimensions
    if (item.height_with_frame_inches && item.width_with_frame_inches) {
      dimensions.push(`framed: ${item.height_with_frame_inches}" × ${item.width_with_frame_inches}"`)
    } else if (item.height_with_frame_cm && item.width_with_frame_cm) {
      dimensions.push(`framed: ${item.height_with_frame_cm}cm × ${item.width_with_frame_cm}cm`)
    }

    return dimensions.length > 0 ? dimensions.join(' • ') : null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin mx-auto mb-6 text-teal-600" />
          <p className="text-xl text-gray-600 font-medium">Loading artwork...</p>
          <p className="text-gray-500 mt-2">Please wait while we fetch the details</p>
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="h-16 w-16 mx-auto mb-6 text-red-500" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Artwork Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The requested artwork could not be found'}</p>
          <button
            onClick={() => router.push('/items')}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-colors"
          >
            Back to Items
          </button>
        </div>
      </div>
    )
  }

  const images = getItemImages()
  const currentImage = images[currentImageIndex]
  const dimensions = formatDimensions()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  // Build return URL with ALL preserved pagination, sorting, and filter parameters
                  const params = new URLSearchParams()

                  // Add pagination parameters if they exist in the current URL
                  const page = searchParams.get('page')
                  const limit = searchParams.get('limit')
                  const sortField = searchParams.get('sort_field')
                  const sortDirection = searchParams.get('sort_direction')

                  if (page) params.set('page', page)
                  if (limit) params.set('limit', limit)
                  if (sortField) params.set('sort_field', sortField)
                  if (sortDirection) params.set('sort_direction', sortDirection)

                  // Add ALL filter parameters from ItemsFilter.tsx
                  const filterKeys = [
                    'status', 'category', 'search', 'brand', 'item_id',
                    'low_est_min', 'low_est_max', 'high_est_min', 'high_est_max',
                    'start_price_min', 'start_price_max', 'condition', 'period_age',
                    'materials', 'artist_id', 'school_id', 'buyer_id', 'vendor_id'
                  ]
                  filterKeys.forEach(key => {
                    const value = searchParams.get(key)
                    if (value && value !== '' && value !== 'all') {
                      params.set(key, value)
                    }
                  })

                  const queryString = params.toString()
                  const returnUrl = `/items${queryString ? `?${queryString}` : ''}`

                  router.push(returnUrl)
                }}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Items
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleShare}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                title="Share"
              >
                <Share2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => router.push(buildEditUrl())}
                className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Item
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-6">
            {/* Main Image with MediaRenderer */}
            <div className="relative bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg">
              {images.length > 0 ? (
                <>
                  <div className="aspect-square relative group">
                    <MediaRenderer
                      src={currentImage}
                      alt={item.title}
                      className="object-cover"
                      aspectRatio="square"
                      onClick={() => setShowFullscreenImage(true)}
                    />
                    <button
                      onClick={() => setShowFullscreenImage(true)}
                      className="absolute top-4 right-4 p-3 bg-black/60 text-white rounded-lg hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
                      title="View fullscreen"
                    >
                      <Maximize2 className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Image Navigation */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/90 backdrop-blur-sm text-gray-800 rounded-full hover:bg-white shadow-lg transition-all"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/90 backdrop-blur-sm text-gray-800 rounded-full hover:bg-white shadow-lg transition-all"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>

                      {/* Image Counter */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-sm text-white text-sm rounded-full font-medium">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="aspect-square flex items-center justify-center bg-gray-50">
                  <div className="text-center text-gray-500">
                    <Eye className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No image available</p>
                    <p className="text-sm mt-1">This artwork doesn't have any images yet</p>
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="grid grid-cols-6 gap-3">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                      index === currentImageIndex
                        ? 'border-teal-500 ring-2 ring-teal-200'
                        : 'border-gray-200 hover:border-gray-300 hover:ring-1 hover:ring-gray-200'
                    }`}
                  >
                    <MediaRenderer
                      src={image}
                      alt={`${item.title} - ${index + 1}`}
                      className="object-cover"
                      aspectRatio="square"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Item Details */}
          <div className="space-y-8">
            {/* Basic Info */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
              <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">{item.title}</h1>

              {/* Artist/School Info */}
              {(artist || school) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-teal-600" />
                    {artist && (
                      <div className="text-lg text-gray-700">
                        <span className="font-semibold">{artist.name}</span>
                        {(artist.birth_year || artist.death_year) && (
                          <span className="text-gray-500 ml-2">
                            ({artist.birth_year || '?'}{artist.death_year ? `-${artist.death_year}` : artist.birth_year ? '-' : ''})
                          </span>
                        )}
                        {artist.nationality && (
                          <span className="text-gray-500 ml-2">• {artist.nationality}</span>
                        )}
                      </div>
                    )}
                    {school && (
                      <div className="text-lg text-gray-700">
                        <span className="font-semibold">{school.name}</span>
                        {school.location && (
                          <span className="text-gray-500 ml-2">• {school.location}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status and ID */}
              <div className="flex items-center justify-between mb-6">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(item.status!)}`}>
                  {getStatusLabel(item.status!)}
                </span>
                {item.id && (
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    ID #{String(item.id)}
                  </span>
                )}
              </div>

              {/* Estimates */}
              <div className="space-y-3">
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(item.low_est)} - {formatCurrency(item.high_est)}
                </div>
                {item.start_price && (
                  <div className="text-xl text-gray-600">
                    Starting bid: {formatCurrency(item.start_price)}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
                <div className="flex items-center space-x-2 mb-6">
                  <Info className="h-5 w-5 text-teal-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Artwork Description</h3>
                </div>
                <div className="prose prose-gray max-w-none">
                  <div className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                    {item.description}
                  </div>
                </div>

                {/* Additional Description Fields */}
                {item.condition_report && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Condition Report</h4>
                      <p className="text-gray-700 whitespace-pre-line">{item.condition_report}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Details Grid */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
              <div className="flex items-center space-x-2 mb-6">
                <Tag className="h-5 w-5 text-teal-600" />
                <h3 className="text-xl font-semibold text-gray-900">Artwork Details</h3>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {/* Primary Details Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {item.category && (
                    <div className="flex items-start space-x-3">
                      <Palette className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-sm font-medium text-gray-500 uppercase tracking-wide">Category</dt>
                        <dd className="text-lg text-gray-900 font-medium">{item.category}</dd>
                      </div>
                    </div>
                  )}

                  {item.materials && (
                    <div className="flex items-start space-x-3">
                      <Palette className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-sm font-medium text-gray-500 uppercase tracking-wide">Materials</dt>
                        <dd className="text-lg text-gray-900 font-medium">{item.materials}</dd>
                      </div>
                    </div>
                  )}

                  {dimensions && (
                    <div className="flex items-start space-x-3">
                      <Ruler className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-sm font-medium text-gray-500 uppercase tracking-wide">Dimensions</dt>
                        <dd className="text-lg text-gray-900 font-medium">{dimensions}</dd>
                      </div>
                    </div>
                  )}

                  {item.period_age && (
                    <div className="flex items-start space-x-3">
                      <Calendar className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-sm font-medium text-gray-500 uppercase tracking-wide">Period</dt>
                        <dd className="text-lg text-gray-900 font-medium">{item.period_age}</dd>
                      </div>
                    </div>
                  )}

                  {item.condition && (
                    <div className="flex items-start space-x-3">
                      <Info className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-sm font-medium text-gray-500 uppercase tracking-wide">Condition</dt>
                        <dd className="text-lg text-gray-900 font-medium">{item.condition}</dd>
                      </div>
                    </div>
                  )}

                  {item.lot_num && (
                    <div className="flex items-start space-x-3">
                      <Tag className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-sm font-medium text-gray-500 uppercase tracking-wide">Lot Number</dt>
                        <dd className="text-lg text-gray-900 font-medium">{item.lot_num}</dd>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Details */}
                <div className="border-t border-gray-200 pt-6 space-y-6">
                  {item.provenance && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Provenance</h4>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">{item.provenance}</p>
                    </div>
                  )}


                  {/* Technical Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
                    {(item.height_inches || item.height_cm) && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Height</h5>
                        <div className="space-y-1">
                          {item.height_inches && (
                            <p className="text-gray-900 font-medium">{item.height_inches}"</p>
                          )}
                          {item.height_cm && (
                            <p className="text-gray-600 text-sm">{item.height_cm} cm</p>
                          )}
                        </div>
                      </div>
                    )}

                    {(item.width_inches || item.width_cm) && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Width</h5>
                        <div className="space-y-1">
                          {item.width_inches && (
                            <p className="text-gray-900 font-medium">{item.width_inches}"</p>
                          )}
                          {item.width_cm && (
                            <p className="text-gray-600 text-sm">{item.width_cm} cm</p>
                          )}
                        </div>
                      </div>
                    )}

                    {item.weight && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Weight</h5>
                        <div className="space-y-1">
                          <p className="text-gray-900 font-medium">{item.weight}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Frame Details */}
                  {(item.height_with_frame_inches || item.height_with_frame_cm) && (
                    <div className="pt-6 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Frame Dimensions</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(item.height_with_frame_inches || item.width_with_frame_inches) && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-gray-500">Frame Size</h5>
                            {item.height_with_frame_inches && item.width_with_frame_inches && (
                              <p className="text-gray-900 font-medium">{item.height_with_frame_inches}" × {item.width_with_frame_inches}"</p>
                            )}
                            {item.height_with_frame_cm && item.width_with_frame_cm && (
                              <p className="text-gray-600 text-sm">{item.height_with_frame_cm}cm × {item.width_with_frame_cm}cm</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <div className="flex space-x-4">
                <button
                  onClick={() => router.push(buildEditUrl())}
                  className="flex-1 bg-teal-600 text-white px-8 py-4 rounded-xl hover:bg-teal-700 font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
                >
                  <Edit3 className="h-5 w-5 mr-2 inline" />
                  Edit Item
                </button>
                <button
                  onClick={handleShare}
                  className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-lg transition-colors"
                >
                  <Share2 className="h-5 w-5 mr-2 inline" />
                  Share
                </button>
              </div>
            </div>

            {/* Additional Information Sections */}
            <div className="space-y-8">
              {/* Auction & Pricing Details */}
              {(item.reserve || item.final_price) && (
                <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
                  <div className="flex items-center space-x-2 mb-6">
                    <ExternalLink className="h-5 w-5 text-teal-600" />
                    <h3 className="text-xl font-semibold text-gray-900">Auction Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {item.reserve && (
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Reserve Price</h4>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(item.reserve)}</p>
                      </div>
                    )}
                    {item.final_price && (
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Final Price</h4>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(item.final_price)}</p>
                      </div>
                    )}
                  </div>
                  {item.date_sold && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          Sold on {new Date(item.date_sold).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}


              {/* Meta Information */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Record Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    {item.created_at && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>
                          Created: {new Date(item.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    {item.updated_at && item.updated_at !== item.created_at && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>
                          Updated: {new Date(item.updated_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {item.id && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Tag className="h-4 w-4 flex-shrink-0" />
                        <span>Database ID: {String(item.id)}</span>
                      </div>
                    )}
                    {item.status && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Info className="h-4 w-4 flex-shrink-0" />
                        <span>Status: {getStatusLabel(item.status)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {showFullscreenImage && currentImage && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-full max-h-full">
            <MediaRenderer
              src={currentImage}
              alt={item.title}
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setShowFullscreenImage(false)}
              className="absolute top-6 right-6 p-3 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
            >
              ✕
            </button>
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-6 top-1/2 transform -translate-y-1/2 p-4 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-6 top-1/2 transform -translate-y-1/2 p-4 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black/60 text-white rounded-full font-medium">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
