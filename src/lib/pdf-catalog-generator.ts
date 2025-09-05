// frontend/src/lib/pdf-catalog-generator.ts
import { jsPDF } from 'jspdf'
import { Artwork } from './items-api'

export interface BrandData {
  id: number
  name: string
  code: string
  logo_url?: string
  logo_base64?: string
}

export interface CatalogOptions {
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
  
  // Layout options
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

export interface ArtworkPreviewData extends Artwork {
  artist_name?: string
  consigner_name?: string
  images?: string[]
  image_urls?: string[]
  artist_maker?: string
  // Allow for artist and consigner_client properties from the original interface
  artist?: { name?: string }
  consigner_client?: { name?: string }
}

interface Colors {
  primary: [number, number, number]
  secondary: [number, number, number]
  accent: [number, number, number]
  text: [number, number, number]
  light: [number, number, number]
  border: [number, number, number]
}

export class PDFCatalogGenerator {
  private doc: any
  private pageWidth: number = 0
  private pageHeight: number = 0
  private margin: number
  private contentWidth: number = 0
  private currentY: number
  private pageNumber: number
  private colors: Colors
  private loadedImages: Map<string, string>
  private brandLogos: Map<number, string>

  constructor() {
    this.margin = 15
    this.currentY = this.margin
    this.pageNumber = 1
    this.loadedImages = new Map()
    this.brandLogos = new Map()
    
    // Define color scheme
    this.colors = {
      primary: [41, 98, 255],
      secondary: [100, 116, 139],
      accent: [245, 158, 11],
      text: [15, 23, 42],
      light: [248, 250, 252],
      border: [226, 232, 240]
    }
  }

  async generatePDF(
    artworks: ArtworkPreviewData[],
    options: CatalogOptions,
    brands: BrandData[] = [],
    action: 'download' | 'share' | 'print' | 'preview' = 'download'
  ): Promise<Blob | void> {
    try {
      // Initialize PDF document
      this.doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      this.pageWidth = this.doc.internal.pageSize.width
      this.pageHeight = this.doc.internal.pageSize.height
      this.contentWidth = this.pageWidth - (this.margin * 2)
      this.currentY = this.margin

      // Load brand logos
      await this.loadBrandLogos(brands)

      // Load artwork images (first 2 images per item)
      await this.loadArtworkImages(artworks)

      // Generate content based on layout type
      switch (options.layoutType) {
        case 'cards':
          await this.generateCardsLayout(artworks, options)
          break
        case 'table':
          await this.generateTableLayout(artworks, options)
          break
        case 'detailed':
          await this.generateDetailedLayout(artworks, options)
          break
        default:
          await this.generateCardsLayout(artworks, options)
      }

      // Handle different actions
      switch (action) {
        case 'download':
          this.doc.save(`catalog-${new Date().toISOString().split('T')[0]}.pdf`)
          break
        case 'preview':
          // Open in new window for preview
          const pdfBlob = this.doc.output('blob')
          const url = URL.createObjectURL(pdfBlob)
          window.open(url, '_blank')
          return pdfBlob
        case 'share':
          const shareBlob = this.doc.output('blob')
          if (navigator.share) {
            const file = new File([shareBlob], `catalog-${Date.now()}.pdf`, { type: 'application/pdf' })
            await navigator.share({ files: [file] })
          } else {
            // Fallback to download
            this.doc.save(`catalog-${new Date().toISOString().split('T')[0]}.pdf`)
          }
          return shareBlob
        case 'print':
          // Open print dialog
          const printBlob = this.doc.output('blob')
          const printUrl = URL.createObjectURL(printBlob)
          const printWindow = window.open(printUrl, '_blank')
          if (printWindow) {
            printWindow.onload = () => {
              printWindow.print()
            }
          }
          return printBlob
        default:
          return this.doc.output('blob')
      }
    } catch (error) {
      console.error('PDF generation error:', error)
      throw error
    }
  }

  private async loadBrandLogos(brands: BrandData[]): Promise<void> {
    for (const brand of brands) {
      if (brand.logo_url) {
        try {
          const response = await fetch(brand.logo_url)
          if (response.ok) {
            const blob = await response.blob()
            const base64 = await this.blobToBase64(blob)
            this.brandLogos.set(brand.id, base64)
          }
        } catch (error) {
          console.warn(`Failed to load brand logo for ${brand.name}:`, error)
        }
      } else if (brand.logo_base64) {
        this.brandLogos.set(brand.id, brand.logo_base64)
      }
    }
  }

  private async loadArtworkImages(artworks: ArtworkPreviewData[]): Promise<void> {
    for (const artwork of artworks) {
      // Load first 2 images per artwork
      const imageFields = ['image_file_1', 'image_file_2']
      
      for (const field of imageFields) {
        const imageUrl = (artwork as any)[field]
        if (imageUrl && !this.loadedImages.has(imageUrl)) {
          try {
            const response = await fetch(imageUrl)
            if (response.ok) {
              const blob = await response.blob()
              const base64 = await this.blobToBase64(blob)
              this.loadedImages.set(imageUrl, base64)
            }
          } catch (error) {
            console.warn(`Failed to load image ${imageUrl}:`, error)
          }
        }
      }
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  private addHeader(options: CatalogOptions): void {
    if (!options.includeHeader) return

    // Header background
    this.doc.setFillColor(this.colors.primary[0], this.colors.primary[1], this.colors.primary[2])
    this.doc.rect(0, 0, this.pageWidth, 35, 'F')
    
    // Accent line
    this.doc.setFillColor(this.colors.accent[0], this.colors.accent[1], this.colors.accent[2])
    this.doc.rect(0, 32, this.pageWidth, 3, 'F')

    // Add brand logos if enabled and available
    if (options.showBrandLogos && this.brandLogos.size > 0) {
      let logoX = this.margin
      const logoY = 5
      const logoWidth = 25
      const logoHeight = 20

      for (const [brandId, logoBase64] of this.brandLogos) {
        try {
          this.doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight)
          logoX += logoWidth + 10
        } catch (error) {
          console.warn(`Failed to add brand logo ${brandId} to PDF:`, error)
        }
      }
    }
    
    if (options.catalogTitle) {
      this.doc.setTextColor(255, 255, 255)
      this.doc.setFontSize(24)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(options.catalogTitle, this.pageWidth / 2, 20, { align: 'center' })
    }
    
    if (options.catalogSubtitle) {
      this.doc.setTextColor(220, 220, 220)
      this.doc.setFontSize(12)
      this.doc.setFont('helvetica', 'normal')
      this.doc.text(options.catalogSubtitle, this.pageWidth / 2, 28, { align: 'center' })
    }
    
    this.currentY = 45
    this.doc.setTextColor(0, 0, 0)
  }

  private addFooter(options: CatalogOptions): void {
    if (!options.includeFooter) return

    const footerY = this.pageHeight - 15
    
    this.doc.setFillColor(this.colors.light[0], this.colors.light[1], this.colors.light[2])
    this.doc.rect(0, footerY - 5, this.pageWidth, 20, 'F')
    
    this.doc.setTextColor(this.colors.secondary[0], this.colors.secondary[1], this.colors.secondary[2])
    this.doc.setFontSize(8)
    this.doc.setFont('helvetica', 'normal')
    
    if (options.showPageNumbers) {
      this.doc.text(`Page ${this.pageNumber}`, this.pageWidth - this.margin, footerY, { align: 'right' })
    }
    
    const currentDate = new Date().toLocaleDateString()
    this.doc.text(`Generated on ${currentDate}`, this.margin, footerY)
  }

  private checkPageBreak(requiredHeight: number, options: CatalogOptions): void {
    const footerSpace = options.includeFooter ? 25 : 15
    if (this.currentY + requiredHeight > this.pageHeight - footerSpace) {
      this.addFooter(options)
      this.doc.addPage()
      this.pageNumber++
      this.addHeader(options)
    }
  }

  private async generateCardsLayout(artworks: ArtworkPreviewData[], options: CatalogOptions): Promise<void> {
    this.addHeader(options)

    const itemsPerRow = 2
    const cardWidth = (this.contentWidth - 10) / itemsPerRow
    const cardHeight = options.includeImages ? 120 : 80
    let col = 0
    let rowY = this.currentY

    for (let i = 0; i < artworks.length; i++) {
      const artwork = artworks[i]
      
      if (col === 0) {
        this.checkPageBreak(cardHeight + 10, options)
        rowY = this.currentY
      }

      const x = this.margin + (col * (cardWidth + 10))
      await this.renderCard(artwork, x, rowY, cardWidth, cardHeight, options)

      col++
      if (col >= itemsPerRow) {
        col = 0
        this.currentY = rowY + cardHeight + 15
      }
    }

    // Handle remaining items in incomplete row
    if (col > 0) {
      this.currentY = rowY + cardHeight + 15
    }

    this.addFooter(options)
  }

  private async renderCard(
    artwork: ArtworkPreviewData,
    x: number,
    y: number,
    width: number,
    height: number,
    options: CatalogOptions
  ): Promise<void> {
    // Card border
    this.doc.setDrawColor(this.colors.border[0], this.colors.border[1], this.colors.border[2])
    this.doc.rect(x, y, width, height)

    let contentY = y + 5
    const lineHeight = 4
    const padding = 5

    // Images (first 2 images side by side if available)
    if (options.includeImages) {
      const imageWidth = (width - (padding * 3)) / 2
      const imageHeight = 30
      let imageX = x + padding

      // First image
      const image1Url = (artwork as any).image_file_1
      if (image1Url && this.loadedImages.has(image1Url)) {
        try {
          this.doc.addImage(this.loadedImages.get(image1Url)!, 'JPEG', imageX, contentY, imageWidth, imageHeight)
        } catch (error) {
          console.warn('Failed to add first image:', error)
        }
      }

      // Second image
      const image2Url = (artwork as any).image_file_2
      if (image2Url && this.loadedImages.has(image2Url)) {
        try {
          imageX += imageWidth + padding
          this.doc.addImage(this.loadedImages.get(image2Url)!, 'JPEG', imageX, contentY, imageWidth, imageHeight)
        } catch (error) {
          console.warn('Failed to add second image:', error)
        }
      }

      contentY += imageHeight + 5
    }

    // Lot number
    if (options.includeLotNumbers && artwork.id) {
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(this.colors.accent[0], this.colors.accent[1], this.colors.accent[2])
      this.doc.text(`Lot ${artwork.id}`, x + padding, contentY)
      contentY += lineHeight
    }

    // Title
    if (options.includeTitle && artwork.title) {
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(this.colors.text[0], this.colors.text[1], this.colors.text[2])
      const titleLines = this.doc.splitTextToSize(artwork.title, width - (padding * 2))
      this.doc.text(titleLines.slice(0, 2), x + padding, contentY) // Max 2 lines
      contentY += lineHeight * Math.min(titleLines.length, 2)
    }

    // Artist
    if (options.includeArtist && (artwork.artist_name || artwork.artist?.name)) {
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'italic')
      const artistName = artwork.artist_name || artwork.artist?.name || ''
      this.doc.text(artistName, x + padding, contentY)
      contentY += lineHeight
    }

    // Category
    if (options.includeCategory && artwork.category) {
      this.doc.setFontSize(7)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(this.colors.secondary[0], this.colors.secondary[1], this.colors.secondary[2])
      this.doc.text(artwork.category, x + padding, contentY)
      contentY += lineHeight
    }

    // Materials
    if (options.includeMaterials && artwork.materials) {
      this.doc.setFontSize(7)
      this.doc.setFont('helvetica', 'normal')
      this.doc.text(artwork.materials, x + padding, contentY)
      contentY += lineHeight
    }

    // Estimates
    if (options.includeEstimates && artwork.low_est && artwork.high_est) {
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(this.colors.primary[0], this.colors.primary[1], this.colors.primary[2])
      this.doc.text(`Est: £${artwork.low_est} - £${artwork.high_est}`, x + padding, contentY)
      contentY += lineHeight
    }
  }

  private async generateTableLayout(artworks: ArtworkPreviewData[], options: CatalogOptions): Promise<void> {
    this.addHeader(options)

    // Table headers
    const headers = ['Lot', 'Title', 'Artist', 'Low Est', 'High Est']
    const colWidths = [20, 80, 60, 25, 25]
    const totalWidth = colWidths.reduce((sum, width) => sum + width, 0)
    
    // Scale to fit content width
    const scale = this.contentWidth / totalWidth
    const scaledWidths = colWidths.map(w => w * scale)

    // Header row
    this.doc.setFillColor(this.colors.primary[0], this.colors.primary[1], this.colors.primary[2])
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 8, 'F')
    
    this.doc.setTextColor(255, 255, 255)
    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'bold')

    let colX = this.margin
    headers.forEach((header, i) => {
      this.doc.text(header, colX + 2, this.currentY + 6)
      colX += scaledWidths[i]
    })

    this.currentY += 10
    this.doc.setTextColor(0, 0, 0)

    // Data rows
    for (const artwork of artworks) {
      this.checkPageBreak(8, options)

      const cellData = [
        artwork.id || '',
        artwork.title || '',
        artwork.artist_name || artwork.artist?.name || '',
        `£${artwork.low_est || 0}`,
        `£${artwork.high_est || 0}`
      ]

      // Row background (alternating)
      if (artworks.indexOf(artwork) % 2 === 0) {
        this.doc.setFillColor(this.colors.light[0], this.colors.light[1], this.colors.light[2])
        this.doc.rect(this.margin, this.currentY, this.contentWidth, 8, 'F')
      }

      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'normal')

      colX = this.margin
      cellData.forEach((cell, i) => {
        const cellText = this.doc.splitTextToSize(cell.toString(), scaledWidths[i] - 4)
        this.doc.text(cellText[0] || '', colX + 2, this.currentY + 6)
        colX += scaledWidths[i]
      })

      this.currentY += 8
    }

    this.addFooter(options)
  }

  private async generateDetailedLayout(artworks: ArtworkPreviewData[], options: CatalogOptions): Promise<void> {
    this.addHeader(options)

    for (const artwork of artworks) {
      const itemHeight = options.includeImages ? 60 : 40
      this.checkPageBreak(itemHeight, options)

      const startY = this.currentY
      let contentX = this.margin
      const contentWidth = this.contentWidth

      // Images section (left side if images are included)
      if (options.includeImages) {
        const imageWidth = 40
        const imageHeight = 30
        let imageY = startY

        // First image
        const image1Url = (artwork as any).image_file_1
        if (image1Url && this.loadedImages.has(image1Url)) {
          try {
            this.doc.addImage(this.loadedImages.get(image1Url)!, 'JPEG', contentX, imageY, imageWidth, imageHeight)
          } catch (error) {
            console.warn('Failed to add first image:', error)
          }
        }

        // Second image (below first)
        const image2Url = (artwork as any).image_file_2
        if (image2Url && this.loadedImages.has(image2Url)) {
          try {
            imageY += imageHeight + 2
            this.doc.addImage(this.loadedImages.get(image2Url)!, 'JPEG', contentX, imageY, imageWidth, imageHeight)
          } catch (error) {
            console.warn('Failed to add second image:', error)
          }
        }

        contentX += imageWidth + 10
      }

      // Content section
      let contentY = startY
      const textWidth = contentWidth - (options.includeImages ? 50 : 0)

      // Lot number and title
      if (options.includeLotNumbers && artwork.id) {
        this.doc.setFontSize(10)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(this.colors.accent[0], this.colors.accent[1], this.colors.accent[2])
        this.doc.text(`Lot ${artwork.id}`, contentX, contentY)
        contentY += 6
      }

      if (options.includeTitle && artwork.title) {
        this.doc.setFontSize(12)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(this.colors.text[0], this.colors.text[1], this.colors.text[2])
        const titleLines = this.doc.splitTextToSize(artwork.title, textWidth)
        this.doc.text(titleLines, contentX, contentY)
        contentY += 4 * titleLines.length
      }

      // Artist
      if (options.includeArtist && (artwork.artist_name || artwork.artist?.name)) {
        this.doc.setFontSize(10)
        this.doc.setFont('helvetica', 'italic')
        const artistName = artwork.artist_name || artwork.artist?.name || ''
        this.doc.text(`by ${artistName}`, contentX, contentY)
        contentY += 5
      }

      // Description
      if (options.includeDescription && artwork.description) {
        this.doc.setFontSize(9)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(this.colors.secondary[0], this.colors.secondary[1], this.colors.secondary[2])
        const description = artwork.description.replace(/<br>/g, ' ').substring(0, 200) + '...'
        const descLines = this.doc.splitTextToSize(description, textWidth)
        this.doc.text(descLines.slice(0, 3), contentX, contentY) // Max 3 lines
        contentY += 4 * Math.min(descLines.length, 3)
      }

      // Additional details in columns
      const detailsY = contentY + 2
      const col1X = contentX
      const col2X = contentX + textWidth / 2

      // Left column
      if (options.includeCategory && artwork.category) {
        this.doc.setFontSize(8)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(this.colors.text[0], this.colors.text[1], this.colors.text[2])
        this.doc.text('Category:', col1X, detailsY)
        this.doc.setFont('helvetica', 'normal')
        this.doc.text(artwork.category, col1X + 20, detailsY)
      }

      if (options.includeMaterials && artwork.materials) {
        this.doc.setFontSize(8)
        this.doc.setFont('helvetica', 'bold')
        this.doc.text('Materials:', col1X, detailsY + 4)
        this.doc.setFont('helvetica', 'normal')
        this.doc.text(artwork.materials, col1X + 20, detailsY + 4)
      }

      // Right column
      if (options.includeEstimates && artwork.low_est && artwork.high_est) {
        this.doc.setFontSize(10)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(this.colors.primary[0], this.colors.primary[1], this.colors.primary[2])
        this.doc.text(`Est: £${artwork.low_est} - £${artwork.high_est}`, col2X, detailsY)
      }

      // Separator line
      this.currentY = startY + itemHeight
      this.doc.setDrawColor(this.colors.border[0], this.colors.border[1], this.colors.border[2])
      this.doc.line(this.margin, this.currentY - 2, this.pageWidth - this.margin, this.currentY - 2)
      this.currentY += 5
    }

    this.addFooter(options)
  }
}
