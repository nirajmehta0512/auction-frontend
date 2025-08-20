// frontend/src/components/compliance/BrandComplianceManager.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { 
  Building2, 
  Save, 
  Loader2, 
  Eye, 
  Edit3, 
  FileText, 
  Shield, 
  Phone, 
  Mail, 
  Globe,
  AlertCircle,
  Check
} from 'lucide-react'
import BrandLogoManager from '@/components/brands/BrandLogoManager'

interface BrandComplianceData {
  id: number
  code: string
  name: string
  brand_address?: string
  contact_email?: string
  contact_phone?: string
  website_url?: string
  privacy_policy?: string
  terms_and_conditions?: string
  company_registration?: string
  vat_number?: string
  business_license?: string
  compliance_notes?: string
  logo_url?: string
  logo_file_name?: string
  logo_uploaded_at?: string
}

interface BrandComplianceManagerProps {
  brandId?: number
  showAllBrands?: boolean
  className?: string
}

export default function BrandComplianceManager({ 
  brandId, 
  showAllBrands = false,
  className = ''
}: BrandComplianceManagerProps) {
  const [brands, setBrands] = useState<BrandComplianceData[]>([])
  const [selectedBrand, setSelectedBrand] = useState<BrandComplianceData | null>(null)
  const [editingBrand, setEditingBrand] = useState<BrandComplianceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'logo' | 'legal'>('info')

  useEffect(() => {
    if (showAllBrands) {
      loadAllBrands()
    } else if (brandId) {
      loadBrandCompliance(brandId)
    }
  }, [brandId, showAllBrands])

  const loadAllBrands = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('token')
      const response = await fetch('/api/brands', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch brands')
      }

      const data = await response.json()
      setBrands(data.data)
      if (data.data.length > 0) {
        setSelectedBrand(data.data[0])
        setEditingBrand(data.data[0])
        loadBrandCompliance(data.data[0].id)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadBrandCompliance = async (id: number) => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('token')
      const response = await fetch(`/api/brands/${id}/compliance`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch brand compliance data')
      }

      const data = await response.json()
      setSelectedBrand(data.data)
      setEditingBrand(data.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof BrandComplianceData, value: string) => {
    setEditingBrand(prev => prev ? { ...prev, [field]: value } : null)
  }

  const handleSave = async () => {
    if (!editingBrand) return

    try {
      setSaving(true)
      setError(null)

      const token = localStorage.getItem('token')
      const response = await fetch(`/api/brands/${editingBrand.id}/compliance`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brand_address: editingBrand.brand_address,
          contact_email: editingBrand.contact_email,
          contact_phone: editingBrand.contact_phone,
          website_url: editingBrand.website_url,
          privacy_policy: editingBrand.privacy_policy,
          terms_and_conditions: editingBrand.terms_and_conditions,
          company_registration: editingBrand.company_registration,
          vat_number: editingBrand.vat_number,
          business_license: editingBrand.business_license,
          compliance_notes: editingBrand.compliance_notes
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save compliance settings')
      }

      const result = await response.json()
      setSelectedBrand(result.data)
      setEditingBrand(result.data)
      
      // Update brands list if showing all brands
      if (showAllBrands) {
        setBrands(prev => prev.map(b => 
          b.id === editingBrand.id ? result.data : b
        ))
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleBrandSelect = (brand: BrandComplianceData) => {
    setSelectedBrand(brand)
    setEditingBrand(brand)
    loadBrandCompliance(brand.id)
  }

  const handleLogoUpdated = (logoUrl: string | null) => {
    if (selectedBrand) {
      const updated = { ...selectedBrand, logo_url: logoUrl }
      setSelectedBrand(updated)
      setEditingBrand(updated)
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-2 text-gray-600">Loading compliance settings...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Brand Selector for All Brands View */}
      {showAllBrands && brands.length > 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Brand</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => handleBrandSelect(brand)}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  selectedBrand?.id === brand.id
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Building2 className="h-8 w-8 text-teal-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">{brand.name}</h4>
                    <p className="text-sm text-gray-500">Code: {brand.code}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Compliance Form */}
      {selectedBrand && editingBrand && (
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Building2 className="h-6 w-6 text-teal-600" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedBrand.name}</h2>
                  <p className="text-sm text-gray-500">Compliance Settings & Brand Information</p>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 py-2 border-b border-gray-200">
            <div className="flex space-x-6">
              {[
                { id: 'info', label: 'Contact & Business Info', icon: Building2 },
                { id: 'logo', label: 'Brand Logo', icon: Eye },
                { id: 'legal', label: 'Legal & Compliance', icon: Shield }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'info' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Contact & Business Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="h-4 w-4 inline mr-1" />
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={editingBrand.contact_email || ''}
                      onChange={(e) => handleInputChange('contact_email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="contact@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="h-4 w-4 inline mr-1" />
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={editingBrand.contact_phone || ''}
                      onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="+44 20 1234 5678"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Globe className="h-4 w-4 inline mr-1" />
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={editingBrand.website_url || ''}
                      onChange={(e) => handleInputChange('website_url', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="https://company.com"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand Address
                    </label>
                    <textarea
                      rows={3}
                      value={editingBrand.brand_address || ''}
                      onChange={(e) => handleInputChange('brand_address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Complete business address..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Registration
                    </label>
                    <input
                      type="text"
                      value={editingBrand.company_registration || ''}
                      onChange={(e) => handleInputChange('company_registration', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Company House No."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      VAT Number
                    </label>
                    <input
                      type="text"
                      value={editingBrand.vat_number || ''}
                      onChange={(e) => handleInputChange('vat_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="GB123456789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business License
                    </label>
                    <input
                      type="text"
                      value={editingBrand.business_license || ''}
                      onChange={(e) => handleInputChange('business_license', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="License number"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logo' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Brand Logo Management</h3>
                <BrandLogoManager 
                  brandId={selectedBrand.id}
                  onLogoUpdated={handleLogoUpdated}
                />
              </div>
            )}

            {activeTab === 'legal' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Legal & Compliance Documents</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Privacy Policy
                  </label>
                  <textarea
                    rows={8}
                    value={editingBrand.privacy_policy || ''}
                    onChange={(e) => handleInputChange('privacy_policy', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Enter privacy policy content..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Terms and Conditions
                  </label>
                  <textarea
                    rows={8}
                    value={editingBrand.terms_and_conditions || ''}
                    onChange={(e) => handleInputChange('terms_and_conditions', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Enter terms and conditions content..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Shield className="h-4 w-4 inline mr-1" />
                    Compliance Notes
                  </label>
                  <textarea
                    rows={4}
                    value={editingBrand.compliance_notes || ''}
                    onChange={(e) => handleInputChange('compliance_notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Internal compliance notes and requirements..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
