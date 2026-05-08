import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { Button } from './ui/Shared';
import { Loader2, Plus, Play, Pause, Trash2, BarChart3, Menu, X, Check, Send, Workflow } from 'lucide-react';
import toast from 'react-hot-toast';
import FlowsPage from './FlowsPage';

interface Broadcast {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed';
  delay_preset: string;
  delay_min_seconds: number;
  delay_max_seconds: number;
  messages: string[];
  contact_ids: string[];
  total_targets: number;
  sent_count: number;
  failed_count: number;
  read_count: number;
  replied_count: number;
  current_index: number;
  created_at: string;
  flow_id?: string | null;
}

interface FlowOption { id: string; name: string; enabled: boolean }

interface Contact {
  id: string;
  name: string;
  phone: string;
  tags: string[] | null;
}

const DELAY_PRESETS = [
  { id: 'very_short', label: 'Muito curto', range: '1–5s', min: 1, max: 5 },
  { id: 'short', label: 'Curto', range: '5–20s', min: 5, max: 20 },
  { id: 'medium', label: 'Médio', range: '20–50s', min: 20, max: 50 },
  { id: 'long', label: 'Longo', range: '50–120s', min: 50, max: 120 },
  { id: 'very_long', label: 'Muito longo', range: '120–300s', min: 120, max: 300 },
];

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-slate-500/20 text-slate-700 dark:text-slate-300' },
  running: { label: 'Em execução', color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  paused: { label: 'Pausada', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' },
  completed: { label: 'Concluída', color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400' },
  failed: { label: 'Falhou', color: 'bg-red-500/20 text-red-700 dark:text-red-400' },
};

interface Props {
  onOpenMenu: () => void;
}

const BroadcastPage: React.FC<Props> = ({ onOpenMenu }) => {
  const [tab, setTab] = useState<'broadcasts' | 'flows'>('broadcasts');
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [metricsId, setMetricsId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false });
    setBroadcasts((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const startBroadcast = async (b: Broadcast) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return toast.error('Sessão expirada');
    toast.loading('Iniciando disparo...', { id: 'start' });
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/broadcast-runner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ broadcast_id: b.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Disparo iniciado!', { id: 'start' });
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao iniciar', { id: 'start' });
    }
  };

  const pauseBroadcast = async (b: Broadcast) => {
    await supabase.from('broadcasts').update({ status: 'paused' }).eq('id', b.id);
    toast.success('Pausado');
    load();
  };

  const deleteBroadcast = async (b: Broadcast) => {
    if (!confirm(`Excluir transmissão "${b.name}"?`)) return;
    await supabase.from('broadcasts').delete().eq('id', b.id);
    toast.success('Excluído');
    load();
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <button className="md:hidden p-2" onClick={onOpenMenu}>
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Transmissão</h1>
            <p className="text-xs text-muted-foreground">Disparos em massa e fluxos automáticos via WhatsApp</p>
          </div>
        </div>
        {tab === 'broadcasts' && (
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova Transmissão
          </Button>
        )}
      </header>

      <div className="flex gap-1 px-4 pt-3 border-b border-border bg-card">
        <button
          onClick={() => setTab('broadcasts')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 -mb-px ${tab === 'broadcasts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Send className="h-4 w-4" /> Transmissões
        </button>
        <button
          onClick={() => setTab('flows')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 -mb-px ${tab === 'flows' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Workflow className="h-4 w-4" /> Fluxos
        </button>
      </div>

      {tab === 'flows' ? (
        <div className="flex-1 overflow-auto"><FlowsPage /></div>
      ) : (
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="mb-4">Nenhuma transmissão criada ainda.</p>
            <Button onClick={() => setShowWizard(true)}>
              <Plus className="h-4 w-4 mr-2" /> Criar primeira transmissão
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {broadcasts.map((b) => {
              const progress = b.total_targets ? (b.current_index / b.total_targets) * 100 : 0;
              const status = STATUS_LABEL[b.status];
              return (
                <div key={b.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-base truncate">{b.name}</h3>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${status.color}`}>{status.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {b.total_targets} contatos · atraso{' '}
                    {DELAY_PRESETS.find((p) => p.id === b.delay_preset)?.range || `${b.delay_min_seconds}-${b.delay_max_seconds}s`}
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                    <div><div className="font-bold text-sm">{b.sent_count}</div><div className="text-muted-foreground">Env.</div></div>
                    <div><div className="font-bold text-sm">{b.failed_count}</div><div className="text-muted-foreground">Falhas</div></div>
                    <div><div className="font-bold text-sm">{b.read_count}</div><div className="text-muted-foreground">Lidas</div></div>
                    <div><div className="font-bold text-sm">{b.replied_count}</div><div className="text-muted-foreground">Resp.</div></div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    {(b.status === 'draft' || b.status === 'paused' || b.status === 'failed') && (
                      <Button size="sm" className="flex-1" onClick={() => startBroadcast(b)}>
                        <Play className="h-3 w-3 mr-1" /> {b.current_index > 0 ? 'Retomar' : 'Iniciar'}
                      </Button>
                    )}
                    {b.status === 'running' && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => pauseBroadcast(b)}>
                        <Pause className="h-3 w-3 mr-1" /> Pausar
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setMetricsId(b.id)} title="Métricas">
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteBroadcast(b)} title="Excluir">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {showWizard && <BroadcastWizard onClose={() => { setShowWizard(false); load(); }} />}
      {metricsId && <BroadcastMetrics broadcastId={metricsId} onClose={() => setMetricsId(null)} />}
    </div>
  );
};

// ============ WIZARD ============
const BroadcastWizard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [preset, setPreset] = useState('medium');
  const [messages, setMessages] = useState<string[]>(['']);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [flows, setFlows] = useState<FlowOption[]>([]);
  const [flowId, setFlowId] = useState<string>('');

  useEffect(() => {
    supabase.from('contacts').select('id, name, phone, tags').order('name').then(({ data }) => {
      setContacts((data as any) || []);
    });
    supabase.from('flows').select('id, name, enabled').order('updated_at', { ascending: false }).then(({ data }) => {
      setFlows((data as any) || []);
    });
  }, []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    contacts.forEach((c) => c.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [contacts]);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (search && !`${c.name} ${c.phone}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (tagFilter.length && !tagFilter.every((t) => c.tags?.includes(t))) return false;
      return true;
    });
  }, [contacts, search, tagFilter]);

  const toggleAll = () => {
    if (filtered.every((c) => selected.has(c.id))) {
      const ns = new Set(selected); filtered.forEach((c) => ns.delete(c.id)); setSelected(ns);
    } else {
      const ns = new Set(selected); filtered.forEach((c) => ns.add(c.id)); setSelected(ns);
    }
  };

  const updateMessage = (i: number, v: string) => {
    const next = [...messages]; next[i] = v; setMessages(next);
  };
  const addMessage = () => messages.length < 30 && setMessages([...messages, '']);
  const removeMessage = (i: number) => setMessages(messages.filter((_, idx) => idx !== i));

  const save = async (startNow: boolean) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const validMessages = messages.map((m) => m.trim()).filter(Boolean);
      if (!name.trim()) throw new Error('Informe o nome da transmissão');
      if (validMessages.length === 0) throw new Error('Adicione ao menos 1 modelo de mensagem');
      if (selected.size === 0) throw new Error('Selecione ao menos 1 contato');

      const p = DELAY_PRESETS.find((x) => x.id === preset)!;
      const ids = Array.from(selected);
      const { data: bc, error } = await supabase
        .from('broadcasts')
        .insert({
          user_id: user.id,
          name: name.trim(),
          status: 'draft',
          delay_preset: preset,
          delay_min_seconds: p.min,
          delay_max_seconds: p.max,
          messages: validMessages,
          contact_ids: ids,
          total_targets: ids.length,
          flow_id: flowId || null,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success('Transmissão criada!');

      if (startNow && bc) {
        const { data: { session } } = await supabase.auth.getSession();
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        await fetch(`https://${projectId}.supabase.co/functions/v1/broadcast-runner`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ broadcast_id: bc.id }),
        });
        toast.success('Disparo iniciado!');
      }
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold">Nova Transmissão · Etapa {step}/4</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-bold mb-2 block">Nome do disparo</label>
                <input
                  className="w-full p-3 rounded-lg bg-muted border border-border"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Promoção Dia das Mães"
                />
              </div>
              <div>
                <label className="text-sm font-bold mb-2 block">Atraso inteligente entre mensagens</label>
                <div className="grid gap-2">
                  {DELAY_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPreset(p.id)}
                      className={`p-3 rounded-lg border text-left flex justify-between items-center ${preset === p.id ? 'border-primary bg-primary/10' : 'border-border bg-muted'}`}
                    >
                      <span className="font-bold">{p.label}</span>
                      <span className="text-sm text-muted-foreground">{p.range}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">Modelos de mensagem ({messages.length}/30)</h3>
                <p className="text-xs text-muted-foreground">Será sorteado aleatoriamente. Use {'{{nome}}'} para personalizar.</p>
              </div>
              {messages.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <textarea
                    className="flex-1 p-3 rounded-lg bg-muted border border-border min-h-[80px]"
                    value={m}
                    onChange={(e) => updateMessage(i, e.target.value)}
                    placeholder={`Modelo ${i + 1}`}
                  />
                  {messages.length > 1 && (
                    <button onClick={() => removeMessage(i)} className="text-red-500 p-2"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              ))}
              {messages.length < 30 && (
                <Button variant="outline" onClick={addMessage}><Plus className="h-4 w-4 mr-1" /> Adicionar modelo</Button>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h3 className="font-bold">Selecionar contatos ({selected.size} selecionados)</h3>
              <input
                placeholder="Buscar nome ou telefone..."
                className="w-full p-2 rounded-lg bg-muted border border-border"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allTags.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTagFilter((tf) => tf.includes(t) ? tf.filter((x) => x !== t) : [...tf, t])}
                      className={`text-xs px-3 py-1 rounded-full border ${tagFilter.includes(t) ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}
                    >{t}</button>
                  ))}
                </div>
              )}
              <div className="flex justify-between text-sm">
                <button onClick={toggleAll} className="text-primary font-bold">
                  {filtered.every((c) => selected.has(c.id)) && filtered.length > 0 ? 'Desmarcar todos' : 'Selecionar todos filtrados'}
                </button>
                <span className="text-muted-foreground">{filtered.length} contatos</span>
              </div>
              <div className="border border-border rounded-lg max-h-72 overflow-auto">
                {filtered.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-muted cursor-pointer border-b border-border last:border-0">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => {
                        const ns = new Set(selected);
                        ns.has(c.id) ? ns.delete(c.id) : ns.add(c.id);
                        setSelected(ns);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.phone}</div>
                    </div>
                    {c.tags?.length ? <div className="text-[10px] text-muted-foreground">{c.tags.join(', ')}</div> : null}
                  </label>
                ))}
                {filtered.length === 0 && <div className="p-4 text-center text-muted-foreground text-sm">Nenhum contato</div>}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-bold">Revisão</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted"><div className="text-xs text-muted-foreground">Nome</div><div className="font-bold">{name}</div></div>
                <div className="p-3 rounded-lg bg-muted"><div className="text-xs text-muted-foreground">Atraso</div><div className="font-bold">{DELAY_PRESETS.find((p) => p.id === preset)?.label}</div></div>
                <div className="p-3 rounded-lg bg-muted"><div className="text-xs text-muted-foreground">Modelos</div><div className="font-bold">{messages.filter((m) => m.trim()).length}</div></div>
                <div className="p-3 rounded-lg bg-muted"><div className="text-xs text-muted-foreground">Destinatários</div><div className="font-bold">{selected.size}</div></div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between p-5 border-t border-border">
          <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : onClose()}>
            {step > 1 ? 'Voltar' : 'Cancelar'}
          </Button>
          <div className="flex gap-2">
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)}>Próximo</Button>
            ) : (
              <>
                <Button variant="outline" disabled={saving} onClick={() => save(false)}>Salvar rascunho</Button>
                <Button disabled={saving} onClick={() => save(true)}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Salvar e iniciar</>}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ METRICS ============
const BroadcastMetrics: React.FC<{ broadcastId: string; onClose: () => void }> = ({ broadcastId, onClose }) => {
  const [bc, setBc] = useState<Broadcast | null>(null);
  const [logs, setLogs] = useState<any[]>([]);

  const load = async () => {
    const { data: b } = await supabase.from('broadcasts').select('*').eq('id', broadcastId).single();
    const { data: l } = await supabase.from('broadcast_logs').select('*').eq('broadcast_id', broadcastId).order('created_at', { ascending: false }).limit(100);
    setBc(b as any);
    setLogs(l || []);
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 3000);
    return () => clearInterval(i);
  }, [broadcastId]);

  if (!bc) return null;
  const progress = bc.total_targets ? (bc.current_index / bc.total_targets) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">{bc.name}</h2>
            <p className="text-xs text-muted-foreground">Métricas em tempo real</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-sm text-center text-muted-foreground">{bc.current_index} / {bc.total_targets} processados</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total', val: bc.total_targets, color: 'text-foreground' },
              { label: 'Enviados', val: bc.sent_count, color: 'text-green-500' },
              { label: 'Falhas', val: bc.failed_count, color: 'text-red-500' },
              { label: 'Lidos', val: bc.read_count, color: 'text-blue-500' },
              { label: 'Respondidos', val: bc.replied_count, color: 'text-purple-500' },
            ].map((m) => (
              <div key={m.label} className="p-4 rounded-xl bg-muted text-center">
                <div className={`text-2xl font-bold ${m.color}`}>{m.val}</div>
                <div className="text-xs text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
          <div>
            <h3 className="font-bold text-sm mb-2">Últimos envios</h3>
            <div className="border border-border rounded-lg max-h-72 overflow-auto">
              {logs.map((l) => (
                <div key={l.id} className="p-2 border-b border-border last:border-0 flex justify-between items-center text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">{l.contact_name}</div>
                    <div className="text-muted-foreground">{l.phone}</div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                    l.status === 'sent' ? 'bg-green-500/20 text-green-700 dark:text-green-400' :
                    l.status === 'failed' ? 'bg-red-500/20 text-red-700 dark:text-red-400' :
                    l.status === 'read' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                    l.status === 'replied' ? 'bg-purple-500/20 text-purple-700 dark:text-purple-400' :
                    'bg-slate-500/20'
                  }`}>{l.status}</span>
                </div>
              ))}
              {logs.length === 0 && <div className="p-4 text-center text-muted-foreground text-sm">Sem registros ainda</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BroadcastPage;
