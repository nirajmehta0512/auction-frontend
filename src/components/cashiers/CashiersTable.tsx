"use client"

import React, { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CashierData {
  id: number
  number: string
  status: 'planned' | 'inProgress' | 'ended' | 'aftersale' | 'archived'
  name: string
  category: string
  type: string
  invoices: number
  settlements: number
  endingDate: string
  action: string
}

interface CashiersTableProps {
  data: CashierData[]
  type: 'auctions' | 'invoices'
}

type SortField = keyof CashierData
type SortDirection = 'asc' | 'desc'

const statusColors = {
  planned: 'bg-gray-800',
  inProgress: 'bg-red-500',
  ended: 'bg-green-500',
  aftersale: 'bg-yellow-500',
  archived: 'bg-blue-500'
}

export default function CashiersTable({ data, type }: CashiersTableProps) {
  const [sortField, setSortField] = useState<SortField>('number')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
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

  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('number')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>#</span>
                  <SortIcon field="number" />
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
                Category
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
                Invoices
              </th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Settlements
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
            {sortedData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.number}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div 
                      className={cn("w-3 h-3 rounded-full", statusColors[item.status])}
                    />
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{item.name}</div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.category || '-'}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.type}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-teal-600 font-medium cursor-pointer hover:text-teal-700">
                    {item.invoices}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-teal-600 font-medium cursor-pointer hover:text-teal-700">
                    {item.settlements}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.endingDate}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.action}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No {type} found</p>
          </div>
        )}
      </div>
    </div>
  )
} 