"use client"

import React, { useState, useEffect } from 'react'
import { Calendar, ChevronDown, MoreHorizontal, TrendingUp, TrendingDown, Users, Package, Gavel, DollarSign, Building } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getDashboardStats, getRecentAuctions, getTopLots, getTopBuyers, getTopVendors, DashboardStats } from '@/lib/dashboard-api'
import { getBrands, Brand } from '@/lib/brands-api'

export default function DashboardPage() {
  // Set default to last 30 days
  const getDefaultDates = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    return {
      from: thirtyDaysAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    };
  };

  const defaultDates = getDefaultDates();
  const [dateFrom, setDateFrom] = useState(defaultDates.from)
  const [dateTo, setDateTo] = useState(defaultDates.to)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Date range selection state
  const [selectedDateRange, setSelectedDateRange] = useState<string>('last30days')

  // Brand selection state
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all')
  const [brandsLoading, setBrandsLoading] = useState(false)

  // Load brands on component mount
  useEffect(() => {
    loadBrands()
  }, [])

  // Calculate dates based on selected range
  const getDatesForRange = (range: string) => {
    const today = new Date();
    const to = today.toISOString().split('T')[0];

    switch (range) {
      case 'last7days':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        return { from: sevenDaysAgo.toISOString().split('T')[0], to };
      case 'last30days':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        return { from: thirtyDaysAgo.toISOString().split('T')[0], to };
      case 'lastyear':
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(today.getFullYear() - 1);
        return { from: oneYearAgo.toISOString().split('T')[0], to };
      case 'last2years':
        const twoYearsAgo = new Date(today);
        twoYearsAgo.setFullYear(today.getFullYear() - 2);
        return { from: twoYearsAgo.toISOString().split('T')[0], to };
      case 'custom':
        return { from: dateFrom, to: dateTo };
      default:
        return getDefaultDates();
    }
  };

  // Update dates when range changes
  useEffect(() => {
    if (selectedDateRange !== 'custom') {
      const newDates = getDatesForRange(selectedDateRange);
      setDateFrom(newDates.from);
      setDateTo(newDates.to);
    }
  }, [selectedDateRange]);

  // Load dashboard data when filters change
  useEffect(() => {
    loadDashboardData()
  }, [dateFrom, dateTo, selectedBrandId])

  const loadBrands = async () => {
    try {
      setBrandsLoading(true)
      const response = await getBrands()
      if (response.success) {
        setBrands(response.data)
      }
    } catch (error) {
      console.error('Error loading brands:', error)
    } finally {
      setBrandsLoading(false)
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get selected brand code or undefined for 'all'
      const brandCode = selectedBrandId === 'all' ? undefined : brands.find(b => b.id.toString() === selectedBrandId)?.code

      const data = await getDashboardStats(dateFrom || undefined, dateTo || undefined, brandCode)
      setStats(data)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-gray-50 min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error loading dashboard</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadDashboardData}
            className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!stats) return null

  // Calculate donut chart values
  const soldPercentage = stats.lots.soldPercentage
  const soldInAuctionPerc = stats.lots.totalLots > 0 ? (stats.lots.soldInAuction / stats.lots.totalLots) * 100 : 0
  const soldAfterwardsPerc = stats.lots.totalLots > 0 ? (stats.lots.soldAfterwards / stats.lots.totalLots) * 100 : 0
  const unsoldPercentage = 100 - soldPercentage

  // Donut chart calculations
  const circumference = 2 * Math.PI * 35
  const soldOffset = circumference * (1 - soldInAuctionPerc / 100)
  const afterSalesOffset = circumference * (1 - (soldInAuctionPerc + soldAfterwardsPerc) / 100)

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Date Filter Section */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
          {/* Date Range Selector */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="bg-transparent text-gray-900 font-medium text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="lastyear">Last Year</option>
              <option value="last2years">Last 2 Years</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Custom Date Inputs - Only show when custom is selected */}
          {selectedDateRange === 'custom' && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-transparent text-gray-900 font-medium text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <span className="text-gray-400">-</span>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-transparent text-gray-900 font-medium text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
          )}

          {/* Brand Filter */}
          <div className="flex items-center space-x-2">
            <Building className="h-5 w-5 text-gray-400" />
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              disabled={brandsLoading}
              className="bg-transparent text-gray-900 font-medium text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">All Brands</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id.toString()}>
                  {brand.name} ({brand.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Top Row - Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Gavel className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Auctions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.auctions.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Lots</p>
                <p className="text-2xl font-bold text-gray-900">{stats.lots.totalLots.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-teal-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-teal-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sold Rate</p>
                <p className="text-2xl font-bold text-gray-900">{soldPercentage}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.revenue.totalRevenue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Second Row - Auctions and Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Auctions Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Auctions</h3>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {stats.recentAuctions.length > 0 ? (
                stats.recentAuctions.slice(0, 5).map((auction) => (
                  <div key={auction.id} className="flex items-center justify-between">
                    <div className="text-teal-600 hover:text-teal-700 cursor-pointer">
                      {auction.short_name}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {new Date(auction.start_date).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">No auctions found</div>
              )}
            </div>
          </div>

          {/* Lots Sold Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Lots Sold</h3>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center">
              {/* Donut Chart */}
              <div className="relative w-48 h-48 mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="35"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="10"
                  />
                  {/* Sold in auction */}
                  {soldInAuctionPerc > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="35"
                      fill="none"
                      stroke="#14B8A6"
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={soldOffset}
                    />
                  )}
                  {/* Sold afterwards */}
                  {soldAfterwardsPerc > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="35"
                      fill="none"
                      stroke="#F97316"
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={afterSalesOffset}
                    />
                  )}
                  {/* Unsold */}
                  {unsoldPercentage > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="35"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={0}
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold text-gray-900">{soldPercentage}%</span>
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex items-center space-x-4 text-sm mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                  <span>Sold</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>Aftersales</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Unsold</span>
                </div>
              </div>

              {/* Stats */}
              <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Sold</span>
                  <span className="text-teal-600 font-medium">{stats.lots.totalSold} / {stats.lots.totalLots}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sold In Auction</span>
                  <span>{stats.lots.soldInAuction}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sold In Aftersale</span>
                  <span>{stats.lots.soldAfterwards}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unsold</span>
                  <span>{stats.lots.unsold}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Third Row - Value Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Total Value */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Total Value</h3>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Total Low Estimate</span>
                <span className="font-medium">{formatCurrency(stats.values.totalLowEstimate)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total High Estimate</span>
                <span className="font-medium">{formatCurrency(stats.values.totalHighEstimate)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Reserve</span>
                <span className="font-medium">{formatCurrency(stats.values.totalReserve)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Hammer Price</span>
                <span className="font-medium">{formatCurrency(stats.values.totalHammerPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Hammer + Commission</span>
                <span className="font-medium">{formatCurrency(stats.values.totalHammerWithCommission)}</span>
              </div>
            </div>
          </div>

          {/* Buyer Total */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Buyer Stats</h3>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Total Buyers</span>
                <span className="font-medium">{stats.buyers.totalBuyers}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Bidders</span>
                <span className="font-medium">{stats.buyers.totalBidders}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Bids</span>
                <span className="font-medium">{stats.buyers.totalBids}</span>
              </div>
            </div>
          </div>

          {/* Vendor Total */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Vendor Stats</h3>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Total Vendors</span>
                <span className="font-medium">{stats.vendors.totalVendors}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Consignments</span>
                <span className="font-medium">{stats.vendors.totalConsignments}</span>
              </div>
              <div className="flex justify-between">
                <span>Items from Vendors</span>
                <span className="font-medium">{stats.lots.totalLots}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fourth Row - Revenue and Best Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Total Revenue */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Total Revenue</h3>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 flex items-center justify-center">
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(stats.revenue.totalRevenue)}</div>
            </div>
          </div>

          {/* Best 5 Lots */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Top 5 Lots</h3>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-2 text-sm">
              {stats.topLots.length > 0 ? (
                stats.topLots.map((lot, index) => (
                  <div key={lot.id} className="flex justify-between">
                    <span className="text-teal-600">{lot.auction_name} / {lot.lot_number}</span>
                    <span className="font-medium">{formatCurrency(lot.hammer_price)}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">No sold lots</div>
              )}
            </div>
          </div>

          {/* Best 5 Buyers */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Top 5 Buyers</h3>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-2 text-sm">
              {stats.topBuyers.length > 0 ? (
                stats.topBuyers.map((buyer, index) => (
                  <div key={buyer.id} className="flex justify-between">
                    <span className="text-teal-600">{buyer.name}</span>
                    <span className="font-medium">{formatCurrency(buyer.total_spent)}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">No buyer data</div>
              )}
            </div>
          </div>

          {/* Best 5 Vendors */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Top 5 Vendors</h3>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-2 text-sm">
              {stats.topVendors.length > 0 ? (
                stats.topVendors.map((vendor, index) => (
                  <div key={vendor.id} className="flex justify-between">
                    <span className="text-teal-600">{vendor.name}</span>
                    <span className="font-medium">{formatCurrency(vendor.total_revenue)}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">No vendor data</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}