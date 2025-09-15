// frontend/src/lib/consignments-api.ts
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

export interface Consignment {
  id?: number; // Changed from string to number
  client_id: number; // Changed from string to number
  client_name?: string;
  client_email?: string;
  client_company?: string;
  client_title?: string;
  client_salutation?: string;
  client_brand_code?: string;
  brandCode?: string; // Alternative field name
  specialist_id?: number; // Changed from string to number
  specialist_name?: string;
  valuation_day_id?: number; // Changed from string to number
  online_valuation_reference?: string;
  reference?: string; // New field
  reference_commission?: number; // New field (default 3%)
  default_sale_id?: number; // Changed from string to number
  default_vendor_commission?: number;
  status?: 'active' | 'pending' | 'completed' | 'cancelled' | 'archived';
  is_signed?: boolean;
  signing_date?: string;
  warehouse_location?: string;
  warehouse_with_whom?: string;
  warehouse_country?: string;
  warehouse_city?: string;
  items_count?: number;
  total_estimated_value?: number;
  total_reserve_value?: number;
  total_sold_value?: number;
  sold_items_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ConsignmentFilters {
  status?: string;
  client_id?: number; // Changed from string to number
  specialist_id?: number; // Changed from string to number
  search?: string;
  page?: number;
  limit?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
}

export interface ConsignmentResponse {
  success: boolean;
  data: Consignment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  counts: {
    active: number;
    pending: number;
    completed: number;
    cancelled: number;
    archived: number;
  };
}

export interface PresaleOption {
  auction_id: number;
  auction_short_name: string;
  auction_long_name: string;
  auction_settlement_date: string;
  auction_type: string;
  auction_subtype?: string;
  auction_catalogue_launch_date?: string;
  brand_id?: number;
  brand_code?: string;
  brand_name?: string;
  specialist_id?: number;
  specialist_name?: string;
  items_count: number;
  items: PresaleItem[];
  total_low_est: number;
  total_high_est: number;
  total_reserve: number;
}

export interface PresaleItem {
  id: number;
  title: string;
  description?: string;
  status: string;
  low_est?: number;
  high_est?: number;
  reserve?: number;
  artist_id?: number;
  artists?: {
    id: number;
    name: string;
  };
  auction_id: number;
  auction_short_name: string;
  auction_long_name: string;
  auction_settlement_date: string;
}

export interface PresaleOptionsResponse {
  consignment_id: number;
  total_items: number;
  presaleOptions: PresaleOption[];
  message: string;
}

// Get all consignments
export async function getConsignments(filters: ConsignmentFilters = {}): Promise<ConsignmentResponse> {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });
  
  const url = `${API_BASE_URL}/consignments?${params.toString()}`;
  console.log('Fetching consignments from:', url); // Debug log
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Consignments API error:', response.status, errorText);
    throw new Error(`Error fetching consignments: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log('Consignments API result:', result); // Debug log
  console.log('Consignments API result type of data:', typeof result.data, Array.isArray(result.data) ? `Array with ${result.data.length} items` : 'Not an array'); // Debug log
  return result;
}

// Get single consignment
export async function getConsignment(id: string): Promise<Consignment> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/consignments/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Error fetching consignment: ${response.statusText}`);
  }
  
  const json = await response.json();
  return json?.data || json;
}

// Create new consignment
export async function createConsignment(consignmentData: Partial<Consignment>): Promise<Consignment> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/consignments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(consignmentData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error creating consignment: ${response.statusText}`);
  }
  
  const json = await response.json();
  return json?.data || json;
}

// Update consignment
export async function updateConsignment(id: string, consignmentData: Partial<Consignment>): Promise<Consignment> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/consignments/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(consignmentData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error updating consignment: ${response.statusText}`);
  }
  
  const json = await response.json();
  return json?.data || json;
}

// Delete consignment
export async function deleteConsignment(id: string): Promise<void> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/consignments/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Error deleting consignment: ${response.statusText}`);
  }
}

// Add artworks to consignment
export async function addArtworksToConsignment(consignmentId: string, artworkIds: number[]): Promise<void> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/consignments/${consignmentId}/add-artworks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ artwork_ids: artworkIds })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error adding artworks to consignment: ${response.statusText}`);
  }
}

// Remove artworks from consignment
export async function removeArtworksFromConsignment(consignmentId: string, artworkIds: number[]): Promise<void> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/consignments/${consignmentId}/remove-artworks`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ artwork_ids: artworkIds })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error removing artworks from consignment: ${response.statusText}`);
  }
}

// Bulk actions
export async function bulkActionConsignments(consignmentIds: string[], action: string): Promise<void> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/consignments/bulk-action`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ consignment_ids: consignmentIds, action })
  });
  
  if (!response.ok) {
    throw new Error(`Error performing bulk action: ${response.statusText}`);
  }
}

// Import consignments from CSV
export async function importConsignmentsCSV(csvData: any[]): Promise<any> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/consignments/upload/csv`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ csv_data: csvData })
  });

  if (!response.ok) {
    throw new Error(`Error importing consignments: ${response.statusText}`);
  }

  return response.json();
}

// Export consignments to CSV
export async function exportConsignmentsCSV(filters: ConsignmentFilters = {}): Promise<Blob> {
  const token = getAuthToken();

  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });

  const response = await fetch(`${API_BASE_URL}/consignments/export/csv?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    }
  });

  if (!response.ok) {
    throw new Error(`Error exporting consignments: ${response.statusText}`);
  }

  return response.blob();
}

// Get presale invoice options for a consignment
export async function getPresaleOptions(consignmentId: string): Promise<PresaleOptionsResponse> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/consignments/${consignmentId}/presale-options`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Error fetching presale options: ${response.statusText}`);
  }

  const json = await response.json();
  return json?.data || json;
} 