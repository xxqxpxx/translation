import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    version: string;
    requestId: string;
    pagination?: PaginationMeta;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

class ApiClient {
  private client: AxiosInstance;
  private getToken: (() => Promise<string | null>) | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  setAuthTokenProvider(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        if (this.getToken) {
          const token = await this.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        return response;
      },
      (error: AxiosError<ApiResponse>) => {
        const { response } = error;
        
        if (response) {
          // Handle specific error codes
          switch (response.status) {
            case 401:
              // Unauthorized - redirect to login
              if (typeof window !== 'undefined') {
                window.location.href = '/sign-in';
              }
              break;
            case 403:
              // Forbidden - show error message
              console.error('Access forbidden:', response.data?.error?.message);
              break;
            case 429:
              // Rate limit exceeded
              console.error('Rate limit exceeded. Please try again later.');
              break;
            case 500:
              // Server error
              console.error('Server error. Please try again later.');
              break;
            default:
              console.error('API Error:', response.data?.error?.message || error.message);
          }
        } else if (error.request) {
          // Network error
          console.error('Network error. Please check your connection.');
        } else {
          console.error('Request error:', error.message);
        }

        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP methods
  async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url);
    return response.data;
  }

  // Specific API methods
  async getHealth() {
    return this.get('/health');
  }

  // User endpoints
  async getCurrentUser() {
    return this.get('/auth/profile');
  }

  async updateProfile(data: any) {
    return this.put('/users/me', data);
  }

  async getUsers(params?: PaginatedRequest & { role?: string; isActive?: boolean }) {
    return this.get('/users', params);
  }

  async getUserById(id: string) {
    return this.get(`/users/${id}`);
  }

  async updateUser(id: string, data: any) {
    return this.put(`/users/${id}`, data);
  }

  async updateUserRole(id: string, role: string) {
    return this.put(`/users/${id}/role`, { role });
  }

  async deactivateUser(id: string) {
    return this.put(`/users/${id}/deactivate`);
  }

  async activateUser(id: string) {
    return this.put(`/users/${id}/activate`);
  }

  async searchUsers(query: string, limit?: number) {
    return this.get('/users/search', { q: query, limit });
  }

  async getUserStats() {
    return this.get('/users/stats');
  }

  // File upload helper
  async uploadFile(file: File, endpoint: string, onProgress?: (progress: number) => void) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<ApiResponse>(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }
}

// Create and export the API client instance
export const apiClient = new ApiClient();

// Helper function to check if response is successful
export const isApiSuccess = <T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true; data: T } => {
  return response.success === true && response.data !== undefined;
};

// Error handling helper
export const getApiError = (error: any): string => {
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
}; 