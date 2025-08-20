// frontend/src/app/preview/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ExternalLink, Download, Eye, Calendar, MapPin, Gavel } from 'lucide-react'
import { Artwork, ArtworksAPI } from '@/lib/artworks-api'
import { Artist, ArtistsAPI } from '@/lib/artists-api'
import { School, SchoolsAPI } from '@/lib/schools-api'
import { useBrand } from '@/lib/brand-context'

export default function LiveAuctioneerPreviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { brand } = useBrand()
  const [items, setItems] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [artists, setArtists] = useState<Record<string, Artist>>({})
  const [schools, setSchools] = useState<Record<string, School>>({})

  const auctionId = searchParams?.get('auction_id') || ''
  const status = searchParams?.get('status') || 'active'

  useEffect(() => {
    loadPreviewData()
  }, [auctionId, status, brand])

  const loadPreviewData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load items for preview
      const itemsResponse = await ArtworksAPI.getArtworks({
        auction_id: auctionId || undefined,
        status: status === 'all' ? undefined : status,
        limit: 100, // Show more items for preview
        brand_code: brand as 'MSABER' | 'AURUM' | 'METSAB' | undefined
      })

      if (itemsResponse.success) {
        setItems(itemsResponse.data)

        // Load related artists and schools
        const artistIds = itemsResponse.data
          .filter(item => item.artist_id)
          .map(item => item.artist_id!)
        const schoolIds = itemsResponse.data
          .filter(item => item.school_id)  
          .map(item => item.school_id!)

        // Fetch artists and schools
        const [artistsData, schoolsData] = await Promise.all([
          Promise.all(artistIds.map(id => ArtistsAPI.getArtist(id.toString()))),
          Promise.all(schoolIds.map(id => SchoolsAPI.getSchool(id.toString())))
        ])

        // Create lookup objects
        const artistsLookup: Record<string, Artist> = {}
        const schoolsLookup: Record<string, School> = {}

        artistsData.forEach((response, index) => {
          if (response.success) {
            artistsLookup[artistIds[index]] = response.data
          }
        })

        schoolsData.forEach((response, index) => {
          if (response.success) {
            schoolsLookup[schoolIds[index]] = response.data
          }
        })

        setArtists(artistsLookup)
        setSchools(schoolsLookup)
      } else {
        setError('Failed to load items')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load preview data')
    } finally {
      setLoading(false)
    }
  }

  const getArtistSchoolInfo = (item: Artwork) => {
    if (item.artist_id && artists[item.artist_id]) {
      const artist = artists[item.artist_id]
      return {
        type: 'artist',
        name: artist.name,
        details: artist.birth_year && artist.death_year 
          ? `${artist.birth_year}-${artist.death_year}`
          : artist.birth_year 
          ? `${artist.birth_year}-`
          : '',
        nationality: artist.nationality
      }
    }
    
    if (item.school_id && schools[item.school_id]) {
      const school = schools[item.school_id]
      return {
        type: 'school',
        name: school.name,
        details: school.founded_year && school.closed_year
          ? `${school.founded_year}-${school.closed_year}`
          : school.founded_year
          ? `${school.founded_year}-`
          : '',
        location: school.location
      }
    }
    
    return null
  }

  const formatEstimate = (low: number, high: number) => {
    return `£${low.toLocaleString()} - £${high.toLocaleString()}`
  }

  const getLiveAuctioneersImageUrl = (item: Artwork) => {
    return item.image_file_1 || '/placeholder-artwork.jpg'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Live Auctioneers preview...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Live Auctioneers Preview</h1>
                <p className="text-sm text-gray-600">Preview how your items will appear on Live Auctioneers</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.open('https://www.liveauctioneers.com', '_blank')}
                className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit Live Auctioneers
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Auction Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Fine Art & Antiques Auction</h2>
              <div className="flex items-center space-x-6 mt-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  March 15, 2024 at 2:00 PM GMT
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  London, United Kingdom
                </div>
                <div className="flex items-center">
                  <Gavel className="h-4 w-4 mr-1" />
                  {items.length} lots
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-900">Msaber Auctions</div>
              <div className="text-sm text-gray-600">Premium Art & Antiques</div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Items Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Eye className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Items to Preview</h3>
            <p className="text-gray-600 mb-4">
              No active auction items found. Add some items to see the Live Auctioneers preview.
            </p>
            <button
              onClick={() => router.push('/items/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
                              Add Artwork
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => {
              const artistSchoolInfo = getArtistSchoolInfo(item)
              
              return (
                <div key={item.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  {/* Image */}
                  <div className="relative aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                    <img
                      src={getLiveAuctioneersImageUrl(item)}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/placeholder-artwork.jpg'
                      }}
                    />
                    <div className="absolute top-2 left-2 bg-white px-2 py-1 rounded text-xs font-medium">
                      Lot {item.lot_num}
                    </div>
                    {item.status !== 'active' && (
                      <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                        {item.status?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    {/* Artist/School */}
                    {artistSchoolInfo && (
                      <div className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">{artistSchoolInfo.name}</span>
                        {artistSchoolInfo.details && (
                          <span className="ml-1">({artistSchoolInfo.details})</span>
                        )}
                        {artistSchoolInfo.nationality && (
                          <span className="ml-1">• {artistSchoolInfo.nationality}</span>
                        )}
                        {artistSchoolInfo.location && (
                          <span className="ml-1">• {artistSchoolInfo.location}</span>
                        )}
                      </div>
                    )}
                    
                    {/* Title */}
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {item.title}
                    </h3>
                    
                    {/* Details */}
                    <div className="space-y-1 text-sm text-gray-600 mb-3">
                      {item.materials && (
                        <div>{item.materials}</div>
                      )}
                      {item.dimensions && (
                        <div>{item.dimensions}</div>
                      )}
                      {item.period_age && (
                        <div>{item.period_age}</div>
                      )}
                      {item.condition && (
                        <div>Condition: {item.condition}</div>
                      )}
                    </div>
                    
                    {/* Estimate */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-500">Estimate</div>
                        <div className="font-semibold text-gray-900">
                          {formatEstimate(item.low_est, item.high_est)}
                        </div>
                      </div>
                      
                      {item.start_price && (
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Starting bid</div>
                          <div className="font-medium text-blue-600">
                            £{item.start_price.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Description Preview */}
                    {item.description && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="bg-blue-50 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-sm text-blue-700">
            <h4 className="font-medium mb-2">Live Auctioneers Integration Notes:</h4>
            <ul className="space-y-1">
              <li>• Only items with "Active" status will be exported to Live Auctioneers</li>
              <li>• Artist/School information is automatically included in the item description</li>
              <li>• Images are optimized for Live Auctioneers display requirements</li>
              <li>• Estimates and starting bids are formatted according to Live Auctioneers standards</li>
              <li>• This preview shows how your items will appear to bidders on the platform</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 