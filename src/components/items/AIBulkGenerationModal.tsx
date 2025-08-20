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

interface FolderItem {
  id: string
  folderName: string
  images: ImageFile[]
  generated?: boolean
  aiData?: any
}

interface AIBulkGenerationModalProps {
  onClose: () => void
  onComplete: (results: any[]) => void
}

export default function AIBulkGenerationModal({ onClose, onComplete }: AIBulkGenerationModalProps) {
  const { brand } = useBrand()
  const [selectedFolders, setSelectedFolders] = useState<FolderItem[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStep, setCurrentStep] = useState<'select' | 'preview' | 'generating' | 'complete'>('select')
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generatedResults, setGeneratedResults] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle folder/file selection with support for multiple folders
  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const folderMap = new Map<string, ImageFile[]>()

    // Process all selected files and group by subfolder
    Array.from(files).forEach((file, index) => {
      if (!file.type.startsWith('image/')) return

      // Extract folder path - for folder selection, use the directory structure
      const path = (file as any).webkitRelativePath || file.name
      const pathParts = path.split('/')
      
      // For folder uploads: ParentFolder/SubfolderA/image.jpg -> use SubfolderA
      // For individual files: use auto-generated folder names
      let folderName: string
      if (pathParts.length > 2) {
        // Has parent folder and subfolder - use subfolder as inventory item
        folderName = `${pathParts[0]}/${pathParts[1]}`
      } else if (pathParts.length > 1) {
        // Direct folder upload - use folder name
        folderName = pathParts[0]
      } else {
        // Individual files - group them
        folderName = `individual-item-${Math.floor(index / 1) + 1}`
      }
      
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

    // Convert to FolderItem objects
    const folderItems: FolderItem[] = Array.from(folderMap.entries())
      .sort(([a], [b]) => {
        // Extract numbers from folder names for proper sorting
        const getNumber = (name: string) => {
          const match = name.match(/(\d+)/)
          return match ? parseInt(match[1]) : 0
        }
        return getNumber(a) - getNumber(b)
      })
      .map(([folderName, images]) => {
        // Sort images within each folder
        images.sort((a, b) => a.name.localeCompare(b.name))
        
        return {
          id: `folder-${Date.now()}-${folderName}`,
          folderName,
          images,
          generated: false
        }
      })

    setSelectedFolders(folderItems)
    setCurrentStep('preview')
  }

  // Remove entire folder (inventory item)
  const removeFolder = (folderId: string) => {
    setSelectedFolders(prev => {
      const folderToRemove = prev.find(folder => folder.id === folderId)
      if (folderToRemove) {
        // Clean up preview URLs for all images in the folder
        folderToRemove.images.forEach(img => URL.revokeObjectURL(img.preview))
      }
      
      return prev.filter(folder => folder.id !== folderId)
    })
  }

  // Remove individual image from a folder
  const removeImageFromFolder = (folderId: string, imageId: string) => {
    setSelectedFolders(prev => prev.map(folder => {
      if (folder.id === folderId) {
        const imageToRemove = folder.images.find(img => img.id === imageId)
        if (imageToRemove) {
          URL.revokeObjectURL(imageToRemove.preview)
        }
        
        const updatedImages = folder.images.filter(img => img.id !== imageId)
        // If no images left, remove the entire folder
        if (updatedImages.length === 0) {
          return null
        }
        
        return {
          ...folder,
          images: updatedImages
        }
      }
      return folder
    }).filter(Boolean) as FolderItem[])
  }

  // Generate AI data for all folders (using first image from each folder)
  const generateAIData = async () => {
    if (selectedFolders.length === 0) return

    setIsGenerating(true)
    setCurrentStep('generating')
    setGenerationProgress(0)

    const results: any[] = []

    for (let i = 0; i < selectedFolders.length; i++) {
      const folder = selectedFolders[i]
      
      // Use the first image from the folder for AI analysis
      const firstImage = folder.images[0]
      if (!firstImage) continue
      
      try {
        // Create FormData for AI analysis (using only the first image)
        const formData = new FormData()
        formData.append('image', firstImage.file)

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
          throw new Error(`AI analysis failed for ${folder.folderName}`)
        }

        const aiResult = await response.json()
        
        if (aiResult.success) {
          // Create artwork data with folder information
          const artworkData = {
            ...aiResult.result,
            folder: folder.folderName,
            original_filename: firstImage.name,
            _folderImages: folder.images, // Keep all images for upload
            _primaryImageFile: firstImage.file // Primary image for display
          }

          results.push(artworkData)
          
          // Update folder status
          setSelectedFolders(prev => prev.map(f => 
            f.id === folder.id 
              ? { ...f, generated: true, aiData: artworkData }
              : f
          ))
        } else {
          console.error(`AI analysis failed for ${folder.folderName}:`, aiResult.error)
        }
      } catch (error) {
        console.error(`Error processing ${folder.folderName}:`, error)
      }

      // Update progress
      setGenerationProgress(((i + 1) / selectedFolders.length) * 100)
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
        // Upload all images from the folder
        const imageUrls: { [key: string]: string } = {}
        
        if (artworkData._folderImages && artworkData._folderImages.length > 0) {
          const imageFormData = new FormData()
          const tempItemId = `temp_${Date.now()}_${Math.random()}`
          imageFormData.append('itemId', tempItemId)

          // Add all images from the folder
          artworkData._folderImages.forEach((image: ImageFile, index: number) => {
            const fieldName = `image_file_${index + 1}`
            imageFormData.append(fieldName, image.file)
          })

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
            if (imageResult.success && imageResult.images) {
              // Store all uploaded image URLs
              Object.assign(imageUrls, imageResult.images)
            }
          }
        }

        // Create artwork in database
        const artworkToSave = {
          ...artworkData,
          ...imageUrls, // Include all uploaded image URLs
          lot_num: await generateNextLotNumber(), // Generate sequential lot numbers
        }

        // Remove temporary fields
        delete artworkToSave._folderImages
        delete artworkToSave._primaryImageFile
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
      selectedFolders.forEach(folder => {
        folder.images.forEach(img => URL.revokeObjectURL(img.preview))
      })

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



  // Calculate total image count across all folders
  const totalImageCount = selectedFolders.reduce((total, folder) => total + folder.images.length, 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AI Bulk Generation</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select folders to create inventory items. Each subfolder becomes one item with multiple images.
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
                  Choose a parent folder containing subfolders (like ParentFolder/inv-1/, ParentFolder/inv-2/, etc.). 
                  Each subfolder becomes one inventory item, with all its images uploaded but only the first used for AI analysis.
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
                Supported formats: JPG, PNG, GIF. Each subfolder becomes one inventory item with multiple images. 
                First image per folder is used for AI analysis.
              </p>
            </div>
          )}

          {currentStep === 'preview' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Preview Selected Folders ({selectedFolders.length} items, {totalImageCount} images total)
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
                    disabled={selectedFolders.length === 0}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate AI Details ({selectedFolders.length} items)
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {selectedFolders.map((folder) => (
                  <div key={folder.id} className="mb-6 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-medium text-gray-800 flex items-center">
                        📁 {folder.folderName} 
                        <span className="ml-2 text-sm text-gray-600">({folder.images.length} images)</span>
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Inventory Item
                        </span>
                      </h4>
                      <button
                        onClick={() => removeFolder(folder.id)}
                        className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        title="Remove entire folder"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {folder.images.map((image, index) => (
                        <div key={image.id} className="relative group">
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={image.preview}
                              alt={image.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          {/* Show primary image indicator */}
                          {index === 0 && (
                            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                              AI Primary
                            </div>
                          )}
                          
                          <button
                            onClick={() => removeImageFromFolder(folder.id, image.id)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove this image"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          
                          <p className="text-xs text-gray-600 mt-1 truncate" title={image.name}>
                            {image.name}
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      ℹ️ First image will be used for AI analysis. All images will be uploaded to storage.
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
                  Processing {selectedFolders.length} inventory items with AI analysis...
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
                  {selectedFolders.map((folder) => (
                    <div key={folder.id} className="flex items-center space-x-2">
                      {folder.generated ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Loader className="h-4 w-4 text-purple-600 animate-spin" />
                      )}
                      <span className={folder.generated ? 'text-green-600' : ''}>
                        📁 {folder.folderName} ({folder.images.length} images)
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
                  Successfully generated details for {generatedResults.length} inventory items
                </p>
              </div>

              <div className="flex-1 overflow-auto mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generatedResults.map((result, index) => {
                    const correspondingFolder = selectedFolders.find(f => f.aiData === result)
                    const primaryImage = correspondingFolder?.images[0]
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex space-x-3">
                          <div className="flex-shrink-0">
                            <img
                              src={primaryImage?.preview || ''}
                              alt={result.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                            <div className="text-xs text-center text-gray-500 mt-1">
                              +{correspondingFolder?.images.length || 0} images
                            </div>
                          </div>
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
                            <div className="text-xs text-blue-600 mt-1">
                              📁 {correspondingFolder?.folderName}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
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
