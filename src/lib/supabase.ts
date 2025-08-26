/**
 * Supabase Client Singleton
 *
 * This module provides a centralized, singleton-pattern Supabase client for the Fileadx application.
 *
 * Why This Pattern?
 *
 * 1. Performance & Resource Management
 * - Single Connection Pool: Supabase clients maintain internal connection pools. Creating multiple
 *   instances across API routes would create unnecessary overhead and potential connection exhaustion.
 * - Memory Efficiency: Singleton ensures only one client instance exists in memory, reducing application footprint.
 * - Connection Reuse: Database connections are properly pooled and reused across requests.
 *
 * 2. Configuration Management
 * - Centralized Config: All database configuration is handled in one place, making it easier
 *   to modify connection settings, add middleware, or implement monitoring.
 * - Environment Validation: Ensures required environment variables are present at startup
 *   rather than failing silently during runtime.
 * - Fail-Fast Principle: Application won't start with invalid database configuration.
 *
 * 3. Enterprise Scalability
 * - Next.js App Router Compatible: Works seamlessly with server components, API routes,
 *   and middleware without creating connection conflicts.
 * - Serverless Friendly: Singleton pattern works well with serverless functions where
 *   instances may be reused across invocations.
 * - Production Ready: Pattern used by enterprise applications handling high throughput.
 *
 * 4. Code Maintainability
 * - DRY Principle: No repeated client creation code across the application.
 * - Type Safety: Centralized typing ensures consistent Supabase client usage.
 * - Testing: Easy to mock for unit tests by replacing the singleton instance.
 *
 * Usage Examples
 *
 * // In API routes
 * import { getSupabaseClient } from '@/lib/supabase';
 *
 * export async function POST() {
 *   const supabase = getSupabaseClient();
 *   const { data, error } = await supabase.from('leads').insert([...]);
 * }
 *
 * // In server components
 * import { getSupabaseClient } from '@/lib/supabase';
 *
 * export default async function Dashboard() {
 *   const supabase = getSupabaseClient();
 *   const { data: leads } = await supabase.from('leads').select('*');
 * }
 *
 * Environment Variables Required
 * - `SUPABASE_URL`: Your Supabase project URL
 * - `SUPABASE_API_KEY`: Your Supabase anon/service role key
 *
 * @module supabase
 * @author Ahmed Kamal
 * @since 1.0.0
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

/**
 * Returns a singleton instance of the Supabase client.
 *
 * This function ensures that only one Supabase client instance is created and reused
 * throughout the application lifecycle. It validates environment variables on first
 * call and throws descriptive errors for missing configuration.
 *
 * @returns The configured Supabase client instance
 * @throws {Error} When required environment variables (SUPABASE_URL, SUPABASE_API_KEY) are missing
 *
 * @example
 * const supabase = getSupabaseClient();
 * const { data: leads } = await supabase.from('leads').select('*');
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabase === null) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Supabase env vars are not found, did you forgot to set 'SUPABASE_URL' and/or 'SUPABASE_API_KEY'?",
      );
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}
