// frontend/src/components/items/DuplicateDetectionModal.tsx
"use client"

import React, { useState } from 'react'
import { X, Search, Eye, AlertTriangle, Check, Clock, RefreshCw, Trash2, Shield, Users, ChevronDown, ChevronUp, Filter, Zap, Server } from 'lucide-react'
import { ArtworksAPI, ITEM_CATEGORIES, ITEM_CONDITIONS, ITEM_PERIODS, ITEM_MATERIALS } from '@/lib/items-api'
import { useBrand } from '@/lib/brand-context'
import MediaRenderer from '@/components/ui/MediaRenderer'
import { compareImages, batchCompareImages, normalizeImageUrl, validateImageUrl, ImageComparisonResult } from '@/utils/image-comparison'

interface DuplicateDetectionModalProps {
  onClose: () => void
}

interface DuplicateGroup {
  group_id: string
  similarity_score: number
  type?: 'exact_image' | 'exact_title' | 'similar'
  match_value?: string
  items: {
    id: string | number
    title: string
    lot_num?: string
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
  const [exactGroups, setExactGroups] = useState(0)
  const [similarGroups, setSimilarGroups] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  
  // Scan settings
  const [similarityThreshold, setSimilarityThreshold] = useState(80)
  const [statusFilter, setStatusFilter] = useState<string[]>(['draft', 'active'])

  // Comparison mode settings
  const [comparisonMode, setComparisonMode] = useState<'backend' | 'frontend'>('backend')
  const [pixelThreshold, setPixelThreshold] = useState(0.1)
  const [maxImageDimension, setMaxImageDimension] = useState(512)

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
      if (comparisonMode === 'backend') {
        // Use backend comparison (existing logic)
        await performBackendScan()
      } else {
        // Use frontend comparison with Pixelmatch
        await performFrontendScan()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to scan for duplicates')
    } finally {
      setIsScanning(false)
    }
  }

  const performBackendScan = async () => {
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
        setExactGroups(result.exact_groups || 0)
        setSimilarGroups(result.similar_groups || 0)
        setScanComplete(true)

        // For exact duplicates, pre-select the first item in each group to keep
        const initialSelected = new Set<string>()
        result.duplicates?.forEach(group => {
          if (group.type?.startsWith('exact_') && group.items.length > 0) {
            initialSelected.add(group.items[0].id)
          }
        })
        setSelectedItems(initialSelected)
      } else {
        setError(result.error || 'Failed to detect duplicates')
      }
  }

  const performFrontendScan = async () => {
    console.log('🔍 Starting efficient frontend duplicate detection scan...')

    // First, get items with images using the same filters
    const params: any = {
      brand_code: brand,
      status: statusFilter.length === 1 ? statusFilter[0] : undefined,
      limit: 1000 // Large limit to get all items
    }

    // Apply filters
    if (itemIdFilter.trim()) {
      params.item_ids = itemIdFilter.trim()
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

    const result = await ArtworksAPI.getArtworks(params)

    if (!result.success || !result.data) {
      setError('Failed to fetch items for duplicate detection')
      return
    }

    const items = result.data.filter(item => item.images && item.images.length > 0)
    console.log(`📸 Found ${items.length} items with images`)

    if (items.length === 0) {
      setDuplicates([])
      setTotalItemsChecked(0)
      setExactGroups(0)
      setSimilarGroups(0)
      setScanComplete(true)
      return
    }

    // Step 1: Group items by title first (fast text matching)
    console.log('📝 Step 1: Grouping items by title...')
    const titleGroups = new Map<string, any[]>()
    const itemImageMap = new Map<string, string>()

    for (const item of items) {
      if (item.images && item.images.length > 0 && item.images[0] && typeof item.images[0] === 'string') {
        const title = (item.title || '').trim().toLowerCase()
        const primaryImage: string = normalizeImageUrl(item.images[0] || '')
        itemImageMap.set(String(item.id), primaryImage)

        if (title) {
          if (!titleGroups.has(title)) {
            titleGroups.set(title, [])
          }
          titleGroups.get(title)!.push(item)
        }
      }
    }

    console.log(`📊 Found ${titleGroups.size} unique titles from ${items.length} items`)

    // Step 2: For each title group with multiple items, compare first images
    const allDuplicateGroups: any[] = []
    let totalImageComparisons = 0

    for (const [title, titleItems] of titleGroups.entries()) {
      if (titleItems.length < 2) continue // Skip titles with only one item

      console.log(`🔍 Processing title group: "${title}" (${titleItems.length} items)`)

      // Group items by their first image URL within this title group
      const imageGroups = new Map<string, any[]>()
      for (const item of titleItems) {
        const itemId = String(item.id)
        const firstImageUrl = itemImageMap.get(itemId)

        if (firstImageUrl) {
          if (!imageGroups.has(firstImageUrl)) {
            imageGroups.set(firstImageUrl, [])
          }
          imageGroups.get(firstImageUrl)!.push(item)
        }
      }

      // Find exact image URL duplicates within this title group
      const urlDuplicates: any[] = []
      for (const [url, itemsWithUrl] of imageGroups.entries()) {
        if (itemsWithUrl.length > 1) {
          urlDuplicates.push({
            group_id: `title_${title.replace(/\s+/g, '_')}_url_exact_${urlDuplicates.length + 1}`,
            type: 'exact_image',
            match_value: `Title: "${title}" + URL: ${url}`,
            similarity_score: 1.0,
            items: itemsWithUrl.map(item => ({
              id: String(item.id),
              title: item.title || '',
              lot_num: item.lot_num,
              image_url: itemImageMap.get(String(item.id)) || '',
              status: item.status || 'draft',
              created_at: item.created_at || new Date().toISOString()
            }))
          })
        }
      }

      // Only compare different first images within this title group
      const imageUrls = Array.from(imageGroups.keys())
      const comparisonPairs: Array<{ url1: string; url2: string; item1: any; item2: any; pairId: string }> = []

      for (let i = 0; i < imageUrls.length; i++) {
        const url1 = imageUrls[i]
        const itemsWithUrl1 = imageGroups.get(url1)!

        for (let j = i + 1; j < imageUrls.length; j++) {
          const url2 = imageUrls[j]
          const itemsWithUrl2 = imageGroups.get(url2)!

          if (url1 !== url2) {
            const item1 = itemsWithUrl1[0]
            const item2 = itemsWithUrl2[0]

            comparisonPairs.push({
              url1,
              url2,
              item1,
              item2,
              pairId: `${item1.id}_${item2.id}`
            })
          }
        }
      }

      if (comparisonPairs.length > 0) {
        console.log(`🖼️ Comparing ${comparisonPairs.length} first image pairs for title: "${title}"`)

        // Perform batch image comparison
        const pairIds = comparisonPairs.map(pair => ({ url1: pair.url1, url2: pair.url2, id: pair.pairId }))
        const comparisonResults = await batchCompareImages(pairIds, {
          threshold: pixelThreshold,
          resizeToSameSize: true,
          maxDimension: maxImageDimension,
          concurrency: 2
        })

        totalImageComparisons += comparisonPairs.length

        // Group similar items based on comparison results
        const similarGroups: any[] = []
        const processedSimilarItems = new Set<string>()

        for (const [pairId, result] of comparisonResults.entries()) {
          if (result.isDuplicate && !result.error) {
            const pair = comparisonPairs.find(p => p.pairId === pairId)
            if (!pair) continue

            const { item1, item2 } = pair

            if (processedSimilarItems.has(item1.id) || processedSimilarItems.has(item2.id)) continue

            const similarItems = [item1, item2]

            // Look for other similar items in this title group
            for (const otherPair of comparisonPairs) {
              if (otherPair.pairId === pairId) continue

              const otherResult = comparisonResults.get(otherPair.pairId)
              if (otherResult?.isDuplicate) {
                if (!processedSimilarItems.has(otherPair.item1.id) &&
                    (otherPair.item1.id === item1.id || otherPair.item1.id === item2.id ||
                     otherPair.item2.id === item1.id || otherPair.item2.id === item2.id)) {
                  if (!similarItems.find(item => item.id === otherPair.item1.id)) {
                    similarItems.push(otherPair.item1)
                  }
                  if (!similarItems.find(item => item.id === otherPair.item2.id)) {
                    similarItems.push(otherPair.item2)
                  }
                }
              }
            }

            const uniqueItems = similarItems.filter((item, index, self) =>
              index === self.findIndex(i => i.id === item.id)
            )

            if (uniqueItems.length > 1) {
              similarGroups.push({
                group_id: `title_${title.replace(/\s+/g, '_')}_pixel_similar_${similarGroups.length + 1}`,
                type: 'similar',
                match_value: `Title: "${title}" + Pixel similarity: ${result.similarity.toFixed(1)}%`,
                similarity_score: result.similarity / 100,
                items: uniqueItems.map(item => ({
                  id: String(item.id),
                  title: item.title || '',
                  lot_num: item.lot_num,
                  image_url: itemImageMap.get(String(item.id)) || '',
                  status: item.status || 'draft',
                  created_at: item.created_at || new Date().toISOString()
                }))
              })

              uniqueItems.forEach(item => processedSimilarItems.add(item.id))
            }
          }
        }

        // Add groups from this title
        allDuplicateGroups.push(...urlDuplicates, ...similarGroups)
      } else {
        // Add URL duplicates even if no image comparisons needed
        allDuplicateGroups.push(...urlDuplicates)
      }
    }

    console.log(`✅ Completed efficient duplicate detection:`)
    console.log(`   - ${totalImageComparisons} image comparisons performed (much fewer than before!)`)
    console.log(`   - ${allDuplicateGroups.length} duplicate groups found`)

    setDuplicates(allDuplicateGroups)
    setTotalItemsChecked(items.length)
    setExactGroups(allDuplicateGroups.filter(g => g.type === 'exact_image').length)
    setSimilarGroups(allDuplicateGroups.filter(g => g.type === 'similar').length)
    setScanComplete(true)

    // Pre-select items to keep (prioritize sold/returned items)
    const initialSelected = new Set<string>()
    allDuplicateGroups.forEach(group => {
      if (group.items.length > 0) {
        // Sort items by priority: sold/returned first, then by creation date
        const sortedItems = [...group.items].sort((a, b) => {
          const priorityOrder = { 'sold': 1, 'returned': 2, 'withdrawn': 3, 'passed': 4, 'active': 5, 'draft': 6 }
          const aPriority = priorityOrder[a.status as keyof typeof priorityOrder] || 99
          const bPriority = priorityOrder[b.status as keyof typeof priorityOrder] || 99

          if (aPriority !== bPriority) {
            return aPriority - bPriority // Lower number = higher priority
          }
          // If same status, prefer older items (created first)
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })

        initialSelected.add(sortedItems[0].id) // Keep the highest priority item
      }
    })
    setSelectedItems(initialSelected)
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

  const handleViewItem = (itemId: string | number) => {
    try {
      // Ensure itemId is a valid number/string and construct URL safely
      const id = String(itemId).trim()
      if (!id || id === 'undefined' || id === 'null') {
        console.error('Invalid item ID:', itemId)
        return
      }
      const url = `/items/${encodeURIComponent(id)}`
      console.log('Opening item preview URL:', url)
      window.open(url, '_blank')
    } catch (error) {
      console.error('Error opening preview:', error)
    }
  }

  const handleItemSelection = (groupId: string, itemId: string | number) => {
    const itemIdStr = String(itemId) // Convert to string for consistent handling
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      // For exact duplicates, only allow selecting one item per group
      const group = duplicates.find(g => g.group_id === groupId)
      if (group?.type?.startsWith('exact_')) {
        // Clear other selections in this group
        group.items.forEach(item => {
          const itemIdToCompare = String(item.id)
          if (itemIdToCompare !== itemIdStr) {
            newSet.delete(itemIdToCompare)
          }
        })
      }

      if (newSet.has(itemIdStr)) {
        newSet.delete(itemIdStr)
      } else {
        newSet.add(itemIdStr)
      }
      return newSet
    })
  }

  const handleBulkAction = async (action: 'keep_selected' | 'delete_unselected' | 'delete_all') => {
    try {
      let itemsToDelete: string[] = []

      if (action === 'keep_selected') {
        // Delete all items that are not selected
        const allItemIds = duplicates.flatMap(group => group.items.map(item => String(item.id)))
        itemsToDelete = allItemIds.filter(id => !selectedItems.has(id))
      } else if (action === 'delete_unselected') {
        // Same as keep_selected
        const allItemIds = duplicates.flatMap(group => group.items.map(item => String(item.id)))
        itemsToDelete = allItemIds.filter(id => !selectedItems.has(id))
      } else if (action === 'delete_all') {
        // Delete all items in duplicate groups
        itemsToDelete = duplicates.flatMap(group => group.items.map(item => String(item.id)))
      }

      if (itemsToDelete.length > 0) {
        await ArtworksAPI.bulkAction('delete', itemsToDelete)
        setDuplicates([])
        console.log(`${action}: ${itemsToDelete.length} items deleted`)
      }
    } catch (error: any) {
      setError(`Failed to process bulk action: ${error.message}`)
    }
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
            <h2 className="text-xl font-semibold text-gray-900">
              {comparisonMode === 'frontend' ? 'Advanced Image Comparison' : 'Duplicate Image Detection'}
            </h2>
            <p className="text-gray-600 mt-1">
              {comparisonMode === 'frontend'
                ? 'Pixel-perfect image analysis using advanced computer vision'
                : 'Fast duplicate detection using hash-based comparison'
              }
            </p>
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
                    {comparisonMode === 'frontend' ? 'Analyzing Images...' : 'Scanning...'}
                  </>
                ) : (
                  <>
                    {comparisonMode === 'frontend' ? <Zap className="h-4 w-4 mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                    {comparisonMode === 'frontend' ? 'Start Analysis' : 'Start Scan'}
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
              {/* Comparison Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comparison Mode
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="comparisonMode"
                      value="backend"
                      checked={comparisonMode === 'backend'}
                      onChange={(e) => setComparisonMode(e.target.value as 'backend' | 'frontend')}
                      className="mr-2"
                    />
                    <Server className="h-4 w-4 mr-1" />
                    <span className="text-sm">Backend (Hash-based)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="comparisonMode"
                      value="frontend"
                      checked={comparisonMode === 'frontend'}
                      onChange={(e) => setComparisonMode(e.target.value as 'backend' | 'frontend')}
                      className="mr-2"
                    />
                    <Zap className="h-4 w-4 mr-1" />
                    <span className="text-sm">Frontend (Pixelmatch)</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {comparisonMode === 'backend'
                    ? 'Fast server-side comparison using MD5 hashes'
                    : 'Accurate client-side comparison using pixel-level analysis'
                  }
                </p>
              </div>

              {/* Similarity/Pixel Threshold */}
              <div>
                {comparisonMode === 'backend' ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pixel Threshold: {pixelThreshold}
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.3"
                      step="0.01"
                      value={pixelThreshold}
                      onChange={(e) => setPixelThreshold(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0.05 (Exact match)</span>
                      <span>0.3 (Loose match)</span>
                    </div>
                  </>
                )}
              </div>

              {/* Max Image Dimension (Frontend only) */}
              {comparisonMode === 'frontend' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Image Dimension: {maxImageDimension}px
                  </label>
                  <input
                    type="range"
                    min="256"
                    max="1024"
                    step="64"
                    value={maxImageDimension}
                    onChange={(e) => setMaxImageDimension(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>256px (Faster)</span>
                    <span>1024px (More accurate)</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Larger dimensions provide more accurate comparison but take longer to process
                  </p>
                </div>
              )}


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
                    <span className="font-medium">
                      {comparisonMode === 'frontend' ? 'Analysis Complete' : 'Scan Complete'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {totalItemsChecked} items checked • {duplicates.length} duplicate groups found
                    {comparisonMode === 'frontend' ? (
                      <>
                        {exactGroups > 0 && <span className="ml-2 text-red-600">({exactGroups} URL exact)</span>}
                        {similarGroups > 0 && <span className="ml-2 text-orange-600">({similarGroups} pixel similar)</span>}
                      </>
                    ) : (
                      <>
                        {exactGroups > 0 && <span className="ml-2 text-red-600">({exactGroups} hash exact)</span>}
                    {similarGroups > 0 && <span className="ml-2 text-orange-600">({similarGroups} similar)</span>}
                      </>
                    )}
                  </div>
                </div>

                {/* Bulk Actions */}
                {duplicates.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleBulkAction('keep_selected')}
                        className="flex items-center px-3 py-2 bg-green-100 text-green-700 text-sm rounded-lg hover:bg-green-200 transition-colors"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Keep Selected ({selectedItems.size})
                      </button>
                      <button
                        onClick={() => handleBulkAction('delete_all')}
                        className="flex items-center px-3 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All Duplicates
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Select items you want to keep, then click "Keep Selected" to delete the rest.
                    </p>
                  </div>
                )}
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
                    <div key={group.group_id} className={`border rounded-lg p-4 ${
                      group.type === 'exact_image' ? 'border-red-300 bg-red-50' :
                      group.type === 'exact_title' ? 'border-orange-300 bg-orange-50' :
                      'border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <h3 className="font-medium text-gray-900">
                            {group.type === 'exact_image' && (comparisonMode === 'frontend' ? '🔗 URL Exact Match' : '🖼️ Hash Exact Match')}
                            {group.type === 'exact_title' && '📝 Exact Title Match'}
                            {group.type === 'similar' && (comparisonMode === 'frontend' ? '🎨 Pixel Similar' : '🔍 Similar Items')}
                            {!group.type && 'Duplicate Group'} #{index + 1} ({group.items.length} items)
                          </h3>
                          {group.match_value && (
                            <span className="ml-2 text-xs text-gray-500 truncate max-w-xs">
                              "{group.match_value}"
                            </span>
                          )}
                        </div>
                        <span className={`text-sm px-2 py-1 rounded ${
                          group.type?.startsWith('exact_') ? 'bg-red-100 text-red-800' :
                          group.type === 'similar' && comparisonMode === 'frontend' ? 'bg-blue-100 text-blue-800' :
                          'text-gray-600'
                        }`}>
                          {group.type?.startsWith('exact_') ? '100%' :
                           comparisonMode === 'frontend' && group.type === 'similar' ? `${Math.round(group.similarity_score * 100)}% similar` :
                           Math.round(group.similarity_score * 100) + '%'} similarity
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {group.items.map((item, itemIndex) => (
                          <div key={String(item.id)} className={`border rounded-lg p-3 ${
                            selectedItems.has(String(item.id)) ? 'border-teal-300 bg-teal-50' : 'border-gray-200'
                          }`}>
                            {/* Checkbox for selection */}
                            <div className="flex items-center justify-between mb-3">
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedItems.has(String(item.id))}
                                  onChange={() => handleItemSelection(group.group_id, item.id)}
                                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 mr-2"
                                />
                                <span className="text-sm font-medium">
                                  {group.type?.startsWith('exact_') ? `Keep Item #${itemIndex + 1}` : 'Keep this item'}
                                </span>
                              </label>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                {item.status}
                              </span>
                            </div>

                            <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-gray-100">
                              <MediaRenderer
                                src={item.image_url || ''}
                                alt={item.title}
                                className="object-cover"
                                aspectRatio="square"
                                placeholder={
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                                    <div className="text-center">
                                      <div className="text-sm font-medium">No Image</div>
                                      <div className="text-xs">ID: {String(item.id)}</div>
                                    </div>
                                  </div>
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <h4 className="font-medium text-sm text-gray-900 truncate" title={item.title}>
                                {item.title}
                              </h4>
                              <p className="text-xs text-gray-600">ID: {String(item.id)}</p>
                              <div className="flex items-center justify-between">
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
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Action Buttons for Similar Groups */}
                      {group.type !== 'exact_image' && group.type !== 'exact_title' && (
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
                      )}

                      {/* Help Text */}
                      <div className="mt-2 text-xs text-gray-500">
                        {group.type?.startsWith('exact_') ? (
                          <span>
                            <strong>Exact duplicates:</strong> Select which item(s) to keep, then use the bulk actions above.
                          </span>
                        ) : (
                          <span>
                            <strong>Keep First:</strong> Keeps the first item in the list, deletes others •
                            <strong> Keep Newest:</strong> Keeps the most recently created item •
                            <strong> Keep All:</strong> Marks as resolved without deleting any items
                          </span>
                        )}
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
