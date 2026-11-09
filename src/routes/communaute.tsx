import { createFileRoute, Link } from "@tanstack/react-router";
import {
  EyeOff,
  Flag,
  Heart,
  ImagePlus,
  MessageCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/marketplace";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  addComment,
  checkMedia,
  createPost,
  deleteComment,
  deletePost,
  fetchComments,
  fetchMyLikes,
  fetchPosts,
  PAGE_SIZE,
  reportPost,
  setLike,
  setPostStatus,
  type CommunityComment,
  type CommunityPost,
} from "@/lib/community";
import { dateFr } from "@/lib/format";

export const Route = createFileRoute("/communaute")({
  head: () => ({
    meta: [
      { title: "Communauté — ANW KA SUKU" },
      {
        name: "description",
        content:
          "Détendez-vous : photos et courtes vidéos partagées par les clients, artisans et vendeurs de la communauté ANW KA SUKU.",
      },
      { property: "og:title", content: "Communauté — ANW KA SUKU" },
      { property: "og:description", content: "Photos et courtes vidéos de la communauté." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/communaute" }],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const { user, profile, role, loading } = useAuth();
  const isAdmin = role === "admin";
  const verified = profile?.status === "active" || isAdmin;
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (before?: string) => {
      setBusy(true);
      setError("");
      try {
        const rows = await fetchPosts({ ...(before ? { before } : {}), all: isAdmin });
        setMore(rows.length === PAGE_SIZE);
        setPosts((prev) => (before ? [...prev, ...rows] : rows));
        if (user) {
          const mine = await fetchMyLikes(user.id, rows.map((r) => r.id));
          setLiked((prev) => new Set([...prev, ...mine]));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chargement impossible.");
      } finally {
        setBusy(false);
      }
    },
    [user, isAdmin],
  );

  useEffect(() => {
    if (!loading) void load();
  }, [loading, load]);

  const patch = (id: string, change: Partial<CommunityPost>) =>
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...change } : p)));

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-extrabold">Communauté</h1>
        <p className="mt-2 text-muted-foreground">
          Un espace pour se détendre : photos et courtes vidéos partagées par les clients, artisans
          et vendeurs. Soyez respectueux : les contenus signalés sont examinés.
        </p>

        <div className="mt-6">
          {!user ? (
            <div className="rounded-xl border border-dashed bg-card p-4 text-sm">
              <Link to="/auth" search={{ mode: "login" }} className="font-bold text-primary underline">
                Connectez-vous
              </Link>{" "}
              pour publier, aimer et commenter. Vous pouvez déjà tout regarder.
            </div>
          ) : !verified ? (
            <div className="rounded-xl border border-dashed bg-card p-4 text-sm">
              <ShieldCheck className="mr-2 inline size-4 text-warning" />
              Confirmez votre email pour publier, aimer et commenter.{" "}
              <Link to="/verification" className="font-bold text-primary underline">
                Vérifier mon compte
              </Link>
            </div>
          ) : (
            <Composer
              userId={user.id}
              onPosted={() => {
                toast.success("Publication ajoutée.");
                void load();
              }}
            />
          )}
        </div>

        <div className="mt-6 space-y-5">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              userId={user?.id ?? null}
              verified={verified}
              isAdmin={isAdmin}
              liked={liked.has(post.id)}
              onLike={async () => {
                if (!user) return;
                const on = !liked.has(post.id);
                setLiked((prev) => {
                  const next = new Set(prev);
                  if (on) next.add(post.id);
                  else next.delete(post.id);
                  return next;
                });
                patch(post.id, { like_count: Math.max(0, post.like_count + (on ? 1 : -1)) });
                try {
                  await setLike(post.id, user.id, on);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erreur");
                  void load();
                }
              }}
              onChanged={(change) => patch(post.id, change)}
              onRemoved={() => setPosts((prev) => prev.filter((p) => p.id !== post.id))}
            />
          ))}
          {!busy && !error && posts.length === 0 && (
            <p className="py-10 text-center text-muted-foreground">
              Aucune publication pour le moment. Soyez le premier à partager une photo !
            </p>
          )}
          {error && (
            <p className="text-center text-sm font-semibold text-destructive" role="alert">
              {error}
            </p>
          )}
          {busy && <p className="py-4 text-center text-sm text-muted-foreground">Chargement…</p>}
          {more && !busy && (
            <div className="text-center">
              <Button variant="soft" onClick={() => void load(posts[posts.length - 1]?.created_at)}>
                Voir plus
              </Button>
            </div>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

function Composer({ userId, onPosted }: { userId: string; onPosted: () => void }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function choose(f: File | undefined) {
    if (!f) return;
    const problem = checkMedia(f);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setFile(f);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || (!text.trim() && !file)) return;
    setBusy(true);
    setError("");
    try {
      await createPost({ userId, body: text, file });
      setText("");
      setFile(null);
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publication impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-4">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Partagez quelque chose avec la communauté…"
        aria-label="Votre publication"
      />
      {preview && file && (
        <div className="relative mt-3 overflow-hidden rounded-lg bg-secondary">
          {file.type.startsWith("video/") ? (
            <video src={preview} controls className="max-h-80 w-full" />
          ) : (
            <img src={preview} alt="Aperçu" className="max-h-80 w-full object-contain" />
          )}
          <button
            type="button"
            onClick={() => setFile(null)}
            className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/90"
            aria-label="Retirer le fichier"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          className="hidden"
          onChange={(e) => {
            choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="soft" onClick={() => input.current?.click()} disabled={busy}>
          <ImagePlus /> Photo ou vidéo
        </Button>
        <Button type="submit" variant="hero" disabled={busy || (!text.trim() && !file)} className="ml-auto">
          {busy ? "Envoi…" : "Publier"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Vidéo : 60 secondes et 20 Mo maximum.</p>
      {error && (
        <p className="mt-2 text-sm font-semibold text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function PostCard(props: {
  post: CommunityPost;
  userId: string | null;
  verified: boolean;
  isAdmin: boolean;
  liked: boolean;
  onLike: () => void;
  onChanged: (change: Partial<CommunityPost>) => void;
  onRemoved: () => void;
}) {
  const { post, userId, verified, isAdmin, liked } = props;
  const [showComments, setShowComments] = useState(false);
  const own = userId === post.author_id;

  async function remove() {
    if (!window.confirm("Supprimer cette publication ?")) return;
    try {
      await deletePost(post);
      props.onRemoved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function report() {
    if (!userId) return;
    const reason = window.prompt("Pourquoi signalez-vous cette publication ? (facultatif)") ;
    if (reason === null) return;
    try {
      await reportPost(post.id, userId, reason);
      toast.success("Merci, le signalement a été envoyé.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function toggleHidden() {
    const next = post.status === "hidden" ? "published" : "hidden";
    try {
      await setPostStatus(post.id, next);
      props.onChanged({ status: next });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <article className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 p-4 pb-2">
        <div className="min-w-0">
          <p className="truncate font-bold">{post.author_name}</p>
          <p className="text-xs text-muted-foreground">{dateFr(post.created_at)}</p>
        </div>
        {post.status === "hidden" && (
          <span className="rounded-full bg-warning/15 px-2 py-1 text-xs font-bold text-warning">
            Masquée ({post.report_count} signalement{post.report_count > 1 ? "s" : ""})
          </span>
        )}
      </div>
      {post.body && <p className="whitespace-pre-wrap break-words px-4 pb-3 text-sm">{post.body}</p>}
      {post.media_url &&
        (post.media_type === "video" ? (
          <video src={post.media_url} controls preload="metadata" playsInline className="max-h-[32rem] w-full bg-black" />
        ) : (
          <img src={post.media_url} alt="" loading="lazy" className="max-h-[32rem] w-full bg-secondary object-contain" />
        ))}
      <div className="flex flex-wrap items-center gap-1 p-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={!userId || !verified}
          onClick={props.onLike}
          aria-pressed={liked}
          aria-label="J'aime"
        >
          <Heart className={liked ? "fill-destructive text-destructive" : ""} /> {post.like_count}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowComments((v) => !v)}>
          <MessageCircle /> {post.comment_count}
        </Button>
        <span className="ml-auto flex items-center gap-1">
          {userId && !own && verified && post.status === "published" && (
            <Button variant="ghost" size="sm" onClick={() => void report()} aria-label="Signaler">
              <Flag />
            </Button>
          )}
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => void toggleHidden()}>
              {post.status === "hidden" ? <RotateCcw /> : <EyeOff />}
              {post.status === "hidden" ? "Rétablir" : "Masquer"}
            </Button>
          )}
          {(own || isAdmin) && (
            <Button variant="ghost" size="sm" onClick={() => void remove()} aria-label="Supprimer">
              <Trash2 />
            </Button>
          )}
        </span>
      </div>
      {showComments && (
        <Comments
          post={post}
          userId={userId}
          verified={verified}
          isAdmin={isAdmin}
          onCount={(delta) => props.onChanged({ comment_count: Math.max(0, post.comment_count + delta) })}
        />
      )}
    </article>
  );
}

function Comments(props: {
  post: CommunityPost;
  userId: string | null;
  verified: boolean;
  isAdmin: boolean;
  onCount: (delta: number) => void;
}) {
  const { post, userId, verified, isAdmin } = props;
  const [items, setItems] = useState<CommunityComment[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setItems(await fetchComments(post.id));
    } catch {
      /* affichage vide en cas d'échec */
    }
  }, [post.id]);
  useEffect(() => {
    void reload();
  }, [reload]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!userId || busy || !text.trim()) return;
    setBusy(true);
    try {
      await addComment(post.id, userId, text);
      setText("");
      props.onCount(1);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 border-t bg-secondary/40 p-4">
      {items.map((c) => (
        <div key={c.id} className="flex items-start gap-2 text-sm">
          <div className="min-w-0 flex-1">
            <span className="font-bold">{c.author_name}</span>{" "}
            <span className="break-words">{c.body}</span>
          </div>
          {(c.author_id === userId || isAdmin) && (
            <button
              type="button"
              aria-label="Supprimer le commentaire"
              className="text-muted-foreground hover:text-destructive"
              onClick={async () => {
                try {
                  await deleteComment(c.id);
                  props.onCount(-1);
                  await reload();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erreur");
                }
              }}
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      ))}
      {items.length === 0 && <p className="text-sm text-muted-foreground">Pas encore de commentaire.</p>}
      {userId && verified && post.status === "published" && (
        <form onSubmit={send} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder="Écrire un commentaire…"
            aria-label="Votre commentaire"
            className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
          />
          <Button type="submit" variant="hero" size="icon" disabled={busy || !text.trim()} aria-label="Envoyer">
            <Send />
          </Button>
        </form>
      )}
    </div>
  );
}
