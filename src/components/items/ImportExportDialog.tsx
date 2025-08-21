// frontend/src/components/items/ImportExportDialog.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { X, Upload, Download, FileText, Globe, AlertCircle, CheckCircle } from 'lucide-react'
import { ArtworksAPI } from '@/lib/items-api'
import { 
  loadBrandGoogleSheetUrl, 
  saveBrandGoogleSheetUrl,
  syncArtworksFromGoogleSheet,
  getApiBaseUrl 
} from '@/lib/google-sheets-api'

interface ImportExportDialogProps {
  mode: 'import' | 'export'
  onClose: () => void
  onComplete?: (result: any) => void
  selectedItems?: string[]
  brand?: string
}

type Format = 'csv' | 'spreadsheet'
type Platform = 'database' | 'liveauctioneers' | 'easylive' | 'thesaleroom' | 'invaluable'

interface PlatformConfig {
  label: string
  description: string
  csvHeaders: string[]
  requiredFields: string[]
  sampleData?: string[]
}

const platformConfigs: Record<Platform, PlatformConfig> = {
  database: {
    label: 'Our Database',
    description: 'Full format with all available fields',
    csvHeaders: [
      'id', 'title', 'description', 'low_est', 'high_est', 'start_price', 'condition', 'reserve', 'consignor',
      'status', 'category', 'subcategory', 'dimensions', 'weight', 'materials', 'artist_maker', 'period_age', 'provenance', 'auction_id',
      'artist_id', 'school_id', 'dimensions_inches', 'dimensions_cm', 'dimensions_with_frame_inches', 'dimensions_with_frame_cm',
      'condition_report', 'gallery_certification', 'gallery_id', 'artist_certification', 'certified_artist_id', 'artist_family_certification',
      'restoration_done', 'restoration_by', 'image_file_1', 'image_file_2', 'image_file_3', 'image_file_4', 'image_file_5',
      'image_file_6', 'image_file_7', 'image_file_8', 'image_file_9', 'image_file_10', 'created_at', 'updated_at'
    ],
    requiredFields: ['id', 'title', 'description', 'low_est', 'high_est']
  },
  liveauctioneers: {
    label: 'LiveAuctioneers',
    description: 'Compatible with LiveAuctioneers CSV format',
    csvHeaders: ['LotNum', 'Title', 'Description', 'LowEst', 'HighEst', 'StartPrice', 'ReservePrice', 'Buy Now Price', 'Exclude From Buy Now', 'Condition', 'Category', 'Origin', 'Style & Period', 'Creator', 'Materials & Techniques', 'Reserve Price', 'Domestic Flat Shipping Price', 'Height', 'Width', 'Depth', 'Dimension Unit', 'Weight', 'Weight Unit', 'Quantity'],
    requiredFields: ['LotNum', 'Title', 'Description', 'LowEst', 'HighEst'],
    sampleData: ['1', 'MAQBOOL FIDA HUSAIN (1915-2011) WATERCOLOUR ON PAPER SIGNED LOWER RIGHT', 'MAQBOOL FIDA HUSAIN (1915-2011) WATERCOLOUR ON PAPER .THESE WORKS ARE HIGHLY SOUGHT AFTER, MUCH LIKE THOSE BY RENOWNED ARTISTS SUCH AS M.F. HUSAIN, S.H. RAZA, F.N. SOUZA, AKBAR PADAMSEE, HEMENDRANATH MAZUMDAR, RAM KUMAR, JAMINI ROY, B. PRABHA, TYEB MEHTA, AND MANY OTHERS. THEY ARE OFTEN SOLD BY AUCTIONEERS TO COLLECTORS AROUND THE GLOBE<BR><BR>30 X 22 INCHES', '8000', '12000', '8000', '8000', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
  },
  easylive: {
    label: 'Easy Live Auction',
    description: 'Compatible with Easy Live Auction CSV format',
    csvHeaders: ['LotNo', 'Description', 'Condition Report', 'LowEst', 'HighEst', 'Category'],
    requiredFields: ['LotNo', 'Description', 'LowEst', 'HighEst'],
    sampleData: ['1', 'Example Lot 1', 'Condition Report 1', '10', '10', 'Furniture']
  },
  thesaleroom: {
    label: 'The Saleroom',
    description: 'Compatible with The Saleroom CSV format',
    csvHeaders: ['Number', 'Title', 'Description', 'Hammer', 'Reserve', 'StartPrice', 'Increment', 'Quantity', 'LowEstimate', 'HighEstimate', 'CategoryCode', 'Sales Tax/VAT', 'BuyersPremiumRate', 'BuyersPremiumCeiling', 'InternetSurchargeRate', 'InternetSurchargeCeiling', 'BuyersPremiumVatRate', 'InternetSurchargeVatRate', 'End Date', 'End Time', 'Lot Link', 'Main Image', 'ExtraImages', 'BuyItNowPrice', 'IsBulk', 'Artist\'s Resale Right Applies', 'Address1', 'Address2', 'Address3', 'Address4', 'Postcode', 'TownCity', 'CountyState', 'CountryCode', 'ShippingInfo'],
    requiredFields: ['Number', 'Title', 'Description', 'LowEstimate', 'HighEstimate'],
    sampleData: ['1', 'Pierre Jeanneret (1896-1967) Desk designed for the Administrative buildings, Chandigarh, North ...', '<p><strong>Pierre Jeanneret (1896-1967)&nbsp;</strong><br><br>Desk designed for the Administrative buildings, Chandigarh, North India, circa 1957&nbsp;<br>Teak, leather inset top&nbsp;<br>71.5cm high, 121.5cm wide, 84cm deep&nbsp;<br><br><strong>Literature&nbsp;</strong><br>Patrick Seguin, \'Le Corbusier, Pierre Jeanneret, Chandigarh India\', Galerie Patrick Seguin, Paris, 2014, p.288&nbsp;</p> <p><strong>Provenance&nbsp;</strong><br>Vigo Gallery, London&nbsp;</p> Condition Report:  <p>Professional restoration towards bottom of front right support, overall general surface wear to include scratches, scuffs and marks commensurate with age and use.</p>', '2000.00', '2000.00', '1400.00', '', '1', '2000.00', '2500.00', 'FUR', '', '', '', '', '', '', '', '13/08/2025', '10:00', 'en-gb/auction-catalogues/metsab/catalogue-id-metsab10000/lot-a81ba4c4-f7fb-462a-9520-b33800c32b65', 'https://cdn.globalauctionplatform.com/54b11a1b-bf41-4c81-b480-b33800c14324/78df6eb5-4bde-440b-9f50-b33800c41734/original.jpg', 'https://cdn.globalauctionplatform.com/54b11a1b-bf41-4c81-b480-b33800c14324/6a526f16-4f89-4239-bf90-b33800c41895/original.jpg', '', 'False', 'False', '', '', '', '', '', '', '', '']
  },
  invaluable: {
    label: 'Invaluable',
    description: 'Compatible with Invaluable CSV format',
    csvHeaders: ['id', 'title', 'description', 'low_est', 'high_est', 'start_price', 'condition', 'category', 'dimensions'],
    requiredFields: ['id', 'title', 'description', 'low_est', 'high_est']
  }
}

export default function ImportExportDialog({
  mode,
  onClose,
  onComplete,
  selectedItems = [],
  brand = 'MSABER'
}: ImportExportDialogProps) {
  const [format, setFormat] = useState<Format>('csv')
  const [platform, setPlatform] = useState<Platform>('database')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState('')
  const [googleSheetUrl, setGoogleSheetUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Google Sheets configuration
  const [hasGoogleSheetConfig, setHasGoogleSheetConfig] = useState(false)
  const [showUrlConfig, setShowUrlConfig] = useState(false)
  const [editingUrl, setEditingUrl] = useState('')

  useEffect(() => {
    if (format === 'spreadsheet') {
      loadGoogleSheetConfig()
    }
  }, [format, brand])

  const loadGoogleSheetConfig = async () => {
    try {
      const url = await loadBrandGoogleSheetUrl(brand, 'artworks')
      if (url) {
        setGoogleSheetUrl(url)
        setHasGoogleSheetConfig(true)
      } else {
        setHasGoogleSheetConfig(false)
      }
    } catch (error) {
      console.error('Error loading Google Sheet config:', error)
      setHasGoogleSheetConfig(false)
    }
  }

  const saveGoogleSheetConfig = async () => {
    try {
      const success = await saveBrandGoogleSheetUrl(brand, editingUrl, 'artworks')
      if (success) {
        setGoogleSheetUrl(editingUrl)
        setHasGoogleSheetConfig(true)
        setShowUrlConfig(false)
        setSuccess('Google Sheets URL saved successfully!')
      } else {
        setError('Failed to save Google Sheets URL')
      }
    } catch (error) {
      console.error('Error saving Google Sheet config:', error)
      setError('Failed to save Google Sheets URL')
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setCsvFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setCsvData(e.target?.result as string)
      }
      reader.readAsText(file)
    }
  }

  const validateCSV = async () => {
    try {
      setLoading(true)
      setError('')
      
      const result = await ArtworksAPI.validateCSV(csvData, platform as any)
      
      if (result.success && result.validation_result) {
        const { total_rows, valid_rows, errors } = result.validation_result
        setProgress(`Validation complete: ${valid_rows}/${total_rows} rows valid`)
        
        if (errors.length > 0) {
          setError(`Validation errors: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`)
        }
        
        return result.validation_result
      } else {
        setError(result.error || 'Validation failed')
        return null
      }
    } catch (error: any) {
      setError(error.message || 'Validation failed')
      return null
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    try {
      setLoading(true)
      setError('')
      setProgress('Starting import...')

      let result
      
      if (format === 'csv') {
        if (!csvData) {
          setError('Please select a CSV file')
          return
        }
        
        setProgress('Validating CSV...')
        const validation = await validateCSV()
        if (!validation) return
        
        setProgress('Importing data...')
        result = await ArtworksAPI.uploadCSV(csvData, platform as any)
        
      } else if (format === 'spreadsheet') {
        if (!googleSheetUrl) {
          setError('Please configure Google Sheets URL')
          return
        }
        
        setProgress('Syncing from Google Sheets...')
        result = await syncArtworksFromGoogleSheet(googleSheetUrl, brand, platform)
      }

      if (result?.success) {
        const importedCount = (result as any).imported_count || (result as any).upserted || 0;
        setSuccess(`Import complete! ${importedCount} artworks imported.`)
        setTimeout(() => {
          onComplete?.(result)
        }, 2000)
      } else {
        setError(result?.error || 'Import failed')
      }

    } catch (error: any) {
      setError(error.message || 'Import failed')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  const handleExport = async () => {
    try {
      setLoading(true)
      setError('')
      setProgress('Generating export...')

      if (format === 'csv') {
        await ArtworksAPI.exportCSV({
          platform: platform as any,
          ...(selectedItems.length > 0 && { item_ids: selectedItems })
        })
        setSuccess('Export complete! File downloaded.')
        
      } else if (format === 'spreadsheet') {
        // Spreadsheet export - export to Google Sheets if configured
        if (!hasGoogleSheetConfig) {
          setError('Google Sheets not configured for this brand. Please configure Google Sheets URL first.')
          return
        }
        
        setProgress('Fetching artworks for Google Sheets export...')
        
        // Get the actual artwork data for export
        const artworksResponse = await ArtworksAPI.getArtworks({
          ...(selectedItems.length > 0 ? {} : { limit: 1000 }),
          brand_code: brand as 'MSABER' | 'AURUM' | 'METSAB'
        })
        
        if (!artworksResponse.success) {
          setError('Failed to fetch artworks for export')
          return
        }
        
        // Filter to selected items if any are selected
        const artworksToExport = selectedItems.length > 0 
          ? artworksResponse.data.filter(artwork => selectedItems.includes(artwork.id!))
          : artworksResponse.data
        
        if (artworksToExport.length === 0) {
          setError('No artworks to export')
          return
        }
        
        setProgress('Syncing to Google Sheets...')
        
        // Use the sync to Google Sheets API
        const apiUrl = getApiBaseUrl()
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
        
        const response = await fetch(`${apiUrl}/api/items/sync-to-google-sheet`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            sheet_url: googleSheetUrl,
            artworks: artworksToExport,
            brand: brand
          })
        })
        
        const result = await response.json()
        
        if (result.success) {
          setSuccess(`Export complete! ${artworksToExport.length} artworks synced to Google Sheets.`)
        } else {
          setError(result.error || 'Failed to sync to Google Sheets. Check your configuration.')
        }
      }

    } catch (error: any) {
      setError(error.message || 'Export failed')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  const downloadTemplate = async () => {
    try {
      await ArtworksAPI.downloadTemplate(platform as any)
    } catch (error: any) {
      setError('Failed to download template')
    }
  }

  const currentConfig = platformConfigs[platform]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">
              {mode === 'import' ? 'Import Artworks' : 'Export Artworks'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Format Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('csv')}
                className={`p-3 border rounded-lg text-left ${
                  format === 'csv' 
                    ? 'border-teal-500 bg-teal-50 text-teal-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <FileText className="h-5 w-5 mb-2" />
                <div className="font-medium">CSV File</div>
                <div className="text-sm text-gray-500">Upload or download CSV files</div>
              </button>
              
              <button
                onClick={() => setFormat('spreadsheet')}
                className={`p-3 border rounded-lg text-left ${
                  format === 'spreadsheet' 
                    ? 'border-teal-500 bg-teal-50 text-teal-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Globe className="h-5 w-5 mb-2" />
                <div className="font-medium">Google Sheets</div>
                <div className="text-sm text-gray-500">Sync with Google Spreadsheets</div>
              </button>
            </div>
          </div>

          {/* Platform Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {Object.entries(platformConfigs).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">{currentConfig.description}</p>
          </div>

          {/* Platform Details */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Platform Details</h4>
            <div className="text-xs text-gray-600">
              <div><strong>Required fields:</strong> {currentConfig.requiredFields.join(', ')}</div>
              <div className="mt-1"><strong>Total fields:</strong> {currentConfig.csvHeaders.length}</div>
            </div>
            
            <button
              onClick={downloadTemplate}
              className="mt-2 text-xs text-teal-600 hover:text-teal-700 underline"
            >
              Download {currentConfig.label} Template
            </button>
          </div>

          {/* CSV File Upload */}
          {mode === 'import' && format === 'csv' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
              {csvFile && (
                <p className="text-sm text-gray-600 mt-1">
                  Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          )}

          {/* Google Sheets Configuration */}
          {format === 'spreadsheet' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Google Sheets URL
                </label>
                <button
                  onClick={() => setShowUrlConfig(!showUrlConfig)}
                  className="text-sm text-teal-600 hover:text-teal-700"
                >
                  {hasGoogleSheetConfig ? 'Change URL' : 'Configure URL'}
                </button>
              </div>
              
              {hasGoogleSheetConfig ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-green-800">Google Sheets URL configured</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
                    <span className="text-sm text-yellow-800">No Google Sheets URL configured for artworks</span>
                  </div>
                </div>
              )}

              {showUrlConfig && (
                <div className="mt-3 p-3 border border-gray-200 rounded-md">
                  <input
                    type="url"
                    value={editingUrl}
                    onChange={(e) => setEditingUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 mb-2"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={saveGoogleSheetConfig}
                      className="px-3 py-1 bg-teal-600 text-white rounded text-sm hover:bg-teal-700"
                    >
                      Save URL
                    </button>
                    <button
                      onClick={() => setShowUrlConfig(false)}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Export Options */}
          {mode === 'export' && selectedItems.length > 0 && (
            <div className="mb-6 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                Exporting {selectedItems.length} selected artwork(s)
              </p>
            </div>
          )}

          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-sm text-green-800">{success}</span>
              </div>
            </div>
          )}

          {progress && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm text-blue-800">{progress}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            
            <button
              onClick={mode === 'import' ? handleImport : handleExport}
              disabled={loading || (mode === 'import' && format === 'csv' && !csvData) || (format === 'spreadsheet' && !hasGoogleSheetConfig)}
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Processing...
                </div>
              ) : (
                <>
                  {mode === 'import' ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 inline" />
                      Import
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2 inline" />
                      Export
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
