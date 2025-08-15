/**
 * Mock implementation of Supabase client for testing
 */

export const createClient = jest.fn(() => {
  const mockSupabase = {
    auth: {
      signUp: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@test.com' }, session: { access_token: 'test-token' } },
        error: null
      }),
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@test.com' } },
        error: null
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token', user: { id: 'test-user-id' } } },
        error: null
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' }, session: { access_token: 'test-token' } },
        error: null
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
        error: null
      })),
      refreshSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'refreshed-token' } },
        error: null
      }),
      admin: {
        deleteUser: jest.fn().mockResolvedValue({ data: {}, error: null })
      }
    },
    from: jest.fn((table: string) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      containedBy: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      overlaps: jest.fn().mockReturnThis(),
      textSearch: jest.fn().mockReturnThis(),
      match: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
      csv: jest.fn().mockResolvedValue({ data: '', error: null }),
      count: jest.fn().mockResolvedValue({ count: 0, error: null }),
      head: jest.fn().mockResolvedValue({ error: null }),
      // Default resolution for chained queries
      then: jest.fn((resolve) => resolve({ data: [], error: null }))
    })),
    storage: {
      from: jest.fn((bucket: string) => ({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
        download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: jest.fn().mockResolvedValue({ data: [], error: null }),
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://test.url' } }),
        createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.url' }, error: null })
      }))
    },
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: {}, error: null })
    },
    realtime: {
      channel: jest.fn((name: string) => ({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
        unsubscribe: jest.fn().mockReturnThis(),
        track: jest.fn().mockReturnThis()
      }))
    },
    rpc: jest.fn().mockResolvedValue({ data: {}, error: null })
  };

  return mockSupabase;
});

// Export types to match the real package
export type SupabaseClient = ReturnType<typeof createClient>;
export type AuthError = { message: string; status?: number };
export type PostgrestError = { message: string; details?: string; hint?: string; code?: string };