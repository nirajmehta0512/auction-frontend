// frontend/src/app/settings/brands/page.tsx
"use client"

import React, { useEffect, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function BrandsAdminPage() {
  const [brands, setBrands] = useState<any[]>([])
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [isPublicAuctions, setIsPublicAuctions] = useState<boolean>(false)
  const [isPublicItems, setIsPublicItems] = useState<boolean>(false)
  const [isPublicRefunds, setIsPublicRefunds] = useState<boolean>(false)
  const [isPublicReimbursements, setIsPublicReimbursements] = useState<boolean>(false)
  const [isPublicBanking, setIsPublicBanking] = useState<boolean>(false)
  const [globalGoogleSheets, setGlobalGoogleSheets] = useState({
    clients: '',
    consignments: '',
    artworks: '',
    auctions: ''
  })
  const [editingSheet, setEditingSheet] = useState<string | null>(null)
  const [tempUrl, setTempUrl] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const authedFetch = (path: string, init?: RequestInit): Promise<Response> => fetch(`${API_BASE_URL}${path}`, { ...(init || {}), headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })

  const loadBrands = async () => {
    const res = await authedFetch('/api/brands')
    const data = await res.json()
    if (data.success) {
      setBrands(data.data)
    }
  }

  const loadGlobalGoogleSheets = async () => {
    try {
      const res = await authedFetch('/api/app-settings/google-sheets')
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setGlobalGoogleSheets({
            clients: data.data.clients || '',
            consignments: data.data.consignments || '',
            artworks: data.data.artworks || '',
            auctions: data.data.auctions || ''
          })
        }
      }
    } catch (error) {
      console.error('Error loading global Google Sheets URLs:', error)
    }
  }

  const saveGlobalGoogleSheetUrl = async (module: string, url: string) => {
    try {
      const res = await authedFetch('/api/app-settings/google-sheets', {
        method: 'POST',
        body: JSON.stringify({
          module,
          url
        })
      })
      if (res.ok) {
        setGlobalGoogleSheets(prev => ({
          ...prev,
          [module]: url
        }))
        setEditingSheet(null)
        setTempUrl('')
        alert(`Google Sheets URL for ${module} saved successfully!`)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to save Google Sheets URL')
      }
    } catch (error) {
      console.error('Error saving Google Sheets URL:', error)
      alert('Failed to save Google Sheets URL')
    }
  }
  const loadVisibility = async () => {
    const modules: Array<[string, (v:boolean)=>void]> = [
      ['auctions', setIsPublicAuctions],
      ['items', setIsPublicItems],
      ['refunds', setIsPublicRefunds],
      ['reimbursements', setIsPublicReimbursements],
      ['banking', setIsPublicBanking],
    ]
    await Promise.all(modules.map(async ([m,setter]) => {
      const res = await authedFetch(`/api/brands/visibility/${m}`)
      if (res.ok) { const data = await res.json(); setter(!!data.data.is_public) }
    }))
  }

  useEffect(() => { loadBrands(); loadVisibility(); loadGlobalGoogleSheets() }, [])

  const createBrand = async () => {
    const res = await authedFetch('/api/brands', { method: 'POST', body: JSON.stringify({ code, name, is_active: true }) })
    if (res.ok) {
      setCode(''); setName('');
      loadBrands()
    } else {
      const data = await res.json(); alert(data.error || 'Failed')
    }
  }

  const saveVisibility = async (module: string, value: boolean) => {
    const res = await authedFetch('/api/brands/visibility', { method: 'POST', body: JSON.stringify({ module, is_public: value }) })
    if (res.ok) {
      switch(module){
        case 'auctions': setIsPublicAuctions(value); break;
        case 'items': setIsPublicItems(value); break;
        case 'refunds': setIsPublicRefunds(value); break;
        case 'reimbursements': setIsPublicReimbursements(value); break;
        case 'banking': setIsPublicBanking(value); break;
      }
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white border rounded p-4">
        <h1 className="text-xl font-semibold">Brands & Visibility (Super Admin)</h1>
      </div>

      <div className="bg-white border rounded p-4 space-y-3">
        <h2 className="font-semibold">Create Brand</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Code (e.g., AURUM)" value={code} onChange={(e) => setCode(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="border rounded px-3 py-2" onClick={createBrand}>Create</button>
        </div>
      </div>

      <div className="bg-white border rounded p-4 space-y-3">
        <h2 className="font-semibold">Global Visibility</h2>
        <div className="space-y-2">
          <label className="inline-flex items-center space-x-2">
            <input type="checkbox" checked={isPublicAuctions} onChange={(e) => saveVisibility('auctions', e.target.checked)} />
            <span>Auctions are public across sub-brands</span>
          </label>
          <label className="inline-flex items-center space-x-2">
            <input type="checkbox" checked={isPublicItems} onChange={(e) => saveVisibility('items', e.target.checked)} />
            <span>Items are public across sub-brands</span>
          </label>
          <label className="inline-flex items-center space-x-2">
            <input type="checkbox" checked={isPublicRefunds} onChange={(e) => saveVisibility('refunds', e.target.checked)} />
            <span>Refunds are public across sub-brands</span>
          </label>
          <label className="inline-flex items-center space-x-2">
            <input type="checkbox" checked={isPublicReimbursements} onChange={(e) => saveVisibility('reimbursements', e.target.checked)} />
            <span>Reimbursements are public across sub-brands</span>
          </label>
          <label className="inline-flex items-center space-x-2">
            <input type="checkbox" checked={isPublicBanking} onChange={(e) => saveVisibility('banking', e.target.checked)} />
            <span>Banking is public across sub-brands</span>
          </label>
        </div>
      </div>

      <div className="bg-white border rounded p-4">
        <h2 className="font-semibold mb-3">Global Google Sheets Configuration</h2>
        <p className="text-sm text-gray-600 mb-4">
          Configure Google Sheets URLs for different modules. These URLs will be used across all brands for import/export and sync operations.
        </p>
        <div className="space-y-4">
          {[
            { key: 'clients', label: 'Clients Import/Export' },
            { key: 'consignments', label: 'Consignments Import/Export' },
            { key: 'artworks', label: 'Artworks/Items Import/Export' },
            { key: 'auctions', label: 'Auctions Import/Export' }
          ].map((module) => (
            <div key={module.key} className="border rounded-lg p-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{module.label}:</label>
                {editingSheet === module.key ? (
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      className="flex-1 border rounded px-3 py-2 text-sm"
                      placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                      value={tempUrl}
                      onChange={(e) => setTempUrl(e.target.value)}
                    />
                    <button
                      onClick={() => saveGlobalGoogleSheetUrl(module.key, tempUrl)}
                      className="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingSheet(null)
                        setTempUrl('')
                      }}
                      className="bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-2 items-center">
                    <input
                      type="text"
                      className="flex-1 border rounded px-3 py-2 text-sm bg-gray-50"
                      value={globalGoogleSheets[module.key as keyof typeof globalGoogleSheets] || 'No URL configured'}
                      readOnly
                    />
                    <button
                      onClick={() => {
                        setEditingSheet(module.key)
                        setTempUrl(globalGoogleSheets[module.key as keyof typeof globalGoogleSheets] || '')
                      }}
                      className="bg-orange-500 text-white px-3 py-2 rounded text-sm hover:bg-orange-600"
                    >
                      Edit
                    </button>
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  Tip: Use Google Sheets export URL in CSV format for automatic sync
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded p-4">
        <h2 className="font-semibold mb-3">Brands Management</h2>
        <div className="space-y-4">
          {brands.map((b) => (
            <div key={b.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-gray-500">{b.code}</div>
                </div>
                <div className="text-xs text-gray-500">{b.is_active ? 'Active' : 'Inactive'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


