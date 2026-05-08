import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { Button } from './ui/Shared';
import { Plus, Loader2, Trash2, Pencil, Workflow as WorkflowIcon, Power } from 'lucide-react';
import toast from 'react-hot-toast';
import FlowEditor from './FlowEditor';

interface Flow {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  triggers: any;
  updated_at: string;
}

const FlowsPage: React.FC = () => {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null | undefined>(undefined); // undefined = closed, null = new

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('flows').select('*').order('updated_at', { ascending: false });
    setFlows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleEnabled = async (f: Flow) => {
    await supabase.from('flows').update({ enabled: !f.enabled }).eq('id', f.id);
    toast.success(!f.enabled ? 'Fluxo ativado' : 'Fluxo desativado');
    load();
  };

  const remove = async (f: Flow) => {
    if (!confirm(`Excluir fluxo "${f.name}"?`)) return;
    await supabase.from('flows').delete().eq('id', f.id);
    load();
  };

  const triggerLabel = (t: any) => {
    if (t.type === 'broadcast_reply') return 'Resposta de transmissão';
    if (t.type === 'keyword') return `Palavra-chave (${(t.keywords || []).join(', ')})`;
    return t.type;
  };

  if (editingId !== undefined) {
    return <FlowEditor flowId={editingId} onClose={() => { setEditingId(undefined); load(); }} />;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><WorkflowIcon className="h-5 w-5" /> Fluxos</h2>
          <p className="text-xs text-muted-foreground">Sequências automáticas de mensagens disparadas por gatilhos.</p>
        </div>
        <Button onClick={() => setEditingId(null)}><Plus className="h-4 w-4 mr-2" />Novo Fluxo</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : flows.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="mb-4">Nenhum fluxo criado ainda.</p>
          <Button onClick={() => setEditingId(null)}><Plus className="h-4 w-4 mr-2" />Criar primeiro fluxo</Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {flows.map((f) => (
            <div key={f.id} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold truncate">{f.name}</h3>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${f.enabled ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-slate-500/20 text-slate-500'}`}>
                  {f.enabled ? 'Ativo' : 'Desativado'}
                </span>
              </div>
              {f.description && <p className="text-xs text-muted-foreground line-clamp-2">{f.description}</p>}
              <div className="flex flex-wrap gap-1 mt-1">
                {(Array.isArray(f.triggers) ? f.triggers : []).slice(0, 3).map((t: any, i: number) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-muted">{triggerLabel(t)}</span>
                ))}
              </div>
              <div className="flex gap-2 pt-3 mt-auto border-t border-border">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingId(f.id)}>
                  <Pencil className="h-3 w-3 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleEnabled(f)} title={f.enabled ? 'Desativar' : 'Ativar'}>
                  <Power className={`h-4 w-4 ${f.enabled ? 'text-emerald-500' : ''}`} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(f)} title="Excluir">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlowsPage;
