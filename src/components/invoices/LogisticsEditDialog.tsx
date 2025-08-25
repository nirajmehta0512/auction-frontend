// frontend/src/components/invoices/LogisticsEditDialog.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { X, Package, Calculator, Save } from 'lucide-react'
import { LogisticsInfo, InvoiceItem } from '../../types/invoice'
import { countries } from '../../data/countries'
import { getCountryMapping } from '../../data/country-mappings'
import { calculateShippingInvoiceCost, inchesToCm, ItemDimensions, getBillableWeight, calculateVolumetricWeight } from '../../lib/shipping-calculator'
import { calculateInsuranceCost, parseDimensions } from '../../lib/invoice-utils'

interface LogisticsEditDialogProps {
  isOpen: boolean
  onClose: () => void
  invoice: any
  onSuccess?: () => void
}

export default function LogisticsEditDialog({
  isOpen,
  onClose,
  invoice,
  onSuccess
}: LogisticsEditDialogProps) {
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
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (invoice && isOpen) {
      // Initialize with existing logistics data or defaults
      const existingLogistics = invoice.logistics as LogisticsInfo | undefined
      
      // Map country code to destination and country name
      const mapCountryCodeToDetails = (countryCode: string) => {
    return getCountryMapping(countryCode)
  }

      // Auto-fill from EOA data if available
      const eoaCountryCode = invoice.ship_to_country
      const countryDetails = eoaCountryCode ? mapCountryCodeToDetails(eoaCountryCode) : null
      
      setFormData({
        status: existingLogistics?.status || 'pending',
        destination: existingLogistics?.destination || countryDetails?.destination || 'within_uk',
        country: existingLogistics?.country || countryDetails?.country || 'United Kingdom',
        postal_code: existingLogistics?.postal_code || invoice.ship_to_postal_code || '',
        description: existingLogistics?.description || '',
        tracking_number: existingLogistics?.tracking_number || '',
        logistics_method: existingLogistics?.logistics_method || 'metsab_courier',
        artworks: existingLogistics?.artworks || [],
        shipping_cost: existingLogistics?.shipping_cost ?? (invoice.total_shipping_amount || invoice.shipping_charge || 0),
        insurance_cost: existingLogistics?.insurance_cost ?? (invoice.insurance_charge || 0),
        total_cost: existingLogistics?.total_cost ?? (invoice.total_shipping_amount || 0)
      })
    }
  }, [invoice, isOpen])

  // Initialize artworks from invoice items
  useEffect(() => {
    const buildArtworksFromInvoice = (inv: any) => {
      // Check if item_ids is empty or undefined
      const itemIds = inv?.item_ids
      if (!itemIds || (Array.isArray(itemIds) && itemIds.length === 0)) {
        return [] as LogisticsInfo['artworks']
      }

      const srcItems = inv?.items as any[] | undefined
      if (!srcItems || srcItems.length === 0) return [] as LogisticsInfo['artworks']

      const artworks: LogisticsInfo['artworks'] = srcItems.map((item: any, index: number) => {
        const dimensions = parseDimensions(item.dimensions_inches || item.dimensions || item.dimensions_cm)
        const artwork: LogisticsInfo['artworks'][0] = {
          id: item.id,
          title: item.title,
          lot_num: invoice.lot_ids?.[index] || (index + 1).toString(),
          height: dimensions?.height || 0,
          width: dimensions?.width || 0,
          length: 0, // Default length
          logistics_height: (dimensions?.height || 0) + 2,
          logistics_width: (dimensions?.width || 0) + 2,
          logistics_length: 0 + 2, // Default length + 2
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

      return artworks
    }

    if (formData.artworks && formData.artworks.length === 0) {
      let artworks = buildArtworksFromInvoice(invoice)
      if ((!artworks || artworks.length === 0) && invoice?.id) {
        // Fallback: refetch invoice with items to ensure we have items list
        const fetchWithItems = async () => {
          try {
            const token = localStorage.getItem('token')
            const resp = await fetch(`/api/invoices/${invoice.id}`, {
              headers: { 'Authorization': token ? `Bearer ${token}` : '' }
            })
            if (resp.ok) {
              const json = await resp.json()
              artworks = buildArtworksFromInvoice(json?.data)
              if (artworks.length > 0) {
                setFormData(prev => ({ ...prev, artworks }))
              }
            }
          } catch (e) {
            // ignore
          }
        }
        fetchWithItems()
      } else if (artworks.length > 0) {
        setFormData(prev => ({ ...prev, artworks }))
      }
    }
  }, [formData.artworks, invoice])

  // Auto-calculate costs when destination, country, or artworks change (unless manually edited)
  const [autoCalculateEnabled, setAutoCalculateEnabled] = useState(true)
  
  useEffect(() => {
    if (formData.artworks && formData.artworks.length > 0 && autoCalculateEnabled) {
      const itemDimensions: ItemDimensions[] = formData.artworks.map(artwork => ({
        length: inchesToCm((artwork.length || 16) + 2),
        width: inchesToCm(artwork.width + 2),
        height: inchesToCm(artwork.height + 2),
        weight: artwork.weight || 1.0
      }))

      // Calculate shipping cost based on logistics method
      const calculatedShippingCost = Math.round(calculateShippingInvoiceCost(
        itemDimensions,
        formData.destination || 'within_uk',
        formData.country
      ))

      // Set shipping cost to 0 for customer collection/courier, otherwise use calculated cost
      const shippingCost = (formData.logistics_method === 'customer_collection' || formData.logistics_method === 'customer_courier')
        ? 0
        : calculatedShippingCost

      const totalPrice = Number(invoice.sale_price) || 0
      const insuranceCost = Math.round(calculateInsuranceCost(
        totalPrice,
        formData.destination === 'within_uk' ? 'UK' : 'International'
      ))

      const totalCost = shippingCost + insuranceCost

      setFormData(prev => ({
        ...prev,
        shipping_cost: shippingCost,
        insurance_cost: insuranceCost,
        total_cost: totalCost
      }))
    }
  }, [formData.destination, formData.country, formData.artworks, invoice, autoCalculateEnabled])

  const handleInputChange = (field: keyof LogisticsInfo, value: any) => {
    // Disable auto-calculation when shipping or insurance costs are manually edited
    if (field === 'shipping_cost' || field === 'insurance_cost') {
      setAutoCalculateEnabled(false)
    }

    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      }

      // Round shipping and insurance costs to whole numbers
      if (field === 'shipping_cost' && typeof value === 'number') {
        newData.shipping_cost = Math.round(value)
      }
      if (field === 'insurance_cost' && typeof value === 'number') {
        newData.insurance_cost = Math.round(value)
      }

      // Recalculate total when shipping or insurance costs change
      if (field === 'shipping_cost' || field === 'insurance_cost') {
        newData.total_cost = (newData.shipping_cost || 0) + (newData.insurance_cost || 0)
      }

      return newData
    })

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

    // Only validate detailed logistics fields for Metsab Courier
    if (formData.logistics_method === 'metsab_courier') {
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
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)
      
      const logisticsInfo: LogisticsInfo = {
        status: formData.status || 'pending',
        tracking_number: formData.tracking_number || undefined,
        description: formData.description || undefined,
        destination: formData.destination || 'within_uk',
        postal_code: formData.postal_code || '',
        country: formData.country || '',
        logistics_method: formData.logistics_method || 'metsab_courier',
        artworks: formData.artworks || [],
        shipping_cost: formData.shipping_cost || 0,
        insurance_cost: formData.insurance_cost || 0,
        total_cost: formData.total_cost || 0
      }

      // Update invoice with logistics information
      const requestBody = {
        logistics: logisticsInfo,
        tracking_number: logisticsInfo.tracking_number,
        shipping_charge: logisticsInfo.shipping_cost,
        insurance_charge: logisticsInfo.insurance_cost,
        total_shipping_amount: logisticsInfo.total_cost
      }

      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to update logistics information: ${errorText}`)
      }

      setLoading(false)
      onSuccess?.()
      onClose()
      
    } catch (error) {
      console.error('Failed to save logistics:', error)
      setLoading(false)
      alert('Failed to save logistics information')
    }
  }

  const getCountriesByRegion = () => {
    if (formData.destination === 'within_uk') {
      return countries.filter(c => c.region === 'UK')
    }
    return countries.filter(c => c.region !== 'UK').sort((a, b) => a.name.localeCompare(b.name))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Edit Logistics Information
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Invoice Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Invoice Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Invoice #:</span>
                <span className="ml-2 font-medium">{invoice.invoice_number}</span>
              </div>
              <div>
                <span className="text-gray-500">Lot IDs:</span>
                <span className="ml-2 font-medium">{invoice.lot_ids?.length ? invoice.lot_ids.join(', ') : 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Item IDs:</span>
                <span className="ml-2 font-medium">{invoice.item_ids?.length ? invoice.item_ids.join(', ') : 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Title:</span>
                <span className="ml-2 font-medium">{invoice.title}</span>
              </div>
            </div>
          </div>

          {/* Logistics Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logistics Method *
            </label>
            <select
              value={formData.logistics_method}
              onChange={(e) => handleInputChange('logistics_method', e.target.value as LogisticsInfo['logistics_method'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="metsab_courier">Metsab Courier</option>
              <option value="customer_collection">Customer Collection from Office</option>
              <option value="customer_courier">Customer Courier</option>
            </select>
            {formData.logistics_method === 'customer_collection' && (
              <p className="text-xs text-blue-600 mt-1">Customer will collect from office - no shipping cost</p>
            )}
            {formData.logistics_method === 'customer_courier' && (
              <p className="text-xs text-blue-600 mt-1">Customer will arrange their own courier - no shipping cost</p>
            )}
            {formData.logistics_method === 'metsab_courier' && (
              <p className="text-xs text-green-600 mt-1">Metsab will arrange courier service</p>
            )}
          </div>

          {/* Show detailed logistics form only for Metsab Courier */}
          {formData.logistics_method === 'metsab_courier' && (
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column - Logistics Details */}
              <div className="space-y-6">
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
            </div>

            {/* Right Column - Destination Details */}
            <div className="space-y-6">
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
            </div>
          </div>
          )}

          {/* Show alternative logistics options */}
          {formData.logistics_method !== 'metsab_courier' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Package className="h-5 w-5 text-blue-600" />
                <h4 className="text-sm font-medium text-blue-900">
                  {formData.logistics_method === 'customer_collection' ? 'Customer Collection from Office' : 'Customer Courier'}
                </h4>
              </div>
              <p className="text-sm text-blue-800">
                {formData.logistics_method === 'customer_collection'
                  ? 'The customer will collect the items directly from our office. No shipping arrangements are required.'
                  : 'The customer will arrange their own courier service. No shipping costs will be charged.'}
              </p>
              <div className="mt-3 p-2 bg-white rounded border border-blue-300">
                <p className="text-sm font-medium text-blue-900">Shipping Cost: £0.00</p>
              </div>
            </div>
          )}

          {/* Artworks Table - Only show for Metsab Courier */}
          {formData.logistics_method === 'metsab_courier' && formData.artworks && formData.artworks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Artworks Dimensions & Weight (for Logistics & Shipping Calculation)
                </label>
                <button
                  onClick={() => setAutoCalculateEnabled(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Auto-Calculate
                </button>
              </div>
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
                    {formData.artworks.map((artwork, index) => (
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
          )}

          {/* Cost Breakdown */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Shipping Cost Calculation (Based on Evri Rates)</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Shipping Cost:</label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">£</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.shipping_cost || 0}
                    onChange={(e) => handleInputChange('shipping_cost', parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Insurance Cost:</label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">£</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.insurance_cost || 0}
                    onChange={(e) => handleInputChange('insurance_cost', parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-between font-medium border-t border-gray-300 pt-2 text-gray-900">
                <span>Total Cost:</span>
                <span>£{formData.total_cost?.toFixed(2)}</span>
              </div>
              {!autoCalculateEnabled && (
                <div className="text-xs text-orange-600 italic">
                  Manual editing enabled - click "Auto-Calculate" to recalculate based on dimensions
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Logistics'}
          </button>
        </div>
      </div>
    </div>
  )
}