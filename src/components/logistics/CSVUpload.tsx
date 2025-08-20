// frontend/src/components/logistics/CSVUpload.tsx
"use client"

import React, { useState, useRef } from 'react'
import { Upload, X, Download, AlertCircle, CheckCircle } from 'lucide-react'
import { importLogisticsCSV } from '@/lib/logistics-api'

interface CSVUploadProps {
  onUploadComplete: (importedCount: number) => void;
  onClose: () => void;
  className?: string;
}

export default function CSVUpload({ onUploadComplete, onClose, className = '' }: CSVUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [errors, setErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      setResult(null)
      setErrors([])
    } else {
      alert('Please select a valid CSV file.')
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const droppedFile = event.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile)
      setResult(null)
      setErrors([])
    } else {
      alert('Please drop a valid CSV file.')
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n')
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row')
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      if (values.length === headers.length) {
        const row: any = {}
        headers.forEach((header, index) => {
          // Map CSV headers to expected field names
          const fieldMapping: Record<string, string> = {
            'reference number': 'reference_number',
            'reference_number': 'reference_number',
            'description': 'description',
            'height (in)': 'height_inches',
            'height_inches': 'height_inches',
            'width (in)': 'width_inches',
            'width_inches': 'width_inches',
            'length (in)': 'length_inches',
            'length_inches': 'length_inches',
            'weight (kg)': 'weight_kg',
            'weight_kg': 'weight_kg',
            'destination type': 'destination_type',
            'destination_type': 'destination_type',
            'country': 'destination_country',
            'destination_country': 'destination_country',
            'address': 'destination_address',
            'destination_address': 'destination_address',
            'item value': 'item_value',
            'item_value': 'item_value',
            'status': 'status',
            'tracking number': 'tracking_number',
            'tracking_number': 'tracking_number'
          }

          const fieldName = fieldMapping[header.toLowerCase()] || header.toLowerCase()
          row[fieldName] = values[index]
        })
        data.push(row)
      }
    }

    return data
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setResult(null)
    setErrors([])

    try {
      const csvText = await file.text()
      const csvData = parseCSV(csvText)

      const response = await importLogisticsCSV(csvData)
      setResult(response)

      if (response.errors && response.errors.length > 0) {
        setErrors(response.errors)
      }

      if (response.imported > 0) {
        setTimeout(() => {
          onUploadComplete(response.imported)
        }, 2000)
      }
    } catch (error: any) {
      console.error('Error uploading CSV:', error)
      setErrors([error.message || 'An error occurred while uploading the file'])
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = () => {
    const template = `Reference Number,Description,Height (in),Width (in),Length (in),Weight (kg),Destination Type,Country,Address,Item Value,Status,Tracking Number
LOG-2024-001,Sample shipment,24,18,2,5.5,within_uk,United Kingdom,London,750,pending,
LOG-2024-002,International shipment,36,24,12,25,outside_uk,United States,New York,2500,pending,`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'logistics_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Import Logistics from CSV</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {!result && (
          <>
            <div className="mb-4">
              <button
                onClick={downloadTemplate}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                <Download className="h-4 w-4" />
                <span>Download CSV Template</span>
              </button>
            </div>

            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                ref={fileInputRef}
                className="hidden"
              />
              
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              
              {file ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Selected file: <span className="font-medium">{file.name}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    File size: {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-600">
                    Drag and drop your CSV file here, or{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-gray-500">
                    Supports .csv files only
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <h4 className="text-sm font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Required fields: Reference Number, Height, Width, Length, Weight, Destination Type, Item Value</li>
                <li>• Destination Type must be either "within_uk" or "outside_uk"</li>
                <li>• Dimensions should be in inches, weight in kg</li>
                <li>• Status can be: pending, in_transit, delivered, cancelled</li>
                <li>• Use the template above for the correct format</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {uploading && (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                )}
                <span>{uploading ? 'Uploading...' : 'Upload CSV'}</span>
              </button>
            </div>
          </>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <h4 className="font-medium text-gray-900">Import Completed</h4>
                <p className="text-sm text-gray-600">
                  Successfully imported {result.imported} logistics entries
                </p>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="p-4 bg-yellow-50 rounded-md">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-medium text-yellow-800">
                      Some rows had issues:
                    </h5>
                    <ul className="mt-2 text-xs text-yellow-700 space-y-1 max-h-32 overflow-y-auto">
                      {errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 