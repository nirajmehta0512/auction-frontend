"use client"

import React, { useState } from 'react'
import { Gavel, FileText, Filter, RefreshCw, ChevronDown } from 'lucide-react'

// Mock cashier data matching the reference
const mockCashierData = [
  {
    id: 1,
    number: '001',
    status: 'planned' as const,
    name: 'First Timed Auction',
    category: '',
    type: 'Timed',
    invoices: 0,
    settlements: 0,
    endingDate: 'Friday 11 April 2025 at 21:00',
    action: '○ ○ ○'
  },
  {
    id: 2,
    number: '002',
    status: 'planned' as const,
    name: 'First Live Auction',
    category: '',
    type: 'Live',
    invoices: 0,
    settlements: 0,
    endingDate: 'Thursday 10 April 2025 at 21:00',
    action: '○ ○ ○'
  }
]

interface ShowHideColumn {
  key: string
  label: string
  visible: boolean
}

export default function CashiersPage() {
  const [activeTab, setActiveTab] = useState<'auctions' | 'invoices'>('auctions')
  const [showFilters, setShowFilters] = useState(false)
  const [showFilterSection, setShowFilterSection] = useState(true)
  const [showHideDropdown, setShowHideDropdown] = useState(false)
  
  const [filters, setFilters] = useState({
    shortName: '',
    longName: '',
    category: '',
    type: ''
  })

  const [columns, setColumns] = useState<ShowHideColumn[]>([
    { key: 'number', label: '#', visible: true },
    { key: 'status', label: 'Status', visible: true },
    { key: 'name', label: 'Name', visible: true },
    { key: 'category', label: 'Category', visible: true },
    { key: 'type', label: 'Type', visible: true },
    { key: 'invoices', label: 'Invoices', visible: true },
    { key: 'settlements', label: 'Settlements', visible: true }
  ])

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const resetFilters = () => {
    setFilters({
      shortName: '',
      longName: '',
      category: '',
      type: ''
    })
  }

  const toggleColumn = (key: string) => {
    setColumns(prev => prev.map(col => 
      col.key === key ? { ...col, visible: !col.visible } : col
    ))
  }

  const getVisibleColumns = () => columns.filter(col => col.visible)

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="bg-slate-700 px-6 py-4">
        <h1 className="text-2xl font-semibold text-white">Cashiers</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-0">
          <button
            onClick={() => setActiveTab('auctions')}
            className={`px-4 py-3 text-sm font-medium flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'auctions'
                ? 'border-green-500 bg-green-600 text-white'
                : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            <Gavel className="h-4 w-4" />
            <span>All Auctions</span>
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-3 text-sm font-medium flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'invoices'
                ? 'border-green-500 bg-green-600 text-white'
                : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>All Invoices</span>
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilterSection && (
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Short Name:</label>
              <input
                type="text"
                value={filters.shortName}
                onChange={(e) => handleFilterChange('shortName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Long Name:</label>
              <input
                type="text"
                value={filters.longName}
                onChange={(e) => handleFilterChange('longName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category:</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">Choose</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type:</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">Choose</option>
              </select>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>
            <button 
              onClick={resetFilters}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reset filter</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Actions */}
      <div className="bg-white px-6 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
          >
            🔍 Show filter
          </button>
        </div>
        <div className="flex items-center space-x-4 relative">
          <button
            onClick={() => setShowHideDropdown(!showHideDropdown)}
            className="text-gray-600 hover:text-gray-700 text-sm flex items-center space-x-1"
          >
            <span>Show/Hide</span>
            <ChevronDown className="h-4 w-4" />
          </button>
          
          {/* Show/Hide Dropdown */}
          {showHideDropdown && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div className="px-4 py-2">
                <button className="w-full bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md text-sm transition-colors">
                  Confirm
                </button>
              </div>
              <div className="px-2">
                {columns.map((column) => (
                  <div key={column.key} className="flex items-center px-2 py-2 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={column.visible}
                      onChange={() => toggleColumn(column.key)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded mr-3"
                    />
                    <span className="text-sm text-gray-700">{column.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content based on active tab */}
      <div className="flex-1 overflow-hidden bg-white">
        {activeTab === 'auctions' ? (
          <div className="h-full overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {getVisibleColumns().map((column) => (
                    <th key={column.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {column.label}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ending Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockCashierData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {columns.find(col => col.key === 'number')?.visible && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.number}
                      </td>
                    )}
                    {columns.find(col => col.key === 'status')?.visible && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-gray-800 rounded-full mr-2"></div>
                        </div>
                      </td>
                    )}
                    {columns.find(col => col.key === 'name')?.visible && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.name}
                      </td>
                    )}
                    {columns.find(col => col.key === 'category')?.visible && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.category}
                      </td>
                    )}
                    {columns.find(col => col.key === 'type')?.visible && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.type}
                      </td>
                    )}
                    {columns.find(col => col.key === 'invoices')?.visible && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-teal-600">
                        {item.invoices}
                      </td>
                    )}
                    {columns.find(col => col.key === 'settlements')?.visible && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-teal-600">
                        {item.settlements}
                      </td>
                    )}
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
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No invoices data available</p>
          </div>
        )}
      </div>

      {/* Footer with Status Indicators and Pagination */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Status Indicators */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
              <span className="text-gray-600">Planned</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">In Progress</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Ended</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-600">Aftersale</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">Archived</span>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              ( Items: 1 - 2 from 2 )
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
    </div>
  )
} 