// frontend/src/components/items/AIBulkGenerationModal.tsx
"use client"

import React, { useState, useRef } from 'react'
import { X, Upload, Eye, Trash2, Sparkles, Check, Loader } from 'lucide-react'
import { syncArtworksToGoogleSheet } from '@/lib/google-sheets-api'
import { useBrand } from '@/lib/brand-context'

interface ImageFile {
  id: string
  file: File
  preview: string
  folder: string
  name: string
  generated?: boolean
  aiData?: any
}

interface AIBulkGenerationModalProps {
  onClose: () => void
  onComplete: (results: any[]) => void
}

export default function AIBulkGenerationModal({ onClose, onComplete }: AIBulkGenerationModalProps) {
  const { brand } = useBrand()
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStep, setCurrentStep] = useState<'select' | 'preview' | 'generating' | 'complete'>('select')
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generatedResults, setGeneratedResults] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle folder/file selection with support for multiple folders
  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const newImages: ImageFile[] = []
    const folderMap = new Map<string, ImageFile[]>()

    // Process all selected files
    Array.from(files).forEach((file, index) => {
      if (!file.type.startsWith('image/')) return

      // Extract folder name from file path or use index-based naming
      const path = (file as any).webkitRelativePath || file.name
      const pathParts = path.split('/')
      const folderName = pathParts.length > 1 ? pathParts[0] : `folder-${Math.floor(index / 10) + 1}`
      
      const imageFile: ImageFile = {
        id: `${Date.now()}-${index}`,
        file,
        preview: URL.createObjectURL(file),
        folder: folderName,
        name: file.name,
        generated: false
      }

      if (!folderMap.has(folderName)) {
        folderMap.set(folderName, [])
      }
      folderMap.get(folderName)!.push(imageFile)
    })

    // Sort folders by name and maintain order within folders
    const sortedFolders = Array.from(folderMap.entries()).sort(([a], [b]) => {
      // Extract numbers from folder names for proper sorting (inv-1, inv-2, etc.)
      const getNumber = (name: string) => {
        const match = name.match(/(\d+)/)
        return match ? parseInt(match[1]) : 0
      }
      return getNumber(a) - getNumber(b)
    })

    // Flatten images maintaining folder order
    sortedFolders.forEach(([folder, images]) => {
      images.sort((a, b) => a.name.localeCompare(b.name))
      newImages.push(...images)
    })

    setSelectedImages(newImages)
    setCurrentStep('preview')
  }

  // Remove individual image
  const removeImage = (imageId: string) => {
    setSelectedImages(prev => {
      const updated = prev.filter(img => img.id !== imageId)
      
      // Clean up preview URLs
      const removedImage = prev.find(img => img.id === imageId)
      if (removedImage) {
        URL.revokeObjectURL(removedImage.preview)
      }
      
      return updated
    })
  }

  // Generate AI data for all images
  const generateAIData = async () => {
    if (selectedImages.length === 0) return

    setIsGenerating(true)
    setCurrentStep('generating')
    setGenerationProgress(0)

    const results: any[] = []

    for (let i = 0; i < selectedImages.length; i++) {
      const image = selectedImages[i]
      
      try {
        // Create FormData for AI analysis
        const formData = new FormData()
        formData.append('image', image.file)

        // Call AI analysis endpoint
        const token = localStorage.getItem('token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/items/ai-analyze`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`AI analysis failed for ${image.name}`)
        }

        const aiResult = await response.json()
        
        if (aiResult.success) {
          // Create artwork data with image
          const artworkData = {
            ...aiResult.result,
            image_file_1: image.preview, // Will be replaced with actual uploaded URL
            folder: image.folder,
            original_filename: image.name,
            _imageFile: image.file // Keep reference to file for upload
          }

          results.push(artworkData)
          
          // Update image status
          setSelectedImages(prev => prev.map(img => 
            img.id === image.id 
              ? { ...img, generated: true, aiData: artworkData }
              : img
          ))
        } else {
          console.error(`AI analysis failed for ${image.name}:`, aiResult.error)
        }
      } catch (error) {
        console.error(`Error processing ${image.name}:`, error)
      }

      // Update progress
      setGenerationProgress(((i + 1) / selectedImages.length) * 100)
    }

    setGeneratedResults(results)
    setIsGenerating(false)
    setCurrentStep('complete')
  }

  // Save all generated artworks to database and sync to Google Sheets
  const saveAllArtworks = async () => {
    if (generatedResults.length === 0) return

    setIsGenerating(true)

    try {
      const savedArtworks = []

      for (const artworkData of generatedResults) {
        // Upload image first
        let imageUrl = ''
        if (artworkData._imageFile) {
          const imageFormData = new FormData()
          imageFormData.append('itemId', `temp_${Date.now()}`)
          imageFormData.append('image_file_1', artworkData._imageFile)

          const token = localStorage.getItem('token')
          const imageResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/images/process-item-images`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: imageFormData,
          })

          if (imageResponse.ok) {
            const imageResult = await imageResponse.json()
            if (imageResult.success && imageResult.images?.image_file_1) {
              imageUrl = imageResult.images.image_file_1
            }
          }
        }

        // Create artwork in database
        const artworkToSave = {
          ...artworkData,
          image_file_1: imageUrl,
          lot_num: await generateNextLotNumber(), // Generate sequential lot numbers
        }

        // Remove temporary fields
        delete artworkToSave._imageFile
        delete artworkToSave.folder
        delete artworkToSave.original_filename

        // Save to database
        const token = localStorage.getItem('token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(artworkToSave),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            savedArtworks.push(result.data)
          }
        }
      }

      // Sync to Google Sheets
      if (savedArtworks.length > 0) {
        const syncResult = await syncArtworksToGoogleSheet(savedArtworks, undefined, brand)
        if (!syncResult.success) {
          console.warn('Google Sheets sync failed:', syncResult.error)
          // Don't block the process, just log the warning
        }
      }

      // Clean up preview URLs
      selectedImages.forEach(img => URL.revokeObjectURL(img.preview))

      // Complete the process
      onComplete(savedArtworks)
    } catch (error) {
      console.error('Error saving artworks:', error)
      alert('Error saving some artworks. Please check the console for details.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate next available lot number
  const generateNextLotNumber = async (): Promise<string> => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/items?limit=1&sort_field=lot_num&sort_direction=desc`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.length > 0) {
          const lastLotNum = parseInt(data.data[0].lot_num) || 0
          return (lastLotNum + 1).toString()
        }
      }
    } catch (error) {
      console.error('Error getting last lot number:', error)
    }
    
    return '1' // Default to 1 if no items exist
  }



  // Group images by folder for display
  const groupedImages = selectedImages.reduce((groups, image) => {
    if (!groups[image.folder]) {
      groups[image.folder] = []
    }
    groups[image.folder].push(image)
    return groups
  }, {} as Record<string, ImageFile[]>)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AI Bulk Generation</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select folders with images to generate artwork details with AI
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {currentStep === 'select' && (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="text-center mb-8">
                <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select Multiple Folders
                </h3>
                <p className="text-sm text-gray-600 max-w-md">
                  Choose folders containing images (like inv-1, inv-2, etc.). All images from selected folders will be processed in order.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelection}
                className="hidden"
                {...({ webkitdirectory: "true" } as any)} // Allow folder selection
              />

              <div className="space-y-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Select Folders
                </button>
                
                <button
                  onClick={() => {
                    // Reset input to allow file selection instead of folders
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('webkitdirectory')
                      fileInputRef.current.click()
                      fileInputRef.current.setAttribute('webkitdirectory', 'true')
                    }
                  }}
                  className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Select Individual Files
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4 text-center max-w-sm">
                Supported formats: JPG, PNG, GIF. Images will be processed in folder order (inv-1, inv-2, etc.).
              </p>
            </div>
          )}

          {currentStep === 'preview' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Preview Selected Images ({selectedImages.length} total)
                </h3>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setCurrentStep('select')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Back
                  </button>
                  <button
                    onClick={generateAIData}
                    disabled={selectedImages.length === 0}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate AI Details
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {Object.entries(groupedImages).map(([folder, images]) => (
                  <div key={folder} className="mb-6">
                    <h4 className="text-md font-medium text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">
                      📁 {folder} ({images.length} images)
                    </h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {images.map((image) => (
                        <div key={image.id} className="relative group">
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={image.preview}
                              alt={image.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          <button
                            onClick={() => removeImage(image.id)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          
                          <p className="text-xs text-gray-600 mt-1 truncate" title={image.name}>
                            {image.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'generating' && (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="text-center mb-8">
                <Loader className="h-16 w-16 text-purple-600 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Generating AI Details
                </h3>
                <p className="text-sm text-gray-600">
                  Processing {selectedImages.length} images with AI analysis...
                </p>
              </div>

              <div className="w-full max-w-md">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{Math.round(generationProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 max-w-md">
                <div className="text-sm text-gray-600 space-y-1">
                  {selectedImages.map((image) => (
                    <div key={image.id} className="flex items-center space-x-2">
                      {image.generated ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Loader className="h-4 w-4 text-purple-600 animate-spin" />
                      )}
                      <span className={image.generated ? 'text-green-600' : ''}>
                        {image.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="h-full flex flex-col">
              <div className="text-center mb-6">
                <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  AI Generation Complete
                </h3>
                <p className="text-sm text-gray-600">
                  Successfully generated details for {generatedResults.length} artworks
                </p>
              </div>

              <div className="flex-1 overflow-auto mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generatedResults.map((result, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex space-x-3">
                        <img
                          src={selectedImages[index]?.preview}
                          alt={result.title}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {result.title}
                          </h4>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {result.description}
                          </p>
                          <div className="text-xs text-gray-500 mt-1">
                            Est: £{result.low_est} - £{result.high_est}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setCurrentStep('preview')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Back to Preview
                </button>
                <button
                  onClick={saveAllArtworks}
                  disabled={isGenerating}
                  className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isGenerating && <Loader className="h-4 w-4 mr-2 animate-spin" />}
                  Save All & Sync to Sheets
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
