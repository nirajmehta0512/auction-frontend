// frontend/src/app/logistics/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import LogisticsTable from '@/components/logistics/LogisticsTable'
import LogisticsFilter from '@/components/logistics/LogisticsFilter'
import CSVUpload from '@/components/logistics/CSVUpload'
import { Plus, Download, Upload, Calculator, CheckCircle, Truck } from 'lucide-react'
import { getLogistics, exportLogisticsCSV, bulkActionLogistics, deleteLogisticsEntry } from '@/lib/logistics-api'
import type { LogisticsEntry, LogisticsFilters } from '@/lib/logistics-api'

export default function LogisticsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLogistics, setSelectedLogistics] = useState<string[]>([])
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [logistics, setLogistics] = useState<LogisticsEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [filters, setFilters] = useState<LogisticsFilters>({
    page: 1,
    limit: 25,
    sort_field: 'created_at',
    sort_direction: 'desc'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0
  })

  // Check for success messages from URL params
  useEffect(() => {
    if (searchParams.get('created') === 'true') {
      setSuccessMessage('Logistics entry created successfully!')
      // Clear the URL parameter
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    } else if (searchParams.get('updated') === 'true') {
      setSuccessMessage('Logistics entry updated successfully!')
      // Clear the URL parameter
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams])

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Load logistics data
  const loadLogistics = async () => {
    try {
      setLoading(true)
      const response = await getLogistics(filters)
      setLogistics(response.logistics)
      setPagination(response.pagination)
    } catch (error) {
      console.error('Error loading logistics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogistics()
  }, [filters])

  const handleFilterChange = (newFilters: LogisticsFilters) => {
    setFilters({ ...newFilters, page: 1 })
    setSelectedLogistics([])
  }

  const handleExportCSV = async () => {
    try {
      const blob = await exportLogisticsCSV(filters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `logistics-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting CSV:', error)
    }
  }

  const handleCSVUploadComplete = (importedCount: number) => {
    setShowCSVUpload(false)
    setSuccessMessage(`Successfully imported ${importedCount} logistics entries`)
    loadLogistics()
  }

  const handleBulkAction = async (action: string, data?: any) => {
    try {
      await bulkActionLogistics(selectedLogistics, action, data)
      setSelectedLogistics([])
      loadLogistics()
    } catch (error) {
      console.error('Error performing bulk action:', error)
    }
  }

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }))
  }

  const handleEditLogistics = (logistics: LogisticsEntry) => {
    router.push(`/logistics/edit/${logistics.id}`)
  }

  const handleDeleteLogistics = async (logistics: LogisticsEntry) => {
    if (window.confirm(`Are you sure you want to delete logistics entry ${logistics.reference_number}?`)) {
      try {
        await deleteLogisticsEntry(logistics.id)
        setSuccessMessage('Logistics entry deleted successfully')
        loadLogistics()
      } catch (error) {
        console.error('Error deleting logistics:', error)
      }
    }
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Truck className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Logistics Management</h1>
              <p className="text-gray-600 mt-1">Manage shipping entries and calculate costs</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showFilters 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Filters
            </button>
            
            <button
              onClick={() => setShowCSVUpload(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>Import CSV</span>
            </button>
            
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
            
            <button
              onClick={() => router.push('/logistics/new')}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Entry</span>
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <p className="text-green-700">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <LogisticsFilter 
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      )}

      {/* Bulk Actions */}
      {selectedLogistics.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">
              {selectedLogistics.length} item{selectedLogistics.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-3">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkAction('status_update', { status: e.target.value })
                    e.target.value = ''
                  }
                }}
                className="text-sm border border-blue-300 rounded px-3 py-1"
              >
                <option value="">Update Status</option>
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button
                onClick={() => handleBulkAction('delete')}
                className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <LogisticsTable
          logistics={logistics}
          loading={loading}
          selectedLogistics={selectedLogistics}
          onSelectionChange={setSelectedLogistics}
          onEdit={handleEditLogistics}
          onDelete={handleDeleteLogistics}
        />

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const page = i + 1
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 text-sm border rounded ${
                        pagination.page === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSV Upload Modal */}
      {showCSVUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <CSVUpload
              onUploadComplete={handleCSVUploadComplete}
              onClose={() => setShowCSVUpload(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
} 