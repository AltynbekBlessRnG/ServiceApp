import { unregisterPushTokenAsync } from './push';
import { supabase } from './supabase';

export async function signOutSecurely() {
  try {
    await unregisterPushTokenAsync();
  } finally {
    await supabase.auth.signOut();
  }
}
