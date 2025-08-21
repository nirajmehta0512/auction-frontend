// frontend/src/lib/clients-api.ts

// Client interface with integer ID
export interface Client {
  id?: number; // Changed from string to number
  brand?: string; // Brand code used for dynamic display prefix (e.g., MSABER)
  brand_code?: string; // Provided by backend enrichment
  brand_name?: string; // Provided by backend enrichment
  brand_id?: string; // FK to brands table
  title?: string;
  first_name: string;
  last_name: string;
  salutation?: string;
  birth_date?: string;
  preferred_language?: string;
  time_zone?: string;
  tags?: string;
  email?: string;
  phone_number?: string;
  company_name?: string;
  vat_number?: string;
  has_no_email?: boolean;
  vat_applicable?: boolean;
  secondary_email?: string;
  secondary_phone_number?: string;
  instagram_url?: string;
  // Deprecated flags removed in favor of client_type
  // is_vendor?: boolean;
  // is_buyer?: boolean;
  // is_supplier?: boolean; // Third-party suppliers not related to auctions
  client_type?: 'buyer' | 'vendor' | 'supplier' | 'buyer_vendor'; // Combined field for easier filtering
  default_vat_scheme?: string;
  default_ldl?: string;
  default_consignment_charges?: string;
  billing_address1?: string;
  billing_address2?: string;
  billing_address3?: string;
  billing_city?: string;
  billing_post_code?: string;
  billing_country?: string;
  billing_region?: string;
  shipping_same_as_billing?: boolean;
  shipping_address1?: string;
  shipping_address2?: string;
  shipping_address3?: string;
  shipping_city?: string;
  shipping_post_code?: string;
  shipping_country?: string;
  shipping_region?: string;
  status?: 'active' | 'suspended' | 'pending' | 'deleted' | 'archived';
  role?: string;
  paddle_no?: string;
  identity_cert?: string;
  platform?: 'Liveauctioneer' | 'The saleroom' | 'Invaluable' | 'Easylive auctions' | 'Private' | 'Others';
  created_at?: string;
  updated_at?: string;
}

// Response interface for paginated results
export interface ClientsResponse {
  success: boolean;
  data: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  counts: {
    active: number;
    suspended: number;
    pending: number;
    archived: number;
    deleted: number;
  };
}

// Single client response interface
export interface ClientResponse {
  success: boolean;
  data: Client;
  message?: string;
}

export interface ClientOverviewResponse {
  success: boolean;
  data: {
    client: Client;
    purchases: any[];
    consignments: any[];
    invoices: any[];
    logistics: any[];
  };
}

// Bulk action request interface
export interface BulkActionRequest {
  action: 'delete' | 'update_status';
  client_ids: number[];
  data?: {
    status?: string;
  };
}

// CSV validation response interface
export interface CSVValidationResponse {
  success: boolean;
  validation_result: {
    total_rows: number;
    valid_rows: number;
    errors: string[];
    sample_clients: Client[];
  };
}

// CSV upload response interface
export interface CSVUploadResponse {
  success: boolean;
  message: string;
  imported_count: number;
  clients: Client[];
  errors: string[];
  existing_emails: string[];
  duplicate_emails: string[];
}

// Utility function to format client display (MSA-XXX format)
export const formatClientDisplay = (client: Client): string => {
  // Compute dynamically from brand code (brand_code or brand) + id
  const rawBrand = client.brand_code || client.brand || '';
  const prefix = rawBrand.trim().length > 0
    ? rawBrand.trim().toUpperCase().slice(0, 3)
    : 'MSA';
  return client.id ? `${prefix}-${client.id.toString().padStart(3, '0')}` : 'Unknown';
};

// Utility function to get client full name
export const getClientFullName = (client: Client): string => {
  return `${client.first_name} ${client.last_name}`.trim();
};

// Utility function to get client display name (includes company if available)
export const getClientDisplayName = (client: Client): string => {
  const fullName = getClientFullName(client);
  return client.company_name ? `${fullName} (${client.company_name})` : fullName;
};

// Utility function to get client type display
export const getClientTypeDisplay = (client: Client): string => {
  switch (client.client_type) {
    case 'buyer_vendor':
      return 'Buyer & Vendor';
    case 'buyer':
      return 'Buyer';
    case 'vendor':
      return 'Vendor';
    case 'supplier':
      return 'Supplier';
    default:
      return 'Buyer';
  }
};

// Utility function to get client type color for badges
export const getClientTypeColor = (client: Client): string => {
  switch (client.client_type) {
    case 'buyer_vendor':
      return 'bg-purple-100 text-purple-800';
    case 'buyer':
      return 'bg-green-100 text-green-800';
    case 'vendor':
      return 'bg-blue-100 text-blue-800';
    case 'supplier':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Utility function to determine client type from boolean flags
export const determineClientType = (client: Client): 'buyer' | 'vendor' | 'supplier' | 'buyer_vendor' => {
  return client.client_type || 'buyer';
};

// Base API URL
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3001/api';

// Get authentication token from localStorage or cookies
const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

// Create headers with authentication
const createHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Handle API response errors
const handleApiError = async (response: Response): Promise<never> => {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  } else {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
};

/**
 * Fetch clients with filtering, pagination, and search
 */
export const fetchClients = async (params: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
  brand_code?: string;
  client_type?: 'buyer' | 'vendor' | 'supplier' | 'buyer_vendor';
  tags?: string;
  platform?: 'all' | 'Liveauctioneer' | 'The saleroom' | 'Invaluable' | 'Easylive auctions' | 'Private' | 'Others';
  registration_date?: 'all' | '30days' | '3months' | '6months' | '1year';
} = {}): Promise<ClientsResponse> => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });

  const url = `${API_BASE_URL}/clients?${searchParams.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders()
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Fetch a single client by integer ID
 */
export const fetchClient = async (id: number): Promise<ClientResponse> => {
  const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
    method: 'GET',
    headers: createHeaders()
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Fetch client overview (purchases, consignments, invoices, logistics)
 */
export const fetchClientOverview = async (id: number): Promise<ClientOverviewResponse> => {
  const response = await fetch(`${API_BASE_URL}/clients/${id}/overview`, {
    method: 'GET',
    headers: createHeaders()
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Create a new client
 */
export const createClient = async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<ClientResponse> => {
  const response = await fetch(`${API_BASE_URL}/clients`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify(clientData)
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Update an existing client
 */
export const updateClient = async (id: number, clientData: Partial<Client>): Promise<ClientResponse> => {
  const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
    method: 'PUT',
    headers: createHeaders(),
    body: JSON.stringify(clientData)
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Delete a client (soft delete by default)
 */
export const deleteClient = async (id: number, hardDelete: boolean = false): Promise<{ success: boolean; message: string }> => {
  const url = hardDelete 
    ? `${API_BASE_URL}/clients/${id}?hard_delete=true`
    : `${API_BASE_URL}/clients/${id}`;
    
  const response = await fetch(url, {
    method: 'DELETE',
    headers: createHeaders()
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Perform bulk actions on multiple clients
 */
export const bulkActionClients = async (request: BulkActionRequest): Promise<{ success: boolean; message: string; affected_count: number }> => {
  const response = await fetch(`${API_BASE_URL}/clients/bulk-action`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Validate CSV data before import
 */
export const validateClientCSV = async (csvData: string): Promise<CSVValidationResponse> => {
  const response = await fetch(`${API_BASE_URL}/clients/validate-csv`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({ csv_data: csvData })
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Upload and import clients from CSV
 */
export const uploadClientCSV = async (csvData: string): Promise<CSVUploadResponse> => {
  const response = await fetch(`${API_BASE_URL}/clients/upload-csv`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({ csv_data: csvData })
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Export clients to CSV
 */
export const exportClientsCSV = async (params: {
  status?: string;
  search?: string;
} = {}): Promise<Blob> => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });

  const url = `${API_BASE_URL}/clients/export/csv?${searchParams.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders()
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.blob();
};

/**
 * Search clients by text (searches across multiple fields including display_id)
 */
export const searchClients = async (searchTerm: string, limit: number = 10): Promise<Client[]> => {
  const params = {
    search: searchTerm,
    limit,
    status: 'active' // Only search active clients by default
  };

  const result = await fetchClients(params);
  return result.data;
};

/**
 * Get client by display_id (MSA-XXX format)
 */
export const getClientByDisplayId = async (_displayId: string): Promise<Client | null> => {
  // display_id deprecated; try to parse trailing numeric id from input like AAA-123 and search by id
  const match = _displayId.match(/^(?:[a-zA-Z]{2,4}-)?(\d{1,})$/);
  if (match) {
    const idNum = parseInt(match[1]);
    if (!Number.isNaN(idNum)) {
      const resp = await fetchClient(idNum);
      return resp?.data || null;
    }
  }
  const result = await searchClients(_displayId, 1);
  return result?.[0] || null;
};