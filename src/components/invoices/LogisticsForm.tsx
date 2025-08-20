// frontend/src/components/invoices/LogisticsForm.tsx
"use client"

import React, { useState } from 'react'
import { LogisticsInfo, Invoice } from '../../types/invoice'
import { countries } from '../../data/countries'
import { calculateShippingInvoiceCost, inchesToCm, ItemDimensions, getBillableWeight, calculateVolumetricWeight } from '../../lib/shipping-calculator'
import { calculateInsuranceCost, parseDimensions } from '../../lib/invoice-utils'

interface LogisticsFormProps {
  invoice: Invoice
  onSubmit: (logisticsInfo: LogisticsInfo) => void
  onCancel: () => void
}

export default function LogisticsForm({ invoice, onSubmit, onCancel }: LogisticsFormProps) {
  const [formData, setFormData] = useState<Partial<LogisticsInfo>>({
    status: 'pending',
    destination: 'within_uk',
    country: 'United Kingdom',
    postal_code: '',
    description: '',
    tracking_number: '',
    artworks: [],
    shipping_cost: 0,
    insurance_cost: 0,
    total_cost: 0
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  React.useEffect(() => {
    // Initialize artworks from invoice items
    const artworks: LogisticsInfo['artworks'] = invoice.items.map(item => {
      const dimensions = parseDimensions(item.dimensions)
      const artwork: LogisticsInfo['artworks'][0] = {
        id: item.id,
        title: item.title,
        lot_num: item.lot_num,
        height: dimensions?.height || 12,
        width: dimensions?.width || 8,
        length: 16, // Default length
        logistics_height: (dimensions?.height || 12) + 2,
        logistics_width: (dimensions?.width || 8) + 2,
        logistics_length: 18, // Default length + 2
        weight: 1.0, // Default 1kg actual weight
        actualWeight: 1.0,
        volumetricWeight: 0,
        billableWeight: 0
      }

      // Calculate volumetric and billable weights
      const itemDims: ItemDimensions = {
        length: inchesToCm(artwork.length + 2), // Add packaging
        width: inchesToCm(artwork.width + 2),
        height: inchesToCm(artwork.height + 2),
        weight: artwork.weight
      }
      
      artwork.volumetricWeight = calculateVolumetricWeight(itemDims)
      artwork.billableWeight = getBillableWeight(itemDims)

      return artwork
    })

    setFormData(prev => ({ ...prev, artworks }))
  }, [invoice.items])

  React.useEffect(() => {
    // Recalculate costs when destination, country, or artworks change
    if (formData.artworks && formData.artworks.length > 0) {
      const itemDimensions: ItemDimensions[] = formData.artworks.map(artwork => ({
        length: inchesToCm((artwork.length || 16) + 2),
        width: inchesToCm(artwork.width + 2),
        height: inchesToCm(artwork.height + 2),
        weight: artwork.weight || 1.0
      }))

      const shippingCost = calculateShippingInvoiceCost(
        itemDimensions,
        formData.destination || 'within_uk',
        formData.country
      )

      const totalPrice = invoice.items.reduce((sum, item) => sum + item.hammer_price, 0)
      const insuranceCost = calculateInsuranceCost(
        totalPrice,
        formData.destination === 'within_uk' ? 'UK' : 'International'
      )

      const totalCost = shippingCost + insuranceCost

      setFormData(prev => ({
        ...prev,
        shipping_cost: shippingCost,
        insurance_cost: insuranceCost,
        total_cost: totalCost
      }))
    }
  }, [formData.destination, formData.country, formData.artworks, invoice.items])

  const handleInputChange = (field: keyof LogisticsInfo, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const updateArtworkDimension = (index: number, field: 'height' | 'width' | 'length' | 'weight', value: number) => {
    if (!formData.artworks) return

    const updatedArtworks = [...formData.artworks]
    updatedArtworks[index] = {
      ...updatedArtworks[index],
      [field]: value
    }

    if (field !== 'weight') {
      const logisticsField = `logistics_${field}` as keyof LogisticsInfo['artworks'][0]
      updatedArtworks[index] = {
        ...updatedArtworks[index],
        [logisticsField]: value + 2
      }
    }

    // Recalculate weights when dimensions or weight change
    const itemDims: ItemDimensions = {
      length: inchesToCm((updatedArtworks[index].length || 16) + 2),
      width: inchesToCm((updatedArtworks[index].width || 8) + 2),
      height: inchesToCm((updatedArtworks[index].height || 12) + 2),
      weight: updatedArtworks[index].weight || 1.0
    }
    
    updatedArtworks[index].actualWeight = itemDims.weight
    updatedArtworks[index].volumetricWeight = calculateVolumetricWeight(itemDims)
    updatedArtworks[index].billableWeight = getBillableWeight(itemDims)

    setFormData(prev => ({
      ...prev,
      artworks: updatedArtworks
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.postal_code?.trim()) {
      newErrors.postal_code = 'Postal code is required'
    }

    if (!formData.country?.trim()) {
      newErrors.country = 'Country is required'
    }

    if (formData.artworks?.some(artwork => 
      artwork.height <= 0 || artwork.width <= 0 || (artwork.length || 0) <= 0
    )) {
      newErrors.artworks = 'All artworks must have valid dimensions'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    const logisticsInfo: LogisticsInfo = {
      status: formData.status || 'pending',
      tracking_number: formData.tracking_number || undefined,
      description: formData.description || undefined,
      destination: formData.destination || 'within_uk',
      postal_code: formData.postal_code || '',
      country: formData.country || '',
      artworks: formData.artworks || [],
      shipping_cost: formData.shipping_cost || 0,
      insurance_cost: formData.insurance_cost || 0,
      total_cost: formData.total_cost || 0
    }

    onSubmit(logisticsInfo)
  }

  const getCountriesByRegion = () => {
    if (formData.destination === 'within_uk') {
      return countries.filter(c => c.region === 'UK')
    }
    return countries.filter(c => c.region !== 'UK').sort((a, b) => a.name.localeCompare(b.name))
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Add Logistics Information</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logistics Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logistics Status *
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value as LogisticsInfo['status'])}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="pending">Pending</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>

        {/* Tracking Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tracking Number
          </label>
          <input
            type="text"
            value={formData.tracking_number || ''}
            onChange={(e) => handleInputChange('tracking_number', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter tracking number"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional shipping notes"
          />
        </div>

        {/* Destination */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Destination *
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="within_uk"
                checked={formData.destination === 'within_uk'}
                onChange={(e) => handleInputChange('destination', e.target.value as 'within_uk' | 'international')}
                className="mr-2"
              />
              Within UK
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="international"
                checked={formData.destination === 'international'}
                onChange={(e) => handleInputChange('destination', e.target.value as 'within_uk' | 'international')}
                className="mr-2"
              />
              International
            </label>
          </div>
        </div>

        {/* Country */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Country *
          </label>
          <select
            value={formData.country}
            onChange={(e) => handleInputChange('country', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.country ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select a country</option>
            {getCountriesByRegion().map((country, index) => (
              <option key={`${country.code}-${index}`} value={country.name}>
                {country.name}
              </option>
            ))}
          </select>
          {errors.country && (
            <p className="text-red-500 text-sm mt-1">{errors.country}</p>
          )}
        </div>

        {/* Postal Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Postal Code *
          </label>
          <input
            type="text"
            value={formData.postal_code}
            onChange={(e) => handleInputChange('postal_code', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.postal_code ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter postal code"
          />
          {errors.postal_code && (
            <p className="text-red-500 text-sm mt-1">{errors.postal_code}</p>
          )}
        </div>

        {/* Artworks Table */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Artworks Dimensions & Weight (for Logistics & Shipping Calculation)
          </label>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Lot #</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Title</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Length (inches)</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Width (inches)</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Height (inches)</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Weight (kg)</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Billable Weight</th>
                </tr>
              </thead>
              <tbody>
                {formData.artworks?.map((artwork, index) => (
                  <tr key={artwork.id} className="border-t border-gray-300">
                    <td className="px-4 py-2 text-sm">{artwork.lot_num}</td>
                    <td className="px-4 py-2 text-sm">{artwork.title}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={artwork.length || 16}
                        onChange={(e) => updateArtworkDimension(index, 'length', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={artwork.width}
                        onChange={(e) => updateArtworkDimension(index, 'width', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={artwork.height}
                        onChange={(e) => updateArtworkDimension(index, 'height', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={artwork.weight || 1.0}
                        onChange={(e) => updateArtworkDimension(index, 'weight', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                      />
                    </td>
                    <td className="px-4 py-2 text-center text-sm text-gray-600">
                      {artwork.billableWeight?.toFixed(2)}kg
                      <div className="text-xs text-gray-500">
                        (Vol: {artwork.volumetricWeight?.toFixed(2)}kg)
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {errors.artworks && (
              <p className="text-red-500 text-sm mt-1">{errors.artworks}</p>
            )}
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Shipping Cost Calculation (Based on Evri Rates)</h3>
          <div className="space-y-2 text-sm">
            {/* Base rate calculation hidden from user */}
            <div className="flex justify-between text-gray-900 mb-3">
              <span>Shipping Cost:</span>
              <span>£{formData.shipping_cost?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-900 mb-3">
              <span>Insurance Cost:</span>
              <span>£{formData.insurance_cost?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium border-t border-gray-300 pt-2 text-gray-900">
              <span>Total Cost:</span>
              <span>£{formData.total_cost?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            Generate Invoice with Logistics
          </button>
        </div>
      </form>
    </div>
  )
} 