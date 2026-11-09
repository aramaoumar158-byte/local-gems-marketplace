import { supabase } from "@/integrations/supabase/client";
import { shrink } from "@/lib/product-images";

const db = supabase as any;

export const BUCKET = "community-media";
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // 20 Mo : léger pour les petites connexions
export const MAX_VIDEO_SECONDS = 60;
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

export type CommunityPost = {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  media_type: "image" | "video" | null;
  media_url: string | null;
  status: "published" | "hidden" | "removed";
  like_count: number;
  comment_count: number;
  report_count: number;
  created_at: string;
};

export type CommunityComment = {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
};

export const PAGE_SIZE = 10;

/** Vérifie le fichier choisi. Retourne un message d'erreur ou null. */
export function checkMedia(file: File): string | null {
  if (/^image\/(jpeg|png|webp)$/i.test(file.type)) {
    return file.size > MAX_PHOTO_BYTES ? "Photo trop lourde (15 Mo maximum)." : null;
  }
  if (/^video\/(mp4|webm)$/i.test(file.type)) {
    return file.size > MAX_VIDEO_BYTES
      ? "Vidéo trop lourde (20 Mo maximum). Filmez plus court ou en qualité réduite."
      : null;
  }
  return "Format non accepté (photo JPG/PNG/WebP, vidéo MP4/WebM).";
}

/** Durée d'une vidéo en secondes (0 si illisible). */
function videoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(v.duration) ? v.duration : 0);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    v.src = url;
  });
}

/** Envoie la photo (réduite) ou la vidéo dans le dossier de l'utilisateur. */
export async function uploadMedia(
  userId: string,
  file: File,
): Promise<{ url: string; path: string; type: "image" | "video" }> {
  const isVideo = file.type.startsWith("video/");
  let body: Blob = file;
  let ext = "jpg";
  let contentType = "image/jpeg";
  if (isVideo) {
    const seconds = await videoDuration(file);
    if (seconds > MAX_VIDEO_SECONDS + 1) {
      throw new Error(`Vidéo trop longue (${MAX_VIDEO_SECONDS} secondes maximum).`);
    }
    ext = file.type === "video/webm" ? "webm" : "mp4";
    contentType = file.type;
  } else {
    body = await shrink(file);
  }
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType, cacheControl: "31536000" });
  if (error) throw error;
  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return { url, path, type: isVideo ? "video" : "image" };
}

export function mediaPathFromUrl(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length).split("?")[0] ?? "");
}

export async function removeMedia(paths: string[]): Promise<void> {
  if (!paths.length) return;
  await supabase.storage.from(BUCKET).remove(paths);
}

function readableError(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? "";
  if (/Limite de/i.test(msg)) return msg;
  if (/row-level security|violates/i.test(msg)) {
    return "Action refusée. Vérifiez que votre compte est vérifié (email confirmé).";
  }
  return "Une erreur est survenue. Réessayez.";
}

export async function fetchPosts(opts: { before?: string; mine?: boolean; userId?: string; all?: boolean }) {
  let q = db.from("community_posts").select("*").order("created_at", { ascending: false }).limit(PAGE_SIZE);
  if (opts.all) q = q.in("status", ["published", "hidden"]);
  else q = q.eq("status", "published");
  if (opts.before) q = q.lt("created_at", opts.before);
  const { data, error } = await q;
  if (error) throw new Error(readableError(error));
  return (data ?? []) as CommunityPost[];
}

export async function fetchMyLikes(userId: string, postIds: string[]): Promise<Set<string>> {
  if (!postIds.length) return new Set();
  const { data } = await db
    .from("community_likes")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);
  return new Set(((data ?? []) as { post_id: string }[]).map((r) => r.post_id));
}

export async function createPost(input: {
  userId: string;
  body: string;
  file: File | null;
}): Promise<void> {
  let uploaded: { url: string; path: string; type: "image" | "video" } | null = null;
  try {
    if (input.file) uploaded = await uploadMedia(input.userId, input.file);
    const { error } = await db.from("community_posts").insert({
      author_id: input.userId,
      body: input.body.trim(),
      media_type: uploaded?.type ?? null,
      media_url: uploaded?.url ?? null,
    });
    if (error) throw error;
  } catch (err) {
    if (uploaded) await removeMedia([uploaded.path]);
    if (err instanceof Error && /trop longue|Impossible/.test(err.message)) throw err;
    throw new Error(readableError(err));
  }
}

export async function deletePost(post: CommunityPost): Promise<void> {
  const { error } = await db.from("community_posts").delete().eq("id", post.id);
  if (error) throw new Error(readableError(error));
  const path = post.media_url ? mediaPathFromUrl(post.media_url) : null;
  if (path) await removeMedia([path]); // échoue sans bruit si on n'en est pas le propriétaire
}

export async function setPostStatus(id: string, status: CommunityPost["status"]): Promise<void> {
  const { error } = await db.from("community_posts").update({ status }).eq("id", id);
  if (error) throw new Error(readableError(error));
}

export async function setLike(postId: string, userId: string, on: boolean): Promise<void> {
  const { error } = on
    ? await db.from("community_likes").insert({ post_id: postId, user_id: userId })
    : await db.from("community_likes").delete().eq("post_id", postId).eq("user_id", userId);
  if (error && error.code !== "23505") throw new Error(readableError(error));
}

export async function fetchComments(postId: string): Promise<CommunityComment[]> {
  const { data, error } = await db
    .from("community_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw new Error(readableError(error));
  return (data ?? []) as CommunityComment[];
}

export async function addComment(postId: string, userId: string, body: string): Promise<void> {
  const { error } = await db
    .from("community_comments")
    .insert({ post_id: postId, author_id: userId, body: body.trim() });
  if (error) throw new Error(readableError(error));
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await db.from("community_comments").delete().eq("id", id);
  if (error) throw new Error(readableError(error));
}

export async function reportPost(postId: string, userId: string, reason: string): Promise<void> {
  const { error } = await db
    .from("community_reports")
    .insert({ post_id: postId, reporter_id: userId, reason: reason.trim().slice(0, 300) });
  if (error && error.code !== "23505") throw new Error(readableError(error));
}
