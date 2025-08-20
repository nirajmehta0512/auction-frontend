// frontend/src/app/settings/brand/page.tsx
"use client"

import React, { useEffect, useState } from 'react'
import { Save, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react'
import { useBrand } from '@/lib/brand-context'
import { loadBrandGoogleSheetUrl, saveBrandGoogleSheetUrl } from '@/lib/google-sheets-api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function BrandSettingsPage() {
  const { brand } = useBrand()
  const [rows, setRows] = useState<{ key: string; value: string }[]>([])
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  
  // Google Sheets specific state
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('')
  const [googleSheetsUrlLoading, setGoogleSheetsUrlLoading] = useState(false)
  const [googleSheetsUrlSaving, setGoogleSheetsUrlSaving] = useState(false)
  const [googleSheetsUrlStatus, setGoogleSheetsUrlStatus] = useState<'success' | 'error' | null>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const authedFetch = (path: string, init?: RequestInit): Promise<Response> => fetch(`${API_BASE_URL}${path}`, { ...(init || {}), headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })

  const load = async () => {
    const res = await authedFetch(`/api/brand-settings?brand_code=${encodeURIComponent(brand)}`)
    if (res.ok) {
      const data = await res.json()
      setRows(data.data || [])
    }
  }

  const loadGoogleSheetsUrl = async () => {
    setGoogleSheetsUrlLoading(true)
    try {
      const url = await loadBrandGoogleSheetUrl(brand, 'artworks')
      setGoogleSheetsUrl(url || '')
    } catch (error) {
      console.error('Failed to load Google Sheets URL:', error)
    } finally {
      setGoogleSheetsUrlLoading(false)
    }
  }

  useEffect(() => { 
    if (brand) {
      load()
      loadGoogleSheetsUrl()
    }
  }, [brand])

  const save = async (key: string, value: string) => {
    await authedFetch('/api/brand-settings', { method: 'POST', body: JSON.stringify({ brand_code: brand, key, value }) })
    load()
  }

  const remove = async (key: string) => {
    await authedFetch('/api/brand-settings', { method: 'DELETE', body: JSON.stringify({ brand_code: brand, key }) })
    load()
  }

  const saveGoogleSheetsUrl = async () => {
    setGoogleSheetsUrlSaving(true)
    setGoogleSheetsUrlStatus(null)
    try {
      const success = await saveBrandGoogleSheetUrl(brand, googleSheetsUrl, 'artworks')
      if (success) {
        setGoogleSheetsUrlStatus('success')
        setTimeout(() => setGoogleSheetsUrlStatus(null), 3000)
      } else {
        setGoogleSheetsUrlStatus('error')
      }
    } catch (error) {
      console.error('Failed to save Google Sheets URL:', error)
      setGoogleSheetsUrlStatus('error')
    } finally {
      setGoogleSheetsUrlSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white border rounded p-4">
        <h1 className="text-xl font-semibold">Brand Settings ({brand})</h1>
        <p className="text-sm text-gray-500">Configure AI keys, model names, or other per-brand settings.</p>
      </div>

      {/* Google Sheets URL for Artworks */}
      <div className="bg-white border rounded p-4">
        <div className="flex items-center space-x-2 mb-4">
          <h2 className="text-lg font-medium">Artworks Google Sheets Integration</h2>
          {googleSheetsUrlStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
          {googleSheetsUrlStatus === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Configure the Google Sheets URL where artwork data will be automatically synced when items are created or updated.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Google Sheets URL
            </label>
            <div className="flex space-x-3">
              <input
                type="url"
                value={googleSheetsUrl}
                onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
                disabled={googleSheetsUrlLoading || googleSheetsUrlSaving}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              <button
                onClick={saveGoogleSheetsUrl}
                disabled={googleSheetsUrlSaving || !googleSheetsUrl.trim()}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {googleSheetsUrlSaving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </button>
            </div>
          </div>
          
          {googleSheetsUrl && (
            <div className="flex items-center space-x-2 text-sm">
              <ExternalLink className="h-4 w-4 text-blue-500" />
              <a
                href={googleSheetsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Open Google Sheet
              </a>
            </div>
          )}
          
          {googleSheetsUrlStatus === 'success' && (
            <div className="text-sm text-green-600">
              ✓ Google Sheets URL saved successfully
            </div>
          )}
          
          {googleSheetsUrlStatus === 'error' && (
            <div className="text-sm text-red-600">
              ✗ Failed to save Google Sheets URL. Please try again.
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            <p><strong>Note:</strong> Make sure the Google Sheet is publicly accessible or shared with the appropriate permissions.</p>
            <p>Supported formats: Google Sheets share URL or CSV export URL</p>
          </div>
        </div>
      </div>

      {/* Generic Brand Settings */}
      <div className="bg-white border rounded p-4">
        <h2 className="text-lg font-medium mb-4">Other Brand Settings</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="border rounded px-3 py-2" placeholder="Key (e.g., ai_model_name)" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
            <input className="border rounded px-3 py-2" placeholder="Value" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
            <button className="border rounded px-3 py-2 bg-gray-100 hover:bg-gray-200" onClick={() => { if (newKey) { save(newKey, newValue); setNewKey(''); setNewValue('') } }}>Add/Update</button>
          </div>
        </div>
      </div>
      
      <div className="bg-white border rounded p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-2">Key</th>
              <th className="py-2">Value</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.filter(r => r.key !== 'google_sheet_url_artworks').map((r) => (
              <tr key={r.key} className="border-t">
                <td className="py-2 pr-4">{r.key}</td>
                <td className="py-2 pr-4">
                  <input className="border rounded px-2 py-1 w-full" defaultValue={r.value} onBlur={(e) => save(r.key, e.target.value)} />
                </td>
                <td className="py-2">
                  <button className="text-red-600 hover:text-red-800" onClick={() => remove(r.key)}>Delete</button>
                </td>
              </tr>
            ))}
            {rows.filter(r => r.key !== 'google_sheet_url_artworks').length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-gray-500">
                  No additional settings configured
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


