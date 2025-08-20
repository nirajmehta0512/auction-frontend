// frontend/src/components/logistics/LogisticsFilter.tsx
"use client"

import React from 'react'
import { Search, X } from 'lucide-react'
import type { LogisticsFilters } from '@/lib/logistics-api'

interface LogisticsFilterProps {
  filters: LogisticsFilters;
  onFilterChange: (filters: LogisticsFilters) => void;
}

export default function LogisticsFilter({ filters, onFilterChange }: LogisticsFilterProps) {
  const handleFilterUpdate = (key: keyof LogisticsFilters, value: any) => {
    onFilterChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFilterChange({
      page: 1,
      limit: filters.limit,
      sort_field: 'created_at',
      sort_direction: 'desc'
    })
  }

  const hasActiveFilters = () => {
    return !!(
      filters.search ||
      filters.status ||
      filters.destination_type ||
      filters.client_id ||
      filters.item_id ||
      filters.consignment_id
    )
  }

  return (
    <div className="p-6 bg-gray-50 border-b border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Search */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => handleFilterUpdate('search', e.target.value)}
              placeholder="Reference, description, country..."
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterUpdate('status', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Destination Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Destination Type
          </label>
          <select
            value={filters.destination_type || ''}
            onChange={(e) => handleFilterUpdate('destination_type', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Destinations</option>
            <option value="within_uk">Within UK</option>
            <option value="outside_uk">Outside UK</option>
          </select>
        </div>

        {/* Sort Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <div className="flex space-x-2">
            <select
              value={filters.sort_field || 'created_at'}
              onChange={(e) => handleFilterUpdate('sort_field', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="created_at">Created Date</option>
              <option value="updated_at">Updated Date</option>
              <option value="reference_number">Reference</option>
              <option value="destination_type">Destination Type</option>
              <option value="status">Status</option>
              <option value="total_charge">Total Charge</option>
              <option value="weight_kg">Weight</option>
            </select>
            <select
              value={filters.sort_direction || 'desc'}
              onChange={(e) => handleFilterUpdate('sort_direction', e.target.value as 'asc' | 'desc')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desc">↓ Desc</option>
              <option value="asc">↑ Asc</option>
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Client ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client ID
          </label>
          <input
            type="text"
            value={filters.client_id || ''}
            onChange={(e) => handleFilterUpdate('client_id', e.target.value || undefined)}
            placeholder="Filter by client ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Item ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item ID
          </label>
          <input
            type="text"
            value={filters.item_id || ''}
            onChange={(e) => handleFilterUpdate('item_id', e.target.value || undefined)}
            placeholder="Filter by item ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Consignment ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Consignment ID
          </label>
          <input
            type="text"
            value={filters.consignment_id || ''}
            onChange={(e) => handleFilterUpdate('consignment_id', e.target.value || undefined)}
            placeholder="Filter by consignment ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filter Actions */}
      {hasActiveFilters() && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Active filters applied
          </div>
          <button
            onClick={clearFilters}
            className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <X className="h-4 w-4" />
            <span>Clear all filters</span>
          </button>
        </div>
      )}
    </div>
  )
} 