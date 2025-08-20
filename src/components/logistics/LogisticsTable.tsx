// frontend/src/components/logistics/LogisticsTable.tsx
"use client"

import React from 'react'
import { Edit, Trash2, Truck, MapPin, Package, DollarSign } from 'lucide-react'
import type { LogisticsEntry } from '@/lib/logistics-api'

interface LogisticsTableProps {
  logistics: LogisticsEntry[];
  loading?: boolean;
  selectedLogistics: string[];
  onSelectionChange: (selected: string[]) => void;
  onEdit: (logistics: LogisticsEntry) => void;
  onDelete: (logistics: LogisticsEntry) => void;
}

export default function LogisticsTable({
  logistics,
  loading = false,
  selectedLogistics,
  onSelectionChange,
  onEdit,
  onDelete
}: LogisticsTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(logistics.map(l => l.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedLogistics, id])
    } else {
      onSelectionChange(selectedLogistics.filter(selected => selected !== id))
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-500'
      case 'in_transit': return 'bg-blue-500'
      case 'delivered': return 'bg-green-500'
      case 'cancelled': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getDestinationType = (type: string) => {
    return type === 'within_uk' ? 'UK' : 'International'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const formatDimensions = (height: number, width: number, length: number) => {
    return `${height}" × ${width}" × ${length}"`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading logistics entries...</div>
      </div>
    )
  }

  if (logistics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Truck className="h-12 w-12 mb-4" />
        <h3 className="text-lg font-medium mb-2">No logistics entries found</h3>
        <p className="text-sm">Create your first logistics entry to get started.</p>
      </div>
    )
  }

  return (
    <div className="overflow-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                checked={logistics.length > 0 && selectedLogistics.length === logistics.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Reference
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Dimensions
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Weight
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Destination
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Item Value
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Charge
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {logistics.map((entry) => (
            <tr 
              key={entry.id} 
              className={`hover:bg-gray-50 ${selectedLogistics.includes(entry.id) ? 'bg-blue-50' : ''}`}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedLogistics.includes(entry.id)}
                  onChange={(e) => handleSelectOne(entry.id, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-gray-900">
                    {entry.reference_number}
                  </div>
                  {entry.tracking_number && (
                    <div className="text-xs text-gray-500">
                      Track: {entry.tracking_number}
                    </div>
                  )}
                </div>
              </td>
              
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 max-w-xs truncate">
                  {entry.description || '-'}
                </div>
                {entry.items?.title && (
                  <div className="text-xs text-gray-500">
                    Item: {entry.items.title}
                  </div>
                )}
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm text-gray-900">
                  <Package className="h-4 w-4 mr-1 text-gray-400" />
                  {formatDimensions(entry.height_inches, entry.width_inches, entry.length_inches)}
                </div>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {entry.weight_kg} kg
                </div>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                  <div className="text-sm">
                    <div className="text-gray-900">
                      {getDestinationType(entry.destination_type)}
                    </div>
                    {entry.destination_country && (
                      <div className="text-xs text-gray-500">
                        {entry.destination_country}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm text-gray-900">
                  <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                  {formatCurrency(entry.item_value)}
                </div>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {formatCurrency(entry.total_charge)}
                </div>
                <div className="text-xs text-gray-500">
                  Ship: {formatCurrency(entry.shipping_charge)} |
                  Ins: {formatCurrency(entry.insurance_charge)} |
                  VAT: {formatCurrency(entry.vat_charge)}
                </div>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(entry.status)}`}>
                  {entry.status || 'pending'}
                </span>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onEdit(entry)}
                    className="text-blue-600 hover:text-blue-900 p-1 rounded"
                    title="Edit logistics entry"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(entry)}
                    className="text-red-600 hover:text-red-900 p-1 rounded"
                    title="Delete logistics entry"
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
  )
} 