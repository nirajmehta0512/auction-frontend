// frontend/src/lib/invoices-api.ts
import { Invoice, InvoiceFormData, PaginatedResponse } from '@/types/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface InvoiceFilters {
  status?: string
  auction_id?: number
  client_id?: number
  search?: string
  page?: number
  limit?: number
  sort_field?: string
  sort_direction?: 'asc' | 'desc'
}

export const InvoicesAPI = {
  // Get all invoices with optional filtering
  getInvoices: async (filters: InvoiceFilters = {}): Promise<PaginatedResponse<Invoice>> => {
    const token = localStorage.getItem('token')
    const queryParams = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString())
      }
    })

    const response = await fetch(`${API_BASE_URL}/api/invoices?${queryParams}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch invoices: ${response.statusText}`)
    }

    return await response.json()
  },

  // Get single invoice by ID
  getInvoice: async (id: number): Promise<Invoice> => {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}/api/invoices/${id}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch invoice: ${response.statusText}`)
    }

    return await response.json()
  },

  // Create new invoice
  createInvoice: async (data: InvoiceFormData): Promise<Invoice> => {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}/api/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`Failed to create invoice: ${response.statusText}`)
    }

    const result = await response.json()
    return result.data
  },

  // Update existing invoice
  updateInvoice: async (id: number, data: Partial<InvoiceFormData>): Promise<Invoice> => {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}/api/invoices/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`Failed to update invoice: ${response.statusText}`)
    }

    const result = await response.json()
    return result.data
  },

  // Delete invoice
  deleteInvoice: async (id: number): Promise<void> => {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}/api/invoices/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to delete invoice: ${response.statusText}`)
    }
  },

  // Generate invoice from auction data
  generateFromAuction: async (data: {
    auction_id: number
    client_id?: number
    logistics?: any
  }): Promise<Invoice> => {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}/api/invoices/generate-from-auction`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`Failed to generate invoice from auction: ${response.statusText}`)
    }

    const result = await response.json()
    return result.data
  }
}

// Export individual functions for backward compatibility
export const getInvoice = InvoicesAPI.getInvoice
export const updateInvoice = InvoicesAPI.updateInvoice
export const getInvoicesForRefund = InvoicesAPI.getInvoices // Use getInvoices for refund purposes