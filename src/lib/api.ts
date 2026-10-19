const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:3000';
const tokenKey = 'cheliel_admin_token';
const sessionKey = 'cheliel_admin_session';

type ApiResult<T> = { data: T | null; error: { message: string } | null };

const request = async <T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> => {
  try {
    const headers = new Headers(init.headers);
    if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    const token = localStorage.getItem(tokenKey);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('X-Authorization', `Bearer ${token}`);
      headers.set('X-Access-Token', token);
    }
    const response = await fetch(`${apiUrl}${path}`, { ...init, headers });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && path.startsWith('/api/admin/')) {
        // Nettoyer la session expirée ou invalide
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(sessionKey);
      }
      return { data: null, error: { message: body?.error || 'Erreur de communication avec le serveur.' } };
    }
    return { data: body as T, error: null };
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : 'Serveur indisponible.' } };
  }
};


class QueryBuilder<T = unknown> implements PromiseLike<ApiResult<T>> {
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: unknown;
  private id: string | null = null;

  constructor(private readonly table: string) {}

  select(_columns = '*') { this.operation = 'select'; return this; }
  order(_column: string, _options?: { ascending?: boolean }) { return this; }
  limit(_count: number) { return this; }
  range(_from: number, _to: number) { return this; }
  single() { return this; }
  insert(payload: unknown) { this.operation = 'insert'; this.payload = payload; return this; }
  update(payload: unknown) { this.operation = 'update'; this.payload = payload; return this; }
  delete() { this.operation = 'delete'; return this; }
  eq(_column: string, value: string) { this.id = value; return this; }

  then<TResult1 = ApiResult<T>, TResult2 = never>(
    onfulfilled?: ((value: ApiResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private execute(): Promise<ApiResult<T>> {
    if (this.operation === 'select') {
      let path = '/api/rooms';
      if (this.table === 'gallery') path = '/api/admin/gallery';
      else if (this.table === 'reservations') path = '/api/admin/reservations';
      else if (this.table === 'audit_log') path = '/api/admin/audit-log';
      return request<T>(path);
    }

    if (this.table === 'rooms') {
      if (this.operation === 'insert') return request<T>('/api/admin/rooms', { method: 'POST', body: JSON.stringify(this.payload) });
      if (this.operation === 'update') return request<T>(`/api/admin/rooms/${this.id}`, { method: 'PUT', body: JSON.stringify(this.payload) });
      return request<T>(`/api/admin/rooms/${this.id}`, { method: 'DELETE' });
    }
    if (this.table === 'reservations') {
      if (this.operation === 'update') return request<T>(`/api/admin/reservations/${this.id}`, { method: 'PATCH', body: JSON.stringify(this.payload) });
      return request<T>(`/api/admin/reservations/${this.id}`, { method: 'DELETE' });
    }
    if (this.table === 'gallery' && this.operation === 'delete') return request<T>(`/api/admin/gallery/${this.id}`, { method: 'DELETE' });
    return request<T>('/api/admin/gallery', { method: 'POST', body: JSON.stringify(this.payload) });
  }
}

const authListeners = new Set<(event: string, session: unknown) => void>();

export const api = {
  from: <T = unknown>(table: string) => new QueryBuilder<T>(table),
  rpc: async <T = unknown>(name: string, params: Record<string, unknown>) => {
    if (name === 'search_reservations_by_phone') return request<T>(`/api/reservations/search?query=${encodeURIComponent(String(params.p_query || ''))}`);
    if (name === 'is_room_available_for_checkin') return request<T>(`/api/rooms/available?roomId=${encodeURIComponent(String(params.p_room_id))}&checkIn=${params.p_check_in}&checkOut=${params.p_check_out || params.p_check_in}`).then(result => ({ ...result, data: result.data ? (result.data as { available: boolean }).available as T : null }));
    if (name === 'list_available_rooms_for_checkin') return request<T>(`/api/rooms/available/list?checkIn=${params.p_check_in}&checkOut=${params.p_check_out || params.p_check_in}`);
    if (name === 'insert_reservation') {
      const result = await request<{ id: string }>('/api/reservations', { method: 'POST', body: JSON.stringify({ clientName: params.client_name, phone: params.phone, email: params.email, roomId: params.room_id, stayType: params.stay_type, checkIn: params.check_in, checkOut: params.check_out, remarks: params.remarks, paymentMethod: params.payment_method }) });
      return { ...result, data: result.data?.id as T | null };
    }
    return { data: null, error: { message: `Fonction API inconnue: ${name}` } };
  },
  auth: {
    getSession: async () => ({ data: { session: localStorage.getItem(tokenKey) ? JSON.parse(localStorage.getItem(sessionKey) || 'null') : null }, error: null }),
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const result = await request<{ token: string; admin: { id: number; email: string } }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (result.data) {
        const session = { access_token: result.data.token, user: result.data.admin };
        localStorage.setItem(tokenKey, result.data.token);
        localStorage.setItem(sessionKey, JSON.stringify(session));
        authListeners.forEach(listener => listener('SIGNED_IN', session));
      }
      return result;
    },
    signOut: async () => {
      await request('/api/admin/logout', { method: 'POST' }).catch(() => {});
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(sessionKey);
      authListeners.forEach(listener => listener('SIGNED_OUT', null));
      return { error: null };
    },
    onAuthStateChange: (listener: (event: string, session: unknown) => void) => { authListeners.add(listener); return { data: { subscription: { unsubscribe: () => authListeners.delete(listener) } } }; },
  },
  storage: {
    from: (_bucket: string) => ({
      upload: async (_path: string, file: File) => {
        const form = new FormData(); form.append('files', file);
        const result = await request<Array<{ url: string }>>('/api/admin/gallery/upload', { method: 'POST', body: form });
        return { data: result.data?.[0] ? { path: result.data[0].url } : null, error: result.error };
      },
      getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
      remove: async (_paths: string[]) => ({ data: null, error: null }),
    }),
    uploadVideo: async (file: File) => {
      const form = new FormData();
      form.append('video', file);
      const result = await request<{ url: string; name: string; storage_path: string }>('/api/admin/video/upload', {
        method: 'POST',
        body: form,
      });
      return { data: result.data ? { url: result.data.url, name: result.data.name } : null, error: result.error };
    },
  },
  channel: (_name: string) => ({ on: () => ({ subscribe: () => ({}) }) }),
  removeChannel: (_channel: unknown) => undefined,
  settings: {
    getAdmins: () => request<Array<{ id: number; email: string; created_at?: string }>>('/api/admin/admins-list'),
    changePassword: (payload: { currentPassword: string; newPassword: string }) =>
      request<{ ok: boolean; message: string }>('/api/admin/change-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    createAdmin: (payload: { email: string; password: string }) =>
      request<{ ok: boolean; admin: { id: number; email: string } }>('/api/admin/create-admin', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    resetDatabase: (payload: { password: string; confirmationText: string }) =>
      request<{ ok: boolean; message: string }>('/api/admin/reset-database', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getSystemInfo: () =>
      request<{
        reservations: number;
        rooms: number;
        admins: number;
        auditLogs: number;
        galleryImages: number;
        nodeVersion: string;
        platform: string;
        uptimeMinutes: number;
        dbStatus: string;
        serverTime: string;
      }>('/api/admin/system-info'),
  },
};
