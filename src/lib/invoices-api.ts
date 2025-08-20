// frontend/src/lib/invoices-api.ts
import { ApiResponse } from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Minimal internal invoice shape used by backend
export interface InternalInvoice {
  id: number;
  invoice_number: string;
  brand_id?: string;
  client_id?: number;
  client_name?: string;
  auction_id?: number;
  auction_name?: string;
  invoice_date: string;
  due_date?: string;
  is_international?: boolean;
  hammer_price?: number;
  buyers_premium?: number;
  vat_amount?: number;
  total_amount?: number;
  shipping_charge?: number;
  international_surcharge?: number;
  handling_charge?: number;
  insurance_charge?: number;
  total_shipping_amount?: number;
  logistics?: any;
  payment_status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// Get authentication token
const getAuthToken = (): string => {
  return typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';
};

// Helper function to check if user is super admin
const isSuperAdmin = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userRole = localStorage.getItem('user_role');
  return userRole === 'super_admin';
};

// Handle API errors
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  return response;
};

// Get all invoices (internal snapshots)
export async function getInvoices(params?: {
  search?: string;
  client_id?: string;
  auction_id?: string;
  payment_status?: string;
  page?: number;
  limit?: number;
}): Promise<{ invoices: InternalInvoice[]; total: number; totalPages: number }> {
  const token = getAuthToken();
  const brand_code = isSuperAdmin() ? undefined : (typeof window !== 'undefined' ? (localStorage.getItem('brand_code') || 'MSABER') : undefined);

  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.client_id) queryParams.append('client_id', params.client_id);
  if (params?.auction_id) queryParams.append('auction_id', params.auction_id);
  if (params?.payment_status) queryParams.append('payment_status', params.payment_status);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (brand_code) queryParams.append('brand_code', brand_code);

  const response = await fetch(`${API_BASE_URL}/api/invoices?${queryParams}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  await handleApiError(response);
  return response.json();
}

// Get single invoice snapshot
export async function getInvoice(id: string): Promise<InternalInvoice> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/invoices/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  await handleApiError(response);
  const data = await response.json();
  return data.invoice as InternalInvoice;
}

// Create/save invoice snapshot (minimal store)
export async function createInvoice(invoiceData: Partial<InternalInvoice & { brand_code?: string }>): Promise<InternalInvoice> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/invoices`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(invoiceData),
  });
  await handleApiError(response);
  const data = await response.json();
  return data.invoice as InternalInvoice;
}

// Update invoice snapshot (e.g., logistics)
export async function updateInvoice(id: string, invoiceData: Partial<InternalInvoice>): Promise<InternalInvoice> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/invoices/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(invoiceData),
  });
  await handleApiError(response);
  const data = await response.json();
  return data.invoice as InternalInvoice;
}

// Delete invoice snapshot
export async function deleteInvoice(id: string): Promise<ApiResponse> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/invoices/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  await handleApiError(response);
  return response.json();
}

// List invoices for refund page selector
export async function getInvoicesForRefund(): Promise<Array<{
  id: number;
  invoice_number: string;
  client_name?: string;
  total_amount: number;
  hammer_price: number;
  buyers_premium: number;
  shipping_charge: number;
  international_surcharge: number;
  handling_charge: number;
  insurance_charge: number;
  is_international: boolean;
}>> {
  const token = getAuthToken();
  const brand_code = isSuperAdmin() ? undefined : (typeof window !== 'undefined' ? (localStorage.getItem('brand_code') || 'MSABER') : undefined);
  const query = brand_code ? `?brand_code=${encodeURIComponent(brand_code)}` : '';
  const response = await fetch(`${API_BASE_URL}/api/invoices/for-refund/list${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  await handleApiError(response);
  return response.json();
}