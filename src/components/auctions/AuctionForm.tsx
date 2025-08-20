// frontend/src/components/auctions/AuctionForm.tsx
"use client"

import React, { useState } from 'react'
import { Plus, Minus, ChevronDown, ChevronUp, Clock, Calendar, Info, DollarSign, Save, X, AlertCircle } from 'lucide-react'
import { createAuction, updateAuction } from '@/lib/auctions-api'
import type { Auction } from '@/lib/auctions-api'

// Modern UI Components with better styling
const Label = ({ htmlFor, className, children, required }: { 
  htmlFor?: string; 
  className?: string; 
  children: React.ReactNode;
  required?: boolean;
}) => (
  <label htmlFor={htmlFor} className={`block text-sm font-semibold text-gray-700 mb-2 ${className}`}>
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
)

const Input = ({ id, type = "text", value, onChange, className, required, min, placeholder, icon, step }: { 
  id?: string; 
  type?: string; 
  value?: string | number; 
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  className?: string; 
  required?: boolean; 
  min?: string;
  placeholder?: string;
  icon?: React.ElementType;
  step?: string;
}) => {
  const IconComponent = icon
  return (
    <div className="relative">
      {IconComponent && (
        <IconComponent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
      )}
      <input 
        id={id} 
        type={type} 
        value={value} 
        onChange={onChange} 
        className={`w-full ${IconComponent ? 'pl-10' : 'pl-4'} pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${className}`} 
        required={required}
        min={min}
        step={step}
        placeholder={placeholder}
      />
    </div>
  )
}

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
    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none ${className}`} 
    placeholder={placeholder}
    rows={rows}
    required={required}
  />
)

const Select = ({ value, onValueChange, children, className }: { 
  value?: string; 
  onValueChange?: (value: string) => void; 
  children: React.ReactNode;
  className?: string;
}) => (
  <select
    value={value}
    onChange={(e) => onValueChange?.(e.target.value)}
    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${className}`}
  >
    {children}
  </select>
)

const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
  <option value={value}>{children}</option>
)

const Button = ({ type = "button", variant = "primary", onClick, disabled, className, children, icon }: { 
  type?: "button" | "submit"; 
  variant?: "primary" | "secondary" | "danger" | "outline"; 
  onClick?: () => void; 
  disabled?: boolean; 
  className?: string; 
  children: React.ReactNode;
  icon?: React.ElementType;
}) => {
  const baseClasses = "inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
  
  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    outline: "border-2 border-gray-300 hover:border-gray-400 text-gray-700 bg-white focus:ring-gray-500"
  }
  
  const disabledClasses = "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-current"
  
  const IconComponent = icon
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
    >
      {IconComponent && <IconComponent className="w-5 h-5 mr-2" />}
      {children}
    </button>
  )
}

interface AuctionFormProps {
  auction?: Auction;
  onSave?: (auction: Auction) => void;
  onCancel?: () => void;
}

export default function AuctionForm({ auction, onSave, onCancel }: AuctionFormProps) {
  const [formData, setFormData] = useState({
    type: auction?.type || 'sealed_bid',
    short_name: auction?.short_name || '',
    long_name: auction?.long_name || '',
    target_reserve: auction?.target_reserve || 0,
    specialist_id: auction?.specialist_id || 0,
    description: auction?.description || '',
    important_notice: auction?.important_notice || '',
    title_image_url: auction?.title_image_url || '',
    catalogue_launch_date: auction?.catalogue_launch_date || '',
    aftersale_deadline: auction?.aftersale_deadline || '',
    shipping_date: auction?.shipping_date || '',
    settlement_date: auction?.settlement_date || '',
    auction_days: auction?.auction_days || [{ day: 1, date: '', start_time: '', end_time: '', first_lot: 1, description: '' }],
    sale_events: auction?.sale_events || [],
    auctioneer_declaration: auction?.auctioneer_declaration || '',
    bid_value_increments: auction?.bid_value_increments || '10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200',
    sorting_mode: auction?.sorting_mode || 'standard',
    estimates_visibility: auction?.estimates_visibility || 'use_global',
    time_zone: auction?.time_zone || 'UTC'
  })

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let savedAuction
      if (auction?.id) {
        savedAuction = await updateAuction(auction.id, formData)
      } else {
        savedAuction = await createAuction(formData)
      }
      onSave?.(savedAuction)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save auction')
    } finally {
      setLoading(false)
    }
  }

  const addAuctionDay = () => {
    setFormData(prev => ({
      ...prev,
      auction_days: [...prev.auction_days, { 
        day: prev.auction_days.length + 1, 
        date: '', 
        start_time: '', 
        end_time: '', 
        first_lot: 1, 
        description: '' 
      }]
    }))
  }

  const removeAuctionDay = (index: number) => {
    setFormData(prev => ({
      ...prev,
      auction_days: prev.auction_days.filter((_, i) => i !== index)
    }))
  }

  const updateAuctionDay = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      auction_days: prev.auction_days.map((day, i) => 
        i === index ? { ...day, [field]: value } : day
      )
    }))
  }

  const addSaleEvent = () => {
    setFormData(prev => ({
      ...prev,
      sale_events: [...prev.sale_events, { 
        type: 'pickup', 
        date: '', 
        start_time: '', 
        end_time: '', 
        description: '' 
      }]
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={onCancel}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <X className="h-5 w-5" />
            <span>Back to Auctions</span>
          </button>
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {auction ? 'Edit Auction' : 'Create New Auction'}
              </h1>
              <p className="text-gray-600 mt-1">
                {auction ? 'Update auction details and settings' : 'Set up a new auction with all the necessary details'}
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100">
              <div className="flex items-center space-x-3">
                <Info className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Auction Type Selection */}
              <div>
                <Label required>Auction Type</Label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'timed', label: 'Timed Auction', desc: 'Online bidding with time limits' },
                    { value: 'live', label: 'Live Auction', desc: 'Real-time bidding event' },
                    { value: 'sealed_bid', label: 'Sealed Bid', desc: 'Private bid submissions' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: type.value as any }))}
                      className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                        formData.type === type.value
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-semibold">{type.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{type.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="short_name" required>Short Name</Label>
                  <Input
                    id="short_name"
                    value={formData.short_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, short_name: e.target.value }))}
                    placeholder="e.g., Winter Sale 2024"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="long_name" required>Long Name</Label>
                  <Input
                    id="long_name"
                    value={formData.long_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, long_name: e.target.value }))}
                    placeholder="e.g., Winter Contemporary Art Sale 2024"
                    required
                  />
                </div>
              </div>

              {/* Target Reserve and Specialist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="target_reserve">Target Reserve</Label>
                  <Input
                    id="target_reserve"
                    type="number"
                    step="0.01"
                    value={formData.target_reserve}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_reserve: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    icon={DollarSign}
                  />
                </div>
                <div>
                  <Label htmlFor="specialist">Specialist In Charge</Label>
                  <Select 
                    value={formData.specialist_id.toString()} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, specialist_id: parseInt(value) || 0 }))}
                  >
                    <SelectItem value="0">Select Specialist</SelectItem>
                    <SelectItem value="1">Sarah Buchanan</SelectItem>
                    <SelectItem value="2">James Morrison</SelectItem>
                    <SelectItem value="3">Emily Chen</SelectItem>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Provide a detailed description of the auction..."
                />
              </div>

              {/* Important Notice */}
              <div>
                <Label htmlFor="important_notice">Important Notice</Label>
                <Textarea
                  id="important_notice"
                  value={formData.important_notice}
                  onChange={(e) => setFormData(prev => ({ ...prev, important_notice: e.target.value }))}
                  rows={2}
                  placeholder="Any important notices for bidders..."
                />
              </div>
            </div>
          </div>

          {/* Key Dates Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-green-100">
              <div className="flex items-center space-x-3">
                <Calendar className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Important Dates</h2>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="catalogue_launch">Catalogue Launch</Label>
                  <Input
                    id="catalogue_launch"
                    type="datetime-local"
                    value={formData.catalogue_launch_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, catalogue_launch_date: e.target.value }))}
                    icon={Clock}
                  />
                </div>
                <div>
                  <Label htmlFor="aftersale_deadline">Aftersale Deadline</Label>
                  <Input
                    id="aftersale_deadline"
                    type="datetime-local"
                    value={formData.aftersale_deadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, aftersale_deadline: e.target.value }))}
                    icon={Clock}
                  />
                </div>
                <div>
                  <Label htmlFor="shipping_date">Shipping Date</Label>
                  <Input
                    id="shipping_date"
                    type="datetime-local"
                    value={formData.shipping_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, shipping_date: e.target.value }))}
                    icon={Clock}
                  />
                </div>
                <div>
                  <Label htmlFor="settlement_date" required>Settlement Date</Label>
                  <Input
                    id="settlement_date"
                    type="datetime-local"
                    value={formData.settlement_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, settlement_date: e.target.value }))}
                    required
                    icon={Clock}
                  />
                  <p className="text-sm text-amber-600 mt-2 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Settlement date is required for all auctions
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Auction Days Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-purple-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Clock className="h-6 w-6 text-purple-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Auction Days</h2>
                </div>
                <Button
                  type="button"
                  onClick={addAuctionDay}
                  variant="outline"
                  icon={Plus}
                  className="!py-2 !px-4 !text-sm"
                >
                  Add Day
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {formData.auction_days.map((day, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Day {day.day}</h3>
                    {formData.auction_days.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeAuctionDay(index)}
                        variant="danger"
                        icon={Minus}
                        className="!py-2 !px-4 !text-sm"
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label required>Date</Label>
                      <Input
                        type="date"
                        value={day.date}
                        onChange={(e) => updateAuctionDay(index, 'date', e.target.value)}
                        required
                        icon={Calendar}
                      />
                    </div>
                    <div>
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={day.start_time}
                        onChange={(e) => updateAuctionDay(index, 'start_time', e.target.value)}
                        icon={Clock}
                      />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={day.end_time}
                        onChange={(e) => updateAuctionDay(index, 'end_time', e.target.value)}
                        icon={Clock}
                      />
                    </div>
                    <div>
                      <Label>First Lot Number</Label>
                      <Input
                        type="number"
                        min="1"
                        value={day.first_lot}
                        onChange={(e) => updateAuctionDay(index, 'first_lot', parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Day Description</Label>
                    <Textarea
                      value={day.description}
                      onChange={(e) => updateAuctionDay(index, 'description', e.target.value)}
                      rows={2}
                      placeholder="Optional description for this auction day..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Settings Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between hover:from-gray-100 hover:to-slate-100 transition-all duration-200"
            >
              <div className="flex items-center space-x-3">
                <ChevronDown className={`h-5 w-5 text-gray-600 transition-transform duration-200 ${isAdvancedOpen ? 'rotate-180' : ''}`} />
                <h2 className="text-xl font-semibold text-gray-900">Advanced Settings</h2>
              </div>
            </button>
            
            {isAdvancedOpen && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="sorting_mode">Sorting Mode</Label>
                                         <Select 
                       value={formData.sorting_mode} 
                       onValueChange={(value) => setFormData(prev => ({ ...prev, sorting_mode: value as 'standard' | 'automatic' | 'manual' }))}
                     >
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="automatic">Automatic</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="estimates_visibility">Estimates Visibility</Label>
                                         <Select 
                       value={formData.estimates_visibility} 
                       onValueChange={(value) => setFormData(prev => ({ ...prev, estimates_visibility: value as 'use_global' | 'show_always' | 'do_not_show' }))}
                     >
                      <SelectItem value="use_global">Use Global Setting</SelectItem>
                      <SelectItem value="show_always">Always Visible</SelectItem>
                      <SelectItem value="do_not_show">Always Hidden</SelectItem>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="bid_value_increments">Bid Value Increments</Label>
                  <Textarea
                    id="bid_value_increments"
                    value={formData.bid_value_increments}
                    onChange={(e) => setFormData(prev => ({ ...prev, bid_value_increments: e.target.value }))}
                    rows={3}
                    placeholder="Enter comma-separated bid increment values..."
                  />
                </div>

                <div>
                  <Label htmlFor="auctioneer_declaration">Auctioneer Declaration</Label>
                  <Textarea
                    id="auctioneer_declaration"
                    value={formData.auctioneer_declaration}
                    onChange={(e) => setFormData(prev => ({ ...prev, auctioneer_declaration: e.target.value }))}
                    rows={3}
                    placeholder="Auctioneer's terms and conditions..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              icon={X}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              icon={Save}
              className="min-w-[140px]"
            >
              {loading ? 'Saving...' : (auction ? 'Update Auction' : 'Create Auction')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 