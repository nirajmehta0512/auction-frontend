// frontend/src/components/items/GoogleSheetsSyncModal.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { X, RefreshCw, Globe, Save, AlertCircle, CheckCircle, Upload, Download, Settings } from 'lucide-react'
import { 
  loadBrandGoogleSheetUrl, 
  saveBrandGoogleSheetUrl, 
  syncArtworksToGoogleSheet,
  syncArtworksFromGoogleSheet 
} from '@/lib/google-sheets-api'

interface GoogleSheetsSyncModalProps {
  onClose: () => void
  onSyncComplete?: (result: any) => void
  selectedItems?: string[]
  allItems?: any[]
  currentBrand?: string
}

export default function GoogleSheetsSyncModal({
  onClose,
  onSyncComplete,
  selectedItems = [],
  allItems = [],
  currentBrand = 'MSABER'
}: GoogleSheetsSyncModalProps) {
  const [syncMode, setSyncMode] = useState<'to' | 'from'>('to')
  const [selectedBrand, setSelectedBrand] = useState(currentBrand)
  const [googleSheetUrl, setGoogleSheetUrl] = useState('')
  const [editingUrl, setEditingUrl] = useState('')
  const [showUrlConfig, setShowUrlConfig] = useState(false)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hasUrlConfig, setHasUrlConfig] = useState(false)

  // Brand options (in a real app, these would come from an API)
  const brandOptions = [
    { value: 'MSABER', label: 'MSaber' },
    { value: 'AURUM', label: 'Aurum' },
    { value: 'METSAB', label: 'Metsab' }
  ]

  useEffect(() => {
    loadBrandConfig(selectedBrand)
  }, [selectedBrand])

  const loadBrandConfig = async (brand: string) => {
    try {
      setLoading(true)
      const url = await loadBrandGoogleSheetUrl(brand, 'artworks')
      if (url) {
        setGoogleSheetUrl(url)
        setEditingUrl(url)
        setHasUrlConfig(true)
      } else {
        setGoogleSheetUrl('')
        setEditingUrl('')
        setHasUrlConfig(false)
      }
    } catch (error: any) {
      console.error('Error loading brand config:', error)
      setError(`Failed to load configuration for ${brand}: ${error.message}`)
      setHasUrlConfig(false)
    } finally {
      setLoading(false)
    }
  }

  const saveUrlConfig = async () => {
    if (!editingUrl.trim()) {
      setError('Please enter a Google Sheets URL')
      return
    }

    try {
      setLoading(true)
      const success = await saveBrandGoogleSheetUrl(selectedBrand, editingUrl.trim(), 'artworks')
      if (success) {
        setGoogleSheetUrl(editingUrl.trim())
        setHasUrlConfig(true)
        setShowUrlConfig(false)
        setSuccess('Google Sheets URL saved successfully!')
        setError('')
      } else {
        setError('Failed to save Google Sheets URL. Please check your permissions.')
      }
    } catch (error: any) {
      console.error('Error saving URL config:', error)
      setError(`Failed to save URL: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const performSync = async () => {
    if (!googleSheetUrl.trim()) {
      setError('Please configure a Google Sheets URL first')
      return
    }

    try {
      setSyncing(true)
      setError('')
      setSuccess('')

      if (syncMode === 'to') {
        // Sync TO Google Sheets (export our data)
        const itemsToSync = selectedItems.length > 0 
          ? allItems.filter(item => selectedItems.includes(item.id))
          : allItems

        if (itemsToSync.length === 0) {
          setError('No items to sync. Please select items or ensure you have data.')
          return
        }

        const result = await syncArtworksToGoogleSheet(itemsToSync, googleSheetUrl, selectedBrand)
        
        if (result.success) {
          setSuccess(`✅ Successfully synced ${itemsToSync.length} artworks to Google Sheets!`)
          onSyncComplete?.(result)
        } else {
          setError(result.error || 'Sync failed')
        }
      } else {
        // Sync FROM Google Sheets (import data)
        const result = await syncArtworksFromGoogleSheet(googleSheetUrl, selectedBrand)
        
        if (result.success) {
          setSuccess(`✅ Successfully imported ${result.upserted || 0} artworks from Google Sheets!`)
          onSyncComplete?.(result)
        } else {
          setError(result.error || 'Import failed')
        }
      }
    } catch (error: any) {
      console.error('Sync error:', error)
      setError(`Sync failed: ${error.message}`)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Globe className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Google Sheets Sync</h2>
              <p className="text-sm text-gray-600">Sync your artworks with Google Sheets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Sync Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sync Direction
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSyncMode('to')}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  syncMode === 'to' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Upload className="h-5 w-5 mb-2" />
                <div className="font-medium">Export to Sheets</div>
                <div className="text-xs text-gray-600">Send our data to Google Sheets</div>
              </button>
              <button
                onClick={() => setSyncMode('from')}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  syncMode === 'from' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Download className="h-5 w-5 mb-2" />
                <div className="font-medium">Import from Sheets</div>
                <div className="text-xs text-gray-600">Get data from Google Sheets</div>
              </button>
            </div>
          </div>

          {/* Google Sheets URL Configuration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Google Sheets URL for {selectedBrand}
              </label>
              <button
                onClick={() => setShowUrlConfig(!showUrlConfig)}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
              >
                <Settings className="h-4 w-4" />
                <span>Configure</span>
              </button>
            </div>
            
            {hasUrlConfig ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800 font-medium">Configured</span>
                </div>
                <a
                  href={googleSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-700 hover:text-green-800 hover:underline mt-1 block break-all cursor-pointer transition-colors"
                  title="Open Google Sheets (opens in new tab)"
                >
                  {googleSheetUrl}
                </a>
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800 font-medium">Not Configured</span>
                </div>
                <div className="text-xs text-yellow-700 mt-1">
                  Please add your Google Sheets URL to enable sync
                </div>
              </div>
            )}

            {showUrlConfig && (
              <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Google Sheets URL
                    </label>
                    <input
                      type="url"
                      value={editingUrl}
                      onChange={(e) => setEditingUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit#gid=0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Make sure the sheet is publicly accessible or shared with the service account
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={saveUrlConfig}
                      disabled={loading || !editingUrl.trim()}
                      className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save URL
                    </button>
                    <button
                      onClick={() => setShowUrlConfig(false)}
                      className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sync Info */}
          {syncMode === 'to' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Export Summary:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Selected items: {selectedItems.length > 0 ? selectedItems.length : 'All items'}</li>
                  <li>• Total items available: {allItems.length}</li>
                  <li>• Target brand: {selectedBrand}</li>
                </ul>
              </div>
            </div>
          )}

          {syncMode === 'from' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">
                <strong>Import Info:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Will import data from the configured Google Sheet</li>
                  <li>• Existing items will be updated, new items will be created</li>
                  <li>• Target brand: {selectedBrand}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">{success}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={performSync}
              disabled={syncing || loading || !hasUrlConfig}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : `${syncMode === 'to' ? 'Export' : 'Import'} ${syncMode === 'to' ? 'to' : 'from'} Sheets`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


