// frontend/src/app/galleries/page.tsx
'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Search, Download, Upload, Filter, MoreHorizontal, Edit, Trash2, Building2, Sparkles, ExternalLink, Share2 } from 'lucide-react'
import { GalleriesAPI, Gallery, GalleriesFilters } from '@/lib/galleries-api'
import { LoadScript, StandaloneSearchBox } from '@react-google-maps/api'
import ExportShareModal from '@/components/ExportShareModal'
import { useExportShare } from '@/hooks/useExportShare'

export default function GalleriesPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null)
  const [showAddOption, setShowAddOption] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [filters, setFilters] = useState<GalleriesFilters>({
    status: 'active',
    page: 1,
    limit: 25,
    sort_field: 'name',
    sort_direction: 'asc'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0
  })

  // Google Places setup
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null)
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  const placesLibraries = useMemo(() => ['places'] as ("places")[], [])

  // Export/Share configuration for superadmin
  const [userRole] = useState<string>('superadmin') // In real app, get from auth context
  
  const galleryExportFields = [
    { key: 'name', label: 'Gallery Name', selected: true, required: true },
    { key: 'location', label: 'Location', selected: true },
    { key: 'country', label: 'Country', selected: true },
    { key: 'gallery_type', label: 'Type', selected: true },
    { key: 'founded_year', label: 'Founded Year', selected: false },
    { key: 'director', label: 'Director', selected: false },
    { key: 'website', label: 'Website', selected: false },
    { key: 'description', label: 'Description', selected: false },
    { key: 'specialties', label: 'Specialties', selected: false },
    { key: 'phone', label: 'Phone', selected: false },
    { key: 'email', label: 'Email', selected: false },
    { key: 'status', label: 'Status', selected: false },
    { key: 'created_at', label: 'Created Date', selected: false },
  ]

  const exportShare = useExportShare({
    title: 'Galleries Database',
    data: galleries,
    fields: galleryExportFields,
    filename: `galleries-export-${Date.now()}`,
    userRole: userRole
  })

  useEffect(() => {
    loadGalleries()
  }, [filters])

  const loadGalleries = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const searchFilters = { ...filters }
      if (searchTerm) {
        searchFilters.search = searchTerm
      }
      
      const response = await GalleriesAPI.getGalleries(searchFilters)
      
      if (response.success) {
        setGalleries(response.data)
        setPagination(response.pagination)
      } else {
        setError('Failed to load galleries')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load galleries')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters(prev => ({ ...prev, page: 1 }))
    loadGalleries()
  }

  const handleFilterChange = (newFilters: Partial<GalleriesFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }

  const handleDelete = async (galleryId: string, galleryName: string) => {
    if (!confirm(`Are you sure you want to delete "${galleryName}"?`)) {
      return
    }

    try {
      await GalleriesAPI.deleteGallery(galleryId)
      await loadGalleries() // Refresh the list
    } catch (err: any) {
      alert(`Failed to delete gallery: ${err.message}`)
    }
  }

  const handleExport = async () => {
    try {
      await GalleriesAPI.exportCSV(filters)
    } catch (err: any) {
      alert(`Failed to export galleries: ${err.message}`)
    }
  }

  const handlePlacesChanged = () => {
    const box = searchBoxRef.current
    if (!box) return
    
    const places = box.getPlaces()
    if (places && places.length > 0) {
      const place = places[0]
      setSelectedPlace(place)
      setShowAddOption(true)
      setSearchTerm(place.name || '')
    }
  }

  const handleGoogleSearch = () => {
    if (selectedPlace?.name) {
      const searchQuery = `${selectedPlace.name} gallery`
      window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank')
    }
  }

  const handleAiGenerateFromPlace = async () => {
    if (!selectedPlace?.name) return

    try {
      setAiGenerating(true)
      
      // Call AI generation API for galleries
      const response = await fetch('/api/galleries/generate-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: selectedPlace.name,
          location: selectedPlace.formatted_address
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate AI content')
      }

      const data = await response.json()
      
      if (data.success) {
        // Navigate to gallery form with AI-generated data
        const galleryData = {
          ...data.data,
          name: selectedPlace.name
        }
        
        const params = new URLSearchParams()
        Object.entries(galleryData).forEach(([key, value]) => {
          if (value) params.append(key, value.toString())
        })
        
        window.location.href = `/galleries/new?${params.toString()}`
      }
    } catch (err: any) {
      alert(`Failed to generate gallery details: ${err.message}`)
    } finally {
      setAiGenerating(false)
    }
  }

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'archived', label: 'Archived' }
  ]

  const galleryTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'museum', label: 'Museum' },
    { value: 'institution', label: 'Institution' },
    { value: 'private', label: 'Private' },
    { value: 'cooperative', label: 'Cooperative' }
  ]

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getGalleryTypeBadge = (type: string) => {
    const colors = {
      commercial: 'bg-blue-100 text-blue-800',
      museum: 'bg-purple-100 text-purple-800',
      institution: 'bg-indigo-100 text-indigo-800',
      private: 'bg-pink-100 text-pink-800',
      cooperative: 'bg-teal-100 text-teal-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Building2 className="h-8 w-8 text-teal-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Galleries</h1>
            <p className="text-gray-600">Manage gallery information and certifications</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          
          {userRole === 'superadmin' && (
            <button
              onClick={exportShare.openModal}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Export & Share
            </button>
          )}
          
          <Link
            href="/galleries/new"
            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Gallery
          </Link>
        </div>
      </div>

      {/* Enhanced Search with Google Places */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="space-y-4">
            {/* Gallery Search with Autocomplete */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Search World Famous Galleries
              </label>
              <LoadScript
                googleMapsApiKey={googleApiKey}
                libraries={placesLibraries}
              >
                <div className="flex items-center space-x-2">
                  <div className="flex-1 relative">
                    <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 z-10" />
                    <StandaloneSearchBox
                      onLoad={(ref) => { searchBoxRef.current = ref }}
                      onPlacesChanged={handlePlacesChanged}
                    >
                      <input
                        type="text"
                        placeholder="Search famous galleries like Louvre, MoMA, Tate Modern..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value)
                          if (!e.target.value) {
                            setShowAddOption(false)
                            setSelectedPlace(null)
                          }
                        }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </StandaloneSearchBox>
                  </div>
                  
                  {showAddOption && selectedPlace && (
                    <>
                      <button
                        type="button"
                        onClick={handleGoogleSearch}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Search
                      </button>
                      <button
                        type="button"
                        onClick={handleAiGenerateFromPlace}
                        disabled={aiGenerating}
                        className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      >
                        {aiGenerating ? (
                          <div className="animate-spin rounded-full h-4 w-4 mr-2 border-b-2 border-white"></div>
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        {aiGenerating ? 'Generating...' : 'Add with AI'}
                      </button>
                    </>
                  )}
                </div>
              </LoadScript>
            </div>

            {/* Traditional Search */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Search Existing Galleries
              </label>
              <form onSubmit={handleSearch} className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search existing galleries by name, location, director..."
                      value={filters.search || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Search Database
                </button>
              </form>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange({ status: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filters.gallery_type || ''}
                onChange={(e) => handleFilterChange({ gallery_type: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {galleryTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                placeholder="Filter by location"
                value={filters.location || ''}
                onChange={(e) => handleFilterChange({ location: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <input
                type="text"
                placeholder="Filter by country"
                value={filters.country || ''}
                onChange={(e) => handleFilterChange({ country: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Results */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {galleries.length} of {pagination.total} galleries
            </p>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={`${filters.sort_field}-${filters.sort_direction}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split('-')
                  handleFilterChange({ 
                    sort_field: field, 
                    sort_direction: direction as 'asc' | 'desc' 
                  })
                }}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="location-asc">Location (A-Z)</option>
                <option value="founded_year-desc">Founded Year (Newest)</option>
                <option value="founded_year-asc">Founded Year (Oldest)</option>
                <option value="created_at-desc">Recently Added</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        ) : galleries.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No galleries found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filters.status !== 'active' 
                ? 'Try adjusting your search or filters' 
                : 'Get started by adding your first gallery'
              }
            </p>
            <Link
              href="/galleries/new"
              className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Gallery
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gallery
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Director
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {galleries.map((gallery) => (
                    <tr key={gallery.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {gallery.name}
                          </div>
                          {gallery.website && (
                            <div className="text-sm text-gray-500">
                              <a 
                                href={gallery.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-teal-600"
                              >
                                {gallery.website}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getGalleryTypeBadge(gallery.gallery_type || '')}`}>
                          {gallery.gallery_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {gallery.location}
                          {gallery.country && gallery.location && ', '}
                          {gallery.country}
                        </div>
                        {gallery.founded_year && (
                          <div className="text-sm text-gray-500">
                            Founded {gallery.founded_year}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{gallery.director}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(gallery.status || 'active')}`}>
                          {gallery.status}
                        </span>
                        {gallery.is_verified && (
                          <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Verified
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/galleries/edit/${gallery.id}`}
                            className="text-teal-600 hover:text-teal-900"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(gallery.id!, gallery.name)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.pages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleFilterChange({ page: Math.max(1, pagination.page - 1) })}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handleFilterChange({ page: Math.min(pagination.pages, pagination.page + 1) })}
                      disabled={pagination.page === pagination.pages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Export/Share Modal */}
      <ExportShareModal
        isOpen={exportShare.isModalOpen}
        onClose={exportShare.closeModal}
        title={exportShare.config.title}
        data={exportShare.config.data}
        availableFields={exportShare.config.fields}
        onExport={exportShare.handleExport}
        onPrint={exportShare.handlePrint}
        onShare={exportShare.handleShare}
        userRole={userRole}
      />
    </div>
  )
} 