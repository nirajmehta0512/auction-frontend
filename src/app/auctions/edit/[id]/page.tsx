// frontend/src/app/auctions/edit/[id]/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import AuctionForm from '@/components/auctions/AuctionForm'
import { getAuction } from '@/lib/auctions-api'
import type { Auction } from '@/lib/auctions-api'
import { ArtworksAPI } from '@/lib/artworks-api'

export default function EditAuctionPage() {
  const router = useRouter()
  const params = useParams()
  const auctionId = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [auction, setAuction] = useState<Auction | null>(null)
  const [selectedArtworks, setSelectedArtworks] = useState<number[]>([])

  useEffect(() => {
    if (auctionId) {
      loadAuction()
    }
  }, [auctionId])

  const loadAuction = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load auction data
      const auctionData = await getAuction(auctionId)
        setAuction(auctionData)
        
      // Load artworks for this auction to get selected IDs from auction.artwork_ids
      if (auctionData.artwork_ids && Array.isArray(auctionData.artwork_ids)) {
        setSelectedArtworks(auctionData.artwork_ids)
      } else {
        setSelectedArtworks([])
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load auction')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = (updatedAuction: Auction) => {
    // Redirect to auctions list after successful save
    router.push('/auctions')
  }

  const handleCancel = () => {
    // Go back to auctions list
        router.push('/auctions')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading auction...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/auctions')}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
          >
            Back to Auctions
          </button>
        </div>
      </div>
    )
  }

  if (!auction) return null

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Auction</h1>
          <p className="mt-2 text-gray-600">Update auction details and settings.</p>
        </div>

        <AuctionForm
          auction={auction}
          onSave={handleSave}
          onCancel={handleCancel}
          initialSelectedArtworks={selectedArtworks}
        />
      </div>
    </div>
  )
}