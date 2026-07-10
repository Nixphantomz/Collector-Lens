import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

console.log('Supabase URL loaded:', supabaseUrl ? '✓' : '✗ MISSING');
console.log('Supabase Key loaded:', supabaseAnonKey ? '✓' : '✗ MISSING');

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;

export type ScanRecord = {
  id?: string;
  user_id: string;
  created_at?: string;
  item_name: string;
  category: string;
  condition: string;
  image_url?: string;
  estimated_value_low: number;
  estimated_value_mid: number;
  estimated_value_high: number;
  signal: string;
  rarity: string;
  rarity_score: number;
  market_trend: string;
  confidence_score: number;
  description: string;
  signal_reason: string;
};

export async function saveScan(scan: ScanRecord) {
  if (!supabase) {
    console.error('Supabase not initialized - check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    return null;
  }

  console.log('Attempting to save scan:', scan.item_name, 'for user:', scan.user_id);

  const { data, error } = await supabase
    .from('scans')
    .insert([scan])
    .select()
    .single();

  if (error) {
    console.error('Supabase insert error:', error.message, error.details, error.hint);
    return null;
  }

  console.log('Scan saved successfully:', data?.id);
  return data;
}

export async function getUserScans(userId: string) {
  if (!supabase) {
    console.error('Supabase not initialized');
    return [];
  }

  console.log('Fetching scans for user:', userId);

  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Supabase fetch error:', error.message);
    return [];
  }

  console.log('Fetched', data?.length, 'scans');
  return data as ScanRecord[];
}

export async function deleteScan(scanId: string) {
  if (!supabase) return false;

  const { error } = await supabase
    .from('scans')
    .delete()
    .eq('id', scanId);

  if (error) {
    console.error('Supabase delete error:', error.message);
    return false;
  }
  return true;
}