"use client"

import React, { useState } from 'react'
import { ChevronUp, ChevronDown, Edit, Trash2, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Auction {
  id: number
  number: string
  status: 'planned' | 'inProgress' | 'ended' | 'aftersale' | 'archived'
  name: string
  type: string
  lots: number
  regs: number
  endingDate: string
}

interface AuctionsTableProps {
  auctions: Auction[]
  selectedAuctions: number[]
  onSelectionChange: (selected: number[]) => void
  onView?: (auctionId: number) => void
  onEdit?: (auctionId: number) => void
  onDelete?: (auctionId: number) => void
}

type SortField = keyof Auction
type SortDirection = 'asc' | 'desc'

const statusColors = {
  planned: 'bg-gray-800',
  inProgress: 'bg-red-500',
  ended: 'bg-green-500',
  aftersale: 'bg-yellow-500',
  archived: 'bg-blue-500'
}

const statusLabels = {
  planned: 'Planned',
  inProgress: 'In Progress',
  ended: 'Ended',
  aftersale: 'Aftersale',
  archived: 'Archived'
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
  onSort,
  currentSortField = 'id',
  currentSortDirection = 'asc'
}: AuctionsTablePropsExtended) {
  const router = useRouter()

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
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>#</span>
                  <SortIcon field="id" />
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
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Name</span>
                  <SortIcon field="name" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('type')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Type</span>
                  <SortIcon field="type" />
                </button>
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lots
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Regs
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('endingDate')}
                  className="flex items-center space-x-1 hover:text-gray-700"
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
                    className="text-teal-600 hover:text-teal-700 font-medium hover:underline"
                  >
                    {auction.number}
                  </button>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div 
                      className={cn("w-3 h-3 rounded-full", statusColors[auction.status])}
                      title={statusLabels[auction.status]}
                    />
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleView(auction.id)}
                    className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline text-left"
                  >
                    {auction.name}
                  </button>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {auction.type}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-teal-600 font-medium cursor-pointer hover:text-teal-700">
                    {auction.lots}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {auction.regs}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {auction.endingDate}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleView(auction.id)}
                      className="text-green-600 hover:text-green-800" 
                      title="View auction"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleEdit(auction.id)}
                      className="text-blue-600 hover:text-blue-800" 
                      title="Edit auction"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(auction.id)}
                      className="text-red-600 hover:text-red-800" 
                      title="Delete auction"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
    </div>
  )
} 