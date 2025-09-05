// frontend/src/components/items/ItemForm.tsx
"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Save, X, Upload, Trash2, Plus } from 'lucide-react'
import { Artwork, ArtworksAPI, validateArtworkData, generateStartPrice, generateReservePriceForAI, ITEM_CATEGORIES, ITEM_PERIODS, ITEM_MATERIALS, ITEM_CONDITIONS } from '@/lib/items-api'
import { ArtistsAPI, Artist } from '@/lib/artists-api'
import { SchoolsAPI, School } from '@/lib/schools-api'
import { getAuctions, Auction } from '@/lib/auctions-api'
import { fetchClients, Client, getClientDisplayName, formatClientDisplay } from '@/lib/clients-api'
import { getConsignments, type Consignment } from '@/lib/consignments-api'
import { GalleriesAPI, Gallery } from '@/lib/galleries-api'
import { getBrands, Brand } from '@/lib/brands-api'
import { useBrand } from '@/lib/brand-context'
import ImageUploadField from './ImageUploadField'
import SearchableSelect, { SearchableOption } from '@/components/ui/SearchableSelect'
import { createClient } from '@/lib/supabase/client'

interface ItemFormProps {
  itemId?: string
  initialData?: Partial<Artwork>
  mode: 'create' | 'edit'
  onSave?: (artwork: Artwork) => void
  onCancel?: () => void
}

interface FormData {
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
  vendor_id: string
  buyer_id: string

  // Consignment field
  consignment_id: string

  // Additional auction management fields
  status: 'draft' | 'active' | 'sold' | 'withdrawn' | 'passed'
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

  // Brand field
  brand_id: string

  // Image fields
  image_file_1: string
  image_file_2: string
  image_file_3: string
  image_file_4: string
  image_file_5: string
  image_file_6: string
  image_file_7: string
  image_file_8: string
  image_file_9: string
  image_file_10: string
}

const initialFormData: FormData = {
  title: '',
  description: '',
  low_est: '',
  high_est: '',
  start_price: '',
  condition: '',
  reserve: '',
  vendor_id: '',
  buyer_id: '',
  consignment_id: '',
  status: 'draft',
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
  brand_id: '',
  image_file_1: '',
  image_file_2: '',
  image_file_3: '',
  image_file_4: '',
  image_file_5: '',
  image_file_6: '',
  image_file_7: '',
  image_file_8: '',
  image_file_9: '',
  image_file_10: ''
}

type ImageFieldKey =
  | 'image_file_1'
  | 'image_file_2'
  | 'image_file_3'
  | 'image_file_4'
  | 'image_file_5'
  | 'image_file_6'
  | 'image_file_7'
  | 'image_file_8'
  | 'image_file_9'
  | 'image_file_10';

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

const statuses = [
  { value: 'draft', label: 'Draft', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'sold', label: 'Sold', color: 'bg-blue-100 text-blue-800' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'bg-red-100 text-red-800' },
  { value: 'passed', label: 'Passed', color: 'bg-gray-100 text-gray-800' }
]

export default function ItemForm({ itemId, initialData, mode, onSave, onCancel }: ItemFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { brand } = useBrand()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('basic')
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [consignments, setConsignments] = useState<Consignment[]>([])
  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loadingArtistsSchools, setLoadingArtistsSchools] = useState(false)
  const [loadingAuctions, setLoadingAuctions] = useState(false)

  // Get brand ID from brand code
  const getBrandId = (brandCode: string): number | undefined => {
    const foundBrand = brands.find(b => b.code === brandCode)
    return foundBrand?.id
  }
  const [loadingClients, setLoadingClients] = useState(false)
  const [loadingConsignments, setLoadingConsignments] = useState(false)
  const [loadingGalleries, setLoadingGalleries] = useState(false)
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [pendingImages, setPendingImages] = useState<Record<string, File>>({})
  const [pendingCertificationFiles, setPendingCertificationFiles] = useState<Record<string, File>>({})

  // Load artists, schools, auctions, clients and consignments data
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoadingArtistsSchools(true)
        setLoadingAuctions(true)
        setLoadingClients(true)
        setLoadingConsignments(true)
        setLoadingGalleries(true)
        setLoadingBrands(true)

        const [artistsResponse, schoolsResponse, auctionsResponse, clientsResponse, consignmentsResponse, galleriesResponse, brandsResponse] = await Promise.all([
          ArtistsAPI.getArtists({ status: 'active', limit: 1000 }),
          SchoolsAPI.getSchools({ status: 'active', limit: 1000 }),
          getAuctions({
            brand_id: getBrandId(brand) || getBrandId('MSABER'),
            limit: 1000,
            sort_field: 'created_at',
            sort_direction: 'desc'
          }),
          fetchClients({
            status: 'active',
            limit: 1000,
            brand_code: brand || 'MSABER'
          }),
          getConsignments({
            status: 'active',
            limit: 1000
          }),
          GalleriesAPI.getGalleries({
            status: 'active',
            limit: 1000
          }),
          getBrands()
        ])

        if (artistsResponse.success) {
          setArtists(artistsResponse.data)
        }
        if (schoolsResponse.success) {
          setSchools(schoolsResponse.data)
        }
        if (auctionsResponse.auctions) {
          setAuctions(auctionsResponse.auctions)
        }
        if (clientsResponse.success) {
          setClients(clientsResponse.data)
        }
        if (consignmentsResponse.success) {
          setConsignments(consignmentsResponse.data)
        }
        if (galleriesResponse.success) {
          setGalleries(galleriesResponse.data)
        }
        if (brandsResponse.success) {
          setBrands(brandsResponse.data)
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoadingArtistsSchools(false)
        setLoadingAuctions(false)
        setLoadingClients(false)
        setLoadingConsignments(false)
        setLoadingGalleries(false)
        setLoadingBrands(false)
      }
    }

    loadAllData()
  }, [brand])



  // Debug effect to track artist selection and client loading
  useEffect(() => {
    console.log('Debug - Artists loaded:', artists.length, artists.map(a => ({ id: a.id, name: a.name })))
    console.log('Debug - Current artist_id:', formData.artist_id)
    console.log('Debug - Artist options:', createArtistOptions())
    const currentArtist = artists.find(a => a.id?.toString() === formData.artist_id)
    console.log('Debug - Found current artist:', currentArtist)
  }, [artists, formData.artist_id])

  // Debug effect to track client loading
  useEffect(() => {
    console.log('Debug - Clients loaded:', clients.length, clients.map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}`, type: c.client_type })))
    console.log('Debug - Consigner options:', createConsignerOptions())
    console.log('Debug - Loading clients:', loadingClients)
  }, [clients, loadingClients])

  // Helper function to generate auto title format
  // Format: ArtistFullName | (Birth-Death) | ArtworkSubject/Untitled | Medium (Materials) | Signature placement | Period
  const generateAutoTitle = (data?: FormData): string => {
    const currentData = data || formData
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
    const currentTitle = formData.title || generateAutoTitle() || 'Untitled Artwork'
    parts.push(currentTitle)

    // Artwork description (double line break after title)
    if (formData.description?.trim()) {
      parts.push(formData.description.trim())
    }

    // Artist info (if checkboxes are selected)
    if (formData.artist_id) {
      const artist = artists.find(a => a.id?.toString() === formData.artist_id)
      if (artist) {
        const artistParts: string[] = []

        if (formData.include_artist_description && artist.description) {
          artistParts.push(artist.description)
        }

        if (formData.include_artist_key_description && artist.key_description) {
          artistParts.push(artist.key_description)
        }

        if (formData.include_artist_biography && artist.biography) {
          artistParts.push(artist.biography)
        }

        if (formData.include_artist_notable_works && artist.notable_works) {
          artistParts.push(`Notable Works: ${artist.notable_works}`)
        }

        if (formData.include_artist_major_exhibitions && artist.exhibitions) {
          artistParts.push(`Major Exhibitions: ${artist.exhibitions}`)
        }

        if (formData.include_artist_awards_honors && artist.awards) {
          artistParts.push(`Awards and Honors: ${artist.awards}`)
        }

        if (formData.include_artist_market_value_range && artist.market_value_range) {
          artistParts.push(`Market Value Range: ${artist.market_value_range}`)
        }

        if (formData.include_artist_signature_style && artist.signature_style) {
          artistParts.push(`Signature Style: ${artist.signature_style}`)
        }

        if (artistParts.length > 0) {
          // Join artist parts with line breaks for better readability
          parts.push(artistParts.join('<br>'))
        }
      }
    }

    // Dimensions (single line break before dimensions)
    if (formData.height_inches || formData.width_inches || formData.height_cm || formData.width_cm) {
      let dimensionText = 'Dimensions: '
      if (formData.height_inches && formData.width_inches) {
        dimensionText += `${formData.height_inches} × ${formData.width_inches} inches`
        if (formData.height_cm && formData.width_cm) {
          dimensionText += ` (${formData.height_cm} × ${formData.width_cm} cm)`
        }
      } else if (formData.height_cm && formData.width_cm) {
        dimensionText += `${formData.height_cm} × ${formData.width_cm} cm`
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
    formData.title,
    formData.description,
    formData.artist_id,
    formData.include_artist_description,
    formData.include_artist_key_description,
    formData.include_artist_biography,
    formData.include_artist_notable_works,
    formData.include_artist_major_exhibitions,
    formData.include_artist_awards_honors,
    formData.include_artist_market_value_range,
    formData.include_artist_signature_style,
    formData.height_inches,
    formData.width_inches,
    formData.height_cm,
    formData.width_cm,
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

  // Helper function to create client options for SearchableSelect
  const createClientOptions = (): SearchableOption[] => {
    return clients
      .filter(client => client.id) // Ensure id exists
      .map(client => ({
        value: client.id!.toString(),
        label: getClientDisplayName(client),
        description: `${formatClientDisplay(client)} - ${client.client_type || 'buyer'}`
      }))
  }

  // Helper function to create consigner client options (vendors only)
  const createConsignerOptions = (): SearchableOption[] => {
    return clients
      .filter(client =>
        client.id &&
        (client.client_type === 'buyer' || client.client_type === 'vendor' || client.client_type === 'buyer_vendor')
      )
      .map(client => ({
        value: client.id!.toString(),
        label: getClientDisplayName(client),
        description: `${formatClientDisplay(client)} - Vendor`
      }))
  }

  // Helper function to create vendor client options (vendors only)
  const createVendorOptions = (): SearchableOption[] => {
    return clients
      .filter(client =>
        client.id &&
        (client.client_type === 'vendor' || client.client_type === 'buyer' || client.client_type === 'buyer_vendor')
      )
      .map(client => ({
        value: client.id!.toString(),
        label: getClientDisplayName(client),
        description: `${formatClientDisplay(client)} - Vendor`
      }))
  }

  const createBuyerOptions = (): SearchableOption[] => {
    return clients
      .filter(client =>
        client.id &&
        (client.client_type === 'buyer' || client.client_type === 'buyer_vendor')
      )
      .map(client => ({
        value: client.id!.toString(),
        label: getClientDisplayName(client),
        description: `${formatClientDisplay(client)} - Buyer`
      }))
  }

  // Helper function to create consignment options for SearchableSelect
  const createConsignmentOptions = (): SearchableOption[] => {
    return consignments
      .filter(consignment => consignment.id) // Ensure id exists
      .map(consignment => ({
        value: consignment.id!.toString(),
        label: `Consignment ${consignment.id}`,
        description: `Client: ${consignment.client_name || 'Unknown'} - ${consignment.status || 'No status'} - ${consignment.items_count || 0} items`
      }))
  }

  // Helper function to create brand options for SearchableSelect
  const createBrandOptions = (): SearchableOption[] => {
    return brands
      .filter(brand => brand.id) // Ensure id exists
      .map(brand => ({
        value: brand.id!.toString(),
        label: brand.name,
        description: `${brand.code} - ${brand.contact_email || 'No email'}`
      }))
  }

  // Load item data if editing or handle AI data
  useEffect(() => {
    if (mode === 'edit' && itemId) {
      loadItemData()
    } else if (initialData) {
      populateFormData(initialData)
    } else if (mode === 'create') {
      // Check for AI data in URL parameters
      const aiDataParam = searchParams.get('ai_data')
      if (aiDataParam) {
        try {
          const aiData = JSON.parse(decodeURIComponent(aiDataParam))
          populateAIData(aiData)
        } catch (error) {
          console.error('Failed to parse AI data:', error)
        }
      }
    }
  }, [itemId, mode, initialData, searchParams])

  const loadItemData = async () => {
    if (!itemId) return

    try {
      setLoading(true)
      const response = await ArtworksAPI.getArtwork(itemId)
      if (response.success) {
        populateFormData(response.data)
      } else {
        setError('Failed to load item data')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load item data')
    } finally {
      setLoading(false)
    }
  }



  const populateFormData = (data: Partial<Artwork>) => {
    // Auto-generate start_price and reserve if low_est exists but they're missing
    let startPrice = data.start_price?.toString() || ''
    let reservePrice = data.reserve?.toString() || ''

    if (data.low_est && !data.start_price) {
      const lowEst = data.low_est
      startPrice = generateStartPrice(lowEst).toString()
    }

    if ((data.low_est || data.start_price) && !data.reserve) {
      if (data.start_price) {
        reservePrice = data.start_price.toString()
      } else if (data.low_est) {
        const startPriceNum = generateStartPrice(data.low_est)
        reservePrice = startPriceNum.toString()
      }
    }

    setFormData({
      title: data.title || '',
      description: data.description || '',
      low_est: data.low_est?.toString() || '',
      high_est: data.high_est?.toString() || '',
      start_price: startPrice,
      condition: data.condition || '',
      reserve: reservePrice,
      vendor_id: (data as any).vendor_id?.toString() || '',
      buyer_id: (data as any).buyer_id?.toString() || '',
      consignment_id: data.consignment_id?.toString() || '',
      status: data.status || 'draft',
      category: data.category || '',
      subcategory: data.subcategory || '',
      height_inches: data.height_inches || '',
      width_inches: data.width_inches || '',
      height_cm: data.height_cm || '',
      width_cm: data.width_cm || '',
      height_with_frame_inches: data.height_with_frame_inches || '',
      width_with_frame_inches: data.width_with_frame_inches || '',
      height_with_frame_cm: data.height_with_frame_cm || '',
      width_with_frame_cm: data.width_with_frame_cm || '',
      weight: data.weight || '',
      materials: data.materials || '',
      artist_id: data.artist_id?.toString() || '',
      school_id: data.school_id || '',
      period_age: data.period_age || '',
      provenance: data.provenance || '',
      artwork_subject: (data as any).artwork_subject || '',
      signature_placement: (data as any).signature_placement || '',
      medium: (data as any).medium || '',
      include_artist_description: (data as any).include_artist_description !== undefined ? Boolean((data as any).include_artist_description) : true,
      include_artist_key_description: (data as any).include_artist_key_description !== undefined ? Boolean((data as any).include_artist_key_description) : true,
      include_artist_biography: Boolean((data as any).include_artist_biography) || false,
      include_artist_notable_works: Boolean((data as any).include_artist_notable_works) || false,
      include_artist_major_exhibitions: Boolean((data as any).include_artist_major_exhibitions) || false,
      include_artist_awards_honors: Boolean((data as any).include_artist_awards_honors) || false,
      include_artist_market_value_range: Boolean((data as any).include_artist_market_value_range) || false,
      include_artist_signature_style: Boolean((data as any).include_artist_signature_style) || false,
      condition_report: (data as any).condition_report || '',
      gallery_certification: (data as any).gallery_certification || false,
      gallery_certification_file: (data as any).gallery_certification_file || '',
      gallery_id: (data as any).gallery_id || '',
      artist_certification: (data as any).artist_certification || false,
      artist_certification_file: (data as any).artist_certification_file || '',
      certified_artist_id: (data as any).certified_artist_id || '',
      artist_family_certification: (data as any).artist_family_certification || false,
      artist_family_certification_file: (data as any).artist_family_certification_file || '',
      restoration_done: (data as any).restoration_done || false,
      restoration_done_file: (data as any).restoration_done_file || '',
      restoration_by: (data as any).restoration_by || '',
      brand_id: (data as any).brand_id?.toString() || '',
      image_file_1: data.image_file_1 || '',
      image_file_2: data.image_file_2 || '',
      image_file_3: data.image_file_3 || '',
      image_file_4: data.image_file_4 || '',
      image_file_5: data.image_file_5 || '',
      image_file_6: data.image_file_6 || '',
      image_file_7: data.image_file_7 || '',
      image_file_8: data.image_file_8 || '',
      image_file_9: data.image_file_9 || '',
      image_file_10: data.image_file_10 || ''
    })
  }

  const populateAIData = (aiData: any) => {
    // Calculate start price and reserve price (reserve = start price for AI data)
    const startPrice = aiData.low_est ? generateStartPrice(aiData.low_est) : 0
    const reservePrice = startPrice ? generateReservePriceForAI(startPrice).toString() : ''

    setFormData({
      title: aiData.title || '',
      description: aiData.description || '',
      low_est: aiData.low_est?.toString() || '',
      high_est: aiData.high_est?.toString() || '',
      start_price: startPrice.toString(), // Auto-calculated from low_est
      condition: aiData.condition || '',
      reserve: reservePrice, // Set reserve price equal to start price
      vendor_id: '',
      buyer_id: '',
      consignment_id: '',
      status: 'draft',
      category: aiData.category || '',
      subcategory: '',
      height_inches: aiData.height_inches || '',
      width_inches: aiData.width_inches || '',
      height_cm: aiData.height_cm || '',
      width_cm: aiData.width_cm || '',
      height_with_frame_inches: aiData.height_with_frame_inches || '',
      width_with_frame_inches: aiData.width_with_frame_inches || '',
      height_with_frame_cm: aiData.height_with_frame_cm || '',
      width_with_frame_cm: aiData.width_with_frame_cm || '',
      weight: aiData.weight || '',
      materials: aiData.materials || '',
      artist_id: aiData.artist_id || '',
      school_id: '',
      period_age: aiData.period_age || '',
      provenance: '',
      artwork_subject: aiData.artwork_subject || '',
      signature_placement: aiData.signature_placement || '',
      medium: aiData.materials || '', // Use materials as medium initially
      include_artist_description: aiData.include_artist_description !== undefined ? aiData.include_artist_description : true,
      include_artist_key_description: aiData.include_artist_key_description !== undefined ? aiData.include_artist_key_description : true,
      include_artist_biography: aiData.include_artist_biography || false,
      include_artist_notable_works: aiData.include_artist_notable_works || false,
      include_artist_major_exhibitions: aiData.include_artist_major_exhibitions || false,
      include_artist_awards_honors: aiData.include_artist_awards_honors || false,
      include_artist_market_value_range: aiData.include_artist_market_value_range || false,
      include_artist_signature_style: aiData.include_artist_signature_style || false,
      condition_report: aiData.condition_report || '',
      gallery_certification: aiData.gallery_certification || false,
      gallery_certification_file: aiData.gallery_certification_file || '',
      gallery_id: aiData.gallery_id || '',
      artist_certification: aiData.artist_certification || false,
      artist_certification_file: aiData.artist_certification_file || '',
      certified_artist_id: aiData.certified_artist_id || '',
      artist_family_certification: aiData.artist_family_certification || false,
      artist_family_certification_file: aiData.artist_family_certification_file || '',
      restoration_done: aiData.restoration_done || false,
      restoration_done_file: aiData.restoration_done_file || '',
      restoration_by: aiData.restoration_by || '',
      brand_id: aiData.brand_id || '',
      image_file_1: '',
      image_file_2: '',
      image_file_3: '',
      image_file_4: '',
      image_file_5: '',
      image_file_6: '',
      image_file_7: '',
      image_file_8: '',
      image_file_9: '',
      image_file_10: ''
    })

    // Auto-calculate start price if low estimate is available
    if (aiData.low_est) {
      const startPrice = generateStartPrice(aiData.low_est)
      setFormData(prev => ({ ...prev, start_price: startPrice.toString() }))
    }
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    // Update the form data first
    setFormData(prev => {
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
        setFormData(prev => ({
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
        setFormData(prev => ({ ...prev, reserve: reservePrice.toString() }))
      }
    }

    // Auto-generate title when related fields change
    if (['artist_id', 'artwork_subject', 'medium', 'signature_placement', 'period_age'].includes(field)) {
      // Use setTimeout to ensure the state update is processed first
      setTimeout(() => {
        setFormData(prev => {
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

  const handleImageChange = (field: ImageFieldKey, url: string, file?: File) => {
    console.log('handleImageChange', field, url, file)
    setFormData(prev => ({ ...prev, [field]: url }))

    if (file) {
      setPendingImages(prev => ({ ...prev, [field]: file }))
    } else {
      // Remove from pending if it's just a URL
      setPendingImages(prev => {
        const updated = { ...prev }
        delete updated[field]
        return updated
      })
    }

    // Clear validation errors
    setValidationErrors([])
  }

  const handleMultipleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    // Find next available slots
    const getNextAvailableSlots = (): number[] => {
      const availableSlots: number[] = []
      for (let i = 1; i <= 10; i++) {
        const fieldKey = `image_file_${i}` as ImageFieldKey
        if (!formData[fieldKey]) {
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
      const fieldKey = `image_file_${slotIndex}` as ImageFieldKey

      // Create blob URL for preview
      const blobUrl = URL.createObjectURL(file)

      // Update form data and pending images
      setFormData(prev => ({ ...prev, [fieldKey]: blobUrl }))
      setPendingImages(prev => ({ ...prev, [fieldKey]: file }))
    })

    // Clear the input
    event.target.value = ''

    // Clear validation errors
    setValidationErrors([])
  }

  const handleCertificationFileUpload = (certificationType: 'gallery_certification_file' | 'artist_certification_file' | 'artist_family_certification_file' | 'restoration_done_file', file: File) => {
    // Create preview URL for the file
    const previewUrl = URL.createObjectURL(file)
    
    // Update form data with preview URL
    setFormData(prev => ({
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
    let count = 0
    for (let i = 1; i <= 10; i++) {
      const fieldKey = `image_file_${i}` as ImageFieldKey
      if (formData[fieldKey]) {
        count++
      }
    }
    return count
  }


  const uploadPendingImages = async (tempItemId: string): Promise<Record<string, string>> => {
    const uploadedImages: Record<string, string> = {}

    if (Object.keys(pendingImages).length === 0) {
      return uploadedImages
    }

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('itemId', tempItemId)

      // Add existing images that aren't files
      const existingImages: Record<string, string> = {}
      const imageFields = Object.keys(formData).filter(key => key.startsWith('image_file_')) as ImageFieldKey[]
      imageFields.forEach(key => {
        if (formData[key] && !pendingImages[key] && !formData[key].startsWith('blob:')) {
          existingImages[key] = formData[key]
        }
      })
      uploadFormData.append('existingImages', JSON.stringify(existingImages))

      // Add pending image files
      Object.entries(pendingImages).forEach(([fieldName, file]) => {
        uploadFormData.append(fieldName, file)
      })

      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/images/process-item-images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: uploadFormData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`Failed to upload images: ${errorData.error || response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(`Upload failed: ${result.error || 'Unknown error'}`)
      }
      return result.images || {}
    } catch (error: any) {
      console.error('Image upload error:', error)
      throw new Error(`Image upload failed: ${error.message || 'Unknown error'}`)
    }
  }

  const uploadPendingCertificationFiles = async (tempItemId: string): Promise<Record<string, string>> => {
    const uploadedFiles: Record<string, string> = {}

    if (Object.keys(pendingCertificationFiles).length === 0) {
      return uploadedFiles
    }

    try {
      for (const [fieldKey, file] of Object.entries(pendingCertificationFiles)) {
        console.log(`Uploading certification file for ${fieldKey}...`)
        
        // Create a unique filename
        const fileExtension = file.name.split('.').pop() || 'pdf'
        const fileName = `certification_${tempItemId}_${fieldKey}_${Date.now()}.${fileExtension}`
        
        // Upload to Supabase Storage
        const supabase = createClient()
        const { data, error } = await supabase.storage
          .from('items')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (error) {
          console.error(`Error uploading ${fieldKey}:`, error)
          throw new Error(`Failed to upload ${fieldKey}: ${error.message}`)
        }

        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from('items')
          .getPublicUrl(fileName)

        uploadedFiles[fieldKey] = publicUrlData.publicUrl
        console.log(`Successfully uploaded ${fieldKey}: ${publicUrlData.publicUrl}`)
      }

      // Clear the pending files
      setPendingCertificationFiles({})
      
      return uploadedFiles
    } catch (error) {
      console.error('Error uploading certification files:', error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Convert form data to Artwork format
    const artworkData: Partial<Artwork> = {
      title: formData.title,
      description: formData.description,
      low_est: parseFloat(formData.low_est),
      high_est: parseFloat(formData.high_est),
      start_price: formData.start_price ? parseFloat(formData.start_price) : undefined,
      condition: formData.condition || undefined,
      reserve: formData.reserve ? parseFloat(formData.reserve) : undefined,
      vendor_id: formData.vendor_id ? parseInt(formData.vendor_id) : undefined,
      buyer_id: formData.buyer_id ? parseInt(formData.buyer_id) : undefined,
      status: formData.status,
      category: formData.category || undefined,
      subcategory: formData.subcategory || undefined,
      height_inches: formData.height_inches || undefined,
      width_inches: formData.width_inches || undefined,
      height_cm: formData.height_cm || undefined,
      width_cm: formData.width_cm || undefined,
      height_with_frame_inches: formData.height_with_frame_inches || undefined,
      width_with_frame_inches: formData.width_with_frame_inches || undefined,
      height_with_frame_cm: formData.height_with_frame_cm || undefined,
      width_with_frame_cm: formData.width_with_frame_cm || undefined,
      weight: formData.weight || undefined,
      materials: formData.materials || undefined,
      artist_id: formData.artist_id ? parseInt(formData.artist_id) : undefined,
      school_id: formData.school_id || undefined,
      period_age: formData.period_age || undefined,
      provenance: formData.provenance || undefined,
      consignment_id: formData.consignment_id ? parseInt(formData.consignment_id) : undefined,
      brand_id: formData.brand_id ? parseInt(formData.brand_id) : undefined,
      image_file_1: formData.image_file_1 || undefined,
      image_file_2: formData.image_file_2 || undefined,
      image_file_3: formData.image_file_3 || undefined,
      image_file_4: formData.image_file_4 || undefined,
      image_file_5: formData.image_file_5 || undefined,
      image_file_6: formData.image_file_6 || undefined,
      image_file_7: formData.image_file_7 || undefined,
      image_file_8: formData.image_file_8 || undefined,
      image_file_9: formData.image_file_9 || undefined,
      image_file_10: formData.image_file_10 || undefined
    }

    // Validate the data
    const errors = validateArtworkData(artworkData)
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    try {
      setSaving(true)
      setError(null)

      // Handle file uploads if there are pending files
      if (Object.keys(pendingImages).length > 0 || Object.keys(pendingCertificationFiles).length > 0) {
        const tempItemId = itemId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        try {
          const uploadedImageUrls = await uploadPendingImages(tempItemId)
          const uploadedCertificationFileUrls = await uploadPendingCertificationFiles(tempItemId)

          // Update artwork data with uploaded image URLs
          Object.entries(uploadedImageUrls).forEach(([fieldName, url]) => {
            if (fieldName.startsWith('image_file_')) {
              (artworkData as any)[fieldName] = url
            }
          })

          // Update artwork data with uploaded certification file URLs
          Object.entries(uploadedCertificationFileUrls).forEach(([fieldName, url]) => {
            (artworkData as any)[fieldName] = url
          })

          // Clear pending images
          setPendingImages({})

          // Clean up blob URLs
          Object.values(pendingImages).forEach(file => {
            const blobUrl = formData[Object.keys(pendingImages).find(key => pendingImages[key] === file) as ImageFieldKey]
            if (blobUrl && blobUrl.startsWith('blob:')) {
              URL.revokeObjectURL(blobUrl)
            }
          })

        } catch (uploadError: any) {
          setError(`Image upload failed: ${uploadError.message}`)
          return
        }
      }

      let savedArtwork
      if (mode === 'create') {
        const result = await ArtworksAPI.createArtwork(artworkData as Omit<Artwork, 'id' | 'created_at' | 'updated_at'>, brand)
        savedArtwork = result.data
      } else if (itemId) {
        const result = await ArtworksAPI.updateArtwork(itemId, artworkData, brand)
        savedArtwork = result.data
      }

      if (onSave && savedArtwork) {
        onSave(savedArtwork)
      } else {
        router.push('/items')
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${mode} item`)
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📝' },
    { id: 'details', label: 'Details', icon: '🔍' },
    { id: 'images', label: 'Images', icon: '🖼️' },
    { id: 'preview', label: 'Preview', icon: '👁️' }
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/items')}
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Items
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === 'create' ? 'Add Artwork' : 'Edit Artwork'}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => onCancel ? onCancel() : router.push('/items')}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            form="item-form"
            disabled={saving}
            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Item'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-medium mb-2">Please fix the following errors:</h3>
          <ul className="list-disc list-inside text-red-600 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Tabs">
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

        <form id="item-form" onSubmit={handleSubmit} className="p-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* Client & Consignment Selection Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-4">Client & Consignment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand
                    </label>
                    <SearchableSelect
                      value={formData.brand_id}
                      options={brands.length > 0 ? createBrandOptions() : []}
                      placeholder={loadingBrands ? "Loading brands..." : "Select brand..."}
                      onChange={(value) => handleInputChange('brand_id', value?.toString() || '')}
                      disabled={loadingBrands || brands.length === 0}
                      inputPlaceholder="Search brands..."
                    />
                    {loadingBrands && (
                      <p className="text-xs text-gray-500 mt-1">Loading brands...</p>
                    )}
                    {!loadingBrands && createBrandOptions().length === 0 && (
                      <p className="text-xs text-orange-500 mt-1">No brands found. Please create brands first.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Consignment (Optional)
                    </label>
                    <SearchableSelect
                      value={formData.consignment_id}
                      options={createConsignmentOptions()}
                      placeholder={loadingConsignments ? "Loading consignments..." : "Select consignment..."}
                      onChange={(value) => {
                        const consignmentId = value?.toString() || ''
                        handleInputChange('consignment_id', consignmentId)

                        // Auto-fill consigner if consignment is selected
                        if (consignmentId) {
                          const selectedConsignment = consignments.find(c => c.id?.toString() === consignmentId)
                          if (selectedConsignment?.client_id) {
                            handleInputChange('vendor_id', selectedConsignment.client_id.toString())
                          }
                        }
                      }}
                      disabled={loadingConsignments}
                      inputPlaceholder="Search consignments..."
                    />
                    {loadingConsignments && (
                      <p className="text-xs text-gray-500 mt-1">Loading consignments...</p>
                    )}
                    {!loadingConsignments && createConsignmentOptions().length === 0 && (
                      <p className="text-xs text-orange-500 mt-1">No consignments found. Create a consignment first.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vendor (Consignor) *
                    </label>
                    <SearchableSelect
                      value={formData.vendor_id}
                      options={clients.length > 0 ? createVendorOptions() : []}
                      placeholder={loadingClients ? "Loading vendors..." : "Select vendor..."}
                      onChange={(value) => handleInputChange('vendor_id', value?.toString() || '')}
                      disabled={loadingClients}
                      inputPlaceholder="Search vendors..."
                    />
                    {formData.consignment_id && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Vendor auto-filled from selected consignment
                      </p>
                    )}
                  </div>

                  {formData.status === 'sold' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Buyer *
                        <span className="text-xs text-gray-500"> (required if sold)</span>
                      </label>
                      <SearchableSelect
                        value={formData.buyer_id}
                        options={clients.length > 0 ? createBuyerOptions() : []}
                        placeholder={loadingClients ? "Loading buyers..." : "Select buyer..."}
                        onChange={(value) => handleInputChange('buyer_id', value?.toString() || '')}
                        disabled={loadingClients}
                        inputPlaceholder="Search buyers..."
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Artist/School Selection */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-900 mb-4">Artist/School & Medium Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Artist
                    </label>
                    <SearchableSelect
                      value={formData.artist_id}
                      options={artists.length > 0 ? createArtistOptions() : []}
                      placeholder={loadingArtistsSchools ? "Loading artists..." : "Select artist..."}
                      onChange={(value) => {
                        console.log('Artist selected:', value, 'Current value:', formData.artist_id)
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
                    {/* Debug display */}
                    {formData.artist_id && (
                      <p className="text-xs text-green-600 mt-1">
                        Selected: {(() => {
                          const artist = artists.find(a => a.id?.toString() === formData.artist_id)
                          return artist ? artist.name : `ID: ${formData.artist_id} (not found)`
                        })()}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      School (if no specific artist)
                    </label>
                    <SearchableSelect
                      value={formData.school_id}
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
                      value={formData.medium}
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
                      value={formData.artwork_subject}
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
                      value={formData.signature_placement}
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
                      value={formData.period_age}
                      options={[{ value: '', label: 'Select period...' }, ...periodOptions]}
                      placeholder="Select period..."
                      onChange={(value) => handleInputChange('period_age', value?.toString() || '')}
                      className="w-full"
                      inputPlaceholder="Type to search periods..."
                    />
                  </div>
                </div>

                {formData.artist_id && formData.school_id && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                    <p className="text-yellow-800 text-sm">
                      ⚠️ Both artist and school are selected. Only one will be saved.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">




                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {statuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>


              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title * <span className="text-xs text-gray-500">(max 200 chars for LiveAuctioneers)</span>
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.title.length}/200 characters
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
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                    placeholder="Enter detailed description of the artwork..."
                  />
                </div>

                {/* Artist Information Options for Export */}
                {formData.artist_id && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Include Artist Information in Export Description:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="include_artist_description"
                          checked={formData.include_artist_description}
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
                          checked={formData.include_artist_key_description}
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
                          checked={formData.include_artist_biography}
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
                          checked={formData.include_artist_notable_works}
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
                          checked={formData.include_artist_major_exhibitions}
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
                          checked={formData.include_artist_awards_honors}
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
                          checked={formData.include_artist_market_value_range}
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
                          checked={formData.include_artist_signature_style}
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
                  value={formData.condition_report}
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
                      checked={formData.gallery_certification}
                      onChange={(e) => handleInputChange('gallery_certification', e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="gallery_certification" className="text-sm font-medium text-gray-700">
                      Gallery Certification
                    </label>
                  </div>
                  {formData.gallery_certification && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Which Gallery?</label>
                        <SearchableSelect
                          value={formData.gallery_id}
                          onChange={(value) => handleInputChange('gallery_id', value?.toString() || '')}
                          options={galleries.map(gallery => ({
                            value: gallery.id || '',
                            label: gallery.name,
                            description: gallery.location ? `${gallery.location}${gallery.country ? `, ${gallery.country}` : ''}` : gallery.country || ''
                          }))}
                          placeholder={loadingGalleries ? "Loading galleries..." : "Search galleries..."}
                          inputPlaceholder="Search by gallery name or location..."
                          className="w-full"
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
                        {formData.gallery_certification_file && (
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
                      checked={formData.artist_certification}
                      onChange={(e) => handleInputChange('artist_certification', e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="artist_certification" className="text-sm font-medium text-gray-700">
                      Artist Certification
                    </label>
                  </div>
                  {formData.artist_certification && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Which Artist?</label>
                        <select
                          value={formData.certified_artist_id}
                          onChange={(e) => handleInputChange('certified_artist_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                          disabled={loadingArtistsSchools}
                        >
                          <option value="">Select artist...</option>
                          {artists.map((artist) => (
                            <option key={artist.id} value={artist.id}>
                              {artist.name}
                              {artist.birth_year && ` (${artist.birth_year}${artist.death_year ? `-${artist.death_year}` : '-'})`}
                            </option>
                          ))}
                        </select>
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
                        {formData.artist_certification_file && (
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
                      checked={formData.artist_family_certification}
                      onChange={(e) => handleInputChange('artist_family_certification', e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="artist_family_certification" className="text-sm font-medium text-gray-700">
                      Artist Family Certification
                    </label>
                  </div>
                  {formData.artist_family_certification && (
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
                      {formData.artist_family_certification_file && (
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
                      checked={formData.restoration_done}
                      onChange={(e) => handleInputChange('restoration_done', e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="restoration_done" className="text-sm font-medium text-gray-700">
                      Restoration Done
                    </label>
                  </div>
                  {formData.restoration_done && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Done by (Person/Company)</label>
                        <input
                          type="text"
                          value={formData.restoration_by}
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
                        {formData.restoration_done_file && (
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
                      value={formData.low_est}
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
                      value={formData.high_est}
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
                      value={formData.start_price}
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
                      value={formData.reserve}
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
                      value={formData.category}
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
                      value={formData.subcategory}
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
                      value={formData.condition}
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
                        value={formData.height_inches}
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
                        value={formData.height_cm}
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
                        value={formData.width_inches}
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
                        value={formData.width_cm}
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
                        value={formData.height_with_frame_inches}
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
                        value={formData.height_with_frame_cm}
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
                        value={formData.width_with_frame_inches}
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
                        value={formData.width_with_frame_cm}
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
                    value={formData.weight}
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
                  value={formData.provenance}
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
                    value={formData[`image_file_${i + 1}` as ImageFieldKey]}
                    onChange={(url, file) => handleImageChange(`image_file_${i + 1}` as ImageFieldKey, url, file)}
                    itemId={itemId}
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
                    key={`${formData.include_artist_description}-${formData.include_artist_key_description}-${formData.include_artist_biography}-${formData.include_artist_notable_works}-${formData.include_artist_major_exhibitions}-${formData.include_artist_awards_honors}-${formData.include_artist_market_value_range}-${formData.include_artist_signature_style}`}
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
                    {formData.vendor_id && (
                      <li>• Vendor: {(() => {
                        const client = clients.find(c => c.id?.toString() === formData.vendor_id)
                        return client ? getClientDisplayName(client) : `ID: ${formData.vendor_id}`
                      })()}</li>
                    )}
                    {formData.buyer_id && formData.status === 'sold' && (
                      <li>• Buyer: {(() => {
                        const client = clients.find(c => c.id?.toString() === formData.buyer_id)
                        return client ? getClientDisplayName(client) : `ID: ${formData.buyer_id}`
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
      </div>
    </div>
  )
} 