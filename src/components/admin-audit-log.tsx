import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Eye, RefreshCw, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { auditChanges, auditDetails, auditValue } from '@/lib/audit';

type Entry = Database['public']['Tables']['admin_audit_log']['Row'];
const PAGE_SIZE = 25;
const timestamp = (value: string) => new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC' }) + ' UTC';

export function AdminAuditLog() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [selected, setSelected] = useState<Entry | null>(null);
  const log = useQuery({ queryKey: ['admin', 'audit-history', page, search, type], queryFn: async () => {
    let query = supabase.from('admin_audit_log').select('*', { count: 'exact' }).order('created_at', { ascending: false }).order('id', { ascending: false });
    if (type !== 'all') query = query.eq('target_type', type);
    const term = search.trim().replace(/[^\p{L}\p{N}_@ .-]/gu, '').slice(0, 100);
    if (term) query = query.or(`action.ilike.%${term}%,target_id.ilike.%${term}%,metadata->>actor_name.ilike.%${term}%,metadata->>target_label.ilike.%${term}%`);
    const { data, error, count } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    return { rows: data, count: count ?? 0 };
  } });
  const details = selected ? auditDetails(selected.metadata) : {};
  const changes = selected ? auditChanges(selected.metadata) : [];
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><input aria-label="Rechercher dans le journal" placeholder="Action, administrateur ou cible…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="h-11 w-full rounded-lg border bg-background pl-9 pr-3 text-sm" /></label>
      <select aria-label="Type de cible" value={type} onChange={e => { setType(e.target.value); setPage(0); }} className="h-11 rounded-lg border bg-background px-3 text-sm"><option value="all">Toutes les cibles</option>{[['user','Compte'],['store','Boutique'],['product','Produit'],['order','Commande'],['withdrawal','Retrait'],['report','Signalement'],['category','Catégorie'],['setting','Paramètre'],['role','Rôle'],['permission','Permission'],['notification','Notification']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
      <Button variant="outline" size="icon" aria-label="Actualiser le journal" title="Actualiser" onClick={() => void log.refetch()} disabled={log.isFetching}><RefreshCw className={log.isFetching ? 'animate-spin motion-reduce:animate-none' : ''} /></Button>
    </div>
    {log.isError ? <div role="alert" className="py-6 text-sm text-destructive">Le journal n'a pas pu être chargé. Vérifiez votre accès administrateur.<Button variant="outline" className="ml-2" onClick={() => void log.refetch()}>Réessayer</Button></div> : log.isPending ? <p role="status" className="py-8 text-sm text-muted-foreground">Chargement du journal…</p> : <>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr>{['Action','Administrateur','Cible','Date et heure',''].map((h,i) => <th key={i} className="px-2 py-3">{h}</th>)}</tr></thead><tbody>{log.data.rows.map(entry => { const meta = auditDetails(entry.metadata); return <tr key={entry.id} className="border-b"><td className="px-2 py-3 font-mono text-xs">{entry.action}</td><td className="px-2 py-3"><span className="block font-semibold">{auditValue(meta['actor_name'] ?? entry.admin_id)}</span><span className="text-xs text-muted-foreground">{auditValue(meta['actor_role'])}</span></td><td className="max-w-48 px-2 py-3"><span className="block truncate">{auditValue(meta['target_label'] ?? entry.target_id)}</span><span className="text-xs text-muted-foreground">{entry.target_type}</span></td><td className="whitespace-nowrap px-2 py-3 text-xs">{timestamp(entry.created_at)}</td><td className="px-2 py-3"><Button variant="ghost" size="icon" title="Voir les détails" aria-label={`Voir les détails de ${entry.action}`} onClick={() => setSelected(entry)}><Eye /></Button></td></tr>; })}</tbody></table></div>
      {!log.data.rows.length && <p className="py-8 text-center text-sm text-muted-foreground">Aucune action enregistrée.</p>}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{log.data.count} action(s) · Page {page + 1}</span><div className="flex gap-1"><Button size="icon" variant="outline" aria-label="Page précédente" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft /></Button><Button size="icon" variant="outline" aria-label="Page suivante" disabled={(page + 1) * PAGE_SIZE >= log.data.count} onClick={() => setPage(page + 1)}><ChevronRight /></Button></div></div>
    </>}
    <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Détails de l'action</DialogTitle><DialogDescription>{selected?.action}</DialogDescription></DialogHeader>{selected && <div className="space-y-4 text-sm"><dl className="grid gap-3 break-words">{[['Administrateur',auditValue(details['actor_name'] ?? selected.admin_id)],['Identifiant administrateur',selected.admin_id ?? '—'],['Rôle',auditValue(details['actor_role'])],['Cible',auditValue(details['target_label'] ?? selected.target_id)],['Identifiant cible',selected.target_id ?? '—'],['Type',selected.target_type],['Date et heure',timestamp(selected.created_at)],['Référence',selected.id]].map(([label,value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl>{changes.length > 0 && <div className="space-y-3 border-t pt-4"><h3 className="font-semibold">Modifications</h3>{changes.map(change => <div key={change.key} className="break-words"><p className="font-mono text-xs">{change.key}</p><p className="text-muted-foreground">Avant : {change.before}</p><p>Après : {change.after}</p></div>)}</div>}{details['note'] && <p className="break-words">Motif : {auditValue(details['note'])}</p>}<details className="border-t pt-3"><summary className="cursor-pointer font-semibold">Détails enregistrés</summary><pre className="mt-2 whitespace-pre-wrap break-all rounded-lg bg-secondary p-3 text-xs">{JSON.stringify(selected.metadata,null,2)}</pre></details></div>}</DialogContent></Dialog>
  </div>;
}