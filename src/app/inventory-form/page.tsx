// frontend/src/app/inventory-form/page.tsx
"use client"

import React, { useState } from 'react'
import { getApiBaseUrl } from '@/lib/google-sheets-api'

interface ClientInfo {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  company_name?: string
}

interface PublicItemInput {
  title: string
  description: string
  low_est: string
  high_est: string
  category?: string
  materials?: string
  height_inches?: string;
  width_inches?: string;
  height_cm?: string;
  width_cm?: string;
  height_with_frame_inches?: string;
  width_with_frame_inches?: string;
  height_with_frame_cm?: string;
  width_with_frame_cm?: string;
  weight?: string;
  period_age?: string
  condition?: string
  images: File[]
}

async function submitPublicInventory(payload: any) {
  const apiUrl = getApiBaseUrl()
  const res = await fetch(`${apiUrl}/public/inventory/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Submission failed')
  return data
}

export default function InventoryFormPage() {
  const [clientId, setClientId] = useState('')
  const [clientInfo, setClientInfo] = useState<ClientInfo>({})
  const [items, setItems] = useState<PublicItemInput[]>([
    { title: '', description: '', low_est: '', high_est: '', images: [] },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const addItem = () => setItems(prev => [...prev, { title: '', description: '', low_est: '', high_est: '', images: [] }])
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

  const handleFileChange = (idx: number, files: FileList | null) => {
    const arr = files ? Array.from(files).slice(0, 10) : []
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, images: arr } : it))
  }

  const validate = (): string[] => {
    const errs: string[] = []
    items.forEach((it, i) => {
      if (!it.title.trim()) errs.push(`Item ${i + 1}: Title is required`)
      if (!it.description.trim()) errs.push(`Item ${i + 1}: Description is required`)
      const low = Number(it.low_est)
      const high = Number(it.high_est)
      if (!Number.isFinite(low) || low <= 0) errs.push(`Item ${i + 1}: Low estimate must be > 0`)
      if (!Number.isFinite(high) || high <= 0) errs.push(`Item ${i + 1}: High estimate must be > 0`)
      if (Number.isFinite(low) && Number.isFinite(high) && low >= high) errs.push(`Item ${i + 1}: High > Low required`)
    })
    return errs
  }

  const onSubmit = async () => {
    setError(null)
    setMessage(null)
    const errs = validate()
    if (errs.length > 0) { setError(errs[0]); return }
    setSubmitting(true)
    try {
      // Convert images to data URLs (base64)
      const serializeImages = async (files: File[]): Promise<string[]> => {
        const toDataUrl = (f: File) => new Promise<string>((resolve, reject) => {
          const r = new FileReader()
          r.onload = () => resolve(String(r.result))
          r.onerror = () => reject(new Error('read error'))
          r.readAsDataURL(f)
        })
        const arr: string[] = []
        for (const f of files.slice(0, 10)) arr.push(await toDataUrl(f))
        return arr
      }

      const payloadItems = [] as any[]
      for (const it of items) {
        payloadItems.push({
          title: it.title,
          description: it.description,
          low_est: Number(it.low_est),
          high_est: Number(it.high_est),
          category: it.category,
          materials: it.materials,
          height_inches: it.height_inches,
          width_inches: it.width_inches,
          height_cm: it.height_cm,
          width_cm: it.width_cm,
          height_with_frame_inches: it.height_with_frame_inches,
          width_with_frame_inches: it.width_with_frame_inches,
          height_with_frame_cm: it.height_with_frame_cm,
          width_with_frame_cm: it.width_with_frame_cm,
          weight: it.weight,
          period_age: it.period_age,
          condition: it.condition,
          images: await serializeImages(it.images),
        })
      }

      const payload = {
        client_id: clientId || undefined,
        client_info: clientId ? undefined : clientInfo,
        items: payloadItems,
      }
      const resp = await submitPublicInventory(payload)
      setMessage(`Submitted successfully. Reference: ${resp.submission_token}`)
      setItems([{ title: '', description: '', low_est: '', high_est: '', images: [] }])
    } catch (e: any) {
      setError(e.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto bg-white border rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-2">Inventory Submission</h1>
        <p className="text-gray-600 mb-6">Submit artworks for review. Well contact you after approval.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800">{error}</div>
        )}
        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800">{message}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Existing Client ID (optional)</label>
            <input value={clientId} onChange={e => setClientId(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="123 or MET-123" />
          </div>
        </div>

        {!clientId && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Your Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="First Name" className="border rounded px-3 py-2" value={clientInfo.first_name||''} onChange={e=>setClientInfo({...clientInfo, first_name:e.target.value})} />
              <input placeholder="Last Name" className="border rounded px-3 py-2" value={clientInfo.last_name||''} onChange={e=>setClientInfo({...clientInfo, last_name:e.target.value})} />
              <input placeholder="Email" className="border rounded px-3 py-2" value={clientInfo.email||''} onChange={e=>setClientInfo({...clientInfo, email:e.target.value})} />
              <input placeholder="Phone" className="border rounded px-3 py-2" value={clientInfo.phone||''} onChange={e=>setClientInfo({...clientInfo, phone:e.target.value})} />
              <input placeholder="Company (optional)" className="border rounded px-3 py-2 md:col-span-2" value={clientInfo.company_name||''} onChange={e=>setClientInfo({...clientInfo, company_name:e.target.value})} />
            </div>
          </div>
        )}

        <div className="space-y-6">
          {items.map((it, idx) => (
            <div key={idx} className="border rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Artwork #{idx + 1}</h3>
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)} className="text-sm text-red-600 hover:underline">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Title" className="border rounded px-3 py-2" value={it.title} onChange={e=>setItems(p=>p.map((x,i)=>i===idx?{...x,title:e.target.value}:x))} />
                <input placeholder="Category (optional)" className="border rounded px-3 py-2" value={it.category||''} onChange={e=>setItems(p=>p.map((x,i)=>i===idx?{...x,category:e.target.value}:x))} />
                <textarea placeholder="Description" className="border rounded px-3 py-2 md:col-span-2" rows={3} value={it.description} onChange={e=>setItems(p=>p.map((x,i)=>i===idx?{...x,description:e.target.value}:x))} />
                <input placeholder="Low Estimate" className="border rounded px-3 py-2" value={it.low_est} onChange={e=>setItems(p=>p.map((x,i)=>i===idx?{...x,low_est:e.target.value}:x))} />
                <input placeholder="High Estimate" className="border rounded px-3 py-2" value={it.high_est} onChange={e=>setItems(p=>p.map((x,i)=>i===idx?{...x,high_est:e.target.value}:x))} />
                <input placeholder="Materials (optional)" className="border rounded px-3 py-2" value={it.materials||''} onChange={e=>setItems(p=>p.map((x,i)=>i===idx?{...x,materials:e.target.value}:x))} />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Height (inches)" className="border rounded px-3 py-2" value={it.height_inches||''} onChange={e=>setItems(p=>p.map((x,i)=>i===idx?{...x,height_inches:e.target.value}:x))} />
                  <input placeholder="Width (inches)" className="border rounded px-3 py-2" value={it.width_inches||''} onChange={e=>setItems(p=>p.map((x,i)=>i===idx?{...x,width_inches:e.target.value}:x))} />
                  <input placeholder="Height (cm)" className="border rounded px-3 py-2" value={it.height_cm||''} onChange={e=>setItems(p=>p.map((x,i)=>i===idx?{...x,height_cm:e.target.value}:x))} />
                  <input placeholder="Width (cm)" className="border rounded px-3 py-2" value={it.width_cm||''} onChange={e=>setItems(p=>p.map((x,i)=>i===idx?{...x,width_cm:e.target.value}:x))} />
                  <input placeholder="Weight (optional)" className="border rounded px-3 py-2 col-span-2" value={it.weight||''} onChange={e=>setItems(p=>p.map((x,i)=>i===idx?{...x,weight:e.target.value}:x))} />
                </div>
                <input placeholder="Period/Age (optional)" className="border rounded px-3 py-2" value={it.period_age||''} onChange={e=>setItems(p=>p.map((x,i)=>i===idx?{...x,period_age:e.target.value}:x))} />
                <input placeholder="Condition (optional)" className="border rounded px-3 py-2" value={it.condition||''} onChange={e=>setItems(p=>p.map((x,i)=>i===idx?{...x,condition:e.target.value}:x))} />
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Images (up to 10) <span className="text-red-600">*</span></label>
                  <input type="file" accept="image/*" multiple onChange={e=>handleFileChange(idx, e.target.files)} />
                  {it.images && it.images.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
                      {it.images.map((file, i) => (
                        <div key={i} className="border rounded p-1 h-28 flex items-center justify-center overflow-hidden bg-gray-50">
                          <img src={URL.createObjectURL(file)} className="object-cover w-full h-full" alt={file.name} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button onClick={addItem} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">Add Another Artwork</button>
          <button onClick={onSubmit} disabled={submitting} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </div>
    </div>
  )
}


