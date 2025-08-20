// frontend/src/components/auctions/AuctionExportDialog.tsx
"use client"

import React, { useState } from 'react'
import { X, Download, FileText, Globe, AlertCircle, CheckCircle } from 'lucide-react'
import { exportAuctionsCSV } from '@/lib/auctions-api'

interface AuctionExportDialogProps {
  onClose: () => void
  selectedAuctions?: number[]
  brand?: string
}

type Platform = 'database' | 'liveauctioneers' | 'easylive' | 'thesaleroom' | 'invaluable'

interface PlatformConfig {
  label: string
  description: string
  csvHeaders: string[]
  requiredFields: string[]
}

const platformConfigs: Record<Platform, PlatformConfig> = {
  database: {
    label: 'Our Database',
    description: 'Full format with all available auction fields',
    csvHeaders: [
      'id', 'name', 'short_name', 'description', 'type', 'status', 'start_date', 'end_date', 
      'preview_date', 'settlement_date', 'lots_count', 'registrations_count', 'is_published',
      'created_at', 'updated_at'
    ],
    requiredFields: ['name', 'type', 'status']
  },
  liveauctioneers: {
    label: 'LiveAuctioneers',
    description: 'Compatible with LiveAuctioneers auction format',
    csvHeaders: [
      'AuctionTitle', 'AuctionDescription', 'AuctionType', 'StartDate', 'EndDate', 
      'PreviewDate', 'SettlementDate', 'Status', 'Currency', 'BuyersPremium'
    ],
    requiredFields: ['AuctionTitle', 'AuctionType', 'StartDate']
  },
  easylive: {
    label: 'EasyLive',
    description: 'Compatible with EasyLive auction format',
    csvHeaders: [
      'Title', 'Description', 'Type', 'Start', 'End', 'Preview', 'Settlement', 'Status'
    ],
    requiredFields: ['Title', 'Type', 'Start']
  },
  thesaleroom: {
    label: 'The Saleroom',
    description: 'Compatible with The Saleroom auction format',
    csvHeaders: [
      'sale_title', 'sale_description', 'sale_type', 'start_datetime', 'end_datetime',
      'preview_datetime', 'settlement_datetime', 'sale_status'
    ],
    requiredFields: ['sale_title', 'sale_type', 'start_datetime']
  },
  invaluable: {
    label: 'Invaluable',
    description: 'Compatible with Invaluable auction format',
    csvHeaders: [
      'auction_name', 'auction_desc', 'auction_type', 'begin_time', 'end_time',
      'preview_time', 'settlement_time', 'auction_status'
    ],
    requiredFields: ['auction_name', 'auction_type', 'begin_time']
  }
}

export default function AuctionExportDialog({
  onClose,
  selectedAuctions = [],
  brand = 'MSABER'
}: AuctionExportDialogProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('database')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleExport = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      // For now, we'll export in a basic CSV format
      // In the future, we can add platform-specific formatting
      const blob = await exportAuctionsCSV()
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `auctions_${selectedPlatform}_export.csv`
      a.click()
      URL.revokeObjectURL(url)

      setSuccess(`Successfully exported ${selectedAuctions.length > 0 ? selectedAuctions.length : 'all'} auctions for ${platformConfigs[selectedPlatform].label}`)
      
      setTimeout(() => {
        onClose()
      }, 2000)

    } catch (err: any) {
      console.error('Export error:', err)
      setError(err.message || 'Failed to export auctions')
    } finally {
      setLoading(false)
    }
  }

  const config = platformConfigs[selectedPlatform]

  return (
    <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Export Auctions to Platform</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">
          Export {selectedAuctions.length > 0 ? `${selectedAuctions.length} selected` : 'all'} auctions to a specific platform format.
        </p>
        <p className="text-xs text-gray-500">
          Brand: {brand}
        </p>
      </div>

      {/* Platform Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Export Platform:
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(platformConfigs).map(([platform, config]) => (
            <div
              key={platform}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                selectedPlatform === platform
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedPlatform(platform as Platform)}
            >
              <div className="flex items-center space-x-2 mb-1">
                <Globe className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">{config.label}</span>
              </div>
              <p className="text-xs text-gray-600">{config.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Details */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-sm mb-2">Export Details for {config.label}:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-medium text-gray-700 mb-1">CSV Headers:</p>
            <p className="text-gray-600">{config.csvHeaders.slice(0, 5).join(', ')}...</p>
          </div>
          <div>
            <p className="font-medium text-gray-700 mb-1">Required Fields:</p>
            <p className="text-gray-600">{config.requiredFields.join(', ')}</p>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
          <span className="text-red-800 text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
          <span className="text-green-800 text-sm">{success}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          onClick={handleExport}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export to {config.label}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
