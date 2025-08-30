// frontend/src/components/items/PendingItemsTab.tsx
"use client"

import React, { useEffect, useState } from 'react'

interface PendingRecord {
  id: number
  status: string | null
  client_id?: number | null
  client_info?: any
  items: any[]
  created_at?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function PendingItemsTab() {
  const [pending, setPending] = useState<PendingRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [driveFolderUrl, setDriveFolderUrl] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`${API_BASE_URL}/api/pending-items`, { headers: { ...(token && { Authorization: `Bearer ${token}` }) } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load pending items')
      setPending(data.data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const approve = async (id: number) => {
    try {
      setActionLoading(id)
      setError(null)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`${API_BASE_URL}/api/pending-items/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({ drive_parent_folder_id_or_url: driveFolderUrl || undefined })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Approve failed')
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const reject = async (id: number) => {
    try {
      setActionLoading(id)
      setError(null)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`${API_BASE_URL}/api/pending-items/${id}/reject`, {
        method: 'POST',
        headers: { ...(token && { Authorization: `Bearer ${token}` }) }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reject failed')
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex items-end gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Google Drive Parent Folder (optional)</label>
          <input value={driveFolderUrl} onChange={(e)=>setDriveFolderUrl(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." className="border rounded px-3 py-2 w-full" />
          <p className="text-xs text-gray-500 mt-1">Approved items will be uploaded into a subfolder.</p>
        </div>
        <button onClick={load} className="px-3 py-2 border rounded">Refresh</button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded">{error}</div>}

      {loading ? (
        <div className="p-8 text-center">Loading...</div>
      ) : pending.length === 0 ? (
        <div className="p-6 text-gray-600">No pending submissions.</div>
      ) : (
        <div className="space-y-4">
          {pending.map((p) => (
            <div key={p.id} className="border rounded p-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Submission #{p.id}</div>
                  <div className="text-xs text-gray-500">Status: {p.status || 'submitted'} • {p.created_at ? new Date(p.created_at).toLocaleString() : ''}</div>
                </div>
                <div className="flex gap-2">
                  <button disabled={actionLoading===p.id} onClick={()=>approve(p.id)} className="px-3 py-1 bg-teal-600 text-white rounded disabled:opacity-50">{actionLoading===p.id? 'Approving...' : 'Approve'}</button>
                  <button disabled={actionLoading===p.id} onClick={()=>reject(p.id)} className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50">{actionLoading===p.id? 'Rejecting...' : 'Reject'}</button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                {(p.items||[]).map((it, idx) => (
                  <div key={idx} className="border rounded p-3">
                    <div className="font-medium truncate">{it.title || 'Untitled'}</div>
                    <div className="text-xs text-gray-500 truncate">{it.description || ''}</div>
                    {Array.isArray(it.images) && it.images.length>0 && (
                      <div className="mt-2 grid grid-cols-3 gap-1">
                        {it.images.slice(0,6).map((u:string, i:number) => (
                          <div key={i} className="aspect-square overflow-hidden bg-gray-50 border">
                            <img src={u} className="object-cover w-full h-full" alt="img" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
