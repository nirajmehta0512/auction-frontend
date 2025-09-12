"use client"

import React, { useState } from 'react'
import { ChevronUp, ChevronDown, Edit, Trash2, Eye, FileText, Upload, MoreVertical, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { AUCTION_SUBTYPES } from '@/lib/constants'
import { generatePassedAuction, getBrandAuctionCounts, type Brand } from '@/lib/auctions-api'

interface Auction {
  id: number
  number: string
  short_name: string
  long_name: string
  type: string
  lots: number
  endingDate: string
  catalogue_launch_date?: string
  settlement_date: string
  upload_status?: string
  brand?: {
    id: number
    code: string
    name: string
  }
  platform?: string
}

interface AuctionsTableProps {
  auctions: Auction[]
  selectedAuctions: number[]
  onSelectionChange: (selected: number[]) => void
  onView?: (auctionId: number) => void
  onEdit?: (auctionId: number) => void
  onDelete?: (auctionId: number) => void
  onImportEOA?: (auctionId: number) => void
  onGenerateInvoice?: (auctionId: number) => void
  onGeneratePassedAuction?: (auctionId: number, subtype: string) => void
  brands?: Brand[]
}

type SortField = keyof Auction

// Dynamic status calculation based on dates
const getAuctionStatus = (auction: Auction) => {
  const today = new Date()
  const catalogueLaunchDate = auction.catalogue_launch_date ? new Date(auction.catalogue_launch_date) : null
  const settlementDate = new Date(auction.settlement_date)

  if (today > settlementDate) {
    return { status: 'Past', color: 'bg-red-100 text-red-800 border border-red-200' }
  } else if (catalogueLaunchDate && today >= catalogueLaunchDate && today <= settlementDate) {
    return { status: 'Present', color: 'bg-green-100 text-green-800 border border-green-200' }
  } else {
    return { status: 'Future', color: 'bg-blue-100 text-blue-800 border border-blue-200' }
  }
}

interface AuctionsTablePropsExtended extends AuctionsTableProps {
  onSort?: (field: string, direction: 'asc' | 'desc') => void
  currentSortField?: string
  currentSortDirection?: 'asc' | 'desc'
}

export default function AuctionsTable({
  auctions,
  selectedAuctions,
  onSelectionChange,
  onView,
  onEdit,
  onDelete,
  onImportEOA,
  onGenerateInvoice,
  onGeneratePassedAuction,
  onSort,
  currentSortField = 'id',
  currentSortDirection = 'asc',
  brands = []
}: AuctionsTablePropsExtended) {
  const router = useRouter()
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null)
  const [passedAuctionDialogOpen, setPassedAuctionDialogOpen] = useState<number | null>(null)
  const [selectedAuctionForPassed, setSelectedAuctionForPassed] = useState<Auction | null>(null)
  const [generatingPassedAuction, setGeneratingPassedAuction] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [passedAuctionShortName, setPassedAuctionShortName] = useState('')
  const [passedAuctionLongName, setPassedAuctionLongName] = useState('')
  const [brandAuctionCounts, setBrandAuctionCounts] = useState<{ [brandId: number]: number }>({})

  // Load brand auction counts when brands change
  React.useEffect(() => {
    const loadBrandAuctionCounts = async () => {
      if (brands.length > 0) {
        try {
          const countsResponse = await getBrandAuctionCounts(brands)
          setBrandAuctionCounts(countsResponse || {})
        } catch (error) {
          console.error('Error loading brand auction counts:', error)
          setBrandAuctionCounts({})
        }
      } else {
        setBrandAuctionCounts({})
      }
    }

    loadBrandAuctionCounts()
  }, [brands])

  const handleView = (auctionId: number) => {
    if (onView) {
      onView(auctionId)
    } else {
      // Default navigation if no custom handler
      router.push(`/auctions/view/${auctionId}`)
    }
  }

  const handleEdit = (auctionId: number) => {
    if (onEdit) {
      onEdit(auctionId)
    } else {
      // Default navigation if no custom handler
      router.push(`/auctions/edit/${auctionId}`)
    }
  }

  const handleDelete = (auctionId: number) => {
    if (onDelete) {
      onDelete(auctionId)
    } else {
      // Default delete confirmation
      if (confirm('Are you sure you want to delete this auction?')) {
        // TODO: Implement default delete logic
        console.log('Delete auction:', auctionId)
      }
    }
  }

  const handleImportEOA = (auctionId: number) => {
    if (onImportEOA) {
      onImportEOA(auctionId)
    } else {
      console.log('Import EOA for auction:', auctionId)
    }
  }

  const handleGenerateInvoice = (auctionId: number) => {
    if (onGenerateInvoice) {
      onGenerateInvoice(auctionId)
    } else {
      // Default navigation to invoice view
      router.push(`/auctions/${auctionId}/invoices`)
    }
  }

  const handleGeneratePassedAuction = (auctionId: number) => {
    const auction = auctions.find(a => a.id === auctionId)
    if (auction) {
      setSelectedAuctionForPassed(auction)

      // Auto-fill short name based on brand (similar to AuctionForm.tsx)
      let suggestedShortName = `${auction.short_name} - Passed`
      if (auction.brand?.id && brands.length > 0) {
        const selectedBrand = brands.find(b => b.id === auction.brand!.id)
        if (selectedBrand) {
          const auctionCount = brandAuctionCounts[selectedBrand.id] || 0
          const nextAuctionNumber = auctionCount + 1
          suggestedShortName = `${selectedBrand.code} ${nextAuctionNumber}`
        }
      }
      setPassedAuctionShortName(suggestedShortName)

      // Pre-fill long name with " - Passed"
      setPassedAuctionLongName(`${auction.long_name} - Passed`)

      setPassedAuctionDialogOpen(auctionId)
    }
  }

  const handlePassedAuctionSubtypeSelect = async (subtype: string) => {
    if (!selectedAuctionForPassed) return

    setGeneratingPassedAuction(true)
    setGenerateError(null)

    try {
      const newAuction = await generatePassedAuction(selectedAuctionForPassed.id.toString(), subtype as any, {
        short_name: passedAuctionShortName,
        long_name: passedAuctionLongName
      })

      // Call the parent handler if provided
      if (onGeneratePassedAuction) {
        onGeneratePassedAuction(selectedAuctionForPassed.id, subtype)
      }

      // Close the dialog and reset state
      setPassedAuctionDialogOpen(null)
      setSelectedAuctionForPassed(null)
      setPassedAuctionShortName('')
      setPassedAuctionLongName('')
      setGenerateError(null)

      // Show success message (you might want to add a toast notification here)
      console.log('Successfully created passed auction:', newAuction)

    } catch (error) {
      console.error('Error generating passed auction:', error)
      setGenerateError(error instanceof Error ? error.message : 'Failed to generate passed auction')
    } finally {
      setGeneratingPassedAuction(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (onSort) {
      const newDirection = currentSortField === field && currentSortDirection === 'asc' ? 'desc' : 'asc'
      onSort(field, newDirection)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(auctions.map(auction => auction.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectAuction = (auctionId: number, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedAuctions, auctionId])
    } else {
      onSelectionChange(selectedAuctions.filter(id => id !== auctionId))
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (currentSortField !== field) {
      return <ChevronUp className="h-4 w-4 text-gray-400" />
    }
    return currentSortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 text-gray-600" /> : 
      <ChevronDown className="h-4 w-4 text-gray-600" />
  }

  // Use auctions as-is since sorting is handled by backend
  const sortedAuctions = auctions

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-6 py-3">
                <input
                  type="checkbox"
                  checked={selectedAuctions.length === auctions.length && auctions.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
              </th>
              
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('id')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>#</span>
                  <SortIcon field="id" />
                </button>
              </th>



              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('long_name')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Name</span>
                  <SortIcon field="long_name" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('type')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Type</span>
                  <SortIcon field="type" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lots
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Launch Date
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('endingDate')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Ending Date</span>
                  <SortIcon field="endingDate" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAuctions.map((auction) => (
              <tr key={auction.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedAuctions.includes(auction.id)}
                    onChange={(e) => handleSelectAuction(auction.id, e.target.checked)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleView(auction.id)}
                    className="text-teal-600 hover:text-teal-700 font-medium hover:underline transition-colors cursor-pointer"
                  >
                    {auction.number}
                  </button>
                </td>



                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleView(auction.id)}
                    className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline transition-colors cursor-pointer text-left"
                  >
                    <div className="flex flex-col">
                      <span>{auction.long_name}</span>
                      <span className="text-xs text-gray-500">{auction.short_name}</span>
                      <div className="flex items-center mt-1 space-x-2 text-xs text-gray-400">
                        {auction.brand?.name && (
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                            {auction.brand.name}
                          </span>
                        )}
                        {auction.platform && (
                          <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                            {auction.platform}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center mt-1 space-x-2">
                        <div
                          className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getAuctionStatus(auction).color)}
                        >
                          {getAuctionStatus(auction).status}
                        </div>
                        {auction.upload_status === 'uploaded' && (
                          <div className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            Uploaded
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {auction.type}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-teal-600 font-medium cursor-pointer hover:text-teal-700 hover:underline transition-colors">
                    {auction.lots}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {auction.catalogue_launch_date ? new Date(auction.catalogue_launch_date).toLocaleDateString() : '-'}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {auction.endingDate}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="relative">
                    <button
                      onClick={() => setActionMenuOpen(actionMenuOpen === auction.id ? null : auction.id)}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                      title="More actions"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    
                    {actionMenuOpen === auction.id && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              handleView(auction.id)
                              setActionMenuOpen(null)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                          >
                            <Eye className="h-4 w-4 mr-3" />
                            View Auction
                          </button>
                          {getAuctionStatus(auction).status !== 'Past' && (
                            <button
                              onClick={() => {
                                handleEdit(auction.id)
                                setActionMenuOpen(null)
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            >
                              <Edit className="h-4 w-4 mr-3" />
                              Edit Auction
                            </button>
                          )}
                          <button
                            onClick={() => {
                              handleImportEOA(auction.id)
                              setActionMenuOpen(null)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 cursor-pointer"
                          >
                            <Upload className="h-4 w-4 mr-3" />
                            Import EOA Data
                          </button>
                          <button
                            onClick={() => {
                              handleGenerateInvoice(auction.id)
                              setActionMenuOpen(null)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-orange-700 hover:bg-orange-50 cursor-pointer"
                          >
                            <FileText className="h-4 w-4 mr-3" />
                            View Auction Invoices
                          </button>
                          <button
                            onClick={() => {
                              handleGeneratePassedAuction(auction.id)
                              setActionMenuOpen(null)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50 cursor-pointer"
                          >
                            <Plus className="h-4 w-4 mr-3" />
                            Generate Passed Auction
                          </button>
                          <button
                            onClick={() => {
                              handleDelete(auction.id)
                              setActionMenuOpen(null)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-3" />
                            Delete Auction
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {auctions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No auctions found</p>
          </div>
        )}
      </div>

      {/* Passed Auction Dialog */}
      {passedAuctionDialogOpen && selectedAuctionForPassed && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Generate Passed Auction</h3>
              <button
                onClick={() => {
                  setPassedAuctionDialogOpen(null)
                  setSelectedAuctionForPassed(null)
                  setPassedAuctionShortName('')
                  setPassedAuctionLongName('')
                  setGenerateError(null)
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Create a new auction with unsold items from "{selectedAuctionForPassed.long_name}".
              </p>

              {generateError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{generateError}</p>
                </div>
              )}

              {/* Auction Name Fields */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Short Name *
                  </label>
                  <input
                    type="text"
                    value={passedAuctionShortName}
                    onChange={(e) => setPassedAuctionShortName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., AURUM 5"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-filled based on brand auction count
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Long Name *
                  </label>
                  <input
                    type="text"
                    value={passedAuctionLongName}
                    onChange={(e) => setPassedAuctionLongName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Winter Contemporary Art Sale 2024 - Passed"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pre-filled with " - Passed" suffix
                  </p>
                </div>
              </div>

              <p className="text-sm font-medium text-gray-700 mb-4">Select Auction Subtype:</p>

              <div className="space-y-3">
                {AUCTION_SUBTYPES.map((subtype) => (
                  <button
                    key={subtype.value}
                    onClick={() => handlePassedAuctionSubtypeSelect(subtype.value)}
                    disabled={generatingPassedAuction}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <div className="font-medium text-sm text-gray-900">{subtype.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{subtype.description}</div>
                  </button>
                ))}
              </div>

              {generatingPassedAuction && (
                <div className="mt-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Creating passed auction...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 