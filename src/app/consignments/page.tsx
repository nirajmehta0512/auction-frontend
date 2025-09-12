"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ConsignmentsTable from '@/components/consignments/ConsignmentsTable'
import CSVUpload from '@/components/consignments/CSVUpload'
import ConsignmentPDFGeneratorBackend from '@/components/consignments/ConsignmentPDFGeneratorBackend'
import ConsignmentGoogleSheetsSync from '@/components/consignments/ConsignmentGoogleSheetsSync'
import { isSuperAdmin } from '@/lib/auth-utils'
import { Plus, Download, Upload } from 'lucide-react'
import { getConsignments, exportConsignmentsCSV } from '@/lib/consignments-api'
import { formatClientDisplay } from '@/lib/clients-api'
import SearchableSelect from '@/components/ui/SearchableSelect'

// Convert API consignment to component consignment format
const convertConsignmentFormat = (consignment: any) => {
  // Extract client name from nested clients object
  let clientName = 'Unknown Client'
  if (consignment.clients) {
    const client = consignment.clients
    const firstName = client.first_name || ''
    const lastName = client.last_name || ''
    const companyName = client.company_name || ''

    if (companyName) {
      clientName = companyName
    } else if (firstName || lastName) {
      clientName = [firstName, lastName].filter(Boolean).join(' ')
    }
  } else {
    // Fallback to old format if clients object doesn't exist
    clientName = consignment.client_name
      || [consignment.client_first_name, consignment.client_last_name].filter(Boolean).join(' ')
      || consignment.client_company
      || 'Unknown Client'
  }

  console.log('Consignment:', consignment)


  // Try to get brand code from various possible fields including nested client data
  const brandCode = consignment.client_brand_code
    || consignment.brand_code
    || (consignment.clients && consignment.clients.brands && consignment.clients.brands.code)
    || null

  return {
    id: consignment.id,
    number: consignment.id, // Use ID as the number display
    client: clientName,
    client_id: consignment.client_id,
    clientIdFormatted: formatClientDisplay({
      id: consignment.client_id,
      brand_code: brandCode,
      brand: brandCode
    } as any),
    itemsCount: consignment.items_count || 0,
    specialist: consignment.specialist_name || consignment.specialist || 'Unknown Specialist',
    defaultSale: consignment.default_sale || '',
    created: consignment.created_at ? new Date(consignment.created_at).toLocaleDateString() : '',
    signed: consignment.is_signed || false
  }
}

// This will be dynamically loaded from actual consignments

export default function ConsignmentsPage() {
  const router = useRouter()
  const [showFilters, setShowFilters] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'completed' | 'cancelled' | 'archived'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConsignments, setSelectedConsignments] = useState<number[]>([])
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [showPDFGenerator, setShowPDFGenerator] = useState(false)
  const [showGoogleSheetsSync, setShowGoogleSheetsSync] = useState(false)
  const [consignments, setConsignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userIsSuperAdmin, setUserIsSuperAdmin] = useState(false)
  const [consignmentSuggestions, setConsignmentSuggestions] = useState<Array<{ value: string, label: string, description: string }>>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  // Check user role on component mount
  useEffect(() => {
    setUserIsSuperAdmin(isSuperAdmin())
  }, [])

  // Load consignment suggestions for search
  const loadConsignmentSuggestions = async () => {
    try {
      setLoadingSuggestions(true)
      const response = await getConsignments({ limit: 200 }) // Get enough for good suggestions
      const consignmentsData = response.data || (response as any).consignments || []

      // Create search suggestions from actual consignments
      const suggestions = [
        { value: '', label: 'All Consignments', description: 'Show all consignments' }
      ]

      // Add unique client names
      const clientNames = new Set<string>()
      const consignmentNumbers = new Set<string>()

      consignmentsData.forEach((consignment: any) => {
        const clientName = consignment.client_name ||
          [consignment.client_first_name, consignment.client_last_name].filter(Boolean).join(' ') ||
          consignment.client_company;

        if (clientName && !clientNames.has(clientName.toLowerCase())) {
          clientNames.add(clientName.toLowerCase())
          if (clientNames.size <= 10) { // Limit suggestions
            suggestions.push({
              value: clientName,
              label: clientName,
              description: `Search for ${clientName}'s consignments`
            })
          }
        }

        // Add consignment numbers/IDs
        if (consignment.id && !consignmentNumbers.has(consignment.id.toString())) {
          consignmentNumbers.add(consignment.id.toString())
          if (consignmentNumbers.size <= 10) {
            suggestions.push({
              value: consignment.id.toString(),
              label: `Consignment #${consignment.id}`,
              description: `Search for consignment ${consignment.id}`
            })
          }
        }
      })

      setConsignmentSuggestions(suggestions)
    } catch (error) {
      console.error('Error loading consignment suggestions:', error)
      // Fallback to basic suggestions
      setConsignmentSuggestions([
        { value: '', label: 'All Consignments', description: 'Show all consignments' }
      ])
    } finally {
      setLoadingSuggestions(false)
    }
  }

  // Load suggestions on component mount
  useEffect(() => {
    loadConsignmentSuggestions()
  }, [])

  // Fetch consignments on component mount
  useEffect(() => {
    const fetchConsignments = async () => {
      try {
        setLoading(true)
        // Default: no status filter
        const response = await getConsignments()
        console.log('Consignments response:', response) // Debug log

        // Handle both possible response structures
        const consignmentsData = response.data || (response as any).consignments || []
        const formattedConsignments = consignmentsData.map(convertConsignmentFormat)
        setConsignments(formattedConsignments)
      } catch (error) {
        console.error('Error fetching consignments:', error)
        setConsignments([]) // Set empty array on error
      } finally {
        setLoading(false)
      }
    }

    fetchConsignments()
  }, [])

  const applyFilters = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter
      if (searchQuery && searchQuery.trim() !== '') params.search = searchQuery.trim()
      const response = await getConsignments(params)
      const consignmentsData = response.data || (response as any).consignments || []
      const formattedConsignments = consignmentsData.map(convertConsignmentFormat)
      setConsignments(formattedConsignments)
    } catch (error) {
      console.error('Error applying filters:', error)
      setConsignments([])
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = async () => {
    setStatusFilter('all')
    setSearchQuery('')
    await applyFilters()
  }

  const handleExportCSV = async () => {
    try {
      const blob = await exportConsignmentsCSV()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'consignments.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting consignments:', error)
    }
  }

  const handleCSVUploadComplete = (importedCount: number) => {
    setShowCSVUpload(false)
    // Refresh consignments list here if needed
    console.log(`Imported ${importedCount} consignments`)
  }

  const handleEditConsignment = (consignment: any) => {
    router.push(`/consignments/edit/${consignment.id}`)
  }

  const handleDeleteConsignment = async (consignment: any) => {
    if (confirm(`Are you sure you want to delete consignment ${consignment.id}?`)) {
      try {
        // Import the delete function from consignments API
        const { deleteConsignment } = await import('@/lib/consignments-api')
        await deleteConsignment(consignment.id)
        // Refresh the consignments list
        const fetchConsignments = async () => {
          try {
            setLoading(true)
            const response = await getConsignments()
            const consignmentsData = response.data || (response as any).consignments || []
            const formattedConsignments = consignmentsData.map(convertConsignmentFormat)
            setConsignments(formattedConsignments)
          } catch (error) {
            console.error('Error fetching consignments:', error)
          } finally {
            setLoading(false)
          }
        }
        await fetchConsignments()
      } catch (error) {
        console.error('Error deleting consignment:', error)
        alert('Failed to delete consignment')
      }
    }
  }

  const handleClientClick = (clientId: number) => {
    router.push(`/clients/${clientId}`)
  }

  const handleGenerateReportPDF = () => {
    if (selectedConsignments.length === 0) {
      alert('Please select at least one consignment to generate a PDF report')
      return
    }

    setShowPDFGenerator(true)
  }

  const handlePDFComplete = () => {
    setShowPDFGenerator(false)
    setSelectedConsignments([])
  }

  const handleGeneratePdf = async (consignment: any, type: 'consignment' | 'collection' | 'presale') => {
    try {
      console.log(`Generating ${type} PDF for consignment ${consignment.id}`)

      // For now, we'll use mock data since we don't have the full integration yet
      // In a real implementation, you would fetch the client and items data here

      // Mock client data (this would come from an API call)
      const mockClient = {
        id: consignment.clientId,
        first_name: consignment.client.split(' ')[0] || 'Unknown',
        last_name: consignment.client.split(' ').slice(1).join(' ') || 'Client',
        company_name: '',
        email: 'client@example.com',
        phone_number: '01234 567890',
        billing_address1: '123 Example Street',
        billing_address2: '',
        billing_address3: '',
        billing_city: 'London',
        billing_post_code: 'SW1A 1AA',
        billing_region: 'London',
        billing_country: 'United Kingdom'
      }

      // Mock items data (this would come from an API call)
      const mockItems = [
        {
          id: '1',
          lot_number: '001',
          title: 'Abstract Composition',
          description: 'Oil on canvas, signed and dated lower right',
          artist_name: 'John Smith',
          dimensions: '60 x 80 cm',
          condition: 'Excellent',
          low_est: 800,
          high_est: 1200,
          reserve: 700,
          status: 'active' as const,
          vendor_commission: 15,
        },
        {
          id: '2',
          lot_number: '002',
          title: 'Landscape Study',
          description: 'Watercolor on paper',
          artist_name: 'Jane Doe',
          dimensions: '30 x 40 cm',
          condition: 'Good',
          low_est: 300,
          high_est: 500,
          status: 'returned' as const,
          vendor_commission: 15,
          return_reason: 'Client requested return',
          return_date: new Date().toISOString()
        }
      ]

      const consignmentData = {
        id: consignment.id.toString(),
        receipt_no: consignment.id.toString(),
        created_at: new Date().toISOString(),
        specialist_name: consignment.specialist,
        items_count: consignment.itemsCount,
        total_estimated_value: 0,
        client_id: consignment.clientId
      }

      // The actual PDF generation will be handled by the PDFGenerator component
      // when it's rendered. This function mainly serves to trigger the UI update
      console.log('PDF generation initiated for:', {
        type,
        consignment: consignmentData,
        client: mockClient,
        items: mockItems
      })

    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  const handleShare = async (consignment: any) => {
    try {
      const consignmentUrl = `${window.location.origin}/consignments/view/${consignment.id}`
      const shareData: ShareData = {
        title: `Consignment ${consignment.id}`,
        text: `Consignment ${consignment.id} for ${consignment.client}`,
        url: consignmentUrl
      }

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData)
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(consignmentUrl)
        alert('Link copied to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing:', error)
      // Fallback to manual copy
      try {
        const consignmentUrl = `${window.location.origin}/consignments/view/${consignment.id}`
        await navigator.clipboard.writeText(consignmentUrl)
        alert('Link copied to clipboard!')
      } catch (clipboardError) {
        console.error('Error copying to clipboard:', clipboardError)
        alert('Unable to share or copy link')
      }
    }
  }

  const handlePrint = (consignment: any) => {
    // Open the consignment view page in a new window for printing
    const printWindow = window.open(`/consignments/view/${consignment.id}`, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
        }, 500)
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 w-full max-w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="bg-slate-700 px-2 py-3 sm:px-4 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 w-full">
        <h1 className="text-lg sm:text-2xl font-semibold text-white">Consignments</h1>
        <button
          onClick={() => router.push('/consignments/new')}
          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-md flex items-center justify-center sm:justify-start space-x-2 transition-colors text-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add New Consignment</span>
          <span className="sm:hidden">Add Consignment</span>
        </button>
      </div>

      {/* Table Actions */}
      <div className="bg-white px-2 sm:px-4 py-3 border-b border-gray-200 w-full">
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between w-full max-w-full">
          <div className="flex items-center">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm transition-colors cursor-pointer"
            >
              🔍 {showFilters ? 'Hide filters' : 'Show filters'}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1 sm:space-x-2 text-gray-600 hover:text-gray-700 text-xs sm:text-sm cursor-pointer hover:underline"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </button>
            <button
              onClick={() => setShowCSVUpload(true)}
              className="flex items-center space-x-1 sm:space-x-2 text-gray-600 hover:text-gray-700 text-xs sm:text-sm cursor-pointer hover:underline"
            >
              <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Import CSV</span>
              <span className="sm:hidden">Import</span>
            </button>
            <button
              onClick={() => setShowGoogleSheetsSync(true)}
              className="flex items-center space-x-1 sm:space-x-2 text-green-600 hover:text-green-700 text-xs sm:text-sm cursor-pointer hover:underline"
            >
              <span className="hidden sm:inline">Google Sheets</span>
              <span className="sm:hidden">Sheets</span>
            </button>

            {/* PDF Generation Button */}
            <button
              onClick={handleGenerateReportPDF}
              disabled={selectedConsignments.length === 0}
              className={`flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm ${selectedConsignments.length === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:text-blue-700 cursor-pointer hover:underline'
                }`}
            >
              <span className="hidden sm:inline">Generate PDF ({selectedConsignments.length})</span>
              <span className="sm:hidden">PDF ({selectedConsignments.length})</span>
              {userIsSuperAdmin && (
                <span className="ml-1 px-1 py-0.5 bg-purple-100 text-purple-600 text-xs rounded">
                  Pro
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white px-2 sm:px-4 py-4 border-b border-gray-200 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-end w-full max-w-full">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Search</label>
              <SearchableSelect
                value={searchQuery}
                options={consignmentSuggestions}
                placeholder={loadingSuggestions ? "Loading suggestions..." : "Search consignments..."}
                onChange={(value) => setSearchQuery(value?.toString() || '')}
                inputPlaceholder="Search by consignment # or client name..."
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={applyFilters} className="px-3 py-1.5 sm:px-4 sm:py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-xs sm:text-sm cursor-pointer">Apply</button>
              <button onClick={clearFilters} className="px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm cursor-pointer hover:underline">Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Consignments Table Container with proper spacing */}
      <div className="flex-1 bg-white mx-2 sm:mx-4 my-4 sm:my-6 rounded-lg shadow-sm border border-gray-200 overflow-hidden w-auto max-w-full">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500 text-sm">Loading consignments...</div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-auto">
              <ConsignmentsTable
                consignments={consignments}
                selectedConsignments={selectedConsignments}
                onSelectionChange={setSelectedConsignments}
                onEdit={handleEditConsignment}
                onDelete={handleDeleteConsignment}
                onClientClick={handleClientClick}
              />
            </div>

            {/* Pagination */}
            <div className="border-t border-gray-200 px-2 sm:px-4 py-3 sm:py-4 bg-gray-50 w-full">
              <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between w-full max-w-full">
                <span className="text-xs sm:text-sm text-gray-600">
                  {`( Items: ${consignments.length} )`}
                </span>

                <select className="border border-gray-300 rounded text-xs sm:text-sm px-2 py-1 w-fit self-center sm:self-auto cursor-pointer">
                  <option>25</option>
                  <option>50</option>
                  <option>100</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSV Upload Modal */}
      {showCSVUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <CSVUpload
            onUploadComplete={handleCSVUploadComplete}
            onClose={() => setShowCSVUpload(false)}
            className="max-w-2xl w-full mx-4"
          />
        </div>
      )}

      {/* PDF Generator Modal */}
      {showPDFGenerator && (
        <ConsignmentPDFGeneratorBackend
          selectedConsignments={consignments.filter(c => selectedConsignments.includes(c.id))}
          onClose={handlePDFComplete}
        />
      )}

      {/* Google Sheets Sync Modal */}
      {showGoogleSheetsSync && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <ConsignmentGoogleSheetsSync
            selectedConsignments={selectedConsignments}
            onSyncComplete={(result) => {
              console.log('Google Sheets sync completed:', result)
              setShowGoogleSheetsSync(false)
            }}
            onClose={() => setShowGoogleSheetsSync(false)}
          />
        </div>
      )}
    </div>
  )
} 