// frontend/src/lib/auctions-api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
  short_name: string;
  long_name: string;
  target_reserve?: number;
  specialist_id?: number;
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
  brand_code?: string;
  brand_id?: string;
  lots_count?: number;
  registrations_count?: number;
  total_estimate_low?: number;
  total_estimate_high?: number;
  total_sold_value?: number;
  sold_lots_count?: number;
  status?: 'planned' | 'in_progress' | 'ended' | 'aftersale' | 'archived';
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface AuctionFilters {
  status?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
  brand_code?: 'MSABER' | 'AURUM' | 'METSAB';
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
  
  // Only require brand_code for non-super-admin users
  if (!isSuperAdmin() && !filters.brand_code && typeof window !== 'undefined') {
    const savedBrand = localStorage.getItem('brand_code');
    if (savedBrand) {
      filters = { ...filters, brand_code: savedBrand as 'MSABER' | 'AURUM' | 'METSAB' };
    } else {
      // For non-super admin users, default to MSABER if no brand is set
      filters = { ...filters, brand_code: 'MSABER' };
    }
  }
  
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });
  
  const response = await fetch(`${API_BASE_URL}/api/auctions?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `Error fetching auctions: ${response.statusText}`);
  }
  
  return response.json();
}

// Get single auction
export async function getAuction(id: string): Promise<Auction> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/auctions/${id}`, {
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

// Create new auction
export async function createAuction(auctionData: Partial<Auction>): Promise<Auction> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/auctions`, {
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
  
  const response = await fetch(`${API_BASE_URL}/api/auctions/${id}`, {
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
  
  const response = await fetch(`${API_BASE_URL}/api/auctions/${id}`, {
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
  
  const response = await fetch(`${API_BASE_URL}/api/auctions/bulk-action`, {
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
  
  const response = await fetch(`${API_BASE_URL}/api/auctions/export/csv?${params}`, {
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
  
  const response = await fetch(`${API_BASE_URL}/api/auctions/upload/csv`, {
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