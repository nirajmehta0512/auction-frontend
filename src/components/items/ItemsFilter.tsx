// frontend/src/components/items/ItemsFilterNew.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Search, Filter, X } from 'lucide-react'
import SearchableSelect from '@/components/ui/SearchableSelect'

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
  const [isExpanded, setIsExpanded] = useState(false)
  const [brands, setBrands] = useState<Array<{id: number, code: string, name: string}>>([])

  // Search suggestions for SearchableSelect
  const searchSuggestions = [
    { value: '', label: 'All Items', description: 'Show all inventory items' },
    { value: 'oil painting', label: 'Oil Paintings', description: 'Search for oil paintings' },
    { value: 'watercolor', label: 'Watercolors', description: 'Search for watercolor artworks' },
    { value: 'sculpture', label: 'Sculptures', description: 'Search for sculptural works' },
    { value: 'contemporary', label: 'Contemporary Art', description: 'Search for contemporary pieces' },
    { value: 'antique', label: 'Antiques', description: 'Search for antique items' },
    { value: 'signed', label: 'Signed Works', description: 'Search for signed artworks' },
    { value: 'framed', label: 'Framed Works', description: 'Search for framed pieces' },
    { value: 'canvas', label: 'Canvas Works', description: 'Search for works on canvas' },
    { value: 'limited edition', label: 'Limited Editions', description: 'Search for limited edition pieces' }
  ]

  // Load brands for filter
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/brands', {
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
  }, [])

  const handleClearFilters = () => {
    onFilterChange({
      status: 'all',
      category: '',
      search: '',
      brand: ''
    })
  }

  const hasActiveFilters = filters.status !== 'all' || filters.category !== '' || filters.search !== '' || filters.brand !== ''

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      {/* Quick Status Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {statuses.map((status) => {
          const count = status.value === 'all' 
            ? Object.values(statusCounts || {}).reduce((sum, count) => sum + count, 0)
            : statusCounts?.[status.value as keyof typeof statusCounts] || 0
          
          return (
            <button
              key={status.value}
              onClick={() => onFilterChange({ status: status.value })}
              className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.status === status.value
                  ? 'bg-teal-100 text-teal-800 border-teal-200 border'
                  : 'bg-gray-50 text-gray-700 border-gray-200 border hover:bg-gray-100'
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
              <span className="ml-2 text-xs bg-white rounded-full px-2 py-0.5">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search and Advanced Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <SearchableSelect
            value={filters.search}
            options={searchSuggestions}
            placeholder="Search items..."
            onChange={(value) => onFilterChange({ search: value?.toString() || '' })}
            inputPlaceholder="Search by title, description, lot number, or artist..."
            className="w-full"
          />
        </div>

        {/* Category Filter */}
        <div className="w-full lg:w-64">
          <select
            value={filters.category}
            onChange={(e) => onFilterChange({ category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
        <div className="w-full lg:w-64">
          <select
            value={filters.brand || ''}
            onChange={(e) => onFilterChange({ brand: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">All Brands</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.code}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Filter className="h-4 w-4 mr-2" />
          {isExpanded ? 'Less Filters' : 'More Filters'}
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <X className="h-4 w-4 mr-2" />
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters (Expandable) */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Created
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Any time</option>
                <option value="today">Today</option>
                <option value="week">Past week</option>
                <option value="month">Past month</option>
                <option value="quarter">Past quarter</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Has Images
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Any</option>
                <option value="yes">With images</option>
                <option value="no">Without images</option>
              </select>
            </div>
          </div>
        </div>
      )}

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