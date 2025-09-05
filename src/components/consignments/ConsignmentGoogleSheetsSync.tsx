// frontend/src/components/consignments/ConsignmentGoogleSheetsSync.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { X, RefreshCw, Globe, Save, AlertCircle, CheckCircle, Upload, Download, Settings } from 'lucide-react'
import { getGoogleSheetsUrlForModule, updateGoogleSheetsUrl } from '@/lib/app-settings-api'
import { exportConsignmentsCSV } from '@/lib/consignments-api'
import { useBrand } from '@/lib/brand-context'

interface ConsignmentGoogleSheetsSyncProps {
  onClose: () => void
  onSyncComplete?: (result: any) => void
  selectedConsignments?: number[]
}

export default function ConsignmentGoogleSheetsSync({
  onClose,
  onSyncComplete,
  selectedConsignments = []
}: ConsignmentGoogleSheetsSyncProps) {
  const { brand } = useBrand()
  const [syncMode, setSyncMode] = useState<'to' | 'from'>('to')
  const [googleSheetUrl, setGoogleSheetUrl] = useState('')
  const [editingUrl, setEditingUrl] = useState('')
  const [showUrlConfig, setShowUrlConfig] = useState(false)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hasUrlConfig, setHasUrlConfig] = useState(false)

  useEffect(() => {
    loadGoogleSheetConfig()
  }, [])

  const loadGoogleSheetConfig = async () => {
    try {
      setLoading(true)
      const url = await getGoogleSheetsUrlForModule('consignments')
      setGoogleSheetUrl(url)
      setEditingUrl(url)
      setHasUrlConfig(!!url)
    } catch (error: any) {
      console.error('Error loading Google Sheets config:', error)
      setError('Failed to load Google Sheets configuration')
    } finally {
      setLoading(false)
    }
  }

  const saveGoogleSheetUrl = async () => {
    try {
      setLoading(true)
      setError('')
      
      await updateGoogleSheetsUrl('consignments', editingUrl)
      setGoogleSheetUrl(editingUrl)
      setHasUrlConfig(!!editingUrl)
      setShowUrlConfig(false)
      setSuccess('Google Sheets URL saved successfully!')
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error saving Google Sheets URL:', error)
      setError('Failed to save Google Sheets URL')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncToGoogleSheets = async () => {
    try {
      setSyncing(true)
      setError('')
      setSuccess('')

      if (!googleSheetUrl) {
        setError('Please configure a Google Sheets URL first')
        return
      }

      // Use the new API endpoint to sync directly to Google Sheets
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/consignments/sync-to-google-sheet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheet_url: googleSheetUrl,
          consignment_ids: selectedConsignments.length > 0 ? selectedConsignments : undefined
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to sync to Google Sheets')
      }

      const result = await response.json()
      setSuccess(`Successfully synced ${result.count} consignments to Google Sheets!`)
      
      if (onSyncComplete) {
        onSyncComplete({ success: true, count: result.count })
      }

    } catch (error: any) {
      console.error('Error syncing to Google Sheets:', error)
      setError(error.message || 'Failed to sync consignments to Google Sheets')
    } finally {
      setSyncing(false)
    }
  }

  const handleSyncFromGoogleSheets = async () => {
    try {
      setSyncing(true)
      setError('')
      setSuccess('')

      if (!googleSheetUrl) {
        setError('Please configure a Google Sheets URL first')
        return
      }

      // Call backend import endpoint to import/sync from Google Sheets
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/consignments/sync-google-sheet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheet_url: googleSheetUrl,
          default_brand: brand
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to import from Google Sheets')
      }

      const result = await response.json()
      setSuccess(`Import completed: ${result.results.success} success, ${result.results.failed} failed`)
      
      if (onSyncComplete) {
        onSyncComplete({ success: true, results: result.results })
      }

    } catch (error: any) {
      console.error('Error syncing from Google Sheets:', error)
      setError(error.message || 'Failed to sync consignments from Google Sheets')
    } finally {
      setSyncing(false)
    }
  }

  if (loading && !syncing) {
    return (
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading configuration...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Google Sheets Sync - Consignments</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">
          Sync consignments {selectedConsignments.length > 0 ? `(${selectedConsignments.length} selected)` : '(all)'} with Google Sheets.
        </p>
        <p className="text-xs text-gray-500">
          Current brand: {brand}
        </p>
      </div>

      {/* URL Configuration */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm">Google Sheets Configuration</h4>
          <button
            onClick={() => setShowUrlConfig(!showUrlConfig)}
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
          >
            <Settings className="h-4 w-4 mr-1" />
            {showUrlConfig ? 'Hide' : 'Configure'}
          </button>
        </div>
        
        {hasUrlConfig && !showUrlConfig && (
          <div className="text-sm text-gray-600">
            <p>✓ Google Sheets URL configured</p>
            <a
              href={googleSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1 block truncate cursor-pointer transition-colors"
              title="Open Google Sheets (opens in new tab)"
            >
              {googleSheetUrl}
            </a>
          </div>
        )}
        
        {!hasUrlConfig && !showUrlConfig && (
          <div className="text-sm text-red-600">
            ⚠ No Google Sheets URL configured. Click "Configure" to set one up.
          </div>
        )}

        {showUrlConfig && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Sheets URL (CSV export format):
              </label>
              <input
                type="url"
                value={editingUrl}
                onChange={(e) => setEditingUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tip: In Google Sheets, go to File → Share → Publish to web → Choose CSV format and copy the link
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={saveGoogleSheetUrl}
                disabled={loading}
                className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save URL'}
              </button>
              <button
                onClick={() => {
                  setShowUrlConfig(false)
                  setEditingUrl(googleSheetUrl)
                }}
                className="bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sync Mode Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Sync Direction:
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              syncMode === 'to'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSyncMode('to')}
          >
            <div className="flex items-center space-x-2 mb-1">
              <Upload className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">Export to Google Sheets</span>
            </div>
            <p className="text-xs text-gray-600">
              Export consignment data from database to Google Sheets
            </p>
          </div>
          <div
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              syncMode === 'from'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSyncMode('from')}
          >
            <div className="flex items-center space-x-2 mb-1">
              <Download className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm">Import from Google Sheets</span>
            </div>
            <p className="text-xs text-gray-600">
              Import consignment data from Google Sheets to database
            </p>
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
          disabled={syncing}
        >
          Cancel
        </button>
        <button
          onClick={syncMode === 'to' ? handleSyncToGoogleSheets : handleSyncFromGoogleSheets}
          disabled={syncing || !hasUrlConfig}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          {syncing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              {syncMode === 'to' ? 'Export to Sheets' : 'Import from Sheets'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
