// frontend/src/app/schools/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Download, Filter } from 'lucide-react'
import { School, SchoolsAPI, SchoolsResponse } from '@/lib/schools-api'
import SchoolsTable from '@/components/schools/SchoolsTable'
import SchoolsFilter from '@/components/schools/SchoolsFilter'

interface FilterState {
  status: string;
  country: string;
  school_type: string;
  search: string;
}

export default function SchoolsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [showFilters, setShowFilters] = useState(true)
  const [selectedSchools, setSelectedSchools] = useState<string[]>([])
  
  // Pagination and filtering state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<FilterState>({
    status: 'active',
    country: '',
    school_type: '',
    search: ''
  })
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [counts, setCounts] = useState({
    active: 0,
    inactive: 0,
    archived: 0
  })

  // Load schools
  const loadSchools = async () => {
    try {
      setLoading(true)
      const response: SchoolsResponse = await SchoolsAPI.getSchools({
        ...filters,
        page,
        limit,
        sort_field: sortField,
        sort_direction: sortDirection
      })

      if (response.success) {
        setSchools(response.data)
        setTotal(response.pagination.total)
        setCounts(response.counts)
      } else {
        setError('Failed to load schools')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load schools')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchools()
  }, [page, limit, filters, sortField, sortDirection])

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPage(1) // Reset to first page when filtering
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleDeleteSchool = async (schoolId: string) => {
    if (!confirm('Are you sure you want to archive this school?')) return

    try {
      await SchoolsAPI.deleteSchool(schoolId)
      loadSchools() // Reload the list
    } catch (err: any) {
      setError(err.message || 'Failed to delete school')
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedSchools.length === 0) return

    try {
      let confirmMessage = ''
      switch (action) {
        case 'delete':
          confirmMessage = `Are you sure you want to archive ${selectedSchools.length} school(s)?`
          break
        case 'activate':
          confirmMessage = `Are you sure you want to activate ${selectedSchools.length} school(s)?`
          break
        case 'inactive':
          confirmMessage = `Are you sure you want to set ${selectedSchools.length} school(s) to inactive?`
          break
      }

      if (!confirm(confirmMessage)) return

      if (action === 'delete') {
        await SchoolsAPI.bulkAction('delete', selectedSchools)
      } else {
        await SchoolsAPI.bulkAction('update_status', selectedSchools, { status: action === 'activate' ? 'active' : 'inactive' })
      }

      setSelectedSchools([])
      loadSchools()
    } catch (err: any) {
      setError(err.message || 'Failed to perform bulk action')
    }
  }

  const handleExportCSV = async () => {
    try {
      await SchoolsAPI.exportCSV({
        status: filters.status === 'all' ? undefined : filters.status,
        country: filters.country || undefined,
        school_type: filters.school_type || undefined
      })
    } catch (err: any) {
      setError(err.message || 'Failed to export CSV')
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School of Art</h1>
          <p className="text-gray-600 mt-1">
            Manage your schools database with AI generation support
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/schools/new')}
            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New School
          </button>
          
          <button
            onClick={handleExportCSV}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-sm text-gray-600">Active</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{counts.active}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
            <span className="text-sm text-gray-600">Inactive</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{counts.inactive}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
            <span className="text-sm text-gray-600">Archived</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{counts.archived}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border mb-6">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            <Filter className="h-4 w-4 mr-1" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
        </div>
        
        {showFilters && (
          <div className="p-4">
            <SchoolsFilter
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedSchools.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedSchools.length} school(s) selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkAction('activate')}
                className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('inactive')}
                className="px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded"
              >
                Set Inactive
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-500 underline text-sm mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Schools Table */}
      <div className="bg-white rounded-lg border">
        <SchoolsTable
          schools={schools}
          loading={loading}
          selectedSchools={selectedSchools}
          onSelectionChange={setSelectedSchools}
          onSort={handleSort}
          sortField={sortField}
          sortDirection={sortDirection}
          onDelete={handleDeleteSchool}
          onEdit={(id: string) => router.push(`/schools/edit/${id}`)}
        />
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-gray-600">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} schools
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 