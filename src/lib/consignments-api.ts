// frontend/src/lib/consignments-api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Get authentication token from localStorage
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export interface Consignment {
  id?: number; // Changed from string to number
  consignment_number: string;
  receipt_no?: string;
  client_id: number; // Changed from string to number
  client_name?: string;
  client_email?: string;
  client_company?: string;
  client_title?: string;
  client_salutation?: string;
  specialist_id?: number; // Changed from string to number
  specialist_name?: string;
  valuation_day_id?: number; // Changed from string to number
  online_valuation_reference?: string;
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
  created_by?: number; // Changed from string to number
  updated_by?: number; // Changed from string to number
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
  consignments: Consignment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Get all consignments
export async function getConsignments(filters: ConsignmentFilters = {}): Promise<any> {
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
  
  const url = `${API_BASE_URL}/api/consignments?${params.toString()}`;
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
  return result;
}

// Get single consignment
export async function getConsignment(id: string): Promise<Consignment> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/consignments/${id}`, {
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
  
  const response = await fetch(`${API_BASE_URL}/api/consignments`, {
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
  
  const response = await fetch(`${API_BASE_URL}/api/consignments/${id}`, {
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
  
  const response = await fetch(`${API_BASE_URL}/api/consignments/${id}`, {
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

// Bulk actions
export async function bulkActionConsignments(consignmentIds: string[], action: string): Promise<void> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/consignments/bulk-action`, {
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

// Export consignments to CSV
export async function exportConsignmentsCSV(filters: ConsignmentFilters = {}): Promise<Blob> {
  const token = getAuthToken();
  
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });
  
  const response = await fetch(`${API_BASE_URL}/api/consignments/export/csv?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    }
  });
  
  if (!response.ok) {
    throw new Error(`Error exporting consignments: ${response.statusText}`);
  }
  
  return response.blob();
}

// Import consignments from CSV
export async function importConsignmentsCSV(csvData: any[]): Promise<any> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/consignments/upload/csv`, {
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