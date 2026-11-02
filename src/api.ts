import {
  AdminUser,
  SourceChannel,
  DestinationChannel,
  ForwardedMessage,
  SystemSettings,
  AuditLog,
  SystemStats,
  PriceRecord,
} from './types';

const TOKEN_KEY = 'mz_telegram_token';

export const api = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      this.clearToken();
      window.dispatchEvent(new Event('mz-auth-required'));
      throw new Error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجددًا');
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'حدث خطأ في معالجة الطلب');
    }

    return data as T;
  },

  // Auth
  async login(username: string, password: string): Promise<{ token: string; username: string }> {
    const res = await this.request<{ token: string; username: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(res.token);
    return res;
  },

  async getMe(): Promise<AdminUser> {
    return this.request<AdminUser>('/api/auth/me');
  },

  async updateCredentials(username: string, currentPassword: string, newPassword?: string) {
    return this.request<{ success: boolean; message: string }>('/api/auth/update-credentials', {
      method: 'POST',
      body: JSON.stringify({ username, currentPassword, newPassword }),
    });
  },

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      this.clearToken();
    }
  },

  // System Stats & Settings
  async getStats(): Promise<SystemStats> {
    return this.request<SystemStats>('/api/stats');
  },

  async getSettings(): Promise<SystemSettings> {
    return this.request<SystemSettings>('/api/settings');
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    return this.request<SystemSettings>('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },

  async controlEngine(action: 'start' | 'pause' | 'resume'): Promise<{ status: 'running' | 'paused' }> {
    return this.request<{ status: 'running' | 'paused' }>('/api/engine/control', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },

  // Source Channels
  async getSources(): Promise<SourceChannel[]> {
    return this.request<SourceChannel[]>('/api/sources');
  },

  async addSource(source: Partial<SourceChannel>): Promise<SourceChannel> {
    return this.request<SourceChannel>('/api/sources', {
      method: 'POST',
      body: JSON.stringify(source),
    });
  },

  async updateSource(id: string, updates: Partial<SourceChannel>): Promise<SourceChannel> {
    return this.request<SourceChannel>(`/api/sources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteSource(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/sources/${id}`, {
      method: 'DELETE',
    });
  },

  async testSource(id: string): Promise<any> {
    return this.request(`/api/sources/${id}/test`, { method: 'POST' });
  },

  // Destination Channels
  async getDestinations(): Promise<DestinationChannel[]> {
    return this.request<DestinationChannel[]>('/api/destinations');
  },

  async addDestination(destination: Partial<DestinationChannel>): Promise<DestinationChannel> {
    return this.request<DestinationChannel>('/api/destinations', {
      method: 'POST',
      body: JSON.stringify(destination),
    });
  },

  async updateDestination(id: string, updates: Partial<DestinationChannel>): Promise<DestinationChannel> {
    return this.request<DestinationChannel>(`/api/destinations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteDestination(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/destinations/${id}`, {
      method: 'DELETE',
    });
  },

  async testDestination(id: string): Promise<any> {
    return this.request(`/api/destinations/${id}/test`, { method: 'POST' });
  },

  async testSendDestination(id: string): Promise<any> {
    return this.request(`/api/destinations/${id}/test-send`, { method: 'POST' });
  },

  // Telegram Bot Credentials
  async testBotToken(): Promise<any> {
    return this.request('/api/telegram/test-bot', { method: 'POST' });
  },

  // Prices
  async getCurrentPrices(): Promise<{ prices: { gold?: PriceRecord; btc?: PriceRecord }; formatted: string }> {
    return this.request('/api/prices/current');
  },

  async updatePricesNow(): Promise<any> {
    return this.request('/api/prices/update-now', { method: 'POST' });
  },

  // Static Message
  async broadcastStaticMessage(payload: { text?: string; pin?: boolean; channelIds?: string[] }): Promise<any> {
    return this.request('/api/static-message/broadcast', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Cleaner & Sandbox
  async testCleaner(text: string, type: 'text' | 'caption', options?: any): Promise<any> {
    return this.request('/api/cleaner/test', {
      method: 'POST',
      body: JSON.stringify({ text, type, options }),
    });
  },

  async simulateForward(payload: any): Promise<any> {
    return this.request('/api/forwarder/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getForwarderLogs(limit = 100): Promise<ForwardedMessage[]> {
    return this.request<ForwardedMessage[]>(`/api/forwarder/logs?limit=${limit}`);
  },

  async retryForward(id: string): Promise<any> {
    return this.request(`/api/forwarder/retry/${id}`, { method: 'POST' });
  },

  async deleteForward(id: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/forwarder/logs/${id}`, {
      method: 'DELETE',
    });
  },

  async clearForwardLogs(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/forwarder/logs', {
      method: 'DELETE',
    });
  },

  // Logs
  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    return this.request<AuditLog[]>(`/api/logs?limit=${limit}`);
  },
};
