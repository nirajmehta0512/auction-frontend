// frontend/src/app/preview/[id]/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, Share2, ExternalLink, Eye, Maximize2, AlertCircle, Loader2 } from 'lucide-react'
import { Artwork, ArtworksAPI, formatCurrency, getStatusColor, getStatusLabel } from '@/lib/items-api'
import { Artist, ArtistsAPI } from '@/lib/artists-api'
import { School, SchoolsAPI } from '@/lib/schools-api'

export default function ArtworkPreviewPage() {
  const router = useRouter()
  const params = useParams()
  const [item, setItem] = useState<Artwork | null>(null)
  const [artist, setArtist] = useState<Artist | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showFullscreenImage, setShowFullscreenImage] = useState(false)

  const itemId = params?.id as string

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading artwork...</p>
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Artwork Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The requested artwork could not be found'}</p>
          <button
            onClick={() => router.push('/items')}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Back to Items
          </button>
        </div>
      </div>
    )
  }

  const images = getItemImages()
  const currentImage = images[currentImageIndex]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/items')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Items
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleShare}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                title="Share"
              >
                <Share2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => router.push(`/items/edit/${item.id}`)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Edit Item
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative bg-white rounded-lg border border-gray-200 overflow-hidden">
              {images.length > 0 ? (
                <>
                  <div className="aspect-square relative">
                    <img
                      src={currentImage}
                      alt={item.title}
                      className="w-full h-full object-cover cursor-zoom-in"
                      onClick={() => setShowFullscreenImage(true)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-artwork.jpg'
                      }}
                    />
                    <button
                      onClick={() => setShowFullscreenImage(true)}
                      className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70"
                      title="View fullscreen"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* Image Navigation */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      
                      {/* Image Counter */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-black bg-opacity-50 text-white text-sm rounded-full">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="aspect-square flex items-center justify-center bg-gray-100">
                  <div className="text-center text-gray-500">
                    <Eye className="h-12 w-12 mx-auto mb-2" />
                    <p>No image available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`aspect-square rounded border-2 overflow-hidden ${
                      index === currentImageIndex 
                        ? 'border-teal-500' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${item.title} - ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-artwork.jpg'
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Item Details */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{item.title}</h1>
              
              {/* Artist/School Info */}
              {(artist || school) && (
                <div className="mb-4">
                  {artist && (
                    <div className="text-lg text-gray-700">
                      <span className="font-medium">{artist.name}</span>
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
                      <span className="font-medium">{school.name}</span>
                      {school.location && (
                        <span className="text-gray-500 ml-2">• {school.location}</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Status */}
              <div className="flex items-center space-x-3 mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.status!)}`}>
                  {getStatusLabel(item.status!)}
                </span>
                {item.id && (
                  <span className="text-sm text-gray-500">ID #{item.id}</span>
                )}
              </div>

              {/* Estimates */}
              <div className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(item.low_est)} - {formatCurrency(item.high_est)}
                </div>
                {item.start_price && (
                  <div className="text-lg text-gray-600">
                    Starting bid: {formatCurrency(item.start_price)}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed">{item.description}</p>
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {item.category && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Category</dt>
                    <dd className="text-sm text-gray-900">{item.category}</dd>
                  </div>
                )}
                {item.materials && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Materials</dt>
                    <dd className="text-sm text-gray-900">{item.materials}</dd>
                  </div>
                )}
                {item.dimensions && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Dimensions</dt>
                    <dd className="text-sm text-gray-900">{item.dimensions}</dd>
                  </div>
                )}
                {item.period_age && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Period</dt>
                    <dd className="text-sm text-gray-900">{item.period_age}</dd>
                  </div>
                )}
                {item.condition && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Condition</dt>
                    <dd className="text-sm text-gray-900">{item.condition}</dd>
                  </div>
                )}
                {item.provenance && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Provenance</dt>
                    <dd className="text-sm text-gray-900">{item.provenance}</dd>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="flex space-x-3">
                <button
                  onClick={() => router.push(`/items/edit/${item.id}`)}
                  className="flex-1 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 font-medium"
                >
                  Edit Item
                </button>
                <button
                  onClick={handleShare}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Share
                </button>
              </div>
            </div>

            {/* Meta Info */}
            {item.created_at && (
              <div className="pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Created {new Date(item.created_at).toLocaleDateString()} 
                  {item.updated_at && item.updated_at !== item.created_at && (
                    <span> • Updated {new Date(item.updated_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {showFullscreenImage && currentImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative max-w-full max-h-full">
            <img
              src={currentImage}
              alt={item.title}
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setShowFullscreenImage(false)}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70"
            >
              ✕
            </button>
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}