import { supabase } from './supabase';
import { getPublicStoragePath } from './storage-path';

export async function removePublicStorageFiles(
  bucket: string,
  urls: (string | null | undefined)[],
): Promise<void> {
  const paths = Array.from(
    new Set(urls.map((url) => getPublicStoragePath(url, bucket)).filter((path): path is string => Boolean(path))),
  );
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw error;
}
