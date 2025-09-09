// frontend/src/app/inventory-form/page.tsx
"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, Save, X, Upload, Trash2, Plus } from 'lucide-react'
import { Artwork, ArtworksAPI, validateArtworkData, generateStartPrice, generateReservePriceForAI, ITEM_CATEGORIES, ITEM_PERIODS, ITEM_MATERIALS, ITEM_CONDITIONS } from '@/lib/items-api'
import { ArtistsAPI, Artist } from '@/lib/artists-api'
import { SchoolsAPI, School } from '@/lib/schools-api'
import ImageUploadField from '@/components/items/ImageUploadField'
import SearchableSelect, { SearchableOption } from '@/components/ui/SearchableSelect'
import { getApiBaseUrl } from '@/lib/google-sheets-api'

interface ClientInfo {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  company_name?: string
}

interface PublicItemInput {
  // LiveAuctioneers required fields
  title: string
  description: string
  low_est: string
  high_est: string
  start_price: string

  // LiveAuctioneers optional fields
  condition: string
  reserve: string

  // Enhanced client fields (using database field names)
  consignment_id: string
  images: File[]

  // Additional auction management fields
  category: string
  subcategory: string
  weight: string
  materials: string
  artist_id: string
  school_id: string
  period_age: string
  provenance: string

  // Enhanced artwork fields
  artwork_subject: string
  signature_placement: string
  medium: string

  // Description enhancement fields
  include_artist_description: boolean
  include_artist_key_description: boolean
  include_artist_biography: boolean
  include_artist_notable_works: boolean
  include_artist_major_exhibitions: boolean
  include_artist_awards_honors: boolean
  include_artist_market_value_range: boolean
  include_artist_signature_style: boolean

  // New dimension fields with unit conversion
  height_inches: string
  width_inches: string
  height_cm: string
  width_cm: string
  height_with_frame_inches: string
  width_with_frame_inches: string
  height_with_frame_cm: string
  width_with_frame_cm: string

  // New certification fields
  condition_report: string
  gallery_certification: boolean
  gallery_certification_file: string
  gallery_id: string
  artist_certification: boolean
  artist_certification_file: string
  certified_artist_id: string
  artist_family_certification: boolean
  artist_family_certification_file: string
  restoration_done: boolean
  restoration_done_file: string
  restoration_by: string
}

const initialItemData: PublicItemInput = {
  title: '',
  description: '',
  low_est: '',
  high_est: '',
  start_price: '',
  condition: '',
  reserve: '',
  consignment_id: '',
  category: '',
  subcategory: '',
  height_inches: '',
  width_inches: '',
  height_cm: '',
  width_cm: '',
  height_with_frame_inches: '',
  width_with_frame_inches: '',
  height_with_frame_cm: '',
  width_with_frame_cm: '',
  weight: '',
  materials: '',
  artist_id: '',
  school_id: '',
  period_age: '',
  provenance: '',
  artwork_subject: '',
  signature_placement: '',
  medium: '',
  include_artist_description: true,
  include_artist_key_description: true,
  include_artist_biography: false,
  include_artist_notable_works: false,
  include_artist_major_exhibitions: false,
  include_artist_awards_honors: false,
  include_artist_market_value_range: false,
  include_artist_signature_style: false,
  condition_report: '',
  gallery_certification: false,
  gallery_certification_file: '',
  gallery_id: '',
  artist_certification: false,
  artist_certification_file: '',
  certified_artist_id: '',
  artist_family_certification: false,
  artist_family_certification_file: '',
  restoration_done: false,
  restoration_done_file: '',
  restoration_by: '',
  images: []
}

// Utility functions for dimension conversion
const convertInchesToCm = (inchStr: string): string => {
  // Parse dimensions like "24 x 36" or "24" x 36"" and convert to cm
  const converted = inchStr.replace(/(\d+(?:\.\d+)?)\s*[\"']?\s*/g, (match, number) => {
    const inches = parseFloat(number)
    const cm = Math.round(inches * 2.54 * 10) / 10 // Round to 1 decimal place
    return cm.toString()
  })
  return converted.replace(/x/g, 'x').replace(/"/g, '').replace(/'/g, '') + ' cm'
}

const convertCmToInches = (cmStr: string): string => {
  // Parse dimensions like "61 x 91 cm" and convert to inches
  const converted = cmStr.replace(/(\d+(?:\.\d+)?)\s*/g, (match, number) => {
    const cm = parseFloat(number)
    const inches = Math.round(cm / 2.54 * 10) / 10 // Round to 1 decimal place
    return inches.toString()
  })
  return converted.replace(/cm/g, '').replace(/x/g, 'x').trim() + '"'
}

// Convert categories to SearchableOption format
const categoryOptions = ITEM_CATEGORIES.map(category => ({
  value: category,
  label: category
}))

// Convert conditions to SearchableOption format
const conditionOptions = ITEM_CONDITIONS.map(condition => ({
  value: condition.toLowerCase().replace(/\s+/g, ''),
  label: condition
}))

// Convert periods to SearchableOption format
const periodOptions = ITEM_PERIODS.map(period => ({
  value: period,
  label: period
}))

// Convert materials to SearchableOption format
const materialOptions = ITEM_MATERIALS.map(material => ({
  value: material,
  label: material
}))

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
  const [item, setItem] = useState<PublicItemInput>(initialItemData)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('basic')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [loadingArtistsSchools, setLoadingArtistsSchools] = useState(false)
  const [pendingImages, setPendingImages] = useState<Record<string, File>>({})
  const [pendingCertificationFiles, setPendingCertificationFiles] = useState<Record<string, File>>({})

  // Handle file change for images
  const handleFileChange = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files)
      setItem(prev => ({
        ...prev,
        images: [...(prev.images || []), ...fileArray]
      }))
    }
  }

  // Handle form submission
  const onSubmit = async () => {
    try {
      setSubmitting(true)
      setMessage(null)
      setError(null)

      // Basic validation
      if (!item.title.trim()) {
        setError('Title is required')
        return
      }
      if (!item.description.trim()) {
        setError('Description is required')
        return
      }
      if (!item.low_est || !item.high_est || !item.start_price) {
        setError('Estimate and start price are required')
        return
      }
      if (!item.consignment_id) {
        setError('Consignment ID is required')
        return
      }

      const result = await submitPublicInventory(item)
      setMessage('Item submitted successfully!')

      // Reset form after successful submission
      setItem(initialItemData)
    } catch (err: any) {
      console.error('Submission error:', err)
      setError(err.message || 'Failed to submit item')
    } finally {
      setSubmitting(false)
    }
  }

  // Add another item (reset form)
  const addItem = () => {
    setItem(initialItemData)
    setMessage(null)
    setError(null)
  }

  // Load artists and schools data
  useEffect(() => {
    const loadArtistsSchools = async () => {
      try {
        setLoadingArtistsSchools(true)
        const [artistsResponse, schoolsResponse] = await Promise.all([
          ArtistsAPI.getArtists({ status: 'active', limit: 1000 }),
          SchoolsAPI.getSchools({ status: 'active', limit: 1000 }),
        ])

        if (artistsResponse.success) {
          setArtists(artistsResponse.data)
        }
        if (schoolsResponse.success) {
          setSchools(schoolsResponse.data)
        }
      } catch (err) {
        console.error('Failed to load artists/schools:', err)
      } finally {
        setLoadingArtistsSchools(false)
      }
    }

    loadArtistsSchools()
  }, [])

  // Helper function to generate auto title format
  const generateAutoTitle = (data?: PublicItemInput): string => {
    const currentData = data || item
    const parts: string[] = []

    // 1. Artist name with birth-death years in parentheses
    if (currentData.artist_id) {
      const artist = artists.find(a => a.id?.toString() === currentData.artist_id)
      if (artist) {
        let artistPart = artist.name
        if (artist.birth_year || artist.death_year) {
          const birthYear = artist.birth_year || ''
          const deathYear = artist.death_year || ''
          artistPart += ` (${birthYear}${deathYear ? `-${deathYear}` : ''})`
        }
        parts.push(artistPart)
      }
    }

    // 2. Artwork subject or "Untitled"
    const artworkSubject = currentData.artwork_subject?.trim() || 'Untitled'
    parts.push(artworkSubject)

    // 3. Medium (Materials) - combine medium and materials if both exist
    let mediumPart = ''
    if (currentData.medium?.trim()) {
      mediumPart = currentData.medium.trim()
      // If materials is different from medium, add it in parentheses
      if (currentData.materials?.trim() && currentData.materials.trim() !== currentData.medium.trim()) {
        mediumPart += ` (${currentData.materials.trim()})`
      }
    } else if (currentData.materials?.trim()) {
      mediumPart = currentData.materials.trim()
    }
    if (mediumPart) {
      parts.push(mediumPart)
    }

    // 4. Signature placement (if signature exists)
    if (currentData.signature_placement?.trim()) {
      parts.push(`Signed ${currentData.signature_placement.trim()}`)
    }

    // 5. Period of the artwork
    if (currentData.period_age?.trim()) {
      parts.push(currentData.period_age.trim())
    }

    return parts.join(' | ')
  }

  // Helper function to generate preview description
  const previewDescription = useMemo(() => {
    const parts: string[] = []

    // Title (always first)
    const currentTitle = item.title || generateAutoTitle() || 'Untitled Artwork'
    parts.push(currentTitle)

    // Artwork description (double line break after title)
    if (item.description?.trim()) {
      parts.push(item.description.trim())
    }

    // Artist info (if checkboxes are selected)
    if (item.artist_id) {
      const artist = artists.find(a => a.id?.toString() === item.artist_id)
      if (artist) {
        const artistParts: string[] = []

        if (item.include_artist_description && artist.description) {
          artistParts.push(artist.description)
        }

        if (item.include_artist_key_description && artist.key_description) {
          artistParts.push(artist.key_description)
        }

        if (item.include_artist_biography && artist.biography) {
          artistParts.push(artist.biography)
        }

        if (item.include_artist_notable_works && artist.notable_works) {
          artistParts.push(`Notable Works: ${artist.notable_works}`)
        }

        if (item.include_artist_major_exhibitions && artist.exhibitions) {
          artistParts.push(`Major Exhibitions: ${artist.exhibitions}`)
        }

        if (item.include_artist_awards_honors && artist.awards) {
          artistParts.push(`Awards and Honors: ${artist.awards}`)
        }

        if (item.include_artist_market_value_range && artist.market_value_range) {
          artistParts.push(`Market Value Range: ${artist.market_value_range}`)
        }

        if (item.include_artist_signature_style && artist.signature_style) {
          artistParts.push(`Signature Style: ${artist.signature_style}`)
        }

        if (artistParts.length > 0) {
          // Join artist parts with line breaks for better readability
          parts.push(artistParts.join('<br>'))
        }
      }
    }

    // Dimensions (single line break before dimensions)
    if (item.height_inches || item.width_inches || item.height_cm || item.width_cm) {
      let dimensionText = 'Dimensions: '
      if (item.height_inches && item.width_inches) {
        dimensionText += `${item.height_inches} × ${item.width_inches} inches`
        if (item.height_cm && item.width_cm) {
          dimensionText += ` (${item.height_cm} × ${item.width_cm} cm)`
        }
      } else if (item.height_cm && item.width_cm) {
        dimensionText += `${item.height_cm} × ${item.width_cm} cm`
      }
      parts.push(dimensionText)
    }

    // Join parts with specific formatting:
    // Title + Description + Artist Info use double line breaks
    // Artist Info + Dimensions use single line break
    if (parts.length > 2) {
      // We have title, description, and potentially artist info and dimensions
      const result = [
        parts[0], // title
        parts[1], // description
        ...parts.slice(2, -1), // artist info parts
        parts[parts.length - 1] // dimensions (if exists)
      ].join('<br><br>')

      // Replace the last double break with single break for dimensions
      return result.replace(/<br><br>Dimensions:/, '<br>Dimensions:')
    } else if (parts.length === 2) {
      // Just title and description, or title and artist info
      return parts.join('<br><br>')
    } else {
      // Just title or empty
      return parts[0] || 'Untitled Artwork'
    }
  }, [
    item.title,
    item.description,
    item.artist_id,
    item.include_artist_description,
    item.include_artist_key_description,
    item.include_artist_biography,
    item.include_artist_notable_works,
    item.include_artist_major_exhibitions,
    item.include_artist_awards_honors,
    item.include_artist_market_value_range,
    item.include_artist_signature_style,
    item.height_inches,
    item.width_inches,
    item.height_cm,
    item.width_cm,
    artists
  ])

  // Helper function to create artist options for SearchableSelect
  const createArtistOptions = (): SearchableOption[] => {
    return artists
      .filter(artist => artist.id) // Ensure id exists
      .map(artist => ({
        value: artist.id!.toString(), // Ensure consistent string type
        label: artist.name,
        description: artist.birth_year && artist.death_year
          ? `${artist.birth_year} - ${artist.death_year}`
          : artist.birth_year
            ? `Born ${artist.birth_year}`
            : artist.nationality || ''
      }))
  }

  // Helper function to create school options for SearchableSelect
  const createSchoolOptions = (): SearchableOption[] => {
    return schools
      .filter(school => school.id) // Ensure id exists
      .map(school => ({
        value: school.id!.toString(), // Ensure consistent string type
        label: school.name,
        description: school.location || ''
      }))
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
          {[item].map((it, idx) => (
            <div key={idx} className="border rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Artwork #{idx + 1}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Title" className="border rounded px-3 py-2" value={it.title} onChange={e=>setItem({...it,title:e.target.value})} />
                <input placeholder="Category (optional)" className="border rounded px-3 py-2" value={it.category||''} onChange={e=>setItem({...it,category:e.target.value})} />
                <textarea placeholder="Description" className="border rounded px-3 py-2 md:col-span-2" rows={3} value={it.description} onChange={e=>setItem({...it,description:e.target.value})} />
                <input placeholder="Low Estimate" className="border rounded px-3 py-2" value={it.low_est} onChange={e=>setItem({...it,low_est:e.target.value})} />
                <input placeholder="High Estimate" className="border rounded px-3 py-2" value={it.high_est} onChange={e=>setItem({...it,high_est:e.target.value})} />
                <input placeholder="Materials (optional)" className="border rounded px-3 py-2" value={it.materials||''} onChange={e=>setItem({...it,materials:e.target.value})} />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Height (inches)" className="border rounded px-3 py-2" value={it.height_inches||''} onChange={e=>setItem({...it,height_inches:e.target.value})} />
                  <input placeholder="Width (inches)" className="border rounded px-3 py-2" value={it.width_inches||''} onChange={e=>setItem({...it,width_inches:e.target.value})} />
                  <input placeholder="Height (cm)" className="border rounded px-3 py-2" value={it.height_cm||''} onChange={e=>setItem({...it,height_cm:e.target.value})} />
                  <input placeholder="Width (cm)" className="border rounded px-3 py-2" value={it.width_cm||''} onChange={e=>setItem({...it,width_cm:e.target.value})} />
                  <input placeholder="Weight (optional)" className="border rounded px-3 py-2 col-span-2" value={it.weight||''} onChange={e=>setItem({...it,weight:e.target.value})} />
                </div>
                <input placeholder="Period/Age (optional)" className="border rounded px-3 py-2" value={it.period_age||''} onChange={e=>setItem({...it,period_age:e.target.value})} />
                <input placeholder="Condition (optional)" className="border rounded px-3 py-2" value={it.condition||''} onChange={e=>setItem({...it,condition:e.target.value})} />
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Images (up to 10) <span className="text-red-600">*</span></label>
                  <input type="file" accept="image/*" multiple onChange={e=>handleFileChange(e.target.files)} />
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


