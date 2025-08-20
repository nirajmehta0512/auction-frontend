// frontend/src/lib/logistics-api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Get authentication token from localStorage
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export interface LogisticsEntry {
  id: string;
  reference_number: string;
  description?: string;
  height_inches: number;
  width_inches: number;
  length_inches: number;
  weight_kg: number;
  destination_type: 'within_uk' | 'outside_uk';
  destination_country?: string;
  destination_address?: string;
  item_value: number;
  shipping_charge: number;
  insurance_charge: number;
  vat_charge: number;
  total_charge: number;
  shipping_formula_base?: number;
  shipping_formula_weight_multiplier?: number;
  shipping_formula_dimension_multiplier?: number;
  insurance_threshold?: number;
  insurance_rate?: number;
  insurance_minimum?: number;
  vat_rate?: number;
  international_surcharge_rate?: number;
  status?: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
  tracking_number?: string;
  item_id?: string;
  consignment_id?: string;
  client_id?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  // Related data
  items?: {
    title?: string;
    lot_number?: string;
  };
  consignments?: {
    consignment_number?: string;
  };
  clients?: {
    first_name?: string;
    last_name?: string;
    company?: string;
  };
}

export interface LogisticsFilters {
  status?: string;
  destination_type?: string;
  client_id?: string;
  item_id?: string;
  consignment_id?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
}

export interface LogisticsResponse {
  logistics: LogisticsEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ShippingCalculation {
  shipping_charge: number;
  insurance_charge: number;
  vat_charge: number;
  total_charge: number;
  breakdown: {
    cubic_inches: number;
    base_shipping: number;
    international_surcharge: number;
  };
}

export async function getLogistics(filters: LogisticsFilters = {}): Promise<LogisticsResponse> {
  const token = getAuthToken();
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value.toString());
    }
  });

  const response = await fetch(`${API_BASE_URL}/api/logistics?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

export async function getLogisticsEntry(id: string): Promise<LogisticsEntry> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/api/logistics/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

export async function createLogisticsEntry(logisticsData: Partial<LogisticsEntry>): Promise<LogisticsEntry> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/api/logistics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(logisticsData),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

export async function updateLogisticsEntry(id: string, logisticsData: Partial<LogisticsEntry>): Promise<LogisticsEntry> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/api/logistics/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(logisticsData),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

export async function deleteLogisticsEntry(id: string): Promise<void> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/api/logistics/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

export async function bulkActionLogistics(logisticsIds: string[], action: string, data?: any): Promise<void> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/api/logistics/bulk-action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      ids: logisticsIds,
      action: action,
      data: data
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

export async function exportLogisticsCSV(filters: LogisticsFilters = {}): Promise<Blob> {
  const token = getAuthToken();
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value.toString());
    }
  });

  const response = await fetch(`${API_BASE_URL}/api/logistics/export/csv?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.blob();
}

export async function importLogisticsCSV(csvData: any[]): Promise<any> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/api/logistics/import/csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ csvData }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

export async function calculateShipping(params: {
  height_inches: number;
  width_inches: number;
  length_inches: number;
  weight_kg: number;
  destination_type: 'within_uk' | 'outside_uk';
  item_value: number;
}): Promise<ShippingCalculation> {
  const token = getAuthToken();
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    queryParams.append(key, value.toString());
  });

  const response = await fetch(`${API_BASE_URL}/api/logistics/calculate?${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
} 