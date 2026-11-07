import { supabase } from "@/integrations/supabase/client";

export const MAX_PRODUCT_PHOTOS = 6;
const MAX_INPUT_BYTES = 15 * 1024 * 1024; // photo de téléphone avant réduction
const MAX_SIDE = 1280; // pixels : assez net, léger pour les petites connexions
const BUCKET = "product-images";

/** Vérifie un fichier choisi par le vendeur. Retourne un message d'erreur, ou null si tout va bien. */
export function checkPhoto(file: File): string | null {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
    return `« ${file.name} » : format non accepté (JPG, PNG ou WebP).`;
  }
  if (file.size > MAX_INPUT_BYTES) {
    return `« ${file.name} » : photo trop lourde (15 Mo maximum).`;
  }
  return null;
}

/** Réduit la photo (1280 px max, JPEG) pour que l'envoi soit rapide même avec un réseau faible. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossible de traiter la photo.");
  ctx.fillStyle = "#ffffff"; // fond blanc pour les PNG transparents
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82),
  );
  if (!blob) throw new Error("Impossible de traiter la photo.");
  return blob;
}

/**
 * Envoie les photos dans le dossier du vendeur et retourne leurs adresses publiques.
 * Si une photo échoue, celles déjà envoyées sont supprimées.
 */
export async function uploadProductPhotos(
  sellerId: string,
  files: File[],
): Promise<{ urls: string[]; paths: string[] }> {
  const paths: string[] = [];
  try {
    for (const file of files) {
      const blob = await shrink(file);
      const path = `${sellerId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (error) throw error;
      paths.push(path);
    }
  } catch (err) {
    await removeProductPhotos(paths);
    throw err;
  }
  const urls = paths.map((p) => supabase.storage.from(BUCKET).getPublicUrl(p).data.publicUrl);
  return { urls, paths };
}

/** Supprime des photos déjà envoyées (annulation si la fiche produit n'a pas pu être créée). */
export async function removeProductPhotos(paths: string[]): Promise<void> {
  if (!paths.length) return;
  await supabase.storage.from(BUCKET).remove(paths);
}
