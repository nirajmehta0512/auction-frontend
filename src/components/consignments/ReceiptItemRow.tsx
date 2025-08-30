// frontend/src/components/consignments/ReceiptItemRow.tsx
"use client"

import React from 'react'
import SearchableSelect from '@/components/ui/SearchableSelect'

export interface ReceiptItemRowItemOption {
  id?: string
  lot_num?: string
  title?: string
  height_inches?: string
  width_inches?: string
  height_cm?: string
  width_cm?: string
  height_with_frame_inches?: string
  width_with_frame_inches?: string
  height_with_frame_cm?: string
  width_with_frame_cm?: string
  weight?: string
  low_est?: number
  high_est?: number
  reserve?: number
  artist_id?: string
  image_file_1?: string
  image_file_2?: string
}

export interface ReceiptItemRowArtistOption {
  id?: string
  name?: string
}

export interface ReceiptItem {
  id: string
  item_no: number
  artwork_id?: string
  artwork_title?: string
  artist_id?: string
  artist_name?: string
  height_inches?: string
  width_inches?: string
  height_cm?: string
  width_cm?: string
  height_with_frame_inches?: string
  width_with_frame_inches?: string
  height_with_frame_cm?: string
  width_with_frame_cm?: string
  weight?: string
  low_estimate?: number
  high_estimate?: number
  reserve?: number
  is_returned: boolean
  return_date?: string
  return_reason?: string
  return_location?: string
  returned_by_user_id?: string
  returned_by_user_name?: string
}

interface Props {
  receiptItem: ReceiptItem
  items: ReceiptItemRowItemOption[]
  artists: ReceiptItemRowArtistOption[]
  users: { id: number; first_name: string; last_name: string; role: string }[]
  onChange: (id: string, field: keyof ReceiptItem, value: any) => void
  onRemove?: (id: string) => void
  onAddArtist?: () => void
  onEditArtwork?: (artworkId: string) => void
}

export default function ReceiptItemRow({ receiptItem, items, artists, users, onChange, onRemove, onAddArtist, onEditArtwork }: Props) {
  const handleArtworkChange = (artworkId: string) => {
    // Handle "Create New" option
    if (artworkId === 'create_new') {
      onChange(receiptItem.id, 'artwork_id', 'new')
      onChange(receiptItem.id, 'artwork_title', '')
      onChange(receiptItem.id, 'height_inches', '')
      onChange(receiptItem.id, 'width_inches', '')
      onChange(receiptItem.id, 'height_cm', '')
      onChange(receiptItem.id, 'width_cm', '')
      onChange(receiptItem.id, 'height_with_frame_inches', '')
      onChange(receiptItem.id, 'width_with_frame_inches', '')
      onChange(receiptItem.id, 'height_with_frame_cm', '')
      onChange(receiptItem.id, 'width_with_frame_cm', '')
      onChange(receiptItem.id, 'weight', '')
      onChange(receiptItem.id, 'low_estimate', 0)
      onChange(receiptItem.id, 'high_estimate', 0)
      onChange(receiptItem.id, 'reserve', 0)
      onChange(receiptItem.id, 'artist_id', '')
      onChange(receiptItem.id, 'artist_name', '')
      return
    }

    // Handle clearing selection (empty value)
    if (!artworkId || artworkId === '') {
      onChange(receiptItem.id, 'artwork_id', '')
      onChange(receiptItem.id, 'artwork_title', '')
      onChange(receiptItem.id, 'height_inches', '')
      onChange(receiptItem.id, 'width_inches', '')
      onChange(receiptItem.id, 'height_cm', '')
      onChange(receiptItem.id, 'width_cm', '')
      onChange(receiptItem.id, 'height_with_frame_inches', '')
      onChange(receiptItem.id, 'width_with_frame_inches', '')
      onChange(receiptItem.id, 'height_with_frame_cm', '')
      onChange(receiptItem.id, 'width_with_frame_cm', '')
      onChange(receiptItem.id, 'weight', '')
      onChange(receiptItem.id, 'low_estimate', 0)
      onChange(receiptItem.id, 'high_estimate', 0)
      onChange(receiptItem.id, 'reserve', 0)
      onChange(receiptItem.id, 'artist_id', '')
      onChange(receiptItem.id, 'artist_name', '')
      return
    }

    // Handle existing artwork selection
    const selectedArtwork = items.find(item => String(item.id) === String(artworkId))
    if (selectedArtwork) {
      onChange(receiptItem.id, 'artwork_id', artworkId)
      onChange(receiptItem.id, 'artwork_title', selectedArtwork.title || '')
      onChange(receiptItem.id, 'height_inches', selectedArtwork.height_inches || '')
      onChange(receiptItem.id, 'width_inches', selectedArtwork.width_inches || '')
      onChange(receiptItem.id, 'height_cm', selectedArtwork.height_cm || '')
      onChange(receiptItem.id, 'width_cm', selectedArtwork.width_cm || '')
      onChange(receiptItem.id, 'height_with_frame_inches', selectedArtwork.height_with_frame_inches || '')
      onChange(receiptItem.id, 'width_with_frame_inches', selectedArtwork.width_with_frame_inches || '')
      onChange(receiptItem.id, 'height_with_frame_cm', selectedArtwork.height_with_frame_cm || '')
      onChange(receiptItem.id, 'width_with_frame_cm', selectedArtwork.width_with_frame_cm || '')
      onChange(receiptItem.id, 'weight', selectedArtwork.weight || '')
      onChange(receiptItem.id, 'low_estimate', selectedArtwork.low_est || 0)
      onChange(receiptItem.id, 'high_estimate', selectedArtwork.high_est || 0)
      onChange(receiptItem.id, 'reserve', selectedArtwork.reserve || 0)

      // Set artist information from artwork
      if ((selectedArtwork as any).artist_id) {
        const artist = artists.find(a => String(a.id) === String((selectedArtwork as any).artist_id))
        if (artist) {
          onChange(receiptItem.id, 'artist_id', String(artist.id))
          onChange(receiptItem.id, 'artist_name', artist.name || '')
        } else {
          onChange(receiptItem.id, 'artist_id', String((selectedArtwork as any).artist_id))
          onChange(receiptItem.id, 'artist_name', '')
        }
      } else {
        onChange(receiptItem.id, 'artist_id', '')
        onChange(receiptItem.id, 'artist_name', '')
      }
    } else {
      console.warn('Selected artwork not found:', artworkId)
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Artwork</label>
          <SearchableSelect
            value={receiptItem.artwork_id || ''}
            onChange={(v)=>handleArtworkChange(String(v))}
            options={[{ value: 'create_new', label: '+ Create New Artwork (Manual Entry)' }, ...items.map((it)=>({
              value: it.id || '',
              label: `${it.title || ''}${it.lot_num ? ` (Lot: ${it.lot_num})` : ''}`,
              description: `£${it.low_est || 0}-${it.high_est || 0}`
            }))]}
            placeholder="Select or search artwork"
          />
          {receiptItem.artwork_id === 'new' && (
            <p className="text-sm text-blue-600 mt-1">🔧 Manual entry mode: Fill in the details below manually</p>
          )}
          {receiptItem.artwork_id && receiptItem.artwork_id !== 'new' && (
            <p className="text-sm text-green-600 mt-1">✅ Existing artwork selected - details loaded automatically</p>
          )}
        </div>

        {receiptItem.artwork_id === 'new' && (
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Artwork Title</label>
            <input
              value={receiptItem.artwork_title || ''}
              onChange={(e)=> onChange(receiptItem.id, 'artwork_title', e.target.value)}
              placeholder="Enter artwork title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {receiptItem.artwork_id === 'new' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Artist</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SearchableSelect
                  value={receiptItem.artist_id || ''}
                  onChange={(v)=>{
                    if (v === '__create__') {
                      onAddArtist?.()
                      return
                    }
                    const artist = artists.find(a=> String(a.id) === String(v))
                    onChange(receiptItem.id, 'artist_id', String(v))
                    onChange(receiptItem.id, 'artist_name', artist?.name || '')
                  }}
                  options={[...artists.map((a)=>({ value: String(a.id) || '', label: a.name || '' })), { value: '__create__', label: '+ Create new artist' } ]}
                  placeholder="Search artist"
                />
                {receiptItem.artist_id && receiptItem.artist_name && (
                  <div className="text-xs text-green-600 mt-1">Selected: {receiptItem.artist_name}</div>
                )}
              </div>
              <button type="button" onClick={onAddArtist} className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded">+ Artist</button>
            </div>
          </div>
        )}

        {receiptItem.artwork_id === 'new' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={receiptItem.height_inches || ''}
                  onChange={(e)=> onChange(receiptItem.id, 'height_inches', e.target.value)}
                  placeholder="Height (inches)"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  value={receiptItem.width_inches || ''}
                  onChange={(e)=> onChange(receiptItem.id, 'width_inches', e.target.value)}
                  placeholder="Width (inches)"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  value={receiptItem.height_cm || ''}
                  onChange={(e)=> onChange(receiptItem.id, 'height_cm', e.target.value)}
                  placeholder="Height (cm)"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  value={receiptItem.width_cm || ''}
                  onChange={(e)=> onChange(receiptItem.id, 'width_cm', e.target.value)}
                  placeholder="Width (cm)"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  value={receiptItem.weight || ''}
                  onChange={(e)=> onChange(receiptItem.id, 'weight', e.target.value)}
                  placeholder="Weight"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Low Estimate (£)</label>
              <input
                type="number"
                value={receiptItem.low_estimate || ''}
                onChange={(e)=> onChange(receiptItem.id, 'low_estimate', parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">High Estimate (£)</label>
              <input
                type="number"
                value={receiptItem.high_estimate || ''}
                onChange={(e)=> onChange(receiptItem.id, 'high_estimate', parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reserve (£)</label>
              <input
                type="number"
                value={receiptItem.reserve || ''}
                onChange={(e)=> onChange(receiptItem.id, 'reserve', parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        {/* Display artwork details when existing artwork is selected */}
        {receiptItem.artwork_id && receiptItem.artwork_id !== 'new' && (
          <div className="lg:col-span-3">
            <div className="bg-gray-50 p-3 rounded-md mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">Selected Artwork Details</h4>
                {onEditArtwork && (
                  <button
                    type="button"
                    onClick={() => onEditArtwork(receiptItem.artwork_id!)}
                    className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    Edit Artwork
                  </button>
                )}
              </div>
              
              <div className="flex gap-4">
                {/* Artwork Images */}
                <div className="flex gap-2">
                  {(() => {
                    const selectedArtwork = items.find(item => String(item.id) === String(receiptItem.artwork_id))
                    
                    // Helper function to get proper image URL
                    const getImageUrl = (imageFile: string | undefined) => {
                      if (!imageFile) return null
                      
                      // If it's already a full URL, return as is
                      if (imageFile.startsWith('http')) return imageFile
                      
                      // If it's a relative path, construct the full URL
                      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
                      if (imageFile.startsWith('/')) {
                        return `${baseUrl}${imageFile}`
                      }
                      
                      // If it's just a filename, assume it's in the storage bucket
                      return `${baseUrl}/storage/v1/object/public/artwork-images/${imageFile}`
                    }
                    
                    const image1 = getImageUrl(selectedArtwork?.image_file_1)
                    const image2 = getImageUrl(selectedArtwork?.image_file_2)
                    
                    if (!image1 && !image2) {
                      return (
                        <div className="w-20 h-20 bg-gray-200 rounded border flex items-center justify-center text-xs text-gray-500">
                          No Image
                        </div>
                      )
                    }
                    
                    return (
                      <>
                        {image1 && (
                          <img
                            src={image1}
                            alt="Artwork 1"
                            className="w-20 h-20 object-cover rounded border"
                            onError={(e) => {
                              // Fallback for broken images
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        )}
                        {image2 && (
                          <img
                            src={image2}
                            alt="Artwork 2"
                            className="w-20 h-20 object-cover rounded border"
                            onError={(e) => {
                              // Fallback for broken images
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        )}
                      </>
                    )
                  })()}
                </div>
                
                {/* Artwork Details */}
                <div className="flex-1">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Title:</span>
                      <div className="font-medium">{receiptItem.artwork_title || '—'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Artist:</span>
                      <div className="font-medium">{receiptItem.artist_name || '—'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Dimensions:</span>
                      <div className="font-medium">
                        {receiptItem.height_inches && receiptItem.width_inches
                          ? `${receiptItem.height_inches}" × ${receiptItem.width_inches}"`
                          : receiptItem.height_cm && receiptItem.width_cm
                          ? `${receiptItem.height_cm}cm × ${receiptItem.width_cm}cm`
                          : receiptItem.height_inches
                          ? `${receiptItem.height_inches}" (H)`
                          : receiptItem.width_inches
                          ? `${receiptItem.width_inches}" (W)`
                          : receiptItem.height_cm
                          ? `${receiptItem.height_cm}cm (H)`
                          : receiptItem.width_cm
                          ? `${receiptItem.width_cm}cm (W)`
                          : receiptItem.weight
                          ? `${receiptItem.weight}`
                          : '—'
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Estimate:</span>
                      <div className="font-medium">
                        {receiptItem.low_estimate || receiptItem.high_estimate 
                          ? `£${receiptItem.low_estimate || 0} - £${receiptItem.high_estimate || 0}`
                          : '—'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="lg:col-span-3">
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              id={`returned_${receiptItem.id}`}
              checked={receiptItem.is_returned}
              onChange={(e)=> onChange(receiptItem.id, 'is_returned', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={`returned_${receiptItem.id}`} className="text-sm font-medium text-gray-700">Item returned</label>
          </div>

          {receiptItem.is_returned && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Return Date</label>
                <input
                  type="date"
                  value={receiptItem.return_date || ''}
                  onChange={(e)=> onChange(receiptItem.id, 'return_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Returned By</label>
                <SearchableSelect
                  value={receiptItem.returned_by_user_id || ''}
                  onChange={(value)=>{
                    const selectedUser = users.find(u => u.id.toString() === String(value))
                    onChange(receiptItem.id, 'returned_by_user_id', String(value))
                    onChange(receiptItem.id, 'returned_by_user_name', selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : '')
                  }}
                  options={users.map((u)=>({ value: u.id.toString(), label: `${u.first_name} ${u.last_name}`, description: u.role }))}
                  placeholder="Select staff member"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Return Reason</label>
                <input
                  type="text"
                  value={receiptItem.return_reason || ''}
                  onChange={(e)=> onChange(receiptItem.id, 'return_reason', e.target.value)}
                  placeholder="e.g., Unsold, Withdrawn, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Return Location</label>
                <input
                  type="text"
                  value={receiptItem.return_location || ''}
                  onChange={(e)=> onChange(receiptItem.id, 'return_location', e.target.value)}
                  placeholder="e.g., Client address, Warehouse, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {onRemove && (
        <div className="flex items-center justify-end mt-3">
          <button type="button" onClick={()=> onRemove(receiptItem.id)} className="text-red-600 hover:text-red-800 text-sm">Remove</button>
        </div>
      )}
    </div>
  )
}


