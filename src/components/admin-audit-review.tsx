import { useEffect, useRef, useState } from 'react';
import { BrainCircuit, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export function AdminAuditReview({ eventIds, onInspect }: { eventIds: string[]; onInspect: (id: string) => void }) {
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [error, setError] = useState('');
  const [reviewed, setReviewed] = useState<string[]>([]);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  async function analyze() {
    if (!session || busy || !eventIds.length) return;
    const controller = new AbortController(); abort.current = controller;
    setBusy(true); setAnswer(''); setReasoning(''); setError(''); setReviewed([...eventIds]);
    try {
      const response = await fetch('/api/audit-review', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ eventIds }), signal: controller.signal });
      if (!response.ok) { const data = await response.json(); throw new Error(data.message ?? 'Analyse indisponible.'); }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('La réponse IA est vide.');
      const decoder = new TextDecoder(); let pending = ''; let complete = false;
      const consume = (line: string) => {
        if (!line.trim()) return;
        const part = JSON.parse(line);
        if (part.type === 'text') setAnswer(value => value + part.text);
        if (part.type === 'reasoning') setReasoning(value => value + part.text);
        if (part.type === 'done') complete = true;
        if (part.type === 'error') { complete = true; setError(part.message); }
      };
      while (true) { const chunk = await reader.read(); if (chunk.done) break; pending += decoder.decode(chunk.value, { stream: true }); const lines = pending.split('\n'); pending = lines.pop() ?? ''; lines.forEach(consume); }
      pending += decoder.decode(); consume(pending);
      if (!complete) throw new Error('L’analyse a été interrompue avant sa conclusion.');
    } catch (cause) {
      setError(controller.signal.aborted ? 'Analyse arrêtée · résultat partiel' : cause instanceof Error ? cause.message : 'Analyse indisponible.');
    } finally { setBusy(false); abort.current = null; }
  }
  return <section className="space-y-3 border-t pt-4" aria-label="Analyse IA du journal">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 font-semibold"><BrainCircuit className="size-4 text-primary" />Analyse de sécurité · Lovable AI</h3><p className="mt-1 text-xs text-muted-foreground">{eventIds.length} événement(s) sélectionné(s)</p></div>{busy ? <Button variant="outline" onClick={() => abort.current?.abort()}><Square />Arrêter</Button> : <Button disabled={!eventIds.length || !session} onClick={() => void analyze()}>Analyser la sélection</Button>}</div>
    <p className="text-xs text-muted-foreground">Avis indicatif à confirmer. Aucune action automatique. Noms, coordonnées et valeurs confidentielles non transmis.</p>
    {busy && <p role="status" className="text-sm text-muted-foreground">Analyse en cours…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {reasoning && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Notes d’analyse</summary><p className="mt-2 whitespace-pre-wrap break-words">{reasoning}</p></details>}
    {answer && <div className="space-y-3"><div className="whitespace-pre-wrap break-words text-sm leading-relaxed" aria-live="polite">{answer}</div><details><summary className="cursor-pointer text-xs font-semibold">Événements analysés ({reviewed.length})</summary><div className="mt-2 flex flex-wrap gap-2">{reviewed.map(id => <Button key={id} variant="outline" size="sm" onClick={() => onInspect(id)} className="font-mono text-xs">{id.slice(0, 8)}…</Button>)}</div></details></div>}
  </section>;
}