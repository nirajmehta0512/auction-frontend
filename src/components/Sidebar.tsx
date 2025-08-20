"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Home, 
  Users, 
  Package, 
  Layers, 
  Gavel, 
  Calculator, 
  BarChart3, 
  MessageSquare, 
  ClipboardList,
  Settings,
  Menu,
  ChevronDown,
  FileText,
  CreditCard,
  Palette,
  Mail,
  Tag,
  Shield,
  HelpCircle,
  Brush,
  GraduationCap,
  Truck,
  RotateCcw,
  Building2,
  Receipt,
  X,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  subItems?: SubNavItem[]
  badge?: string
}

interface SubNavItem {
  name: string
  href: string
  badge?: string
}

const navigationItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Consignments', href: '/consignments', icon: Package },
  { name: 'Artists', href: '/artists', icon: Brush },
  { name: 'Galleries', href: '/galleries', icon: Building2 },
  { name: 'School of Art', href: '/schools', icon: GraduationCap },
  { name: 'Inventory', href: '/items', icon: Layers },
  { name: 'Auctions', href: '/auctions', icon: Gavel },
  { name: 'Internal Invoices', href: '/invoices', icon: FileText, badge: 'New' },
  { name: 'Banking', href: '/banking', icon: Building2 },
  { 
    name: 'Internal Communication', 
    href: '/internal-communication', 
    icon: MessageSquare,
    subItems: [
      { name: 'Chat', href: '/internal-communication' },
      { name: 'Campaigns', href: '/internal-communication/campaigns' }
    ]
  },
  // { 
  //   name: 'Reports', 
  //   href: '/reports', 
  //   icon: BarChart3,
  //   subItems: [
  //     { name: 'Item Charge', href: '/reports/item-charge' },
  //     { name: 'Invoice Payment Summary', href: '/reports/invoice-payment' },
  //     { name: 'Settlements Summary', href: '/reports/settlements' },
  //     { name: 'Auction Results', href: '/reports/auction-results' },
  //     { name: 'Vendor Results', href: '/reports/vendor-results' },
  //     { name: 'Debtors', href: '/reports/debtors' },
  //     { name: 'Payments', href: '/reports/payments' }
  //   ]
  // },
  // { 
  //   name: 'Valuations', 
  //   href: '/valuations', 
  //   icon: ClipboardList,
  //   subItems: [
  //     { name: 'Days', href: '/valuations' },
  //     { name: 'Regions', href: '/valuations/regions' },
  //     { name: 'Leads', href: '/valuations/leads' }
  //   ]
  // },

  { name: 'Refunds', href: '/refunds', icon: RotateCcw },
  { 
    name: 'Reimbursements', 
    href: '/reimbursements', 
    icon: Receipt,
    subItems: [
      { name: 'Food', href: '/reimbursements?category=food' },
      { name: 'Fuel', href: '/reimbursements?category=fuel' },
      { name: 'Internal Logistics', href: '/reimbursements?category=internal_logistics' },
      { name: 'International Logistics', href: '/reimbursements?category=international_logistics' },
      { name: 'Stationary', href: '/reimbursements?category=stationary' },
      { name: 'Travel', href: '/reimbursements?category=travel' },
      { name: 'Accommodation', href: '/reimbursements?category=accommodation' },
      { name: 'Other', href: '/reimbursements?category=other' },
      { name: 'Accountant', href: '/reimbursements?status=accountant_approved', badge: '3' }
    ]
  }
]

const settingsItems: SubNavItem[] = [
  { name: 'Users', href: '/settings/users' },
  { name: 'Brand Members', href: '/settings/members' },
  // { name: 'Tags', href: '/settings/tags' },
  // { name: 'Messages', href: '/settings/messages' },
  // { name: 'VAT Rates', href: '/settings/vat-rates' },
  { name: 'Payment Methods', href: '/settings/payment-methods' },
  { name: 'Item Charges', href: '/settings/item-charges' },
  { name: 'Valuation Days', href: '/settings/valuation-days' },
  { name: 'Appearance', href: '/settings/appearance' },
  // { name: 'SEO', href: '/settings/seo' },
  { name: 'Integrations', href: '/settings/integrations' },
  { name: 'Platform Credentials', href: '/settings/platforms' },
  { name: 'Brand Settings', href: '/settings/brand' },
  { name: 'Brands & Visibility', href: '/settings/brands' },
  // { name: 'DAR', href: '/settings/dar' },
  { name: 'Compliance', href: '/settings/compliance' },
  { name: 'General', href: '/settings/general' },
  { name: 'About', href: '/settings/about' }
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])

  // Auto-expand menus if on their routes
  useEffect(() => {
    const expanded = []
    if (pathname.startsWith('/valuations')) expanded.push('Valuations')
    if (pathname.startsWith('/reports')) expanded.push('Reports')
    if (pathname.startsWith('/reimbursements')) expanded.push('Reimbursements')
    if (pathname.startsWith('/settings')) expanded.push('Settings')
    setExpandedMenus(expanded)
  }, [pathname])

  // Auto-navigate to first submenu item when parent is clicked
  useEffect(() => {
    const currentItem = navigationItems.find(item => 
      (item.name === 'Reports' || item.name === 'Valuations' || item.name === 'Reimbursements') && 
      pathname === item.href
    )
    if (currentItem && currentItem.subItems) {
      router.push(currentItem.subItems[0].href)
    }
    
    // Handle settings auto-navigation
    if (pathname === '/settings') {
      router.push('/settings/users')
    }
  }, [pathname, router])

  const handleMenuClick = (item: NavItem) => {
    if (item.subItems && item.subItems.length > 0) {
      const isCurrentlyExpanded = expandedMenus.includes(item.name)
      
      if (isCurrentlyExpanded) {
        setExpandedMenus(prev => prev.filter(name => name !== item.name))
      } else {
        setExpandedMenus([item.name]) // Only one menu expanded at a time
        router.push(item.subItems[0].href)
      }
    } else {
      setExpandedMenus([])
    }
  }

  const handleSettingsClick = () => {
    const isCurrentlyExpanded = expandedMenus.includes('Settings')
    
    if (isCurrentlyExpanded) {
      setExpandedMenus(prev => prev.filter(name => name !== 'Settings'))
    } else {
      setExpandedMenus(['Settings'])
      router.push('/settings/users')
    }
  }

  return (
    <div className={cn(
      "bg-white border-r border-gray-200 flex flex-col h-full shadow-sm transition-all duration-300",
      isCollapsed ? "w-16" : "w-72"
    )}>
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              MSABER
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mx-auto shadow-sm">
            <span className="text-white text-sm font-bold">M</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 text-gray-600 hover:text-gray-900"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-6">
        {!isCollapsed && (
          <div className="px-6 mb-4">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Navigation
            </span>
          </div>
        )}
        
        <nav className="px-3">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const IconComponent = item.icon
              const isActive = pathname === item.href || 
                               (item.subItems && item.subItems.some(sub => pathname === sub.href))
              const isExpanded = expandedMenus.includes(item.name)
              
              return (
                <li key={item.name}>
                  {item.subItems ? (
                    <div>
                      <button
                        onClick={() => handleMenuClick(item)}
                        className={cn(
                          "w-full flex items-center transition-all duration-200 group",
                          isCollapsed 
                            ? "justify-center p-3 mx-1 rounded-xl" 
                            : "px-3 py-2.5 justify-between rounded-xl",
                          isActive
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        )}
                      >
                        <div className="flex items-center">
                          <IconComponent className={cn(
                            "flex-shrink-0",
                            isCollapsed ? "h-5 w-5" : "h-5 w-5 mr-3"
                          )} />
                          {!isCollapsed && (
                            <span className="font-medium">{item.name}</span>
                          )}
                          {!isCollapsed && item.badge && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full font-medium">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {!isCollapsed && (
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            isExpanded && "transform rotate-180"
                          )} />
                        )}
                      </button>
                      
                      {/* Submenu items when expanded and not collapsed */}
                      {!isCollapsed && isExpanded && item.subItems && (
                        <ul className="mt-2 space-y-1 ml-4 border-l border-gray-200 pl-4">
                          {item.subItems.map((subItem) => (
                            <li key={subItem.name}>
                              <Link
                                href={subItem.href}
                                className={cn(
                                  "block px-3 py-2 text-sm transition-colors duration-200 rounded-lg relative",
                                  pathname === subItem.href
                                    ? "text-blue-600 bg-blue-50 font-medium border border-blue-200"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{subItem.name}</span>
                                  {subItem.badge && (
                                    <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-600 rounded-full font-medium">
                                      {subItem.badge}
                                    </span>
                                  )}
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => handleMenuClick(item)}
                      className={cn(
                        "flex items-center transition-all duration-200 group",
                        isCollapsed 
                          ? "justify-center p-3 mx-1 rounded-xl" 
                          : "px-3 py-2.5 rounded-xl",
                        pathname === item.href
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <IconComponent className={cn(
                        "flex-shrink-0",
                        isCollapsed ? "h-5 w-5" : "h-5 w-5 mr-3"
                      )} />
                      {!isCollapsed && (
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{item.name}</span>
                          {item.badge && (
                            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full font-medium">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* Settings Section */}
      <div className="border-t border-gray-100 py-4">
        <nav className="px-3">
          <ul>
            <li>
              <button
                onClick={handleSettingsClick}
                className={cn(
                  "w-full flex items-center transition-all duration-200 group",
                  isCollapsed 
                    ? "justify-center p-3 mx-1 rounded-xl" 
                    : "px-3 py-2.5 justify-between rounded-xl",
                  (pathname.startsWith('/settings'))
                    ? "bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <div className="flex items-center">
                  <Settings className={cn(
                    "flex-shrink-0",
                    isCollapsed ? "h-5 w-5" : "h-5 w-5 mr-3"
                  )} />
                  {!isCollapsed && (
                    <span className="font-medium">Settings</span>
                  )}
                </div>
                {!isCollapsed && (
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    expandedMenus.includes('Settings') && "transform rotate-180"
                  )} />
                )}
              </button>
              
              {/* Settings submenu */}
              {!isCollapsed && expandedMenus.includes('Settings') && (
                <ul className="mt-2 space-y-1 ml-4 border-l border-gray-200 pl-4">
                  {settingsItems.map((subItem) => (
                    <li key={subItem.name}>
                      <Link
                        href={subItem.href}
                        className={cn(
                          "block px-3 py-2 text-sm transition-colors duration-200 rounded-lg",
                          pathname === subItem.href
                            ? "text-blue-600 bg-blue-50 font-medium border border-blue-200"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span>{subItem.name}</span>
                          {subItem.badge && (
                            <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-600 rounded-full font-medium">
                              {subItem.badge}
                            </span>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
} 