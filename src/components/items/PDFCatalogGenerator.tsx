// frontend/src/components/items/PDFCatalogGenerator.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { X, Download, Share2, Printer, Eye, Settings } from 'lucide-react'
import { Artwork } from '@/lib/items-api'
import { ArtistsAPI, Artist } from '@/lib/artists-api'
import { fetchClient, Client } from '@/lib/clients-api'
import { 
  generateArtworkPreview, 
  ArtworkPreviewData, 
  ArtworkPreviewOptions 
} from '@/lib/artwork-preview'

interface PDFCatalogGeneratorProps {
  selectedArtworks: Artwork[]
  onClose: () => void
}

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
  
  // Layout options
  layoutType: 'cards' | 'table' | 'detailed'
  itemsPerPage: number
  showPageNumbers: boolean
  catalogTitle: string
  catalogSubtitle: string
  includeHeader: boolean
  includeFooter: boolean
  logoUrl: string
}

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
  
  layoutType: 'cards',
  itemsPerPage: 4,
  showPageNumbers: true,
  catalogTitle: 'Auction Catalog',
  catalogSubtitle: '',
  includeHeader: true,
  includeFooter: true,
  logoUrl: ''
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

  // Load additional data for artworks (artists, clients, etc.)
  useEffect(() => {
    loadEnrichedData()
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
              enrichedArtwork.artist = artistResponse.data
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
              enrichedArtwork.consigner_client = clientResponse.data
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
      previewText: generateArtworkPreview(artwork, previewOptions)
    }))
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
        
        if (options.catalogTitle) {
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(24)
          doc.setFont(undefined, 'bold')
          doc.text(options.catalogTitle, pageWidth / 2, 20, { align: 'center' })
        }
        
        if (options.catalogSubtitle) {
          doc.setTextColor(220, 220, 220)
          doc.setFontSize(12)
          doc.setFont(undefined, 'normal')
          doc.text(options.catalogSubtitle, pageWidth / 2, 28, { align: 'center' })
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
          doc.setFont(undefined, 'normal')
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

      const previewData = generatePreviewData()

      if (options.layoutType === 'table') {
        // Table layout
        const rowHeight = 20
        const colWidths = [25, 60, 30, 35, 30] // Lot, Title, Artist, Estimate, Dimensions
        const tableHeaders = ['Lot', 'Title', 'Artist', 'Estimate', 'Dimensions']
        
        // Draw table header
        let tableY = currentY
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
        doc.rect(margin, tableY, contentWidth, rowHeight, 'F')
        
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(10)
        doc.setFont(undefined, 'bold')
        
        let colX = margin + 2
        tableHeaders.forEach((header, index) => {
          doc.text(header, colX, tableY + 13)
          colX += colWidths[index]
        })
        
        tableY += rowHeight
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
        doc.setFont(undefined, 'normal')
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
            doc.setFont(undefined, 'bold')
            
            colX = margin + 2
            tableHeaders.forEach((header, index) => {
              doc.text(header, colX, tableY + 13)
              colX += colWidths[index]
            })
            
            tableY += rowHeight
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
            doc.setFont(undefined, 'normal')
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
          
          // Lot number
          if (artwork.id) {
            doc.text(artwork.id, colX, tableY + 13)
          }
          colX += colWidths[0]
          
          // Title (truncated)
          if (artwork.title) {
            const titleText = artwork.title.length > 25 ? artwork.title.substring(0, 25) + '...' : artwork.title
            doc.text(titleText, colX, tableY + 13)
          }
          colX += colWidths[1]
          
          // Artist
          if (artwork.artist?.name) {
            const artistText = artwork.artist.name.length > 15 ? artwork.artist.name.substring(0, 15) + '...' : artwork.artist.name
            doc.text(artistText, colX, tableY + 13)
          }
          colX += colWidths[2]
          
          // Estimate
          if (artwork.low_est && artwork.high_est) {
            doc.text(`$${artwork.low_est.toLocaleString()}-${artwork.high_est.toLocaleString()}`, colX, tableY + 13)
          }
          colX += colWidths[3]
          
          // Dimensions
          let dimension = ''
          if (artwork.height_inches && artwork.width_inches) {
            dimension = `${artwork.height_inches}" × ${artwork.width_inches}"`
          } else if (artwork.height_cm && artwork.width_cm) {
            dimension = `${artwork.height_cm}cm × ${artwork.width_cm}cm`
          }
          if (dimension) {
            const dimText = dimension.length > 12 ? dimension.substring(0, 12) + '...' : dimension
            doc.text(dimText, colX, tableY + 13)
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
            doc.setFont(undefined, 'bold')
            doc.text(`LOT ${artwork.id}`, margin + 7, cardY + 13)
          }

          // Reset text color
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])

          // Image placeholder
          if (options.includeImages && artwork.image_file_1) {
            const imageWidth = options.layoutType === 'detailed' ? 40 : 30
            const imageHeight = options.layoutType === 'detailed' ? 35 : 25
            drawBorder(margin + 5, cardY + 20, imageWidth, imageHeight)
            doc.setFontSize(8)
            doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2])
            doc.text('IMAGE', margin + 5 + imageWidth/2, cardY + 20 + imageHeight/2, { align: 'center' })
          }

          // Content area
          const contentX = options.includeImages ? (options.layoutType === 'detailed' ? margin + 50 : margin + 40) : margin + 10
          const contentWidthCard = options.includeImages ? (options.layoutType === 'detailed' ? 120 : 130) : 170
          let contentY = cardY + 20

          // Title
          if (options.includeTitle && artwork.title) {
            doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
            doc.setFontSize(12)
            doc.setFont(undefined, 'bold')
            const titleLines = doc.splitTextToSize(artwork.title, contentWidthCard)
            doc.text(titleLines.slice(0, 2), contentX, contentY) // Max 2 lines for title
            contentY += titleLines.slice(0, 2).length * 5
          }

          // Artist
          if (artwork.artist?.name) {
            doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2])
            doc.setFontSize(10)
            doc.setFont(undefined, 'italic')
            doc.text(`by ${artwork.artist.name}`, contentX, contentY)
            contentY += 5
          }

          // Estimates
          if (options.includeEstimates && artwork.low_est && artwork.high_est) {
            doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2])
            doc.setFontSize(11)
            doc.setFont(undefined, 'bold')
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
              doc.setFont(undefined, 'normal')
              doc.text(dimension, contentX, contentY)
              contentY += 4
            }
          }

          // Description (truncated)
          if (options.includeDescription && artwork.description) {
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
            doc.setFontSize(8)
            doc.setFont(undefined, 'normal')
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
                      { key: 'includeLotNumbers', label: 'Include Lot Numbers' }
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
                    {options.includeImages && artwork.image_file_1 && (
                      <div className="mt-2 text-xs text-gray-500">[Image placeholder]</div>
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
              onClick={() => generatePDF('preview')}
              disabled={generating}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview PDF
            </button>
            
            <button
              onClick={() => generatePDF('download')}
              disabled={generating}
              className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              {generating ? 'Generating...' : 'Download PDF'}
            </button>

            <button
              onClick={() => generatePDF('share')}
              disabled={generating}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share PDF
            </button>

            <button
              onClick={() => generatePDF('print')}
              disabled={generating}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
