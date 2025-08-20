// frontend/src/lib/artworks-api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Artwork interface matching the database schema and LiveAuctioneers requirements
export interface Artwork {
  id?: string;
  lot_num: string;                    // Required: LotNum (up to 10 chars)
  title: string;                      // Required: Title (max 49 chars)
  description: string;                // Required: Description (unlimited)
  low_est: number;                    // Required: Low Estimate
  high_est: number;                   // Required: High Estimate  
  start_price?: number;               // Optional: Start Price (defaults to 50% of low_est)
  condition?: string;                 // Optional: Condition
  reserve?: number;                   // Optional: Reserve price (internal use)
  consignor?: string;                 // Optional: Consignor (internal use)
  
  // Additional auction management fields
  status?: 'draft' | 'active' | 'sold' | 'withdrawn' | 'passed';
  category?: string;
  subcategory?: string;
  dimensions?: string;
  weight?: string;
  materials?: string;
  artist_id?: number;                 // Reference to artist in database
  school_id?: string;
  period_age?: string;
  provenance?: string;
  auction_id?: string;
  
  // Image fields (1-10 images)
  image_file_1?: string;
  image_file_2?: string;
  image_file_3?: string;
  image_file_4?: string;
  image_file_5?: string;
  image_file_6?: string;
  image_file_7?: string;
  image_file_8?: string;
  image_file_9?: string;
  image_file_10?: string;
  
  // Audit fields
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ArtworksResponse {
  success: boolean;
  data: Artwork[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  counts: {
    draft: number;
    active: number;
    sold: number;
    withdrawn: number;
    passed: number;
  };
}

export interface ArtworkResponse {
  success: boolean;
  data: Artwork;
  message?: string;
}

interface GetArtworksParams {
  status?: string;
  category?: string;
  auction_id?: string;
  consignment_id?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
  brand_code?: 'MSABER' | 'AURUM' | 'METSAB';
}

// Helper function to get auth token
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Helper function to create auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Helper function to handle API errors
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  return response;
};

export class ArtworksAPI {
  // Get all artworks with optional filtering and pagination
  static async getArtworks(params: GetArtworksParams = {}): Promise<ArtworksResponse> {
    // Check if user is super admin
    const isSuperAdmin = (): boolean => {
      if (typeof window !== 'undefined') {
        const userRole = localStorage.getItem('user_role');
        return userRole === 'super_admin';
      }
      return false;
    };

    // Only require brand_code for non-super-admin users if no brand_code is explicitly provided
    if (!isSuperAdmin() && !params.brand_code && typeof window !== 'undefined') {
      const savedBrand = localStorage.getItem('brand_code');
      if (savedBrand && savedBrand.toLowerCase() !== 'all') {
        params = { ...params, brand_code: savedBrand as 'MSABER' | 'AURUM' | 'METSAB' };
      } else if (!savedBrand) {
        // Default to MSABER if no brand code is saved for non-super admin
        params = { ...params, brand_code: 'MSABER' };
      }
      // If savedBrand is 'ALL', don't set brand_code to show all brands
    }
    
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Don't include brand_code if it's 'ALL' or 'all'
        if (key === 'brand_code' && value.toString().toLowerCase() === 'all') {
          return;
        }
        queryParams.append(key, value.toString());
      }
    });

    const response = await fetch(`${API_BASE_URL}/api/items?${queryParams}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    await handleApiError(response);
    return response.json();
  }

  // Get specific artwork by ID
  static async getArtwork(id: string): Promise<ArtworkResponse> {
    const response = await fetch(`${API_BASE_URL}/api/items/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    await handleApiError(response);
    return response.json();
  }

  // Create new artwork
  static async createArtwork(artworkData: Omit<Artwork, 'id' | 'created_at' | 'updated_at'>): Promise<ArtworkResponse> {
    const response = await fetch(`${API_BASE_URL}/api/items`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(artworkData),
    });

    await handleApiError(response);
    return response.json();
  }

  // Update existing artwork
  static async updateArtwork(id: string, artworkData: Partial<Artwork>): Promise<ArtworkResponse> {
    const response = await fetch(`${API_BASE_URL}/api/items/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(artworkData),
    });

    await handleApiError(response);
    return response.json();
  }

  // Delete artwork (soft delete by default)
  static async deleteArtwork(id: string, hardDelete = false): Promise<{ success: boolean; message: string }> {
    const queryParams = hardDelete ? '?hard_delete=true' : '';
    const response = await fetch(`${API_BASE_URL}/api/items/${id}${queryParams}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    await handleApiError(response);
    return response.json();
  }

  // Bulk operations
  static async bulkAction(
    action: 'delete' | 'update_status',
    itemIds: string[],
    data?: { status?: string }
  ): Promise<{ success: boolean; message: string; affected_count: number }> {
    const response = await fetch(`${API_BASE_URL}/api/items/bulk-action`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action,
        item_ids: itemIds,
        data
      }),
    });

    await handleApiError(response);
    return response.json();
  }

  // Export items to CSV by platform
  static async exportCSV(params: { 
    auction_id?: string; 
    status?: string; 
    category?: string;
    platform?: 'liveauctioneers' | 'easy_live' | 'invaluable' | 'the_saleroom'
  } = {}): Promise<void> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== 'all') {
        queryParams.append(key, value.toString());
      }
    });

    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/items/export/csv?${queryParams}`, {
      method: 'GET',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
    });

    await handleApiError(response);

    // Create blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const platformSuffix = params.platform || 'liveauctioneers';
    a.download = `items_${platformSuffix}_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Download a CSV template for a platform
  static async downloadTemplate(platform: 'liveauctioneers' | 'easy_live' | 'invaluable' | 'the_saleroom' = 'liveauctioneers') {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/items/export/template?platform=${platform}`, {
      method: 'GET',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
    });
    await handleApiError(response);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `items_${platform}_template.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Validate CSV data before upload
  static async validateCSV(csvData: string, platform: 'liveauctioneers' | 'easy_live' | 'invaluable' | 'the_saleroom' = 'liveauctioneers'): Promise<{
    success: boolean;
    validation_result?: {
      total_rows: number;
      valid_rows: number;
      errors: string[];
      sample_items: Artwork[];
    };
    error?: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/items/upload/csv`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        csvData,
        validateOnly: true,
        platform
      }),
    });

    return response.json();
  }

  // Upload items from CSV (LiveAuctioneers compatible format)
  static async uploadCSV(csvData: string, platform: 'liveauctioneers' | 'easy_live' | 'invaluable' | 'the_saleroom' = 'liveauctioneers'): Promise<{
    success: boolean;
    message?: string;
    imported_count?: number;
    items?: Artwork[];
    error?: string;
    errors?: string[];
    existing_lot_numbers?: string[];
    duplicate_lot_numbers?: string[];
  }> {
    const response = await fetch(`${API_BASE_URL}/api/items/upload/csv`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        csvData,
        validateOnly: false,
        platform
      }),
    });

    return response.json();
  }

  // Upload images to a platform FTP (e.g., LiveAuctioneers)
  static async uploadImagesViaFTP(params: {
    host: string;
    user: string;
    password: string;
    secure?: boolean;
    base_dir?: string;
    files: { path: string; content: string; encoding?: 'base64' | 'utf8' }[];
  }): Promise<{ success: boolean; uploaded?: number; error?: string; details?: string }> {
    const response = await fetch(`${API_BASE_URL}/api/items/images/upload/ftp`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    })
    return response.json()
  }

  // Auto-upload images to FTP by fetching item image URLs (by auction_id or item_ids)
  static async uploadImagesViaFTPFromItems(params: {
    brand_code: string;
    platform?: 'liveauctioneers';
    auction_id?: string;
    item_ids?: string[];
    base_dir?: string;
    host?: string;
    secure?: boolean;
  }): Promise<{ success?: boolean; uploaded?: number; errors?: string[]; error?: string; details?: string }> {
    const response = await fetch(`${API_BASE_URL}/api/items/images/upload/ftp/from-items`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    })
    return response.json()
  }
}

// Platform credentials helpers (used by frontend components to pull saved creds)
export async function getPlatformCredentials(brandCode: string, platform: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await fetch(`${API_BASE_URL}/api/platform-credentials?brand_code=${encodeURIComponent(brandCode)}&platform=${encodeURIComponent(platform)}`, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })
  if (!res.ok) throw new Error('Failed to fetch platform credentials')
  const data = await res.json()
  return Array.isArray(data.data) ? data.data[0] : null
}

// Validation functions
export const validateArtworkData = (data: Partial<Artwork>): string[] => {
  const errors: string[] = [];

  if (!data.lot_num?.trim()) {
    errors.push('Lot number is required');
  } else if (data.lot_num.length > 10) {
    errors.push('Lot number must be 10 characters or less');
  }

  if (!data.title?.trim()) {
    errors.push('Title is required');
  } else if (data.title.length > 200) {
    errors.push('Title must be 200 characters or less');
  }

  if (!data.description?.trim()) {
    errors.push('Description is required');
  }

  if (!data.low_est || data.low_est <= 0) {
    errors.push('Low estimate is required and must be greater than 0');
  }

  if (!data.high_est || data.high_est <= 0) {
    errors.push('High estimate is required and must be greater than 0');
  }

  if (data.low_est && data.high_est && data.low_est >= data.high_est) {
    errors.push('High estimate must be greater than low estimate');
  }

  if (data.start_price && data.low_est && data.start_price > data.low_est) {
    errors.push('Start price cannot be greater than low estimate');
  }

  return errors;
};

// Helper functions
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return 'bg-green-500';
    case 'sold': return 'bg-blue-500';
    case 'withdrawn': return 'bg-red-500';
    case 'passed': return 'bg-gray-500';
    case 'draft': return 'bg-yellow-500';
    default: return 'bg-gray-400';
  }
};

export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'active': return 'Active';
    case 'sold': return 'Sold';
    case 'withdrawn': return 'Withdrawn';
    case 'passed': return 'Passed';
    case 'draft': return 'Draft';
    default: return 'Unknown';
  }
};

export const formatLotNumber = (lotNum: string): string => {
  return lotNum.toUpperCase().trim();
};

export const generateStartPrice = (lowEst: number): number => {
  return Math.round(lowEst * 0.5);
};

// Categories for dropdown selections
export const ITEM_CATEGORIES = [
  'Fine Art',
  'Antiques',
  'Jewelry & Watches',
  'Asian Art',
  'Furniture',
  'Silver & Metalware',
  'Ceramics & Glass',
  'Books & Manuscripts',
  'Collectibles',
  'Textiles',
  'Sculptures',
  'Photography',
  'Wine & Spirits',
  'Musical Instruments',
  'Coins & Currency',
  'Stamps',
  'Sports Memorabilia',
  'Tribal Art',
  'Modern Design',
  'Vintage Fashion'
];

export const ITEM_CONDITIONS = [
  'Excellent',
  'Very Good',
  'Good',
  'Fair',
  'Poor',
  'As Found',
  'Restored',
  'Original Condition'
];

export const ITEM_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'passed', label: 'Passed' }
]; 