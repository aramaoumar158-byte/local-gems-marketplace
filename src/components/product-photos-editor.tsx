import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MAX_PRODUCT_PHOTOS,
  checkPhoto,
  photoPathFromUrl,
  removeProductPhotos,
  uploadProductPhotos,
} from "@/lib/product-images";

type Props = {
  product: { id: string; name: string; images: string[] | null } | null;
  sellerId: string;
  onClose: () => void;
};

/** Fenêtre qui permet au vendeur d'ajouter, retirer ou réordonner les photos d'un produit publié. */
export function ProductPhotosEditor({ product, sellerId, onClose }: Props) {
  const qc = useQueryClient();
  const [kept, setKept] = useState<string[]>([]);
  const [added, setAdded] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setKept(product?.images ?? []);
    setAdded([]);
  }, [product]);

  const previews = useMemo(() => added.map((f) => URL.createObjectURL(f)), [added]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const total = kept.length + added.length;

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...added];
    for (const file of Array.from(list)) {
      if (kept.length + next.length >= MAX_PRODUCT_PHOTOS) {
        toast.error(`${MAX_PRODUCT_PHOTOS} photos maximum par produit.`);
        break;
      }
      const problem = checkPhoto(file);
      if (problem) {
        toast.error(problem);
        continue;
      }
      next.push(file);
    }
    setAdded(next);
  }

  function makeMain(i: number) {
    setKept([kept[i], ...kept.filter((_, k) => k !== i)]);
  }

  async function save() {
    if (!product || busy) return;
    setBusy(true);
    let uploaded: { urls: string[]; paths: string[] } = { urls: [], paths: [] };
    try {
      uploaded = await uploadProductPhotos(sellerId, added);
    } catch {
      toast.error("L'envoi des photos a échoué. Vérifiez votre connexion et réessayez.");
      setBusy(false);
      return;
    }
    const finalUrls = [...kept, ...uploaded.urls];
    const { error } = await supabase
      .from("products")
      .update({ images: finalUrls })
      .eq("id", product.id)
      .eq("seller_id", sellerId);
    if (error) {
      await removeProductPhotos(uploaded.paths); // on annule les nouvelles photos
      toast.error(error.message);
      setBusy(false);
      return;
    }
    // La fiche est à jour : on supprime seulement maintenant les photos retirées
    const removed = (product.images ?? [])
      .filter((u) => !kept.includes(u))
      .map(photoPathFromUrl)
      .filter((p): p is string => !!p && p.startsWith(`${sellerId}/`));
    await removeProductPhotos(removed);
    toast.success("Photos mises à jour");
    void qc.invalidateQueries({ queryKey: ["seller-products"] });
    setBusy(false);
    onClose();
  }

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Photos de « {product?.name} »</DialogTitle>
          <DialogDescription>
            {total}/{MAX_PRODUCT_PHOTOS} photos. La première est celle du catalogue.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {kept.map((src, i) => (
            <div key={src} className="relative aspect-square overflow-hidden rounded-lg border">
              <img src={src} alt={`Photo ${i + 1}`} className="size-full object-cover" />
              {i === 0 ? (
                <span className="absolute left-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-bold">
                  Principale
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeMain(i)}
                  className="absolute bottom-1 left-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-bold shadow"
                >
                  Mettre en principale
                </button>
              )}
              <button
                type="button"
                aria-label={`Retirer la photo ${i + 1}`}
                onClick={() => setKept(kept.filter((_, k) => k !== i))}
                className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-background/90 shadow"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          {previews.map((src, i) => (
            <div key={src} className="relative aspect-square overflow-hidden rounded-lg border">
              <img src={src} alt={`Nouvelle photo ${i + 1}`} className="size-full object-cover" />
              <span className="absolute left-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-bold">
                Nouvelle
              </span>
              <button
                type="button"
                aria-label={`Retirer la nouvelle photo ${i + 1}`}
                onClick={() => setAdded(added.filter((_, k) => k !== i))}
                className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-background/90 shadow"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          {total < MAX_PRODUCT_PHOTOS && (
            <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border border-dashed bg-secondary p-2 text-center text-xs text-muted-foreground">
              <span>
                <ImagePlus className="mx-auto mb-1 size-6" />
                Ajouter une photo
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="button" variant="hero" onClick={save} disabled={busy}>
            {busy ? "Enregistrement…" : "Enregistrer les photos"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
