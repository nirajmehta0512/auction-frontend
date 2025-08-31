// frontend/src/components/items/ItemsFilterNew.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Search, Filter, X } from 'lucide-react'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { ArtworksAPI } from '@/lib/items-api'
import { useBrand } from '@/lib/brand-context'

interface FilterState {
  status: string
  category: string
  search: string
  brand?: string
}

interface ItemsFilterProps {
  filters: FilterState
  onFilterChange: (filters: Partial<FilterState>) => void
  statusCounts?: {
    draft: number
    active: number
    sold: number
    withdrawn: number
    passed: number
  }
}

const categories = [
  'Fine Art',
  'Antique Furniture',
  'Silver & Metalware',
  'Ceramics & Glass',
  'Asian Art',
  'Jewelry & Watches',
  'Books & Manuscripts',
  'Collectibles',
  'Textiles',
  'Musical Instruments',
  'Scientific Instruments',
  'Other'
]

const statuses = [
  { value: 'all', label: 'All Items', color: 'bg-gray-100 text-gray-800' },
  { value: 'draft', label: 'Draft', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'sold', label: 'Sold', color: 'bg-blue-100 text-blue-800' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'bg-red-100 text-red-800' },
  { value: 'passed', label: 'Passed', color: 'bg-gray-100 text-gray-800' }
]

export default function ItemsFilter({ filters, onFilterChange, statusCounts }: ItemsFilterProps) {
  const { brand } = useBrand()
  const [showFilters, setShowFilters] = useState(true)
  const [brands, setBrands] = useState<Array<{id: number, code: string, name: string}>>([])
  const [itemSuggestions, setItemSuggestions] = useState<Array<{value: string, label: string, description: string}>>([])
  const [loadingItems, setLoadingItems] = useState(false)

  // Load items and create suggestions
  useEffect(() => {
    const loadItemSuggestions = async () => {
      if (!brand) return
      
      try {
        setLoadingItems(true)
        const response = await ArtworksAPI.getArtworks({
          page: 1,
          limit: 200, // Get enough items to create good suggestions
          brand_code: brand as 'MSABER' | 'AURUM' | 'METSAB' | undefined
        })
        
        // Create search suggestions from real items
        const suggestions = [
          { value: '', label: 'All Items', description: 'Show all inventory items' }
        ]
        
        // Add suggestions based on unique titles and categories
        const uniqueTitles = new Set<string>()
        const uniqueCategories = new Set<string>()
        
        response.data.forEach(item => {
          if (item.title && !uniqueTitles.has(item.title.toLowerCase())) {
            uniqueTitles.add(item.title.toLowerCase())
            if (uniqueTitles.size <= 15) { // Limit to prevent too many suggestions
              suggestions.push({
                value: item.title,
                label: item.title,
                description: `Search for "${item.title}"`
              })
            }
          }
          
          if (item.category && !uniqueCategories.has(item.category.toLowerCase())) {
            uniqueCategories.add(item.category.toLowerCase())
            if (uniqueCategories.size <= 10) {
              suggestions.push({
                value: item.category,
                label: item.category,
                description: `Search for ${item.category} items`
              })
            }
          }
        })
        
        setItemSuggestions(suggestions)
      } catch (error) {
        console.error('Failed to load item suggestions:', error)
        // Fallback to basic suggestions
        setItemSuggestions([
          { value: '', label: 'All Items', description: 'Show all inventory items' }
        ])
      } finally {
        setLoadingItems(false)
      }
    }

    const loadBrands = async () => {
      try {
        const token = localStorage.getItem('token')
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const response = await fetch(`${backendUrl}/api/brands`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        })
        if (response.ok) {
          const data = await response.json()
          setBrands(data.data || [])
        }
      } catch (error) {
        console.error('Failed to load brands:', error)
      }
    }
    
    loadBrands()
    loadItemSuggestions()
  }, [brand])

  const handleClearFilters = () => {
    onFilterChange({
      status: 'all',
      category: '',
      search: '',
      brand: ''
    })
  }

  const hasActiveFilters = filters.status !== 'all' || filters.category !== '' || filters.search !== '' || filters.brand !== ''

  // When filters are hidden, show only the toggle button
  if (!showFilters) {
    return (
      <div className="flex items-center justify-center py-4">
        <button
          onClick={() => setShowFilters(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
        >
          <Filter className="h-4 w-4 mr-2" />
          Show Filters
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with hide toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        <button
          onClick={() => setShowFilters(false)}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <X className="h-4 w-4 mr-1" />
          Hide Filters
        </button>
      </div>

      {/* Quick Status Filters with enhanced layout */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Filter by Status</h4>
          <div className="text-xs text-gray-500">
            Total: {Object.values(statusCounts || {}).reduce((sum, count) => sum + count, 0).toLocaleString()} items
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => {
            const count = status.value === 'all'
              ? Object.values(statusCounts || {}).reduce((sum, count) => sum + count, 0)
              : statusCounts?.[status.value as keyof typeof statusCounts] || 0

            return (
              <button
                key={status.value}
                onClick={() => onFilterChange({ status: status.value })}
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  filters.status === status.value
                    ? 'bg-teal-100 text-teal-800 border-teal-200 border-2 shadow-sm'
                    : 'bg-gray-50 text-gray-700 border-gray-200 border hover:bg-gray-100 hover:border-gray-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  status.value === 'all' ? 'bg-gray-400' :
                  status.value === 'draft' ? 'bg-yellow-500' :
                  status.value === 'active' ? 'bg-green-500' :
                  status.value === 'sold' ? 'bg-blue-500' :
                  status.value === 'withdrawn' ? 'bg-red-500' :
                  'bg-gray-400'
                }`}></span>
                {status.label}
                <span className={`ml-2 text-xs rounded-full px-2 py-0.5 ${
                  filters.status === status.value
                    ? 'bg-teal-200 text-teal-800'
                    : 'bg-white text-gray-600'
                }`}>
                  {count.toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Search and Filter</h4>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Search - takes more space */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search Items</label>
            <SearchableSelect
              value={filters.search}
              options={itemSuggestions}
              placeholder={loadingItems ? "Loading items..." : "Search by title, description, ID, or artist..."}
              onChange={(value) => onFilterChange({ search: value?.toString() || '' })}
              inputPlaceholder="Type to search..."
              className="w-full"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => onFilterChange({ category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Brand</label>
            <select
              value={filters.brand || ''}
              onChange={(e) => onFilterChange({ brand: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            >
              <option value="">All Brands</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.code}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="flex justify-end mt-4">
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Active filters:</span>

            {filters.status !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                Status: {statuses.find(s => s.value === filters.status)?.label}
                <button
                  onClick={() => onFilterChange({ status: 'all' })}
                  className="ml-1 text-teal-600 hover:text-teal-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.category && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Category: {filters.category}
                <button
                  onClick={() => onFilterChange({ category: '' })}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.search && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Search: "{filters.search}"
                <button
                  onClick={() => onFilterChange({ search: '' })}
                  className="ml-1 text-purple-600 hover:text-purple-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 