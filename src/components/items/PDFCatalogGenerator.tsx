// frontend/src/components/items/PDFCatalogGenerator.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { X, Download, Share2, Printer, Eye, Settings, Image, FileText, Grid, List, Layers } from 'lucide-react'
import { Artwork } from '@/lib/items-api'
import { ArtistsAPI, Artist } from '@/lib/artists-api'
import { fetchClient, Client } from '@/lib/clients-api'
import { ArtworkPreviewOptions, generateArtworkPreview } from '@/lib/artwork-preview'
// Define types for PDF catalog generation
interface CatalogOptions {
  includeTitle: boolean
  includeImages: boolean
  includeDescription: boolean
  includeArtist: boolean
  includeArtistBiography: boolean
  includeArtistDescription: boolean
  includeArtistExtraInfo: boolean
  includeDimensions: boolean
  includeCondition: boolean
  includeMaterials: boolean
  includeProvenance: boolean
  includeEstimates: boolean
  includeConsigner: boolean
  includeLotNumbers: boolean
  includeCategory: boolean
  includePeriodAge: boolean
  includeWeight: boolean
  includeImageCaptions: boolean
  layoutType: 'cards' | 'table' | 'detailed'
  itemsPerPage: number
  showPageNumbers: boolean
  catalogTitle: string
  catalogSubtitle: string
  includeHeader: boolean
  includeFooter: boolean
  logoUrl: string
  showBrandLogos: boolean
  imagesPerItem: number
  imageSize: 'small' | 'medium' | 'large'
  showImageBorder: boolean
}

interface BrandData {
  id: number
  name: string
  code: string
  logo_url?: string
}

interface ArtworkPreviewData extends Artwork {
  artist_name?: string
  consigner_name?: string
  images?: string[]
  image_urls?: string[]
  artist_maker?: string
}
// PDF generation now handled by backend API

interface PDFCatalogGeneratorProps {
  selectedArtworks: Artwork[]
  onClose: () => void
}

// Interfaces moved to @/lib/pdf-catalog-generator

const defaultOptions: CatalogOptions = {
  includeTitle: true,
  includeImages: true,
  includeDescription: true,
  includeArtist: true,
  includeArtistBiography: false,
  includeArtistDescription: false,
  includeArtistExtraInfo: false,
  includeDimensions: true,
  includeCondition: false,
  includeMaterials: false,
  includeProvenance: false,
  includeEstimates: true,
  includeConsigner: false,
  includeLotNumbers: true,
  includeCategory: false,
  includePeriodAge: false,
  includeWeight: false,
  includeImageCaptions: false,
  
  layoutType: 'cards',
  itemsPerPage: 4,
  showPageNumbers: true,
  catalogTitle: 'Auction Catalog',
  catalogSubtitle: '',
  includeHeader: true,
  includeFooter: true,
  logoUrl: '',
  showBrandLogos: true,
  imagesPerItem: 2, // Show first two images by default
  imageSize: 'medium',
  showImageBorder: true
}

export default function PDFCatalogGenerator({
  selectedArtworks,
  onClose
}: PDFCatalogGeneratorProps) {
  const [options, setOptions] = useState<CatalogOptions>(defaultOptions)
  const [showSettings, setShowSettings] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [enrichedArtworks, setEnrichedArtworks] = useState<ArtworkPreviewData[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [loadingImages, setLoadingImages] = useState(false)
  const [brands, setBrands] = useState<BrandData[]>([])
  const [loadedBrandLogos, setLoadedBrandLogos] = useState<Map<number, string>>(new Map())

  // Load brand data and logos
  const loadBrandData = async () => {
    try {
      // Get unique brand IDs from selected artworks
      const brandIds = new Set<number>()
      selectedArtworks.forEach(artwork => {
        if (artwork.brands?.id) {
          brandIds.add(artwork.brands.id)
        } else if (artwork.brand_id) {
          brandIds.add(artwork.brand_id)
        }
      })

      if (brandIds.size === 0) return

      // Fetch brand data
      const token = localStorage.getItem('token')
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      
      const brandsData: BrandData[] = []
      const logoMap = new Map<number, string>()

      for (const brandId of brandIds) {
        try {
          const response = await fetch(`${backendUrl}/api/brands/${brandId}`, {
            headers: {
              'Authorization': token ? `Bearer ${token}` : ''
            }
          })
          
          if (response.ok) {
            const brandResponse = await response.json()
            const brand = brandResponse.data
            brandsData.push(brand)

            // Load brand logo if available
            if (brand.logo_url) {
              try {
                const logoBase64 = await loadImageAsBase64(brand.logo_url)
                if (logoBase64) {
                  logoMap.set(brand.id, logoBase64)
                }
              } catch (logoError) {
                console.warn(`Failed to load logo for brand ${brand.name}:`, logoError)
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to load brand ${brandId}:`, error)
        }
      }

      setBrands(brandsData)
      setLoadedBrandLogos(logoMap)
    } catch (error) {
      console.error('Failed to load brand data:', error)
    }
  }

  // Load additional data for artworks (artists, clients, etc.)
  useEffect(() => {
    loadEnrichedData()
    loadBrandData()
  }, [selectedArtworks])

  const loadEnrichedData = async () => {
    try {
      setLoadingData(true)
      const enriched: ArtworkPreviewData[] = []

      for (const artwork of selectedArtworks) {
        const enrichedArtwork: ArtworkPreviewData = { ...artwork, lot_num: artwork.id || '' }

        // Load artist data
        if (artwork.artist_id) {
          try {
            const artistResponse = await ArtistsAPI.getArtist(artwork.artist_id.toString())
            if (artistResponse.success) {
              (enrichedArtwork as any).artist = artistResponse.data
            }
          } catch (error) {
            console.error('Error loading artist:', error)
          }
        }

        // Load vendor client data
        if (artwork.vendor_id) {
          try {
            const clientResponse = await fetchClient(artwork.vendor_id)
            if (clientResponse.success) {
              (enrichedArtwork as any).consigner_client = clientResponse.data
            }
          } catch (error) {
            console.error('Error loading vendor:', error)
          }
        }

        enriched.push(enrichedArtwork)
      }

      setEnrichedArtworks(enriched)
    } catch (error) {
      console.error('Error loading enriched data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const generatePreviewData = () => {
    const previewOptions: ArtworkPreviewOptions = {
      includeTitle: options.includeTitle,
      includeDescription: options.includeDescription,
      includeArtist: options.includeArtist,
      includeArtistBiography: options.includeArtistBiography,
      includeArtistDescription: options.includeArtistDescription,
      includeArtistExtraInfo: options.includeArtistExtraInfo,
      includeDimensions: options.includeDimensions,
      includeCondition: options.includeCondition,
      includeMaterials: options.includeMaterials,
      includeProvenance: options.includeProvenance,
      includeEstimates: options.includeEstimates,
      includeConsigner: options.includeConsigner
    }

    return enrichedArtworks.map(artwork => ({
      ...artwork,
      previewText: generateArtworkPreview(artwork as any, previewOptions)
    }))
  }

  // Helper function to load image from URL and convert to base64
  const loadImageAsBase64 = async (imageUrl: string): Promise<string | null> => {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 10000) // 10 second timeout
      })

      // Create the fetch promise
      const fetchPromise = (async () => {
        const response = await fetch(imageUrl, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })

        if (!response.ok) {
          console.warn(`Failed to load image: ${imageUrl} (${response.status})`)
          return null
        }

        const contentLength = response.headers.get('content-length')
        if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
          console.warn(`Image too large: ${imageUrl} (${contentLength} bytes)`)
          return null
        }

        const blob = await response.blob()

        // Check blob size
        if (blob.size > 10 * 1024 * 1024) { // 10MB limit
          console.warn(`Image blob too large: ${imageUrl} (${blob.size} bytes)`)
          return null
        }

        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => {
            console.warn(`Error reading image blob: ${imageUrl}`)
            resolve(null)
          }
          reader.readAsDataURL(blob)
        })
      })()

      // Race between fetch and timeout
      return await Promise.race([fetchPromise, timeoutPromise]) as string | null

    } catch (error) {
      console.warn(`Error loading image ${imageUrl}:`, error)
      return null
    }
  }

  // Helper function to get the best available image URL
  const getBestImageUrl = (artwork: ArtworkPreviewData): string | null => {
    // Try image_file_1 first, then fall back to others
    const imageFields = ['image_file_1', 'image_file_2', 'image_file_3', 'image_file_4', 'image_file_5']
    for (const field of imageFields) {
      const url = (artwork as any)[field]
      if (url && url.trim() && !url.includes('blob:')) { // Skip blob URLs as they're temporary
        return url
      }
    }
    return null
  }

  const generatePDF = async (action: 'download' | 'share' | 'print' | 'preview') => {
    try {
      setGenerating(true)

      // Dynamic import of jsPDF to avoid SSR issues
      const jsPDF = (await import('jspdf')).default

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      const contentWidth = pageWidth - (margin * 2)

      let currentY = margin
      let pageNumber = 1

      // Pre-load images for better performance
      setLoadingImages(true)
      const previewData = generatePreviewData()
      const imagePromises = previewData.map(async (artwork) => {
        const imageUrl = getBestImageUrl(artwork)
        if (imageUrl && options.includeImages) {
          const base64Image = await loadImageAsBase64(imageUrl)
          return { artworkId: artwork.id, imageUrl, base64Image }
        }
        return null
      })

      // Wait for all images to load (with timeout)
      const imageResults = await Promise.allSettled(imagePromises)
      const loadedImages = new Map()

      let loadedCount = 0
      imageResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value && result.value.base64Image) {
          loadedImages.set(result.value.artworkId, result.value.base64Image)
          loadedCount++
        }
      })

      setLoadingImages(false)
      console.log(`Loaded ${loadedCount} images out of ${previewData.length} artworks`)

      // Show success message if images were loaded
      if (options.includeImages && loadedCount > 0) {
        console.log(`✅ Successfully loaded ${loadedCount} images for PDF catalog`)
      }

      // Modern color palette
      const colors = {
        primary: [41, 37, 36],      // Dark brown/black
        secondary: [74, 85, 104],    // Blue-gray
        accent: [236, 201, 75],      // Gold
        text: [45, 55, 72],          // Dark gray
        light: [247, 250, 252],      // Light gray
        border: [203, 213, 224]      // Light border
      }

      // Helper function to draw modern border
      const drawBorder = (x: number, y: number, width: number, height: number, color = colors.border) => {
        doc.setDrawColor(color[0], color[1], color[2])
        doc.setLineWidth(0.5)
        doc.rect(x, y, width, height)
      }

      // Helper function to draw filled rectangle with rounded corners effect
      const drawModernCard = (x: number, y: number, width: number, height: number, fillColor = colors.light) => {
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2])
        doc.rect(x, y, width, height, 'F')
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.setLineWidth(0.3)
        doc.rect(x, y, width, height)
      }

      // Helper function to add new page
      const addNewPage = () => {
        doc.addPage()
        currentY = margin
        pageNumber++
        
        if (options.includeHeader) {
          addHeader()
        }
      }

      // Helper function to add modern header
      const addHeader = () => {
        // Header background
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
        doc.rect(0, 0, pageWidth, 35, 'F')
        
        // Accent line
        doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2])
        doc.rect(0, 32, pageWidth, 3, 'F')
        
        // Add brand logos if enabled and available
        if (options.showBrandLogos && brands.length > 0) {
          const logoHeight = 25
          const logoSpacing = 35
          let logoX = margin
          
          // If multiple brands, space them out
          if (brands.length > 1) {
            logoX = (pageWidth - (brands.length * logoSpacing)) / 2
          } else {
            logoX = margin + 10
          }
          
          brands.forEach((brand, index) => {
            const logoBase64 = loadedBrandLogos.get(brand.id)
            if (logoBase64) {
              try {
                // Add brand logo
                doc.addImage(logoBase64, 'PNG', logoX + (index * logoSpacing), 5, logoHeight, logoHeight)
              } catch (error) {
                console.warn(`Failed to add logo for brand ${brand.name}:`, error)
                // Fallback to text
                doc.setTextColor(255, 255, 255)
                doc.setFontSize(10)
                doc.setFont('helvetica', 'bold')
                doc.text(brand.name, logoX + (index * logoSpacing), 20)
              }
            } else {
              // Fallback to brand name text
              doc.setTextColor(255, 255, 255)
              doc.setFontSize(10)
              doc.setFont('helvetica', 'bold')
              doc.text(brand.name, logoX + (index * logoSpacing), 20)
            }
          })
        }
        
        // Adjust title position if logos are present
        const titleX = options.showBrandLogos && brands.length > 0 ? pageWidth / 2 + 50 : pageWidth / 2
        
        if (options.catalogTitle) {
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(24)
          doc.setFont('helvetica', 'bold')
          doc.text(options.catalogTitle, titleX, 20, { align: 'center' })
        }
        
        if (options.catalogSubtitle) {
          doc.setTextColor(220, 220, 220)
          doc.setFontSize(12)
          doc.setFont('helvetica', 'normal')
          doc.text(options.catalogSubtitle, titleX, 28, { align: 'center' })
        }
        
        currentY = 45
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
      }

      // Helper function to add modern footer
      const addFooter = () => {
        if (options.includeFooter && options.showPageNumbers) {
          // Footer line
          doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
          doc.setLineWidth(0.5)
          doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20)
          
          // Page number
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2])
          doc.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
          
          // Date
          const currentDate = new Date().toLocaleDateString()
          doc.text(currentDate, pageWidth - margin, pageHeight - 10, { align: 'right' })
        }
      }

      // Add first page header
      if (options.includeHeader) {
        addHeader()
      }

      if (options.layoutType === 'table') {
        // Table layout with image support
        const rowHeight = options.includeImages ? 35 : 20 // Taller rows if images are included
        const colWidths = options.includeImages
          ? [20, 35, 55, 25, 30, 25] // Image, Lot, Title, Artist, Estimate, Dimensions
          : [25, 60, 30, 35, 30] // Lot, Title, Artist, Estimate, Dimensions
        const tableHeaders = options.includeImages
          ? ['Image', 'Lot', 'Title', 'Artist', 'Estimate', 'Dimensions']
          : ['Lot', 'Title', 'Artist', 'Estimate', 'Dimensions']

        // Draw table header
        let tableY = currentY
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
        doc.rect(margin, tableY, contentWidth, rowHeight, 'F')

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')

        let colX = margin + 2
        tableHeaders.forEach((header, index) => {
          doc.text(header, colX, tableY + (rowHeight/2) + 2)
          colX += colWidths[index]
        })

        tableY += rowHeight
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)

        previewData.forEach((artwork, index) => {
          // Check if we need a new page
          if (tableY + rowHeight > pageHeight - 30) {
            addFooter()
            addNewPage()
            tableY = currentY

            // Redraw header on new page
            doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
            doc.rect(margin, tableY, contentWidth, rowHeight, 'F')
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')

            colX = margin + 2
            tableHeaders.forEach((header, index) => {
              doc.text(header, colX, tableY + (rowHeight/2) + 2)
              colX += colWidths[index]
            })

            tableY += rowHeight
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
          }

          // Draw row background (alternate colors)
          if (index % 2 === 0) {
            doc.setFillColor(colors.light[0], colors.light[1], colors.light[2])
            doc.rect(margin, tableY, contentWidth, rowHeight, 'F')
          }

          // Draw borders
          doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
          doc.setLineWidth(0.2)
          doc.rect(margin, tableY, contentWidth, rowHeight)

          // Draw cell content
          colX = margin + 2

          // Image column (if enabled)
          if (options.includeImages) {
            const imageData = loadedImages.get(artwork.id)
            if (imageData) {
              try {
                // Determine image format from base64 data
                let format = 'JPEG'
                if (imageData.includes('data:image/png')) {
                  format = 'PNG'
                } else if (imageData.includes('data:image/gif')) {
                  format = 'GIF'
                } else if (imageData.includes('data:image/webp')) {
                  format = 'WEBP'
                }

                // Add image (thumbnail size for table)
                doc.addImage(imageData, format, colX, tableY + 2, 16, 16)
              } catch (error) {
                console.warn(`Failed to add table image for artwork ${artwork.id}:`, error)
                // Fallback to placeholder
                doc.setFontSize(6)
                doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2])
                doc.text('IMG', colX + 8, tableY + 10, { align: 'center' })
              }
            } else {
              // No image placeholder
              doc.setFontSize(6)
              doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2])
              doc.text('No IMG', colX + 8, tableY + 10, { align: 'center' })
            }
            colX += colWidths[0]
          }

          // Lot number
          if (artwork.id) {
            doc.text(artwork.id, colX, tableY + (rowHeight/2) + 2)
          }
          colX += colWidths[options.includeImages ? 1 : 0]

          // Title (truncated)
          if (artwork.title) {
            const titleText = artwork.title.length > (options.includeImages ? 25 : 30) ? artwork.title.substring(0, (options.includeImages ? 25 : 30)) + '...' : artwork.title
            doc.text(titleText, colX, tableY + (rowHeight/2) + 2)
          }
          colX += colWidths[options.includeImages ? 2 : 1]

          // Artist
          if ((artwork as any).artist?.name) {
            const artistText = (artwork as any).artist.name.length > (options.includeImages ? 12 : 15) ? (artwork as any).artist.name.substring(0, (options.includeImages ? 12 : 15)) + '...' : (artwork as any).artist.name
            doc.text(artistText, colX, tableY + (rowHeight/2) + 2)
          }
          colX += colWidths[options.includeImages ? 3 : 2]

          // Estimate
          if (artwork.low_est && artwork.high_est) {
            doc.text(`$${artwork.low_est.toLocaleString()}-${artwork.high_est.toLocaleString()}`, colX, tableY + (rowHeight/2) + 2)
          }
          colX += colWidths[options.includeImages ? 4 : 3]

          // Dimensions
          let dimension = ''
          if (artwork.height_inches && artwork.width_inches) {
            dimension = `${artwork.height_inches}" × ${artwork.width_inches}"`
          } else if (artwork.height_cm && artwork.width_cm) {
            dimension = `${artwork.height_cm}cm × ${artwork.width_cm}cm`
          }
          if (dimension) {
            const dimText = dimension.length > (options.includeImages ? 10 : 12) ? dimension.substring(0, (options.includeImages ? 10 : 12)) + '...' : dimension
            doc.text(dimText, colX, tableY + (rowHeight/2) + 2)
          }

          tableY += rowHeight
        })

      } else {
        // Card layout (existing code)
        let itemsOnCurrentPage = 0

        for (let i = 0; i < previewData.length; i++) {
          const artwork = previewData[i]
          
          // Calculate card height
          const cardHeight = options.layoutType === 'detailed' ? 120 : 80
          
          // Check if we need a new page
          if (currentY + cardHeight > pageHeight - 30 || (itemsOnCurrentPage >= options.itemsPerPage && i > 0)) {
            addFooter()
            addNewPage()
            itemsOnCurrentPage = 0
          }

          // Draw artwork card
          const cardY = currentY
          drawModernCard(margin, cardY, contentWidth, cardHeight)

          // Lot number badge
          if (options.includeLotNumbers && artwork.id) {
            doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
            doc.rect(margin + 5, cardY + 5, 40, 12, 'F')
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text(`LOT ${artwork.id}`, margin + 7, cardY + 13)
          }

          // Reset text color
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])

          // Image handling
          if (options.includeImages) {
            const imageWidth = options.layoutType === 'detailed' ? 40 : 30
            const imageHeight = options.layoutType === 'detailed' ? 35 : 25
            const imageData = loadedImages.get(artwork.id)

            if (imageData) {
              try {
                // Determine image format from base64 data
                let format = 'JPEG'
                if (imageData.includes('data:image/png')) {
                  format = 'PNG'
                } else if (imageData.includes('data:image/gif')) {
                  format = 'GIF'
                } else if (imageData.includes('data:image/webp')) {
                  format = 'WEBP'
                }

                // Add actual image
                doc.addImage(imageData, format, margin + 5, cardY + 20, imageWidth, imageHeight)
                // Draw border around image
                drawBorder(margin + 5, cardY + 20, imageWidth, imageHeight)
              } catch (error) {
                console.warn(`Failed to add card image for artwork ${artwork.id}:`, error)
                // Fallback to placeholder if image fails to load
                drawBorder(margin + 5, cardY + 20, imageWidth, imageHeight)
                doc.setFontSize(8)
                doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2])
                doc.text('IMG', margin + 5 + imageWidth/2, cardY + 20 + imageHeight/2, { align: 'center' })
              }
            } else {
              // No image available
              drawBorder(margin + 5, cardY + 20, imageWidth, imageHeight)
              doc.setFontSize(6)
              doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2])
              doc.text('No Image', margin + 5 + imageWidth/2, cardY + 20 + imageHeight/2, { align: 'center' })
            }
          }

          // Content area
          const contentX = options.includeImages ? (options.layoutType === 'detailed' ? margin + 50 : margin + 40) : margin + 10
          const contentWidthCard = options.includeImages ? (options.layoutType === 'detailed' ? 120 : 130) : 170
          let contentY = cardY + 20

          // Title
          if (options.includeTitle && artwork.title) {
            doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
            doc.setFontSize(12)
            doc.setFont('helvetica', 'bold')
            const titleLines = doc.splitTextToSize(artwork.title, contentWidthCard)
            doc.text(titleLines.slice(0, 2), contentX, contentY) // Max 2 lines for title
            contentY += titleLines.slice(0, 2).length * 5
          }

          // Artist
          if ((artwork as any).artist?.name) {
            doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2])
            doc.setFontSize(10)
            doc.setFont('helvetica', 'italic')
            doc.text(`by ${(artwork as any).artist.name}`, contentX, contentY)
            contentY += 5
          }

          // Estimates
          if (options.includeEstimates && artwork.low_est && artwork.high_est) {
            doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2])
            doc.setFontSize(11)
            doc.setFont('helvetica', 'bold')
            doc.text(`$${artwork.low_est.toLocaleString()} - $${artwork.high_est.toLocaleString()}`, contentX, contentY)
            contentY += 7
          }

          // Dimensions
          if (options.includeDimensions) {
            let dimension = ''
            if (artwork.height_inches && artwork.width_inches) {
              dimension = `${artwork.height_inches}" × ${artwork.width_inches}"`
            } else if (artwork.height_cm && artwork.width_cm) {
              dimension = `${artwork.height_cm}cm × ${artwork.width_cm}cm`
            }
            if (dimension) {
              doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
              doc.setFontSize(9)
              doc.setFont('helvetica', 'normal')
              doc.text(dimension, contentX, contentY)
              contentY += 4
            }
          }

          // Description (truncated)
          if (options.includeDescription && artwork.description) {
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            const maxChars = options.layoutType === 'detailed' ? 250 : 150
            const descLines = doc.splitTextToSize(artwork.description.substring(0, maxChars) + '...', contentWidthCard)
            const maxLines = options.layoutType === 'detailed' ? 4 : 3
            doc.text(descLines.slice(0, maxLines), contentX, contentY)
          }

          currentY += cardHeight + 10 // Add spacing between cards
          itemsOnCurrentPage++
        }
      }

      // Add footer to last page
      addFooter()

      // Handle the action
      switch (action) {
        case 'download':
          doc.save(`artwork-catalog-${new Date().toISOString().split('T')[0]}.pdf`)
          break
          
        case 'print':
          doc.autoPrint()
          window.open(doc.output('bloburl'), '_blank')
          break
          
        case 'share':
          if (navigator.share) {
            const blob = doc.output('blob')
            const file = new File([blob], 'artwork-catalog.pdf', { type: 'application/pdf' })
            await navigator.share({
              title: 'Artwork Catalog',
              files: [file]
            })
          } else {
            // Fallback: copy link or show share options
            const blob = doc.output('blob')
            const url = URL.createObjectURL(blob)
            await navigator.clipboard.writeText(url)
            alert('PDF link copied to clipboard!')
          }
          break
          
        case 'preview':
          const blob = doc.output('blob')
          const url = URL.createObjectURL(blob)
          window.open(url, '_blank')
          break
      }

    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // Generate PDF using backend API (PDFKit)
  const generatePDFNew = async (action: 'download' | 'share' | 'print' | 'preview') => {
    try {
      setGenerating(true)
      setLoadingImages(true)

      // Get selected artwork IDs
      const itemIds = selectedArtworks.map(artwork => artwork.id).filter(id => id)

      if (itemIds.length === 0) {
        alert('No artworks selected for PDF generation')
        return
      }

      // Prepare request data
      const requestData = {
        item_ids: itemIds,
        options: options,
        brand_code: undefined // Can be added later if needed
      }

      // Call backend API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/items/generate-pdf-catalog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate PDF')
      }

      // Get PDF blob from response
      const pdfBlob = await response.blob()

      setLoadingImages(false)

      // Handle different actions
      switch (action) {
        case 'download':
          const fileName = `catalog_${options.catalogTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`
          const downloadUrl = URL.createObjectURL(pdfBlob)
          const link = document.createElement('a')
          link.href = downloadUrl
          link.download = fileName
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(downloadUrl)
          break
        case 'print':
          const printUrl = URL.createObjectURL(pdfBlob)
          const printWindow = window.open(printUrl, '_blank')
          if (printWindow) {
            printWindow.onload = () => {
              printWindow.print()
            }
          }
          break
        case 'share':
        case 'preview':
          const previewUrl = URL.createObjectURL(pdfBlob)
          window.open(previewUrl, '_blank')
          break
      }

    } catch (error: any) {
      console.error('Error generating PDF:', error)
      alert(`Error generating PDF: ${error.message}`)
    } finally {
      setGenerating(false)
      setLoadingImages(false)
    }
  }

  const updateOption = (key: keyof CatalogOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }))
  }

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading artwork data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Generate PDF Catalog</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-3">Catalog Settings</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Options */}
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Content Options</h5>
                  <div className="space-y-2">
                    {[
                      { key: 'includeTitle', label: 'Include Title' },
                      { key: 'includeImages', label: 'Include Images' },
                      { key: 'includeDescription', label: 'Include Description' },
                      { key: 'includeArtist', label: 'Include Artist' },
                      { key: 'includeDimensions', label: 'Include Dimensions' },
                      { key: 'includeEstimates', label: 'Include Estimates' },
                      { key: 'includeLotNumbers', label: 'Include Lot Numbers' },
                      { key: 'includeCondition', label: 'Include Condition' },
                      { key: 'includeMaterials', label: 'Include Materials' },
                      { key: 'includeProvenance', label: 'Include Provenance' },
                      { key: 'includeCategory', label: 'Include Category' },
                      { key: 'includePeriodAge', label: 'Include Period/Age' },
                      { key: 'includeWeight', label: 'Include Weight' },
                      { key: 'includeImageCaptions', label: 'Include Image Captions' }
                    ].map(option => (
                      <label key={option.key} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={options[option.key as keyof CatalogOptions] as boolean}
                          onChange={(e) => updateOption(option.key as keyof CatalogOptions, e.target.checked)}
                          className="mr-2"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Layout Options */}
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Layout Options</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Layout Type</label>
                      <select
                        value={options.layoutType}
                        onChange={(e) => updateOption('layoutType', e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="cards">Modern Cards</option>
                        <option value="table">Professional Table</option>
                        <option value="detailed">Detailed Cards</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Catalog Title</label>
                      <input
                        type="text"
                        value={options.catalogTitle}
                        onChange={(e) => updateOption('catalogTitle', e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                      />
                    </div>
                    {options.layoutType !== 'table' && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Items per Page</label>
                        <select
                          value={options.itemsPerPage}
                          onChange={(e) => updateOption('itemsPerPage', parseInt(e.target.value))}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value={2}>2</option>
                          <option value={4}>4</option>
                          <option value={6}>6</option>
                          <option value={8}>8</option>
                        </select>
                      </div>
                    )}
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={options.showPageNumbers}
                        onChange={(e) => updateOption('showPageNumbers', e.target.checked)}
                        className="mr-2"
                      />
                      Show Page Numbers
                    </label>
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={options.showBrandLogos}
                        onChange={(e) => updateOption('showBrandLogos', e.target.checked)}
                        className="mr-2"
                      />
                      Show Brand Logos ({brands.length} brand{brands.length !== 1 ? 's' : ''} detected)
                    </label>
                    
                    {/* Image Options */}
                    {options.includeImages && (
                      <>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Images per Item</label>
                          <select
                            value={options.imagesPerItem}
                            onChange={(e) => updateOption('imagesPerItem', parseInt(e.target.value))}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value={1}>1 Image</option>
                            <option value={2}>2 Images</option>
                            <option value={3}>3 Images</option>
                            <option value={4}>4 Images</option>
                            <option value={5}>5 Images</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Image Size</label>
                          <select
                            value={options.imageSize}
                            onChange={(e) => updateOption('imageSize', e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                          </select>
                        </div>
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={options.showImageBorder}
                            onChange={(e) => updateOption('showImageBorder', e.target.checked)}
                            className="mr-2"
                          />
                          Show Image Border
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Artwork Count */}
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              Ready to generate catalog for <span className="font-semibold">{selectedArtworks.length}</span> artwork(s)
            </p>
          </div>

          {/* Preview */}
          {!showSettings && (
            <div className="mb-6">
              <h4 className="font-medium mb-3">Preview</h4>
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                {generatePreviewData().slice(0, 3).map((artwork, index) => (
                  <div key={artwork.id || index} className="mb-4 p-3 bg-white rounded border">
                    {options.includeLotNumbers && artwork.id && (
                      <div className="font-semibold text-sm mb-2">Lot {artwork.id}</div>
                    )}
                    <div 
                      className="text-sm"
                      dangerouslySetInnerHTML={{ 
                        __html: artwork.previewText.replace(/<br\s*\/?>/gi, '<br>') 
                      }}
                    />
                    {options.includeImages && getBestImageUrl(artwork) && (
                      <div className="mt-2">
                        <img
                          src={getBestImageUrl(artwork) || ''}
                          alt={artwork.title || 'Artwork'}
                          className="w-16 h-16 object-cover border border-gray-300 rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent) {
                              parent.innerHTML = '<div class="text-xs text-gray-500">[Image failed to load]</div>'
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
                {selectedArtworks.length > 3 && (
                  <div className="text-sm text-gray-500 text-center">
                    ... and {selectedArtworks.length - 3} more artwork(s)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => generatePDFNew('preview')}
              disabled={generating || loadingImages}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              <Eye className="h-4 w-4 mr-2" />
              {loadingImages ? 'Loading Images...' : 'Preview PDF'}
            </button>

            <button
              onClick={() => generatePDFNew('download')}
              disabled={generating || loadingImages}
              className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              {loadingImages ? 'Loading Images...' : generating ? 'Generating...' : 'Download PDF'}
            </button>

            <button
              onClick={() => generatePDFNew('share')}
              disabled={generating || loadingImages}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Share2 className="h-4 w-4 mr-2" />
              {loadingImages ? 'Loading Images...' : 'Share PDF'}
            </button>

            <button
              onClick={() => generatePDFNew('print')}
              disabled={generating || loadingImages}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <Printer className="h-4 w-4 mr-2" />
              {loadingImages ? 'Loading Images...' : 'Print PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
