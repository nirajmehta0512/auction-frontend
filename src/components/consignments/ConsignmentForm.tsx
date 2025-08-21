// frontend/src/components/consignments/ConsignmentForm.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { createConsignment, updateConsignment } from '@/lib/consignments-api'
import { fetchClients, searchClients, type Client } from '@/lib/clients-api'
import { ArtworksAPI } from '@/lib/items-api'
import { ArtistsAPI } from '@/lib/artists-api'
import type { Consignment } from '@/lib/consignments-api'
import type { Artwork } from '@/lib/items-api'
import type { Artist } from '@/lib/artists-api'
import { Plus, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import SearchableSelect from '@/components/ui/SearchableSelect'
import ReceiptItemRow, { type ReceiptItem as ReceiptItemRowType } from '@/components/consignments/ReceiptItemRow'
const LoadScript = dynamic(() => import('@react-google-maps/api').then(m => m.LoadScript), { ssr: false })
const StandaloneSearchBox = dynamic(() => import('@react-google-maps/api').then(m => m.StandaloneSearchBox), { ssr: false })
import ArtistForm from '@/components/artists/ArtistForm'

// User interface for app staff dropdown
interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
  position?: string
}

// Temporary placeholder components (these should be replaced with your actual UI library components)
const Label = ({ htmlFor, className, children }: { htmlFor?: string; className?: string; children: React.ReactNode }) => (
  <label htmlFor={htmlFor} className={className}>{children}</label>
)

const Input = ({ id, type = "text", value, onChange, className, required, min, placeholder, disabled }: {
  id?: string;
  type?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  required?: boolean;
  min?: string;
  placeholder?: string;
  disabled?: boolean;
}) => (
  <input
    id={id}
    type={type}
    value={value}
    onChange={onChange}
    className={className}
    required={required}
    min={min}
    placeholder={placeholder}
    disabled={disabled}
  />
)

const Textarea = ({ id, value, onChange, className, placeholder, rows, required }: {
  id?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) => (
  <textarea
    id={id}
    value={value}
    onChange={onChange}
    className={className}
    placeholder={placeholder}
    rows={rows}
    required={required}
  />
)

const Select = ({ value, onValueChange, children }: {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode
}) => (
  <select
    value={value}
    onChange={(e) => onValueChange?.(e.target.value)}
    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
  >
    {children}
  </select>
)

const SelectValue = ({ placeholder }: { placeholder?: string }) => (
  <option value="" disabled>{placeholder}</option>
)

const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
  <option value={value}>{children}</option>
)

const Button = ({ type = "button", variant, onClick, disabled, className, children }: {
  type?: "button" | "submit";
  variant?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`
      px-4 py-2 text-sm font-medium rounded-md border focus:outline-none focus:ring-2 focus:ring-offset-2
      ${variant === 'outline'
        ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500'
        : className || 'border-transparent text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}
  >
    {children}
  </button>
)

// Using reusable ReceiptItemRow type for consistency
type ReceiptItem = ReceiptItemRowType

interface ConsignmentFormProps {
  consignment?: Consignment;
  onSave?: (consignment: Consignment) => void;
  onCancel?: () => void;
}

export default function ConsignmentForm({ consignment, onSave, onCancel }: ConsignmentFormProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [items, setItems] = useState<Artwork[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [showArtistModal, setShowArtistModal] = useState(false)
  const [warehouseSearchBoxRef, setWarehouseSearchBoxRef] = useState<any>(null)
  const [formData, setFormData] = useState({
    receipt_no: consignment?.id?.toString() || '',
    client_id: consignment?.client_id || 0, // Changed to number (0 for no selection)
    client_name: consignment?.client_name || '',
    client_email: consignment?.client_email || '',
    client_company: consignment?.client_company || '',
    client_title: consignment?.client_title || '',
    client_salutation: consignment?.client_salutation || '',
    specialist_id: consignment?.specialist_id || 0, // Changed to number
    specialist_name: consignment?.specialist_name || '',
    valuation_day_id: consignment?.valuation_day_id || 0, // Changed to number
    online_valuation_reference: consignment?.online_valuation_reference || '',
    default_sale_id: consignment?.default_sale_id || 0, // Changed to number
    default_vendor_commission: consignment?.default_vendor_commission || 0,
    status: consignment?.status || 'pending' as 'active' | 'pending' | 'completed' | 'cancelled' | 'archived',
    is_signed: consignment?.is_signed || false,
    signing_date: consignment?.signing_date || '',
    warehouse_location: consignment?.warehouse_location || '',
    warehouse_with_whom: consignment?.warehouse_with_whom || '',
    warehouse_country: consignment?.warehouse_country || '',
    warehouse_city: consignment?.warehouse_city || '',
    released_by_staff: (consignment as any)?.released_by_staff || ''
  })

  // Receipt items state
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([{
    id: '1',
    item_no: 1,
    is_returned: false
  }])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [clientsResponse, itemsResponse, artistsResponse, usersResponse] = await Promise.all([
          fetchClients({ limit: 1000 }),
          ArtworksAPI.getArtworks({ limit: 1000 }),
          ArtistsAPI.getArtists({ limit: 1000 }),
          fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }).then(res => res.json())
        ])
        setClients(clientsResponse.data)
        setItems(itemsResponse.data)
        setArtists(artistsResponse.data)
        setUsers(usersResponse.users || [])

        // If editing an existing consignment, load its items
        if (consignment?.id) {
          try {
            // TODO: Implement API endpoint to fetch consignment items
            // For now, we'll use mock data to show how it should work
            // setReceiptItems(mockConsignmentItems)
          } catch (error) {
            console.error('Error loading consignment items:', error)
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [consignment?.id])

  // Generate receipt number if not existing
  useEffect(() => {
    if (!formData.receipt_no && !consignment?.id) {
      // Generate a receipt number using current timestamp for uniqueness
      const receiptId = Date.now()
      setFormData(prev => ({
        ...prev,
        receipt_no: `R${receiptId}`
      }))
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const dataToSubmit: Partial<Consignment> = {
        // consignment_number removed - using auto-generated ID
        client_id: formData.client_id,
        specialist_id: formData.specialist_id || undefined,
        valuation_day_id: formData.valuation_day_id || undefined,
        online_valuation_reference: formData.online_valuation_reference || undefined,
        default_sale_id: formData.default_sale_id || undefined,
        default_vendor_commission: formData.default_vendor_commission,
        status: formData.status,
        is_signed: formData.is_signed,
        signing_date: formData.signing_date || undefined
      }

      let savedConsignment
      if (consignment?.id) {
        // Convert number ID to string for updateConsignment API call
        savedConsignment = await updateConsignment(consignment.id.toString(), dataToSubmit)
      } else {
        savedConsignment = await createConsignment(dataToSubmit)
      }

      // After saving consignment, link the selected artworks to it
      if (savedConsignment?.id) {
        const artworkIds = receiptItems
          .filter(item => item.artwork_id && item.artwork_id !== 'new' && item.artwork_id !== 'create_new')
          .map(item => Number(item.artwork_id))
          .filter(id => Number.isFinite(id)) as number[]

        if (artworkIds.length > 0) {
          try {
            const token = localStorage.getItem('token')
            const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
            const response = await fetch(`${base}/api/consignments/${savedConsignment.id}/add-artworks`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
              },
              body: JSON.stringify({ artwork_ids: artworkIds })
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || 'Failed to link artworks to consignment')
            }

            console.log(`Successfully linked ${artworkIds.length} artworks to consignment ${savedConsignment.id}`)
          } catch (linkError) {
            console.error('Error linking artworks to consignment:', linkError)
            // Don't fail the whole operation, just log the error
          }
        }
      }

      onSave?.(savedConsignment)
    } catch (error) {
      console.error('Error saving consignment:', error)
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

  const handleClientChange = (clientId: string) => {
    const selectedClient = clients.find(c => c.id?.toString() === clientId)
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        client_id: parseInt(clientId, 10), // Convert string to number
        client_name: `${selectedClient.first_name} ${selectedClient.last_name}`,
        client_email: selectedClient.email || '',
        client_company: selectedClient.company_name || ''
      }))
    }
  }

  // Receipt Items functions
  const addReceiptItem = () => {
    const newItemNo = Math.max(...receiptItems.map(item => item.item_no)) + 1
    setReceiptItems(prev => [...prev, {
      id: Date.now().toString(),
      item_no: newItemNo,
      is_returned: false
    }])
  }

  const removeReceiptItem = (id: string) => {
    setReceiptItems(prev => prev.filter(item => item.id !== id))
  }

  const updateReceiptItem = (id: string, field: keyof ReceiptItem, value: any) => {
    setReceiptItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  // Artwork change handled within ReceiptItemRow

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">
        {consignment ? 'Edit Consignment' : 'Create New Consignment'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Consignment number is now auto-generated using the ID */}

          <div>
            <Label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-2">
              Select Client *
            </Label>
            <SearchableSelect
              value={formData.client_id || 0}
              onChange={(val) => handleClientChange(String(val))}
              options={clients.map((c) => ({
                value: c.id as number,
                label: `${(c as any).brand ? ((c as any).brand as string).toUpperCase().slice(0,3) : 'MSA'}-${(c.id||0).toString().padStart(3,'0')} - ${c.first_name} ${c.last_name}${c.company_name ? ` (${c.company_name})` : ''}`
              }))}
              placeholder="Type to search clients"
            />
            {formData.client_id && formData.client_name && (
              <div className="text-xs text-green-600 mt-1">
                Selected: {formData.client_name} {formData.client_email && `(${formData.client_email})`}
              </div>
            )}
          </div>

          {/* Removed redundant client fields: title/salutation/name/email/company */}

          <div>
            <Label htmlFor="specialist_name" className="block text-sm font-medium text-gray-700 mb-2">
              Specialist
            </Label>
            <Input
              id="specialist_name"
              value={formData.specialist_name}
              onChange={(e) => handleInputChange('specialist_name', e.target.value)}
              placeholder="Enter specialist name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <Label htmlFor="released_by_staff" className="block text-sm font-medium text-gray-700 mb-2">
              Released by Staff
            </Label>
            <Select
              value={formData.released_by_staff}
              onValueChange={(value) => handleInputChange('released_by_staff', value)}
            >
              <SelectValue placeholder="Select staff member" />
              {users.map((user) => (
                <SelectItem key={user.id} value={`${user.first_name} ${user.last_name}`}>
                  {user.first_name} {user.last_name} ({user.role})
                </SelectItem>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
            >
              <SelectValue placeholder="Select status" />
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </Select>
          </div>

          <div>
            <Label htmlFor="online_valuation_reference" className="block text-sm font-medium text-gray-700 mb-2">
              Online Valuation Reference
            </Label>
            <Input
              id="online_valuation_reference"
              value={formData.online_valuation_reference}
              onChange={(e) => handleInputChange('online_valuation_reference', e.target.value)}
              placeholder="Enter valuation reference"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <Label htmlFor="default_vendor_commission" className="block text-sm font-medium text-gray-700 mb-2">
              Default Vendor Commission (%)
            </Label>
            <Input
              id="default_vendor_commission"
              type="number"
              value={formData.default_vendor_commission}
              onChange={(e) => handleInputChange('default_vendor_commission', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <Label htmlFor="signing_date" className="block text-sm font-medium text-gray-700 mb-2">
              Signing Date
            </Label>
            <Input
              id="signing_date"
              type="date"
              value={formData.signing_date}
              onChange={(e) => handleInputChange('signing_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Signed Status */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_signed"
            checked={formData.is_signed}
            onChange={(e) => handleInputChange('is_signed', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <Label htmlFor="is_signed" className="text-sm font-medium text-gray-700">
            Consignment agreement signed
          </Label>
        </div>

        {/* Warehouse Location Section */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Warehouse Location</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="warehouse_with_whom" className="block text-sm font-medium text-gray-700 mb-2">
                With Whom
              </Label>
              <Select
                value={formData.warehouse_with_whom}
                onValueChange={(value) => {
                  handleInputChange('warehouse_with_whom', value)
                  // Clear country/city if changing from "Consigner"
                  if (value !== 'consigner') {
                    handleInputChange('warehouse_country', '')
                    handleInputChange('warehouse_city', '')
                  }
                }}
              >
                <SelectValue placeholder="Select location" />
                <SelectItem value="airport_house_london">Airport House (London)</SelectItem>
                <SelectItem value="neeraj_home_india">Neeraj's Home (India)</SelectItem>
                <SelectItem value="neeraj_home_uk">Neeraj's Home (UK)</SelectItem>
                <SelectItem value="shenaz_home">Shenaz's Home</SelectItem>
                <SelectItem value="consigner">Consigner</SelectItem>
              </Select>
            </div>

            {/* Show country/city fields only if "Consigner" is selected */}
            {formData.warehouse_with_whom === 'consigner' && (
              <>
                <div className="md:col-span-2">
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Consigner Address (Search)
                  </Label>
                  <LoadScript id="warehouse-places-script" googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''} libraries={["places"] as any}>
                    <StandaloneSearchBox onLoad={(ref:any)=>setWarehouseSearchBoxRef(ref)} onPlacesChanged={()=>{
                      const places = warehouseSearchBoxRef?.getPlaces?.()
                      const p = places && places[0]
                      if (!p) return
                      const components = p.address_components || []
                      const find = (t:string)=>components.find((c:any)=> (c.types||[]).includes(t))
                      const country = find('country')?.long_name || ''
                      const locality = find('locality')?.long_name || find('postal_town')?.long_name || ''
                      handleInputChange('warehouse_country', country)
                      handleInputChange('warehouse_city', locality)
                    }}>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Search address, then city/country auto-fill"
                      />
                    </StandaloneSearchBox>
                  </LoadScript>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Receipt No. Section */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Receipt No.</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="receipt_no" className="text-sm font-medium text-gray-700">
                  Receipt No.
                </Label>
                <Input
                  id="receipt_no"
                  value={formData.receipt_no}
                  placeholder="Auto-generated"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  disabled
                />
              </div>
              <Button
                type="button"
                onClick={addReceiptItem}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4" />
                <span>Add Artwork</span>
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {receiptItems.map((receiptItem) => (
              <div key={receiptItem.id}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-md font-medium text-gray-800">Item #{receiptItem.item_no}</h4>
                  {receiptItems.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeReceiptItem(receiptItem.id)}
                      className="text-red-600 hover:text-red-800 bg-transparent border-none p-1"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <ReceiptItemRow
                  receiptItem={receiptItem}
                  items={items as any}
                  artists={artists as any}
                  users={users}
                  onChange={updateReceiptItem}
                  onRemove={receiptItems.length > 1 ? removeReceiptItem : undefined}
                  onAddArtist={() => setShowArtistModal(true)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {consignment ? 'Update Consignment' : 'Create Consignment'}
          </Button>
        </div>
      </form>

      {showArtistModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-semibold">Create Artist</h4>
              <button onClick={()=>setShowArtistModal(false)} className="text-gray-600 hover:text-gray-800">✕</button>
            </div>
            <ArtistForm isEditing={false} onSaved={(a)=>{
              // Close, add to list, preselect in current focused receipt line if any
              setArtists((prev)=> [...prev, a as any])
              setShowArtistModal(false)
            }} />
          </div>
        </div>
      )}
    </div>
  )
} 