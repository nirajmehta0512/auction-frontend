// frontend/src/components/items/ItemsTableNew.tsx
"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown, Edit, Trash2, MoreVertical, Eye } from 'lucide-react'
import { Artwork } from '@/lib/items-api'
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/items-api'

interface ItemsTableProps {
  items: Artwork[]
  selectedItems: string[]
  onSelectionChange: (selected: string[]) => void
  onEdit?: (item: Artwork) => void
  onDelete?: (itemId: string) => void
  onSort?: (field: string, direction: 'asc' | 'desc') => void
  sortField?: string
  sortDirection?: 'asc' | 'desc'
}

type SortField = 'id' | 'lot_num' | 'title' | 'low_est' | 'high_est' | 'start_price' | 'status' | 'category' | 'created_at'

export default function ItemsTableNew({ 
  items, 
  selectedItems, 
  onSelectionChange, 
  onEdit, 
  onDelete, 
  onSort,
  sortField = 'created_at',
  sortDirection = 'desc'
}: ItemsTableProps) {
  const router = useRouter()
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const handleSort = (field: SortField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'
    onSort?.(field, newDirection)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(items.map(item => item.id!))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedItems, itemId])
    } else {
      onSelectionChange(selectedItems.filter(id => id !== itemId))
    }
  }

  const handleEdit = (item: Artwork) => {
    if (onEdit) {
      onEdit(item)
    } else {
      router.push(`/items/edit/${item.id}`)
    }
    setOpenMenuId(null)
  }

  const handleDelete = (itemId: string) => {
    if (onDelete && confirm('Are you sure you want to withdraw this item?')) {
      onDelete(itemId)
    }
    setOpenMenuId(null)
  }

  const handlePreview = (itemId: string) => {
    router.push(`/preview/${itemId}`)
    setOpenMenuId(null)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="h-4 w-4 text-gray-400" />
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 text-gray-600" /> : 
      <ChevronDown className="h-4 w-4 text-gray-600" />
  }

  const allSelected = selectedItems.length === items.length && items.length > 0
  const someSelected = selectedItems.length > 0

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={input => {
                    if (input) input.indeterminate = someSelected && !allSelected
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
              </th>
              
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('id')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>ID</span>
                  <SortIcon field="id" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('title')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Title</span>
                  <SortIcon field="title" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('category')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Category</span>
                  <SortIcon field="category" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('low_est')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Low Est</span>
                  <SortIcon field="low_est" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('high_est')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>High Est</span>
                  <SortIcon field="high_est" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('start_price')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Start Price</span>
                  <SortIcon field="start_price" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Status</span>
                  <SortIcon field="status" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Condition
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('created_at')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Created</span>
                  <SortIcon field="created_at" />
                </button>
              </th>

              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {items.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                  <div className="text-lg font-medium">No items found</div>
                  <p className="mt-1">Try adjusting your search or filter criteria</p>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr 
                  key={item.id} 
                  className={`hover:bg-gray-50 ${
                    selectedItems.includes(item.id!) ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-3 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id!)}
                      onChange={(e) => handleSelectItem(item.id!, e.target.checked)}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                  </td>
                  
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.id}
                  </td>
                  
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs">
                      <div className="font-medium truncate">{item.title}</div>
                      {(item.artist_id || item.school_id) && (
                        <div className="text-gray-500 text-xs truncate">
                          {item.artist_id ? 'Artist' : 'School'} selected
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.category || '-'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.low_est)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.high_est)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.start_price ? formatCurrency(item.start_price) : '-'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status!)}`}>
                      {getStatusLabel(item.status!)}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs truncate">
                      {item.condition || '-'}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id!)}
                        className="inline-flex items-center p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      
                      {openMenuId === item.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                          <div className="py-1">
                            <button
                              onClick={() => handlePreview(item.id!)}
                              className="flex items-center w-full px-4 py-2 text-sm text-purple-600 hover:bg-gray-100"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Preview Item
                            </button>
                            <button
                              onClick={() => handleEdit(item)}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Item
                            </button>
                            <button
                              onClick={() => handleDelete(item.id!)}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Withdraw Item
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Click outside to close menu */}
      {openMenuId && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setOpenMenuId(null)}
        />
      )}
    </div>
  )
} 