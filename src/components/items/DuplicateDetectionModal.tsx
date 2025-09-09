// frontend/src/components/items/DuplicateDetectionModal.tsx
"use client"

import React, { useState } from 'react'
import { X, Search, Eye, AlertTriangle, Check, Clock, RefreshCw, Trash2, Shield, Users, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { ArtworksAPI, ITEM_CATEGORIES, ITEM_CONDITIONS, ITEM_PERIODS, ITEM_MATERIALS } from '@/lib/items-api'
import { useBrand } from '@/lib/brand-context'

interface DuplicateDetectionModalProps {
  onClose: () => void
}

interface DuplicateGroup {
  group_id: string
  similarity_score: number
  items: {
    id: string
    title: string
    lot_num: string
    image_url: string
    status: string
    created_at: string
  }[]
}

export default function DuplicateDetectionModal({ onClose }: DuplicateDetectionModalProps) {
  const { brand } = useBrand()
  const [isScanning, setIsScanning] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [scanComplete, setScanComplete] = useState(false)
  const [totalItemsChecked, setTotalItemsChecked] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  // Scan settings
  const [similarityThreshold, setSimilarityThreshold] = useState(80)
  const [statusFilter, setStatusFilter] = useState<string[]>(['draft', 'active'])

  // New advanced filters
  const [itemIdFilter, setItemIdFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [conditionFilter, setConditionFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')
  const [materialsFilter, setMaterialsFilter] = useState('')
  const [artistIdFilter, setArtistIdFilter] = useState('')
  const [schoolIdFilter, setSchoolIdFilter] = useState('')
  const [lowEstMin, setLowEstMin] = useState('')
  const [lowEstMax, setLowEstMax] = useState('')
  const [highEstMin, setHighEstMin] = useState('')
  const [highEstMax, setHighEstMax] = useState('')
  const [startPriceMin, setStartPriceMin] = useState('')
  const [startPriceMax, setStartPriceMax] = useState('')

  // Show advanced filters toggle
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const handleStartScan = async () => {
    setIsScanning(true)
    setError(null)
    setScanComplete(false)
    setDuplicates([])
    
    try {
      const params: any = {
        brand_code: brand,
        similarity_threshold: similarityThreshold / 100, // Convert percentage to decimal
        status_filter: statusFilter
      }

      // Add new advanced filters
      if (itemIdFilter.trim()) {
        params.item_id_filter = itemIdFilter.trim()
      }
      if (categoryFilter) {
        params.category = categoryFilter
      }
      if (conditionFilter) {
        params.condition = conditionFilter
      }
      if (periodFilter) {
        params.period_age = periodFilter
      }
      if (materialsFilter) {
        params.materials = materialsFilter
      }
      if (artistIdFilter) {
        params.artist_id = artistIdFilter
      }
      if (schoolIdFilter) {
        params.school_id = schoolIdFilter
      }
      if (lowEstMin || lowEstMax) {
        params.low_est_min = lowEstMin || undefined
        params.low_est_max = lowEstMax || undefined
      }
      if (highEstMin || highEstMax) {
        params.high_est_min = highEstMin || undefined
        params.high_est_max = highEstMax || undefined
      }
      if (startPriceMin || startPriceMax) {
        params.start_price_min = startPriceMin || undefined
        params.start_price_max = startPriceMax || undefined
      }
      
      const result = await ArtworksAPI.detectDuplicateImages(params)
      
      if (result.success) {
        setDuplicates(result.duplicates || [])
        setTotalItemsChecked(result.total_items_checked || 0)
        setScanComplete(true)
      } else {
        setError(result.error || 'Failed to detect duplicates')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to scan for duplicates')
    } finally {
      setIsScanning(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'sold': return 'bg-blue-100 text-blue-800'
      case 'withdrawn': return 'bg-red-100 text-red-800'
      case 'passed': return 'bg-gray-100 text-gray-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleViewItem = (itemId: string) => {
    window.open(`/preview/${itemId}`, '_blank')
  }

  const handleDuplicateAction = async (groupId: string, action: 'keep_first' | 'keep_newest' | 'keep_all' | 'manual', selectedItemId?: string) => {
    const group = duplicates.find(g => g.group_id === groupId)
    if (!group) return

    try {
      let itemsToDelete: string[] = []
      
      switch (action) {
        case 'keep_first':
          // Keep the first item, delete the rest
          itemsToDelete = group.items.slice(1).map((item: any) => item.id)
          break
          
        case 'keep_newest':
          // Sort by created_at and keep the newest, delete the rest
          const sortedByDate = [...group.items].sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          itemsToDelete = sortedByDate.slice(1).map((item: any) => item.id)
          break
          
        case 'keep_all':
          // Don't delete anything, just mark as resolved
          break
          
        case 'manual':
          // Keep only the selected item
          if (selectedItemId) {
            itemsToDelete = group.items.filter((item: any) => item.id !== selectedItemId).map((item: any) => item.id)
          }
          break
      }

      // Delete the selected items if any
      if (itemsToDelete.length > 0) {
        await ArtworksAPI.bulkAction('delete', itemsToDelete)
      }

      // Remove the group from duplicates list
      setDuplicates(prev => prev.filter(g => g.group_id !== groupId))
      
      // Show success message
      const actionMessage = action === 'keep_all' 
        ? 'Marked as resolved' 
        : `${itemsToDelete.length} duplicate item(s) removed`
      
      // You could add a toast notification here
      console.log(`${actionMessage} for group ${groupId}`)
      
    } catch (error: any) {
      setError(`Failed to process duplicates: ${error.message}`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Duplicate Image Detection</h2>
            <p className="text-gray-600 mt-1">Scan inventory for duplicate or similar images</p>
          </div>
          <div className="flex items-center gap-3">
            {!scanComplete && (
              <button
                onClick={handleStartScan}
                disabled={isScanning || statusFilter.length === 0}
                className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Start Scan
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Settings */}
        {!scanComplete && (
          <div className="flex-1 overflow-auto p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Similarity Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Similarity Threshold: {similarityThreshold}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={similarityThreshold}
                  onChange={(e) => setSimilarityThreshold(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>50% (More matches)</span>
                  <span>95% (Exact matches)</span>
                </div>
              </div>


              {/* Status Filter */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Include Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {['draft', 'active', 'sold', 'withdrawn', 'passed'].map(status => (
                    <label key={status} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={statusFilter.includes(status)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setStatusFilter(prev => [...prev, status])
                          } else {
                            setStatusFilter(prev => prev.filter(s => s !== status))
                          }
                        }}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 mr-2"
                      />
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(status)}`}>
                        {status}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced Filters Toggle */}
            <div className="mt-6 border-t border-gray-200 pt-4">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2 text-teal-600" />
                  <span className="text-sm font-medium text-gray-700">Advanced Filters</span>
                  <span className="ml-2 text-xs text-gray-500">
                    ({[
                      itemIdFilter && 'Item IDs',
                      categoryFilter && 'Category',
                      conditionFilter && 'Condition',
                      periodFilter && 'Period',
                      materialsFilter && 'Materials',
                      artistIdFilter && 'Artist',
                      schoolIdFilter && 'School',
                      (lowEstMin || lowEstMax) && 'Low Est',
                      (highEstMin || highEstMax) && 'High Est',
                      (startPriceMin || startPriceMax) && 'Start Price'
                    ].filter(Boolean).length} applied)
                  </span>
                </div>
                {showAdvancedFilters ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="mt-4 space-y-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
                {/* Item ID Filter */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item IDs
                      <span className="text-xs text-gray-500 ml-2">
                        (e.g., 1,2,3 or 1-10 or 1,5,12)
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter IDs or ranges..."
                      value={itemIdFilter}
                      onChange={(e) => setItemIdFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    >
                      <option value="">All Categories</option>
                      {ITEM_CATEGORIES.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Condition, Period, Materials */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condition
                    </label>
                    <select
                      value={conditionFilter}
                      onChange={(e) => setConditionFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    >
                      <option value="">All Conditions</option>
                      {ITEM_CONDITIONS.map(condition => (
                        <option key={condition} value={condition}>{condition}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Period/Age
                    </label>
                    <select
                      value={periodFilter}
                      onChange={(e) => setPeriodFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    >
                      <option value="">All Periods</option>
                      {ITEM_PERIODS.map(period => (
                        <option key={period} value={period}>{period}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Materials
                    </label>
                    <select
                      value={materialsFilter}
                      onChange={(e) => setMaterialsFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    >
                      <option value="">All Materials</option>
                      {ITEM_MATERIALS.map(material => (
                        <option key={material} value={material}>{material}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Artist and School ID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Artist ID
                    </label>
                    <input
                      type="text"
                      placeholder="Enter artist ID..."
                      value={artistIdFilter}
                      onChange={(e) => setArtistIdFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      School ID
                    </label>
                    <input
                      type="text"
                      placeholder="Enter school ID..."
                      value={schoolIdFilter}
                      onChange={(e) => setSchoolIdFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    />
                  </div>
                </div>

                {/* Price Ranges */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-700">Price Ranges</h4>

                  {/* Low Estimate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Low Estimate ($)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={lowEstMin}
                        onChange={(e) => setLowEstMin(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={lowEstMax}
                        onChange={(e) => setLowEstMax(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* High Estimate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      High Estimate ($)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={highEstMin}
                        onChange={(e) => setHighEstMin(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={highEstMax}
                        onChange={(e) => setHighEstMax(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Start Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Price ($)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={startPriceMin}
                        onChange={(e) => setStartPriceMin(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={startPriceMax}
                        onChange={(e) => setStartPriceMax(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {isScanning && (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Scanning for duplicate images...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few minutes depending on your inventory size</p>
            </div>
          )}

          {scanComplete && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span className="font-medium">Scan Complete</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {totalItemsChecked} items checked • {duplicates.length} duplicate groups found
                  </div>
                </div>
              </div>

              {/* Duplicate Groups */}
              {duplicates.length === 0 ? (
                <div className="text-center py-12">
                  <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Duplicates Found</h3>
                  <p className="text-gray-600">All images in your inventory appear to be unique.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {duplicates.map((group, index) => (
                    <div key={group.group_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900">
                          Duplicate Group #{index + 1} ({group.items.length} items)
                        </h3>
                        <span className="text-sm text-gray-600">
                          {Math.round(group.similarity_score * 100)}% similarity
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {group.items.map((item) => (
                          <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                            <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-gray-100">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  No Image
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm text-gray-900 truncate" title={item.title}>
                                {item.title}
                              </h4>
                              <p className="text-xs text-gray-600">ID: {item.id}</p>
                              <div className="flex items-center justify-between">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                  {item.status}
                                </span>
                                <button
                                  onClick={() => handleViewItem(item.id)}
                                  className="flex items-center text-xs text-teal-600 hover:text-teal-700"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </button>
                              </div>
                              <p className="text-xs text-gray-500">
                                {new Date(item.created_at).toLocaleDateString()}
                              </p>
                              <button
                                onClick={() => handleDuplicateAction(group.group_id, 'manual', item.id)}
                                className="w-full mt-2 px-3 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 transition-colors"
                              >
                                <Shield className="h-3 w-3 inline mr-1" />
                                Keep This One
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleDuplicateAction(group.group_id, 'keep_first')}
                          className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Keep First
                        </button>
                        
                        <button
                          onClick={() => handleDuplicateAction(group.group_id, 'keep_newest')}
                          className="flex items-center px-3 py-2 bg-purple-100 text-purple-700 text-sm rounded-lg hover:bg-purple-200 transition-colors"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Keep Newest
                        </button>
                        
                        <button
                          onClick={() => handleDuplicateAction(group.group_id, 'keep_all')}
                          className="flex items-center px-3 py-2 bg-green-100 text-green-700 text-sm rounded-lg hover:bg-green-200 transition-colors"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Keep All
                        </button>
                        
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete all ${group.items.length} items in this group?`)) {
                              const allItemIds = group.items.map((item: any) => item.id)
                              ArtworksAPI.bulkAction('delete', allItemIds).then(() => {
                                setDuplicates(prev => prev.filter(g => g.group_id !== group.group_id))
                              }).catch(err => setError(`Failed to delete items: ${err.message}`))
                            }
                          }}
                          className="flex items-center px-3 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete All
                        </button>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500">
                        <strong>Keep First:</strong> Keeps the first item in the list, deletes others • 
                        <strong> Keep Newest:</strong> Keeps the most recently created item • 
                        <strong> Keep All:</strong> Marks as resolved without deleting any items
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
