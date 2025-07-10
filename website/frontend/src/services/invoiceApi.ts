import { apiClient } from './api';
import { Invoice } from '../types/entities';

export interface Invoice {
  id: string;
  clientId: string;
  amount: number;
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  paidDate?: string;
  items: InvoiceItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CreateInvoiceRequest {
  clientId: string;
  amount: number;
  status: 'draft' | 'issued';
  dueDate: string;
  items: InvoiceItem[];
  notes?: string;
}

export interface UpdateInvoiceRequest {
  amount?: number;
  status?: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';
  dueDate?: string;
  paidDate?: string;
  items?: InvoiceItem[];
  notes?: string;
}

export interface InvoiceFilters {
  status?: string[];
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  totalPages: number;
}

class InvoiceApiService {
  private readonly baseUrl = '/admin/invoices';

  async getInvoices(filters: InvoiceFilters = {}): Promise<InvoiceListResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v.toString()));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    const response = await apiClient.get(`${this.baseUrl}?${queryParams.toString()}`);
    return response.data.data;
  }

  async getInvoice(id: string): Promise<Invoice> {
    const response = await apiClient.get(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  async createInvoice(invoice: CreateInvoiceRequest): Promise<Invoice> {
    const response = await apiClient.post(this.baseUrl, invoice);
    return response.data.data;
  }

  async updateInvoice(id: string, updates: UpdateInvoiceRequest): Promise<Invoice> {
    const response = await apiClient.put(`${this.baseUrl}/${id}`, updates);
    return response.data.data;
  }

  async updateInvoiceStatus(id: string, status: Invoice['status']): Promise<Invoice> {
    const response = await apiClient.patch(`${this.baseUrl}/${id}/status`, { status });
    return response.data.data;
  }

  async deleteInvoice(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  async exportInvoices(format: 'pdf' | 'csv', filters: InvoiceFilters = {}): Promise<Blob> {
    const queryParams = new URLSearchParams();
    queryParams.append('format', format);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v.toString()));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    const response = await apiClient.get(`${this.baseUrl}/export?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    
    return response.data;
  }

  async generateInvoicePdf(id: string): Promise<Blob> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/pdf`, {
      responseType: 'blob',
    });
    
    return response.data;
  }

  // Helper methods for calculations
  calculateItemTotal(item: Omit<InvoiceItem, 'total'>): number {
    return item.quantity * item.unitPrice;
  }

  calculateInvoiceTotal(items: InvoiceItem[]): number {
    return items.reduce((total, item) => total + item.total, 0);
  }

  formatCurrency(amount: number, currency = 'CAD'): string {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  getStatusColor(status: Invoice['status']): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    switch (status) {
      case 'draft':
        return 'default';
      case 'issued':
        return 'primary';
      case 'paid':
        return 'success';
      case 'overdue':
        return 'error';
      case 'cancelled':
        return 'warning';
      default:
        return 'default';
    }
  }

  getStatusLabel(status: Invoice['status']): string {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'issued':
        return 'Issued';
      case 'paid':
        return 'Paid';
      case 'overdue':
        return 'Overdue';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  isOverdue(invoice: Invoice): boolean {
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return false;
    }
    
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return dueDate < today;
  }

  getDaysUntilDue(invoice: Invoice): number {
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  getDaysOverdue(invoice: Invoice): number {
    if (!this.isOverdue(invoice)) {
      return 0;
    }
    
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
}

export const invoiceApi = new InvoiceApiService(); 