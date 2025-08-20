// frontend/src/lib/xero-payments-api.ts
import { ApiResponse } from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Get authentication token
const getAuthToken = (): string => {
  return localStorage.getItem('token') || '';
};

// Handle API errors
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  return response;
};

export interface XeroCredentials {
  clientId: string;
  clientSecret: string;
  tenantName?: string;
  hasTokens: boolean;
  tokenExpiresAt?: string;
}

export interface XeroPaymentLink {
  invoiceId: string;
  invoiceNumber: string;
  paymentUrl: string;
  amount: number;
  dueDate: string;
  status: string;
}

export interface XeroInvoiceStatus {
  invoiceId: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  total: number;
}

// Get Xero authorization URL
export async function getXeroAuthUrl(brandId: string): Promise<{ authUrl: string }> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/api/xero-payments/auth-url/${brandId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Save Xero credentials
export async function saveXeroCredentials(brandId: string, clientId: string, clientSecret: string): Promise<ApiResponse> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/api/xero-payments/save-credentials`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      brandId,
      clientId,
      clientSecret
    })
  });

  await handleApiError(response);
  return response.json();
}

// Get Xero credentials (without secrets)
export async function getXeroCredentials(brandId: string): Promise<{ configured: boolean } & Partial<XeroCredentials>> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/api/xero-payments/credentials/${brandId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Create payment link
export async function createXeroPaymentLink(
  brandId: string,
  amount: number,
  description: string,
  customerEmail?: string
): Promise<{ success: boolean; paymentLink: XeroPaymentLink }> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/api/xero-payments/create-payment-link`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      brandId,
      amount,
      description,
      customerEmail
    })
  });

  await handleApiError(response);
  return response.json();
}

// Get invoice status
export async function getXeroInvoiceStatus(
  brandId: string,
  invoiceId: string
): Promise<{ success: boolean; invoice: XeroInvoiceStatus }> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/api/xero-payments/invoice-status/${brandId}/${invoiceId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Refresh access token
export async function refreshXeroToken(brandId: string): Promise<ApiResponse> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/api/xero-payments/refresh-token/${brandId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}
