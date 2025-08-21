"use client"

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChevronUp, ChevronDown, Edit, X, User, Trash2, Printer, Share2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Consignment {
  id: number
  number: string
  client: string
  clientId: number
  clientIdFormatted: string
  itemsCount: number
  specialist: string
  defaultSale: string
  created: string
  signed: boolean
  brandCode?: string
  client_brand_code?: string
}

interface ConsignmentsTableProps {
  consignments: Consignment[]
  selectedConsignments: number[]
  onSelectionChange: (selected: number[]) => void
  onEdit?: (consignment: Consignment) => void
  onDelete?: (consignment: Consignment) => void
  onClientClick?: (clientId: number) => void
  onGeneratePdf?: (consignment: Consignment, type: 'consignment' | 'collection' | 'presale') => void
  onShare?: (consignment: Consignment) => void
  onPrint?: (consignment: Consignment) => void
}

type SortField = keyof Consignment
type SortDirection = 'asc' | 'desc'

export default function ConsignmentsTable({ 
  consignments, 
  selectedConsignments, 
  onSelectionChange, 
  onEdit, 
  onDelete, 
  onClientClick,
  onGeneratePdf,
  onShare,
  onPrint
}: ConsignmentsTableProps) {
  const [sortField, setSortField] = useState<SortField>('number')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [showPDFDropdown, setShowPDFDropdown] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPDFDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(consignments.map(consignment => consignment.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectConsignment = (consignmentId: number, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedConsignments, consignmentId])
    } else {
      onSelectionChange(selectedConsignments.filter(id => id !== consignmentId))
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="h-4 w-4 text-gray-400" />
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 text-gray-600" /> : 
      <ChevronDown className="h-4 w-4 text-gray-600" />
  }

  const sortedConsignments = [...consignments].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    // Handle undefined values
    if (aValue === undefined && bValue === undefined) return 0
    if (aValue === undefined) return sortDirection === 'asc' ? 1 : -1
    if (bValue === undefined) return sortDirection === 'asc' ? -1 : 1
    
    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-6 py-3">
                <input
                  type="checkbox"
                  checked={selectedConsignments.length === consignments.length && consignments.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
              </th>
              
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort('number')}
                          className="flex items-center space-x-1 hover:text-gray-700"
                        >
                          <span>Number</span>
                          <SortIcon field="number" />
                        </button>
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client ID
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort('client')}
                          className="flex items-center space-x-1 hover:text-gray-700"
                        >
                          <span>Client</span>
                          <SortIcon field="client" />
                        </button>
                      </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                # Items
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Specialist
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Default Sale
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('created')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Created</span>
                  <SortIcon field="created" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('signed')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Signed</span>
                  <SortIcon field="signed" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedConsignments.map((consignment) => (
              <tr key={consignment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedConsignments.includes(consignment.id)}
                    onChange={(e) => handleSelectConsignment(consignment.id, e.target.checked)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Link href={`/consignments/view/${consignment.id}`} className="text-teal-600 hover:text-teal-700 font-medium hover:underline">
                            {consignment.number}
                          </Link>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {(() => {
                            // Extract brand code from nested client data structure if available
                            const clientData = (consignment as any).clients;
                            let brandCode = 'MSA'; // Default fallback
                            
                            if (clientData?.brands?.code) {
                              brandCode = clientData.brands.code;
                            } else if (consignment.client_brand_code) {
                              brandCode = consignment.client_brand_code;
                            } else if (consignment.brandCode) {
                              brandCode = consignment.brandCode;
                            }
                            
                            const prefix = brandCode.slice(0, 3).toUpperCase();
                            return `${prefix}-${consignment.clientId.toString().padStart(3, '0')}`;
                          })()}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-teal-500 mr-2" />
                            <span 
                              className="text-sm text-teal-600 hover:text-teal-700 cursor-pointer hover:underline"
                              onClick={() => onClientClick?.(consignment.clientId)}
                            >
                              {consignment.client}
                            </span>
                          </div>
                        </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {consignment.itemsCount}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {consignment.specialist}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {consignment.defaultSale || '-'}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {consignment.created}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  {consignment.signed ? (
                    <span className="inline-flex items-center text-green-600">
                      ✓
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-red-500">
                      <X className="h-4 w-4" />
                    </span>
                  )}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    {/* PDF Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                      <button 
                        onClick={() => setShowPDFDropdown(showPDFDropdown === consignment.id ? null : consignment.id)}
                        className="text-gray-600 hover:text-gray-800"
                        title="Generate PDF"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      
                      {showPDFDropdown === consignment.id && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                onGeneratePdf?.(consignment, 'consignment')
                                setShowPDFDropdown(null)
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <div className="font-medium">Consignment Receipt</div>
                              <div className="text-xs text-gray-500">All artworks</div>
                            </button>
                            <button
                              onClick={() => {
                                onGeneratePdf?.(consignment, 'collection')
                                setShowPDFDropdown(null)
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <div className="font-medium">Collection Back Receipt</div>
                              <div className="text-xs text-gray-500">Returned artworks only</div>
                            </button>
                            <button
                              onClick={() => {
                                onGeneratePdf?.(consignment, 'presale')
                                setShowPDFDropdown(null)
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <div className="font-medium">Pre-Sale Invoice</div>
                              <div className="text-xs text-gray-500">Artworks going to auction</div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => onShare?.(consignment)}
                      className="text-gray-600 hover:text-gray-800"
                      title="Share"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => onPrint?.(consignment)}
                      className="text-gray-600 hover:text-gray-800"
                      title="Print"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => onEdit?.(consignment)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit consignment"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => onDelete?.(consignment)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete consignment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {consignments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No consignments found</p>
          </div>
        )}
      </div>
    </div>
  )
} 