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

type SortField = 'id' | 'title' | 'low_est' | 'high_est' | 'start_price' | 'status' | 'category' | 'created_at'

export default function ItemsTable({
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

  // Helper function to get first two images from an item
  const getItemImages = (item: Artwork): string[] => {
    const images: string[] = []
    for (let i = 1; i <= 10; i++) {
      const imageKey = `image_file_${i}` as keyof Artwork
      const imageUrl = item[imageKey] as string
      if (imageUrl && imageUrl.trim()) {
        images.push(imageUrl)
        if (images.length >= 2) break // Only need first 2 images
      }
    }
    return images
  }

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
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>ID</span>
                  <SortIcon field="id" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('title')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Title</span>
                  <SortIcon field="title" />
                </button>
              </th>

              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                <button
                  onClick={() => handleSort('category')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Category</span>
                  <SortIcon field="category" />
                </button>
              </th>

              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                <button
                  onClick={() => handleSort('low_est')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Low Est</span>
                  <SortIcon field="low_est" />
                </button>
              </th>

              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                <button
                  onClick={() => handleSort('high_est')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>High Est</span>
                  <SortIcon field="high_est" />
                </button>
              </th>

              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                <button
                  onClick={() => handleSort('start_price')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
                >
                  <span>Start Price</span>
                  <SortIcon field="start_price" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('created_at')}
                  className="flex items-center space-x-1 hover:text-gray-700 cursor-pointer"
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
                <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                  <div className="text-lg font-medium">No items found</div>
                  <p className="mt-1">Try adjusting your search or filter criteria</p>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50 ${selectedItems.includes(item.id!) ? 'bg-blue-50' : ''
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
                      <div
                        className="font-medium truncate cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                        onClick={() => handlePreview(item.id!)}
                        title="Click to preview"
                      >
                        {item.title}
                      </div>
                      <div className="text-gray-500 text-xs truncate">
                        {item.brands?.name || item.brand_name || 'not assigned yet'}
                      </div>
                      {(item.artist_id || item.school_id) && (
                        <div className="text-gray-500 text-xs truncate">
                          {item.artist_id ? 'Artist' : 'School'} selected
                        </div>
                      )}
                      {/* Item Images */}
                      {(() => {
                        const images = getItemImages(item)
                        return images.length > 0 ? (
                          <div className="flex space-x-1 mt-2">
                            {images.map((imageUrl, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={imageUrl}
                                  alt={`${item.title} - Image ${index + 1}`}
                                  className="w-24 h-24 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80"
                                  onClick={() => handlePreview(item.id!)}
                                  onError={(e) => {
                                    // Hide broken images
                                    (e.target as HTMLImageElement).style.display = 'none'
                                  }}
                                />
                              </div>
                            ))}
                            {images.length < 2 && (
                              <div className="w-24 h-24 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
                                <span className="text-gray-400 text-xs">No Image</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex space-x-1 mt-2">
                            <div className="w-24 h-24 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
                              <span className="text-gray-400 text-xs">No Image</span>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </td>

                  <td className="px-3 py-4 text-sm text-gray-500 truncate" title={item.category || '-'}>
                    {item.category || '-'}
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.low_est)}
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.high_est)}
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.start_price ? formatCurrency(item.start_price) : '-'}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                    </div>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status!)}`}>
                        {getStatusLabel(item.status!)}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {/* More Actions Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id!)}
                          className="inline-flex items-center p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 cursor-pointer"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {openMenuId === item.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                            <div className="py-1">
                              <button
                                onClick={() => handlePreview(item.id!)}
                                className="flex items-center w-full px-4 py-2 text-sm text-purple-600 hover:bg-gray-100 cursor-pointer"
                              >
                                Preview
                              </button>
                              <button
                                onClick={() => handleEdit(item)}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(item.id!)}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
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