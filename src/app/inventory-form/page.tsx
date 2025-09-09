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

  // Images array (unlimited images)
  images: string[]
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

  const handleInputChange = (field: keyof PublicItemInput, value: string | boolean) => {
    // Update the item data first
    setItem(prev => {
      const updatedData = { ...prev, [field]: value }

      // Auto-calculate with-frame dimensions when main dimensions change
      if (field === 'height_inches' || field === 'width_inches') {
        const height = parseFloat(updatedData.height_inches)
        const width = parseFloat(updatedData.width_inches)

        if (!isNaN(height) && !isNaN(width)) {
          updatedData.height_with_frame_inches = (height + 2).toFixed(1)
          updatedData.width_with_frame_inches = (width + 2).toFixed(1)
          updatedData.height_with_frame_cm = (parseFloat(updatedData.height_with_frame_inches) * 2.54).toFixed(1)
          updatedData.width_with_frame_cm = (parseFloat(updatedData.width_with_frame_inches) * 2.54).toFixed(1)
        }
      }

      // Auto-calculate with-frame dimensions when cm dimensions change
      if (field === 'height_cm' || field === 'width_cm') {
        const heightCm = parseFloat(updatedData.height_cm)
        const widthCm = parseFloat(updatedData.width_cm)

        if (!isNaN(heightCm) && !isNaN(widthCm)) {
          // Convert to inches, add 2 inches, convert back to cm
          const heightInInches = heightCm / 2.54
          const widthInInches = widthCm / 2.54
          updatedData.height_with_frame_inches = (heightInInches + 2).toFixed(1)
          updatedData.width_with_frame_inches = (widthInInches + 2).toFixed(1)
          updatedData.height_with_frame_cm = ((heightInInches + 2) * 2.54).toFixed(1)
          updatedData.width_with_frame_cm = ((widthInInches + 2) * 2.54).toFixed(1)
        }
      }

      return updatedData
    })

    // Auto-calculate start price when low_est changes
    if (field === 'low_est' && typeof value === 'string' && value) {
      const lowEst = parseFloat(value)
      if (!isNaN(lowEst)) {
        const startPrice = generateStartPrice(lowEst)
        const reservePrice = startPrice // Reserve = start price
        setItem(prev => ({
          ...prev,
          start_price: startPrice.toString(),
          reserve: reservePrice.toString()
        }))
      }
    }

    // Auto-calculate reserve price when start_price changes
    if (field === 'start_price' && typeof value === 'string' && value) {
      const startPrice = parseFloat(value)
      if (!isNaN(startPrice)) {
        const reservePrice = startPrice // Reserve = start price
        setItem(prev => ({ ...prev, reserve: reservePrice.toString() }))
      }
    }

    // Auto-generate title when related fields change
    if (['artist_id', 'artwork_subject', 'medium', 'signature_placement', 'period_age'].includes(field)) {
      // Use setTimeout to ensure the state update is processed first
      setTimeout(() => {
        setItem(prev => {
          // Create the updated data with the new value
          const updatedData = { ...prev, [field]: value }

          // Use the centralized title generation function
          const autoTitle = generateAutoTitle(updatedData)

          // Update title if we have meaningful content
          if (autoTitle && autoTitle !== 'Untitled') {
            return { ...updatedData, title: autoTitle }
          }

          return updatedData
        })
      }, 50) // Reduced delay for faster UI updates
    }

    // Clear validation errors when user starts typing
    setValidationErrors([])
  }

  const handleImageChange = (index: number, url: string, file?: File) => {
    console.log('handleImageChange', index, url, file)
    setItem(prev => {
      const newImages = [...prev.images]
      // Ensure array has enough slots
      while (newImages.length <= index) {
        newImages.push('')
      }
      newImages[index] = url
      return { ...prev, images: newImages }
    })

    if (file) {
      setPendingImages(prev => ({ ...prev, [`image_${index}`]: file }))
    } else {
      // Remove from pending if it's just a URL
      setPendingImages(prev => {
        const updated = { ...prev }
        delete updated[`image_${index}`]
        return updated
      })
    }

    // Clear validation errors
    setValidationErrors([])
  }

  const handleMultipleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    // Find next available slots in the images array
    const getNextAvailableSlots = (): number[] => {
      const availableSlots: number[] = []
      for (let i = 0; i < 10; i++) { // Allow up to 10 images for now (can be increased)
        if (!item.images[i] || item.images[i] === '') {
          availableSlots.push(i)
        }
      }
      return availableSlots
    }

    const availableSlots = getNextAvailableSlots()
    const filesToProcess = Array.from(files).slice(0, availableSlots.length)

    if (filesToProcess.length === 0) {
      alert('All image slots are already filled. Please remove some images first.')
      return
    }

    if (filesToProcess.length < files.length) {
      alert(`Only ${filesToProcess.length} files can be added (remaining slots available)`)
    }

    filesToProcess.forEach((file, index) => {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        alert(`File ${file.name} is not an image`)
        return
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`File ${file.name} is too large (max 10MB)`)
        return
      }

      // Use next available slot
      const slotIndex = availableSlots[index]

      // Create blob URL for preview
      const blobUrl = URL.createObjectURL(file)

      // Update item data and pending images
      handleImageChange(slotIndex, blobUrl, file)
    })

    // Clear the input
    event.target.value = ''

    // Clear validation errors
    setValidationErrors([])
  }

  const handleCertificationFileUpload = (certificationType: 'gallery_certification_file' | 'artist_certification_file' | 'artist_family_certification_file' | 'restoration_done_file', file: File) => {
    // Create preview URL for the file
    const previewUrl = URL.createObjectURL(file)

    // Update item data with preview URL
    setItem(prev => ({
      ...prev,
      [certificationType]: previewUrl
    }))

    // Store pending file
    setPendingCertificationFiles(prev => ({
      ...prev,
      [certificationType]: file
    }))
  }

  // Get count of filled image slots
  const getFilledSlotsCount = (): number => {
    return item.images.filter(url => url && url.trim() !== '').length
  }

  const validate = (): string[] => {
    const errs: string[] = []
    if (!item.title.trim()) errs.push('Title is required')
    if (!item.description.trim()) errs.push('Description is required')
    const low = Number(item.low_est)
    const high = Number(item.high_est)
    if (!Number.isFinite(low) || low <= 0) errs.push('Low estimate must be > 0')
    if (!Number.isFinite(high) || high <= 0) errs.push('High estimate must be > 0')
    if (Number.isFinite(low) && Number.isFinite(high) && low >= high) errs.push('High estimate must be greater than low estimate')
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
      const serializeImages = async (files: Record<string, File>): Promise<string[]> => {
        const toDataUrl = (f: File) => new Promise<string>((resolve, reject) => {
          const r = new FileReader()
          r.onload = () => resolve(String(r.result))
          r.onerror = () => reject(new Error('read error'))
          r.readAsDataURL(f)
        })
        const arr: string[] = []
        for (const f of Object.values(files).slice(0, 10)) arr.push(await toDataUrl(f))
        return arr
      }

      const payloadItem = {
        title: item.title,
        description: item.description,
        low_est: Number(item.low_est),
        high_est: Number(item.high_est),
        start_price: item.start_price ? Number(item.start_price) : undefined,
        condition: item.condition || undefined,
        reserve: item.reserve ? Number(item.reserve) : undefined,
        category: item.category || undefined,
        subcategory: item.subcategory || undefined,
        height_inches: item.height_inches || undefined,
        width_inches: item.width_inches || undefined,
        height_cm: item.height_cm || undefined,
        width_cm: item.width_cm || undefined,
        height_with_frame_inches: item.height_with_frame_inches || undefined,
        width_with_frame_inches: item.width_with_frame_inches || undefined,
        height_with_frame_cm: item.height_with_frame_cm || undefined,
        width_with_frame_cm: item.width_with_frame_cm || undefined,
        weight: item.weight || undefined,
        materials: item.materials || undefined,
        artist_id: item.artist_id ? Number(item.artist_id) : undefined,
        school_id: item.school_id || undefined,
        period_age: item.period_age || undefined,
        provenance: item.provenance || undefined,
        artwork_subject: item.artwork_subject || undefined,
        signature_placement: item.signature_placement || undefined,
        medium: item.medium || undefined,
        include_artist_description: item.include_artist_description,
        include_artist_key_description: item.include_artist_key_description,
        include_artist_biography: item.include_artist_biography,
        include_artist_notable_works: item.include_artist_notable_works,
        include_artist_major_exhibitions: item.include_artist_major_exhibitions,
        include_artist_awards_honors: item.include_artist_awards_honors,
        include_artist_market_value_range: item.include_artist_market_value_range,
        include_artist_signature_style: item.include_artist_signature_style,
        condition_report: item.condition_report || undefined,
        gallery_certification: item.gallery_certification,
        gallery_id: item.gallery_id || undefined,
        artist_certification: item.artist_certification,
        certified_artist_id: item.certified_artist_id || undefined,
        artist_family_certification: item.artist_family_certification,
        restoration_done: item.restoration_done,
        restoration_by: item.restoration_by || undefined,
        images: Object.keys(pendingImages).length > 0 ? await serializeImages(pendingImages) : []
      }

      const payload = {
        client_id: clientId || undefined,
        client_info: clientId ? undefined : clientInfo,
        items: [payloadItem],
      }
      const resp = await submitPublicInventory(payload)
      setMessage(`Submitted successfully. Reference: ${resp.submission_token}`)
      setItem(initialItemData)
      setPendingImages({})
      setPendingCertificationFiles({})
    } catch (e: any) {
      setError(e.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📝' },
    { id: 'details', label: 'Details', icon: '🔍' },
    { id: 'images', label: 'Images', icon: '🖼️' },
    { id: 'preview', label: 'Preview', icon: '👁️' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto bg-white border rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventory Submission</h1>
              <p className="text-gray-600">Submit artworks for review. We'll contact you after approval.</p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </button>
          </div>

          {/* Client Information */}
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

          {/* Error and Message Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800">{error}</div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800">{message}</div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <h3 className="text-red-800 font-medium mb-2">Please fix the following errors:</h3>
              <ul className="list-disc list-inside text-red-600 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab.id
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <form className="p-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
        <div className="space-y-6">
              {/* Artist/School Selection */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-900 mb-4">Artist/School & Medium Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Artist
                    </label>
                    <SearchableSelect
                      value={item.artist_id}
                      options={artists.length > 0 ? createArtistOptions() : []}
                      placeholder={loadingArtistsSchools ? "Loading artists..." : "Select artist..."}
                      onChange={(value) => {
                        console.log('Artist selected:', value, 'Current value:', item.artist_id)
                        const artistId = value?.toString() || ''
                        console.log('Setting artist_id to:', artistId)
                        handleInputChange('artist_id', artistId)
                        // Clear school selection when artist is selected
                        if (artistId) {
                          handleInputChange('school_id', '')
                        }
                      }}
                      disabled={loadingArtistsSchools || artists.length === 0}
                      inputPlaceholder="Search artists..."
                    />
                    {loadingArtistsSchools && (
                      <p className="text-xs text-gray-500 mt-1">Loading artists...</p>
                    )}
                    {item.artist_id && (
                      <p className="text-xs text-green-600 mt-1">
                        Selected: {(() => {
                          const artist = artists.find(a => a.id?.toString() === item.artist_id)
                          return artist ? artist.name : `ID: ${item.artist_id} (not found)`
                        })()}
                      </p>
                )}
              </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      School (if no specific artist)
                    </label>
                    <SearchableSelect
                      value={item.school_id}
                      options={schools.length > 0 ? createSchoolOptions() : []}
                      placeholder={loadingArtistsSchools ? "Loading schools..." : "Select school..."}
                      onChange={(value) => {
                        const schoolId = value?.toString() || ''
                        handleInputChange('school_id', schoolId)
                        // Clear artist selection when school is selected
                        if (schoolId) {
                          handleInputChange('artist_id', '')
                        }
                      }}
                      disabled={loadingArtistsSchools || schools.length === 0}
                      inputPlaceholder="Search schools..."
                    />
                    {loadingArtistsSchools && (
                      <p className="text-xs text-gray-500 mt-1">Loading schools...</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medium/Materials
                    </label>
                    <SearchableSelect
                      value={item.medium}
                      options={[{ value: '', label: 'Select material...' }, ...materialOptions]}
                      placeholder="Select material..."
                      onChange={(value) => handleInputChange('medium', value?.toString() || '')}
                      className="w-full"
                      inputPlaceholder="Type to search materials..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Artwork Subject
                    </label>
                    <input
                      type="text"
                      value={item.artwork_subject}
                      onChange={(e) => handleInputChange('artwork_subject', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., Portrait, Landscape, Abstract composition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Signature Placement
                    </label>
                    <input
                      type="text"
                      value={item.signature_placement}
                      onChange={(e) => handleInputChange('signature_placement', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., Lower right, Verso, Not visible"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Period/Age
                    </label>
                    <SearchableSelect
                      value={item.period_age}
                      options={[{ value: '', label: 'Select period...' }, ...periodOptions]}
                      placeholder="Select period..."
                      onChange={(value) => handleInputChange('period_age', value?.toString() || '')}
                      className="w-full"
                      inputPlaceholder="Type to search periods..."
                    />
                  </div>
                </div>

                {item.artist_id && item.school_id && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                    <p className="text-yellow-800 text-sm">
                      ⚠️ Both artist and school are selected. Only one will be saved.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title * <span className="text-xs text-gray-500">(max 200 chars for LiveAuctioneers)</span>
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={item.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  {item.title.length}/200 characters
                </div>
              </div>

              {/* Description Section with AI and Artist Info Options */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-purple-900 mb-4">Artwork Description & Export Options</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Artwork Description *
                  </label>
                  <textarea
                    rows={4}
                    value={item.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                    placeholder="Enter detailed description of the artwork..."
                  />
                </div>

                {/* Artist Information Options for Export */}
                {item.artist_id && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Include Artist Information in Export Description:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="include_artist_description"
                          checked={item.include_artist_description}
                          onChange={(e) => handleInputChange('include_artist_description', e.target.checked)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label htmlFor="include_artist_description" className="text-sm text-gray-700">
                          Include Artist Description <span className="text-xs text-green-600">(default on)</span>
                        </label>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="include_artist_key_description"
                          checked={item.include_artist_key_description}
                          onChange={(e) => handleInputChange('include_artist_key_description', e.target.checked)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label htmlFor="include_artist_key_description" className="text-sm text-gray-700">
                          Include Artist Key Description <span className="text-xs text-green-600">(default on)</span>
                        </label>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="include_artist_biography"
                          checked={item.include_artist_biography}
                          onChange={(e) => handleInputChange('include_artist_biography', e.target.checked)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label htmlFor="include_artist_biography" className="text-sm text-gray-700">
                          Include Biography
                        </label>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="include_artist_notable_works"
                          checked={item.include_artist_notable_works}
                          onChange={(e) => handleInputChange('include_artist_notable_works', e.target.checked)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label htmlFor="include_artist_notable_works" className="text-sm text-gray-700">
                          Include Notable Works
                        </label>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="include_artist_major_exhibitions"
                          checked={item.include_artist_major_exhibitions}
                          onChange={(e) => handleInputChange('include_artist_major_exhibitions', e.target.checked)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label htmlFor="include_artist_major_exhibitions" className="text-sm text-gray-700">
                          Include Major Exhibitions
                        </label>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="include_artist_awards_honors"
                          checked={item.include_artist_awards_honors}
                          onChange={(e) => handleInputChange('include_artist_awards_honors', e.target.checked)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label htmlFor="include_artist_awards_honors" className="text-sm text-gray-700">
                          Include Awards and Honors
                        </label>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="include_artist_market_value_range"
                          checked={item.include_artist_market_value_range}
                          onChange={(e) => handleInputChange('include_artist_market_value_range', e.target.checked)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label htmlFor="include_artist_market_value_range" className="text-sm text-gray-700">
                          Include Market Value Range
                        </label>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="include_artist_signature_style"
                          checked={item.include_artist_signature_style}
                          onChange={(e) => handleInputChange('include_artist_signature_style', e.target.checked)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label htmlFor="include_artist_signature_style" className="text-sm text-gray-700">
                          Include Signature Style
                        </label>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-purple-600">
                      ℹ️ These options control what artist information appears in the exported description for auction platforms and CSV exports.
                    </div>
                  </div>
                )}
              </div>

              {/* New Certification Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Condition Report
                </label>
                <textarea
                  rows={3}
                  value={item.condition_report}
                  onChange={(e) => handleInputChange('condition_report', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Detailed condition report..."
                />
              </div>

              <div className="space-y-4">
                {/* Gallery Certification */}
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <input
                      type="checkbox"
                      id="gallery_certification"
                      checked={item.gallery_certification}
                      onChange={(e) => handleInputChange('gallery_certification', e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="gallery_certification" className="text-sm font-medium text-gray-700">
                      Gallery Certification
                    </label>
                  </div>
                  {item.gallery_certification && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Which Gallery?</label>
                        <input
                          type="text"
                          value={item.gallery_id}
                          onChange={(e) => handleInputChange('gallery_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="Gallery name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Certification Document (optional)</label>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleCertificationFileUpload('gallery_certification_file', file)
                            }
                          }}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {item.gallery_certification_file && (
                          <div className="mt-2 text-xs text-green-600">
                            ✓ File uploaded
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Artist Certification */}
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <input
                      type="checkbox"
                      id="artist_certification"
                      checked={item.artist_certification}
                      onChange={(e) => handleInputChange('artist_certification', e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="artist_certification" className="text-sm font-medium text-gray-700">
                      Artist Certification
                    </label>
                  </div>
                  {item.artist_certification && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Which Artist?</label>
                        <input
                          type="text"
                          value={item.certified_artist_id}
                          onChange={(e) => handleInputChange('certified_artist_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="Artist name for certification"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Certification Document (optional)</label>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleCertificationFileUpload('artist_certification_file', file)
                            }
                          }}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {item.artist_certification_file && (
                          <div className="mt-2 text-xs text-green-600">
                            ✓ File uploaded
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Artist Family Certification */}
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <input
                      type="checkbox"
                      id="artist_family_certification"
                      checked={item.artist_family_certification}
                      onChange={(e) => handleInputChange('artist_family_certification', e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="artist_family_certification" className="text-sm font-medium text-gray-700">
                      Artist Family Certification
                    </label>
                  </div>
                  {item.artist_family_certification && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Certification Document (optional)</label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleCertificationFileUpload('artist_family_certification_file', file)
                          }
                        }}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {item.artist_family_certification_file && (
                        <div className="mt-2 text-xs text-green-600">
                          ✓ File uploaded
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Restoration */}
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <input
                      type="checkbox"
                      id="restoration_done"
                      checked={item.restoration_done}
                      onChange={(e) => handleInputChange('restoration_done', e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="restoration_done" className="text-sm font-medium text-gray-700">
                      Restoration Done
                    </label>
                  </div>
                  {item.restoration_done && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Done by (Person/Company)</label>
                        <input
                          type="text"
                          value={item.restoration_by}
                          onChange={(e) => handleInputChange('restoration_by', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="Name of person or company who did the restoration"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Restoration Documentation (optional)</label>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleCertificationFileUpload('restoration_done_file', file)
                            }
                          }}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {item.restoration_done_file && (
                          <div className="mt-2 text-xs text-green-600">
                            ✓ File uploaded
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Pricing Information Section */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-900 mb-4">Pricing Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Low Estimate * (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.low_est}
                      onChange={(e) => handleInputChange('low_est', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      High Estimate * (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.high_est}
                      onChange={(e) => handleInputChange('high_est', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Price (£) <span className="text-xs text-gray-500">(auto-calculated)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.start_price}
                      onChange={(e) => handleInputChange('start_price', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reserve Price (£) <span className="text-xs text-gray-500">(internal use)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.reserve}
                      onChange={(e) => handleInputChange('reserve', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Category Information Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-4">Category Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <SearchableSelect
                      value={item.category}
                      options={[{ value: '', label: 'Select category...' }, ...categoryOptions]}
                      placeholder="Select category..."
                      onChange={(value) => handleInputChange('category', value?.toString() || '')}
                      className="w-full"
                      inputPlaceholder="Type to search categories..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategory
                    </label>
                    <input
                      type="text"
                      value={item.subcategory}
                      onChange={(e) => handleInputChange('subcategory', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., Oil Paintings, Watercolors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condition
                    </label>
                    <SearchableSelect
                      value={item.condition}
                      options={[{ value: '', label: 'Select condition...' }, ...conditionOptions]}
                      placeholder="Select condition..."
                      onChange={(value) => handleInputChange('condition', value?.toString() || '')}
                      className="w-full"
                      inputPlaceholder="Type to search conditions..."
                    />
                  </div>
                </div>
              </div>

              {/* New Dimensions with inch/cm conversion */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dimensions
                  </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Inches</label>
                      <input
                        type="text"
                        value={item.height_inches}
                        onChange={(e) => {
                          handleInputChange('height_inches', e.target.value)
                          // Auto-convert to cm
                          if (e.target.value) {
                            const cmValue = convertInchesToCm(e.target.value)
                            if (cmValue) {
                              handleInputChange('height_cm', cmValue)
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder='e.g., 24"'
                      />
                </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Centimeters</label>
                      <input
                        type="text"
                        value={item.height_cm}
                        onChange={(e) => {
                          handleInputChange('height_cm', e.target.value)
                          // Auto-convert to inches
                          if (e.target.value) {
                            const inchValue = convertCmToInches(e.target.value)
                            if (inchValue) {
                              handleInputChange('height_inches', inchValue)
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g., 61 x 91 cm"
                      />
                        </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Inches</label>
                      <input
                        type="text"
                        value={item.width_inches}
                        onChange={(e) => {
                          handleInputChange('width_inches', e.target.value)
                          // Auto-convert to cm
                          if (e.target.value) {
                            const cmValue = convertInchesToCm(e.target.value)
                            if (cmValue) {
                              handleInputChange('width_cm', cmValue)
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder='e.g., 36"'
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Centimeters</label>
                      <input
                        type="text"
                        value={item.width_cm}
                        onChange={(e) => {
                          handleInputChange('width_cm', e.target.value)
                          // Auto-convert to inches
                          if (e.target.value) {
                            const inchValue = convertCmToInches(e.target.value)
                            if (inchValue) {
                              handleInputChange('width_inches', inchValue)
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g., 91 cm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dimensions with Frame
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Inches</label>
                      <input
                        type="text"
                        value={item.height_with_frame_inches}
                        onChange={(e) => {
                          handleInputChange('height_with_frame_inches', e.target.value)
                          // Auto-convert to cm
                          if (e.target.value) {
                            const cmValue = convertInchesToCm(e.target.value)
                            if (cmValue) {
                              handleInputChange('height_with_frame_cm', cmValue)
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder='e.g., 26" x 38"'
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Centimeters</label>
                      <input
                        type="text"
                        value={item.height_with_frame_cm}
                        onChange={(e) => {
                          handleInputChange('height_with_frame_cm', e.target.value)
                          // Auto-convert to inches
                          if (e.target.value) {
                            const inchValue = convertCmToInches(e.target.value)
                            if (inchValue) {
                              handleInputChange('height_with_frame_inches', inchValue)
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g., 66 x 97 cm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width with Frame
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Inches</label>
                      <input
                        type="text"
                        value={item.width_with_frame_inches}
                        onChange={(e) => {
                          handleInputChange('width_with_frame_inches', e.target.value)
                          // Auto-convert to cm
                          if (e.target.value) {
                            const cmValue = convertInchesToCm(e.target.value)
                            if (cmValue) {
                              handleInputChange('width_with_frame_cm', cmValue)
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder='e.g., 38"'
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Centimeters</label>
                      <input
                        type="text"
                        value={item.width_with_frame_cm}
                        onChange={(e) => {
                          handleInputChange('width_with_frame_cm', e.target.value)
                          // Auto-convert to inches
                          if (e.target.value) {
                            const inchValue = convertCmToInches(e.target.value)
                            if (inchValue) {
                              handleInputChange('width_with_frame_inches', inchValue)
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g., 97 cm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight
                  </label>
                  <input
                    type="text"
                    value={item.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g., 2.5kg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provenance
                </label>
                <textarea
                  rows={3}
                  value={item.provenance}
                  onChange={(e) => handleInputChange('provenance', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="History and ownership details"
                />
              </div>
                    </div>
                  )}

          {/* Images Tab */}
          {activeTab === 'images' && (
            <div className="space-y-6">
              <div className="text-sm text-gray-600 mb-4">
                Upload up to 10 images for this item. Images will be stored securely and optimized for auction platforms.
                </div>

              {/* Multiple File Upload */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-900">Bulk Upload</h4>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    {getFilledSlotsCount()}/10 slots filled
                  </span>
              </div>
                <p className="text-sm text-blue-800 mb-3">
                  Select multiple files to automatically populate available image slots.
                </p>

                <div className="space-y-3">
                  {/* Initial Upload */}
                  <div>
                    <input
                      id="bulk-upload-input"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleMultipleImageUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
            </div>

                  {/* Add More Button */}
                  {getFilledSlotsCount() > 0 && getFilledSlotsCount() < 10 && (
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('bulk-upload-additional') as HTMLInputElement
                          if (input) input.click()
                        }}
                        className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors border border-blue-300"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add More Images ({10 - getFilledSlotsCount()} slots available)
                      </button>
                      <input
                        id="bulk-upload-additional"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleMultipleImageUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                <p className="text-xs text-blue-600 mt-2">
                  Maximum 10 files total. Supported formats: JPG, PNG, GIF (max 10MB each)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 10 }, (_, i) => (
                  <ImageUploadField
                    key={i}
                    label={`Image ${i + 1}`}
                    value={item.images[i] || ''}
                    onChange={(url, file) => handleImageChange(i, url, file)}
                    itemId={undefined}
                    imageIndex={i + 1}
                    required={i === 0} // First image is required
                  />
          ))}
        </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Image Requirements</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Supported formats: JPG, PNG, GIF</li>
                  <li>• Maximum file size: 10MB per image</li>
                  <li>• Recommended minimum resolution: 800x600 pixels</li>
                  <li>• First image will be used as the primary listing image</li>
                  <li>• Images are automatically stored in secure cloud storage</li>
                </ul>
              </div>
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Export Preview</h3>
                <p className="text-sm text-gray-600 mb-6">
                  This is how your artwork information will appear when exported to auction platforms.
                </p>

                {/* Description Preview */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Description Preview:</h4>
                  <div
                    className="bg-white border border-gray-200 rounded-md p-4"
                    key={`${item.include_artist_description}-${item.include_artist_key_description}-${item.include_artist_biography}-${item.include_artist_notable_works}-${item.include_artist_major_exhibitions}-${item.include_artist_awards_honors}-${item.include_artist_market_value_range}-${item.include_artist_signature_style}`}
                  >
                    <div
                      className="text-gray-900 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: previewDescription || 'Enter artwork description...'
                      }}
                    />
                  </div>
                </div>

                {/* Export Information */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Export Information:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Description includes selected artist information</li>
                    <li>• Dimensions will be formatted appropriately for each platform</li>
                    {item.artist_id && (
                      <li>• Artist: {(() => {
                        const artist = artists.find(a => a.id?.toString() === item.artist_id)
                        return artist ? artist.name : `ID: ${item.artist_id}`
                      })()}</li>
                    )}
                  </ul>
                </div>

                {/* Live Preview Updates */}
                <div className="mt-4 text-xs text-gray-500">
                  📝 Preview updates automatically as you edit fields in other tabs.
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Submit Button */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
