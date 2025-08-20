// frontend/src/components/logistics/LogisticsForm.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Calculator, Package, MapPin, DollarSign, Info, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { createLogisticsEntry, updateLogisticsEntry, calculateShipping } from '@/lib/logistics-api'
import type { LogisticsEntry, ShippingCalculation } from '@/lib/logistics-api'

interface LogisticsFormProps {
  logistics?: LogisticsEntry;
  onSave?: (logistics: LogisticsEntry) => void;
  onCancel?: () => void;
}

const countryOptions = [
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
  { value: 'IT', label: 'Italy' },
  { value: 'ES', label: 'Spain' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'BE', label: 'Belgium' },
  { value: 'AU', label: 'Australia' },
  { value: 'JP', label: 'Japan' },
  { value: 'CN', label: 'China' },
  { value: 'IN', label: 'India' },
  { value: 'BR', label: 'Brazil' },
  { value: 'MX', label: 'Mexico' },
  { value: 'OTHER', label: 'Other' }
]

export default function LogisticsForm({ logistics, onSave, onCancel }: LogisticsFormProps) {
  const [formData, setFormData] = useState({
    reference_number: logistics?.reference_number || '',
    description: logistics?.description || '',
    height_inches: logistics?.height_inches || 0,
    width_inches: logistics?.width_inches || 0,
    length_inches: logistics?.length_inches || 0,
    weight_kg: logistics?.weight_kg || 0,
    destination_type: logistics?.destination_type || 'within_uk' as 'within_uk' | 'outside_uk',
    destination_country: logistics?.destination_country || 'GB',
    destination_address: logistics?.destination_address || '',
    item_value: logistics?.item_value || 0,
    status: logistics?.status || 'pending' as 'pending' | 'in_transit' | 'delivered' | 'cancelled',
    tracking_number: logistics?.tracking_number || '',
    item_id: logistics?.item_id || '',
    consignment_id: logistics?.consignment_id || '',
    client_id: logistics?.client_id || ''
  })

  const [calculation, setCalculation] = useState<ShippingCalculation | null>(null)
  const [loading, setLoading] = useState(false)
  const [calculatingShipping, setCalculatingShipping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCalculationDetails, setShowCalculationDetails] = useState(false)

  // Auto-calculate shipping when relevant fields change
  useEffect(() => {
    if (formData.height_inches > 0 && formData.width_inches > 0 && 
        formData.length_inches > 0 && formData.weight_kg > 0 && 
        formData.item_value > 0) {
      calculateShippingCost()
    }
  }, [
    formData.height_inches, 
    formData.width_inches, 
    formData.length_inches, 
    formData.weight_kg, 
    formData.destination_type, 
    formData.item_value
  ])

  const calculateShippingCost = async () => {
    try {
      setCalculatingShipping(true)
      const result = await calculateShipping({
        height_inches: formData.height_inches,
        width_inches: formData.width_inches,
        length_inches: formData.length_inches,
        weight_kg: formData.weight_kg,
        destination_type: formData.destination_type,
        item_value: formData.item_value
      })
      setCalculation(result)
    } catch (error) {
      console.error('Error calculating shipping:', error)
    } finally {
      setCalculatingShipping(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Include calculated shipping charges
      const dataToSubmit = {
        ...formData,
        ...(calculation && {
          shipping_charge: calculation.shipping_charge,
          insurance_charge: calculation.insurance_charge,
          vat_charge: calculation.vat_charge,
          total_charge: calculation.total_charge
        })
      }

      let savedLogistics
      if (logistics?.id) {
        savedLogistics = await updateLogisticsEntry(logistics.id, dataToSubmit)
      } else {
        savedLogistics = await createLogisticsEntry(dataToSubmit)
      }
      onSave?.(savedLogistics)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save logistics entry')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="mb-8">
        <button 
          onClick={onCancel}
          className="text-gray-600 hover:text-gray-800 flex items-center space-x-2 mb-4 transition-colors"
        >
          <span>← Back to Logistics</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          {logistics ? 'Edit Logistics Entry' : 'Create New Logistics Entry'}
        </h1>
        <p className="text-gray-600 mt-2">
          Enter shipping details and let our system calculate costs automatically
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Information */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Package className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reference Number *
                </label>
                <input
                  type="text"
                  value={formData.reference_number}
                  onChange={(e) => handleInputChange('reference_number', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="LOG-2024-001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="pending">Pending</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Brief description of the item..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={formData.tracking_number}
                  onChange={(e) => handleInputChange('tracking_number', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Optional tracking number"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Item Value (£) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.item_value}
                    onChange={(e) => handleInputChange('item_value', parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dimensions & Weight */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Package className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Dimensions & Weight</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Height (inches) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.height_inches}
                  onChange={(e) => handleInputChange('height_inches', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="0.0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Width (inches) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.width_inches}
                  onChange={(e) => handleInputChange('width_inches', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="0.0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Length (inches) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.length_inches}
                  onChange={(e) => handleInputChange('length_inches', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="0.0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Weight (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.weight_kg}
                  onChange={(e) => handleInputChange('weight_kg', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="0.0"
                  required
                />
              </div>
            </div>

            {/* Calculated volume */}
            {formData.height_inches > 0 && formData.width_inches > 0 && formData.length_inches > 0 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  <strong>Calculated Volume:</strong> {(formData.height_inches * formData.width_inches * formData.length_inches).toFixed(1)} cubic inches
                </p>
              </div>
            )}
          </div>

          {/* Destination */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <MapPin className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">Destination</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Destination Type *
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="destination_type"
                      value="within_uk"
                      checked={formData.destination_type === 'within_uk'}
                      onChange={(e) => handleInputChange('destination_type', e.target.value)}
                      className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Within UK</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="destination_type"
                      value="outside_uk"
                      checked={formData.destination_type === 'outside_uk'}
                      onChange={(e) => handleInputChange('destination_type', e.target.value)}
                      className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">International</span>
                  </label>
                </div>
              </div>

              {formData.destination_type === 'outside_uk' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Destination Country *
                  </label>
                  <select
                    value={formData.destination_country}
                    onChange={(e) => handleInputChange('destination_country', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    required
                  >
                    {countryOptions.map(country => (
                      <option key={country.value} value={country.value}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Destination Address
                </label>
                <textarea
                  value={formData.destination_address}
                  onChange={(e) => handleInputChange('destination_address', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Full shipping address..."
                />
              </div>
            </div>
          </div>

          {/* Related Records */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Info className="h-6 w-6 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">Related Records</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Item ID
                </label>
                <input
                  type="text"
                  value={formData.item_id}
                  onChange={(e) => handleInputChange('item_id', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Optional item ID"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Consignment ID
                </label>
                <input
                  type="text"
                  value={formData.consignment_id}
                  onChange={(e) => handleInputChange('consignment_id', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Optional consignment ID"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Client ID
                </label>
                <input
                  type="text"
                  value={formData.client_id}
                  onChange={(e) => handleInputChange('client_id', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Optional client ID"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Calculator Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Calculator className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Shipping Calculator</h3>
              </div>

              {calculatingShipping ? (
                <div className="flex items-center space-x-3 py-8">
                  <Clock className="h-5 w-5 text-blue-500 animate-spin" />
                  <span className="text-sm text-gray-600">Calculating shipping costs...</span>
                </div>
              ) : calculation ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Shipping:</span>
                        <div className="font-semibold text-gray-900">{formatCurrency(calculation.shipping_charge)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Insurance:</span>
                        <div className="font-semibold text-gray-900">{formatCurrency(calculation.insurance_charge)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">VAT:</span>
                        <div className="font-semibold text-gray-900">{formatCurrency(calculation.vat_charge)}</div>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-gray-200">
                        <span className="text-gray-600">Total:</span>
                        <div className="text-xl font-bold text-blue-600">{formatCurrency(calculation.total_charge)}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCalculationDetails(!showCalculationDetails)}
                    className="w-full text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {showCalculationDetails ? 'Hide' : 'Show'} calculation details
                  </button>

                  {showCalculationDetails && (
                    <div className="bg-white rounded-lg p-4 border border-blue-200 text-xs space-y-2">
                      <div className="font-semibold text-gray-900 mb-2">Breakdown:</div>
                      <div className="space-y-1 text-gray-600">
                        <div>Volume: {calculation.breakdown.cubic_inches.toFixed(1)} cubic inches</div>
                        <div>Base shipping: {formatCurrency(calculation.breakdown.base_shipping)}</div>
                        {calculation.breakdown.international_surcharge > 0 && (
                          <div>International surcharge: {formatCurrency(calculation.breakdown.international_surcharge)}</div>
                        )}
                        <div>Insurance (3% of item value, min £30)</div>
                        <div>VAT (16% on shipping only)</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">Fill in dimensions, weight, and item value to calculate shipping costs</p>
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="mt-6 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Clock className="h-5 w-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span>{logistics ? 'Update Entry' : 'Create Entry'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
} 