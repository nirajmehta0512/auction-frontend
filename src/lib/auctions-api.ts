// frontend/src/lib/auctions-api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

// Get authentication token from localStorage
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export interface Auction {
  id: number;
  type: 'timed' | 'live' | 'sealed_bid';
  subtype?: 'actual' | 'post_sale_platform' | 'post_sale_private' | 'free_timed';
  short_name: string;
  long_name: string;
  target_reserve?: number;
  specialist_id?: number | null;
  specialist?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  charges?: any;
  description?: string;
  important_notice?: string;
  title_image_url?: string;
  catalogue_launch_date?: string;
  aftersale_deadline?: string;
  shipping_date?: string;
  settlement_date: string;
  auction_days: any[];
  sale_events?: any[];
  auctioneer_declaration?: string;
  bid_value_increments?: string;
  sorting_mode?: 'standard' | 'automatic' | 'manual';
  estimates_visibility?: 'use_global' | 'show_always' | 'do_not_show';
  time_zone?: string;
  platform?: string;
  upload_status?: string;
  brand_id?: number;
  brand?: {
    id: number;
    code: string;
    name: string;
  };
  total_estimate_low?: number;
  total_estimate_high?: number;
  total_sold_value?: number;
  sold_lots_count?: number;

  // Platform URLs
  liveauctioneers_url?: string;
  easy_live_url?: string;
  invaluable_url?: string;
  the_saleroom_url?: string;

  artwork_ids?: number[]; // Array of artwork/item IDs
  created_at?: string;
  updated_at?: string;
}

export interface AuctionFilters {
  status?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
  brand_id?: number;
}

export interface AuctionResponse {
  auctions: Auction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Check if user is super admin
const isSuperAdmin = (): boolean => {
  if (typeof window !== 'undefined') {
    const userRole = localStorage.getItem('user_role');
    return userRole === 'super_admin';
  }
  return false;
};

// Get all auctions
export async function getAuctions(filters: AuctionFilters = {}): Promise<AuctionResponse> {
  const token = getAuthToken();

  // Brand code filtering ignored for now
  
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });
  
  const response = await fetch(`${API_BASE_URL}/auctions?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('Auctions response:', response);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `Error fetching auctions: ${response.statusText}`);
  }
  
  return response.json();
}

// Get single auction
export async function getAuction(id: string): Promise<Auction> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/auctions/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Error fetching auction: ${response.statusText}`);
  }
  
  return response.json();
}

// Get auction status counts
export interface AuctionStatusCounts {
  future: number;
  present: number;
  past: number;
}

export interface AuctionStatusCountsResponse {
  success: boolean;
  counts: AuctionStatusCounts;
}

export async function getAuctionStatusCounts(brandId?: number): Promise<AuctionStatusCountsResponse> {
  const token = getAuthToken();

  const params = new URLSearchParams();
  if (brandId) {
    params.append('brand_id', brandId.toString());
  }

  const response = await fetch(`${API_BASE_URL}/auctions/counts/status?${params}`, {
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `Error fetching status counts: ${response.statusText}`);
  }

  return response.json();
}

// Create new auction
export async function createAuction(auctionData: Partial<Auction>): Promise<Auction> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/auctions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(auctionData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error creating auction: ${response.statusText}`);
  }
  
  return response.json();
}

// Update auction
export async function updateAuction(id: string, auctionData: Partial<Auction>): Promise<Auction> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/auctions/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(auctionData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error updating auction: ${response.statusText}`);
  }
  
  return response.json();
}

// Delete auction
export async function deleteAuction(id: string): Promise<void> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/auctions/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Error deleting auction: ${response.statusText}`);
  }
}

// Bulk actions
export async function bulkActionAuctions(auctionIds: string[], action: string): Promise<void> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/auctions/bulk-action`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ auction_ids: auctionIds, action })
  });
  
  if (!response.ok) {
    throw new Error(`Error performing bulk action: ${response.statusText}`);
  }
}

// Export auctions to CSV
export async function exportAuctionsCSV(filters: AuctionFilters = {}): Promise<Blob> {
  const token = getAuthToken();
  
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });
  
  const response = await fetch(`${API_BASE_URL}/auctions/export/csv?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    }
  });
  
  if (!response.ok) {
    throw new Error(`Error exporting auctions: ${response.statusText}`);
  }
  
  return response.blob();
}

// Import auctions from CSV
export async function importAuctionsCSV(csvData: any[]): Promise<any> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/auctions/upload/csv`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ csv_data: csvData })
  });
  
  if (!response.ok) {
    throw new Error(`Error importing auctions: ${response.statusText}`);
  }
  
  return response.json();
}

// Invoice-related interfaces and functions
export interface Invoice {
  id: number
  invoice_number: string
  title: string
  hammer_price?: number
  buyers_premium?: number
  buyer_first_name: string
  buyer_last_name: string
  buyer_email: string
  buyer_phone: string
  ship_to_first_name?: string
  ship_to_last_name?: string
  ship_to_address?: string
  ship_to_city?: string
  ship_to_state?: string
  ship_to_country?: string
  ship_to_postal_code?: string
  platform: string
  status: 'paid' | 'unpaid' | 'cancelled'
  paid_amount?: number
  domestic_flat_shipping?: number
  paddle_number?: string
  type?: 'buyer' | 'vendor'
  created_at: string
  client?: {
    id: number
    first_name: string
    last_name: string
    email: string
    phone_number?: string
  }
  item?: {
    id: number
    title: string
    height_inches?: string;
    width_inches?: string;
    height_cm?: string;
    width_cm?: string;
    height_with_frame_inches?: string;
    width_with_frame_inches?: string;
    height_with_frame_cm?: string;
    width_with_frame_cm?: string;
    weight?: string
    artist_maker?: string
  }
}

export interface InvoicesResponse {
  success: boolean
  message: string
  data: {
    invoices: Invoice[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
}

export interface EOAImportResponse {
  success: boolean
  message: string
  data: {
    imported_count: number
    inserted_count: number
    updated_count: number
    buyer_invoices_count: number
    vendor_invoices_count: number
    invoices: Invoice[]
  }
}

// Get invoices for an auction
export async function getAuctionInvoices(
  auctionId: string,
  options: { page?: number; limit?: number; brand_id?: number; type?: 'buyer' | 'vendor' } = {}
): Promise<InvoicesResponse> {
  const token = getAuthToken();

  const params = new URLSearchParams();
  if (options.page) params.append('page', options.page.toString());
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.type) params.append('type', options.type);

  const response = await fetch(`${API_BASE_URL}/auctions/${auctionId}/invoices?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `Error fetching invoices: ${response.statusText}`);
  }
  
  return response.json();
}

// Import EOA data
export async function importEOA(formData: FormData): Promise<EOAImportResponse> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/auctions/import-eoa`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type header, let browser set it for FormData
    },
    body: formData
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `Error importing EOA: ${response.statusText}`);
  }
  
  return response.json();
}

// Export EOA CSV
export async function exportEOACsv(auctionId: string): Promise<Blob> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/invoices/export-eoa-csv/${auctionId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `Error exporting EOA CSV: ${response.statusText}`);
  }

  return response.blob();
}

// Generate invoice PDF
export async function generateInvoicePdf(
  invoiceId: number,
  type: 'internal' | 'final',
  brandId?: number
): Promise<Blob> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/pdf`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type,
      brand_id: brandId
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `Error generating PDF: ${response.statusText}`);
  }

  return response.blob();
}

// Generate passed auction with unsold items
export async function generatePassedAuction(
  originalAuctionId: string,
  subtype: 'actual' | 'post_sale_platform' | 'post_sale_private' | 'free_timed',
  options?: {
    short_name?: string;
    long_name?: string;
  }
): Promise<Auction> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/auctions/${originalAuctionId}/generate-passed`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ subtype, ...options })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `Error generating passed auction: ${response.statusText}`);
  }

  return response.json();
}

// Export auction data to platform-specific CSV format
export async function exportAuctionToPlatform(
  auctionId: string,
  platform: 'liveauctioneers' | 'easy_live' | 'invaluable' | 'the_saleroom'
): Promise<void> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/auctions/${auctionId}/export/${platform}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `Error exporting auction: ${response.statusText}`);
  }

  // Create blob and download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auction_${auctionId}_${platform}_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Export auction images to platform-specific ZIP format
export async function exportAuctionImagesToPlatform(
  auctionId: string,
  platform: 'liveauctioneers' | 'easy_live' | 'invaluable' | 'the_saleroom' | 'database'
): Promise<void> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/auctions/${auctionId}/export-images/${platform}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `Error exporting images: ${response.statusText}`);
  }

  // Create blob and download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auction_${auctionId}_images_${platform}_${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Platform export information
export interface PlatformInfo {
  id: 'liveauctioneers' | 'easy_live' | 'invaluable' | 'the_saleroom' | 'database';
  name: string;
  imageFormat: string;
  description: string;
}

// Brand auction counts interface
export interface BrandAuctionCounts {
  [brandId: number]: number;
}

export const PLATFORM_OPTIONS: PlatformInfo[] = [
  {
    id: 'liveauctioneers',
    name: 'Live Auctioneers',
    imageFormat: '1_1.jpg, 1_2.jpg, 1_3.jpg, 1_4.jpg',
    description: 'Format: 1_1.jpg, 1_2.jpg, 1_3.jpg, 1_4.jpg'
  },
  {
    id: 'easy_live',
    name: 'EasyLive',
    imageFormat: '1.jpg, 1-2.jpg, 1-3.jpg, 2.jpg, 2-2.jpg',
    description: 'Format: 1.jpg, 1-2.jpg, 1-3.jpg, 2.jpg, 2-2.jpg, 2-3.jpg'
  },
  {
    id: 'the_saleroom',
    name: 'The Saleroom',
    imageFormat: '1.jpg, 1-2.jpg, 1-3.jpg, 1-4.jpg, 1-5.jpg',
    description: 'Format: 1.jpg, 1-2.jpg, 1-3.jpg, 1-4.jpg, 1-5.jpg'
  },
  {
    id: 'invaluable',
    name: 'Invaluable',
    imageFormat: '1_1.jpg, 1_2.jpg, 1_3.jpg',
    description: 'Format: 1_1.jpg, 1_2.jpg, 1_3.jpg (similar to Live Auctioneers)'
  },
  {
    id: 'database',
    name: 'Database',
    imageFormat: 'lot_1_img_1.jpg, lot_1_img_2.jpg',
    description: 'Database format: lot_1_img_1.jpg, lot_1_img_2.jpg'
  }
];

// Brand interface for auction count loading
export interface Brand {
  id: number;
  code: string;
  name: string;
}

// Utility function to check if an auction is past its settlement date
export function isAuctionPast(auction: Auction): boolean {
  const today = new Date()
  const settlementDate = new Date(auction.settlement_date)
  return today > settlementDate
}

// Get auction counts for multiple brands
export async function getBrandAuctionCounts(brands: Brand[]): Promise<BrandAuctionCounts> {
  const counts: BrandAuctionCounts = {};

  try {
    // Extract brand IDs
    const brandIds = brands.map(brand => brand.id);

    // Use the new backend endpoint to get counts for all brands at once
    const response = await fetch(`${API_BASE_URL}/auctions/counts/brands?brand_ids=${brandIds.join(',')}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch auction counts: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && data.counts) {
      // Use the counts from the backend
      Object.assign(counts, data.counts);
    } else {
      throw new Error('Invalid response format from backend');
    }

  } catch (error) {
    console.error('Error loading brand auction counts:', error);
    // Return empty counts if there's a general error
    brands.forEach(brand => {
      counts[brand.id] = 0;
    });
  }

  return counts;
}