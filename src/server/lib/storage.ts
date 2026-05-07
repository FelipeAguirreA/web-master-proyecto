import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
);

export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer,
  contentType: string,
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: true });

  if (error) throw new Error(`Error al subir archivo: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Borra un archivo del bucket. Idempotente: si ya no existe, no falla.
 * Necesario para F-Legal-2.3 (delete account) — borrar el CV del Storage
 * además del registro en DB para cumplir derecho de eliminación efectiva.
 */
export async function removeFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  // Supabase no falla si el archivo no existe — pero si error real, propagamos.
  if (error) throw new Error(`Error al eliminar archivo: ${error.message}`);
}

/**
 * Extrae el path interno del bucket desde una URL pública de Supabase Storage.
 * Formato URL: `<host>/storage/v1/object/public/<bucket>/<path>`.
 * Retorna null si la URL no matchea el bucket esperado (ej: URL de otro
 * sistema, URL malformada).
 */
export function pathFromPublicUrl(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const path = url.substring(idx + marker.length);
  return path.length > 0 ? path : null;
}
