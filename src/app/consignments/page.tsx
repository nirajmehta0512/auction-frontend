"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ConsignmentsTable from '@/components/consignments/ConsignmentsTable'
import CSVUpload from '@/components/consignments/CSVUpload'
import ConsignmentPDFGenerator from '@/components/consignments/ConsignmentPDFGenerator'
import { isSuperAdmin } from '@/lib/auth-utils'
import { Plus, Download, Upload, FileText, Share2, Printer } from 'lucide-react'
import { getConsignments, exportConsignmentsCSV, bulkActionConsignments } from '@/lib/consignments-api'
import type { Consignment } from '@/lib/consignments-api'
import SearchableSelect from '@/components/ui/SearchableSelect'

// Convert API consignment to component consignment format
const convertConsignmentFormat = (consignment: any) => {
  const clientName = consignment.client_name
    || [consignment.client_first_name, consignment.client_last_name].filter(Boolean).join(' ')
    || consignment.client_company
    || 'Unknown Client'
  
  // Format client ID similar to clients page
  const formatClientId = (clientId: number, brandCode?: string): string => {
    const prefix = brandCode && brandCode.trim().length > 0
      ? brandCode.trim().toUpperCase().slice(0, 3)
      : 'MSA';
    return `${prefix}-${clientId.toString().padStart(3, '0')}`;
  }
  
  return {
    id: consignment.id,
    number: consignment.consignment_number,
    client: clientName,
    clientId: consignment.client_id,
    clientIdFormatted: formatClientId(consignment.client_id, consignment.client_brand_code || consignment.brand_code),
    itemsCount: consignment.items_count || 0,
    specialist: consignment.specialist_name || consignment.specialist || 'Unknown Specialist',
    defaultSale: consignment.default_sale || '',
    created: consignment.created_at ? new Date(consignment.created_at).toLocaleDateString() : '',
    signed: consignment.is_signed || false
  }
}

// Search suggestions for consignments
const consignmentSearchSuggestions = [
  { value: '', label: 'All Consignments', description: 'Show all consignments' },
  { value: 'paintings', label: 'Paintings', description: 'Search for painting consignments' },
  { value: 'jewelry', label: 'Jewelry', description: 'Search for jewelry consignments' },
  { value: 'furniture', label: 'Furniture', description: 'Search for furniture consignments' },
  { value: 'ceramics', label: 'Ceramics', description: 'Search for ceramic consignments' },
  { value: 'contemporary', label: 'Contemporary', description: 'Search for contemporary art' },
  { value: 'antique', label: 'Antiques', description: 'Search for antique consignments' },
  { value: 'silver', label: 'Silver & Metalware', description: 'Search for silver items' },
  { value: 'textiles', label: 'Textiles', description: 'Search for textile consignments' },
  { value: 'books', label: 'Books & Manuscripts', description: 'Search for book consignments' }
]

export default function ConsignmentsPage() {
  const router = useRouter()
  const [showFilters, setShowFilters] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'completed' | 'cancelled' | 'archived'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConsignments, setSelectedConsignments] = useState<number[]>([])
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [showPDFGenerator, setShowPDFGenerator] = useState(false)
  const [consignments, setConsignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userIsSuperAdmin, setUserIsSuperAdmin] = useState(false)

  // Check user role on component mount
  useEffect(() => {
    setUserIsSuperAdmin(isSuperAdmin())
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
        const consignmentsData = response.data || response.consignments || []
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
      const consignmentsData = response.data || response.consignments || []
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
    if (confirm(`Are you sure you want to delete consignment ${consignment.number}?`)) {
      try {
        // Import the delete function from consignments API
        const { deleteConsignment } = await import('@/lib/consignments-api')
        await deleteConsignment(consignment.id)
        // Refresh the consignments list
        const fetchConsignments = async () => {
          try {
            setLoading(true)
            const response = await getConsignments()
            const formattedConsignments = response.data?.map(convertConsignmentFormat) || []
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
        consignment_number: consignment.number,
        receipt_no: consignment.number,
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
        title: `Consignment ${consignment.number}`,
        text: `Consignment ${consignment.number} for ${consignment.client}`,
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
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-slate-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Consignments</h1>
        <button 
          onClick={() => router.push('/consignments/new')}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Consignment</span>
        </button>
      </div>

      {/* Table Actions */}
      <div className="bg-white px-6 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
          >
            🔍 {showFilters ? 'Hide filters' : 'Show filters'}
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 text-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowCSVUpload(true)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 text-sm"
          >
            <Upload className="h-4 w-4" />
            <span>Import CSV</span>
          </button>
          
          {/* PDF Generation Button */}
          <button
            onClick={handleGenerateReportPDF}
            disabled={selectedConsignments.length === 0}
            className={`flex items-center space-x-2 text-sm ${
              selectedConsignments.length === 0 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Generate PDF ({selectedConsignments.length})</span>
            {userIsSuperAdmin && (
              <span className="ml-1 px-1 py-0.5 bg-purple-100 text-purple-600 text-xs rounded">
                Pro
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white px-6 py-4 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <SearchableSelect
                value={searchQuery}
                options={consignmentSearchSuggestions}
                placeholder="Search consignments..."
                onChange={(value) => setSearchQuery(value?.toString() || '')}
                inputPlaceholder="Search by consignment # or client name..."
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e)=> setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
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
              <button onClick={applyFilters} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm">Apply</button>
              <button onClick={clearFilters} className="px-4 py-2 border border-gray-300 rounded-md text-sm">Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Consignments Table Container with proper spacing */}
      <div className="flex-1 bg-white m-6 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading consignments...</div>
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
                onGeneratePdf={handleGeneratePdf}
                onShare={handleShare}
                onPrint={handlePrint}
              />
            </div>
            
            {/* Pagination */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {`( Items: ${consignments.length} )`}
                </span>
                <div className="text-sm text-gray-600">
                  * Times are shown in UTC timezone.
                </div>
                <select className="border border-gray-300 rounded text-sm px-2 py-1">
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
        <ConsignmentPDFGenerator
          selectedConsignments={consignments.filter(c => selectedConsignments.includes(c.id))}
          onClose={handlePDFComplete}
        />
      )}
    </div>
  )
} 