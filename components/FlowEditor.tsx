import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { supabase } from '@/src/integrations/supabase/client';
import { Button, Input } from './ui/Shared';
import { ArrowLeft, MessageSquare, Clock, GitBranch, Tag, Save, Play, Plus, Trash2, Zap, Activity, X } from 'lucide-react';
import toast from 'react-hot-toast';

type NodeKind = 'trigger' | 'send_message' | 'wait_reply' | 'delay' | 'condition' | 'crm_action';

interface FlowDoc {
  id?: string;
  name: string;
  description?: string;
  enabled: boolean;
  triggers: any[];
  nodes: Node[];
  edges: Edge[];
  start_node_id?: string | null;
}

const NODE_META: Record<NodeKind, { label: string; icon: any; color: string; defaultData: any }> = {
  trigger: { label: 'Gatilho', icon: Zap, color: 'bg-orange-500', defaultData: { triggers: [{ type: 'broadcast_reply' }] } },
  send_message: { label: 'Enviar mensagem', icon: MessageSquare, color: 'bg-emerald-500', defaultData: { text: 'Olá!' } },
  wait_reply: { label: 'Aguardar resposta', icon: GitBranch, color: 'bg-blue-500', defaultData: { timeout_minutes: 60 } },
  delay: { label: 'Atraso', icon: Clock, color: 'bg-purple-500', defaultData: { seconds: 30 } },
  condition: { label: 'Condição (palavra-chave)', icon: GitBranch, color: 'bg-amber-500', defaultData: { match_type: 'contains', keywords: ['sim'] } },
  crm_action: { label: 'Ação CRM', icon: Tag, color: 'bg-pink-500', defaultData: { action: 'add_tag', value: 'fluxo' } },
};

// =================== Custom node renderer ===================
const FlowNode: React.FC<NodeProps> = ({ data, selected, type }) => {
  const meta = NODE_META[(type as NodeKind) || 'send_message'];
  const Icon = meta.icon;
  const isTrigger = type === 'trigger';
  const isCondition = type === 'condition';
  return (
    <div className={`rounded-xl shadow-md bg-card border-2 ${selected ? 'border-primary' : 'border-border'} min-w-[220px]`}>
      {!isTrigger && <Handle type="target" position={Position.Top} className="!bg-primary" />}
      <div className={`flex items-center gap-2 px-3 py-2 ${meta.color} text-white rounded-t-[10px]`}>
        <Icon className="h-4 w-4" />
        <span className="font-bold text-xs uppercase tracking-wider">{meta.label}</span>
      </div>
      <div className="px-3 py-2 text-xs text-foreground">
        <FlowNodePreview type={type as NodeKind} data={data as any} />
      </div>
      {isCondition ? (
        <>
          <Handle id="match" type="source" position={Position.Bottom} style={{ left: '30%' }} className="!bg-emerald-500" />
          <Handle id="nomatch" type="source" position={Position.Bottom} style={{ left: '70%' }} className="!bg-red-500" />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} className="!bg-primary" />
      )}
    </div>
  );
};

const FlowNodePreview: React.FC<{ type: NodeKind; data: any }> = ({ type, data }) => {
  switch (type) {
    case 'trigger': {
      const t = (data?.triggers || [])[0];
      if (!t) return <span className="text-muted-foreground">Configure o gatilho</span>;
      if (t.type === 'broadcast_reply') return <span>Resposta de transmissão</span>;
      if (t.type === 'keyword') return <span>Palavra-chave: <b>{(t.keywords || []).join(', ')}</b></span>;
      return <span>{t.type}</span>;
    }
    case 'send_message':
      return <span className="line-clamp-3 whitespace-pre-wrap">{data?.text || 'Sem mensagem'}</span>;
    case 'wait_reply':
      return <span>Aguarda resposta · timeout {data?.timeout_minutes || 60}min</span>;
    case 'delay':
      return <span>Esperar {data?.seconds || 0}s</span>;
    case 'condition':
      return (
        <span>
          {data?.match_type || 'contains'}: <b>{(data?.keywords || []).join(', ')}</b>
          <div className="flex justify-between mt-1 text-[10px]"><span className="text-emerald-600">match ✓</span><span className="text-red-600">no-match ✗</span></div>
        </span>
      );
    case 'crm_action':
      return <span>{data?.action || 'add_tag'}: <b>{data?.value}</b></span>;
  }
};

const nodeTypes = {
  trigger: FlowNode,
  send_message: FlowNode,
  wait_reply: FlowNode,
  delay: FlowNode,
  condition: FlowNode,
  crm_action: FlowNode,
};

// =================== Editor ===================
interface Props {
  flowId?: string | null;
  onClose: () => void;
}

const FlowEditorInner: React.FC<Props> = ({ flowId, onClose }) => {
  const [doc, setDoc] = useState<FlowDoc>({
    name: 'Novo Fluxo',
    description: '',
    enabled: false,
    triggers: [],
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 40 }, data: NODE_META.trigger.defaultData },
    ],
    edges: [],
    start_node_id: 'trigger-1',
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [runs, setRuns] = useState<any[]>([]);
  const [showLive, setShowLive] = useState(true);

  useEffect(() => {
    if (!flowId) return;
    (async () => {
      const { data } = await supabase.from('flows').select('*').eq('id', flowId).maybeSingle();
      if (data) {
        setDoc({
          id: data.id,
          name: data.name,
          description: data.description || '',
          enabled: data.enabled,
          triggers: (data.triggers as any) || [],
          nodes: (data.nodes as any) || [],
          edges: (data.edges as any) || [],
          start_node_id: data.start_node_id,
        });
      }
    })();
  }, [flowId]);

  // Realtime: list of runs in this flow + counts per node
  useEffect(() => {
    if (!flowId) return;
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from('flow_runs')
        .select('id, contact_phone, contact_name, current_node_id, status, scheduled_at, last_event_at, last_message_text, error, updated_at')
        .eq('flow_id', flowId)
        .order('updated_at', { ascending: false })
        .limit(200);
      if (mounted) setRuns(data || []);
    };
    load();
    const channel = supabase
      .channel(`flow_runs_${flowId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flow_runs', filter: `flow_id=eq.${flowId}` }, () => load())
      .subscribe();
    const interval = setInterval(load, 8000);
    return () => { mounted = false; clearInterval(interval); supabase.removeChannel(channel); };
  }, [flowId]);

  // Counts per node (active runs only)
  const nodeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of runs) {
      if (['pending', 'waiting_input', 'scheduled'].includes(r.status) && r.current_node_id) {
        map[r.current_node_id] = (map[r.current_node_id] || 0) + 1;
      }
    }
    return map;
  }, [runs]);

  // Inject counts into nodes for renderer
  const nodesWithCounts = useMemo(
    () => doc.nodes.map((n) => ({ ...n, data: { ...(n.data as any), _liveCount: nodeCounts[n.id] || 0 } })),
    [doc.nodes, nodeCounts]
  );

  const onNodesChange = useCallback((changes: any) => {
    setDoc((d) => ({ ...d, nodes: applyNodeChanges(changes, d.nodes) }));
  }, []);
  const onEdgesChange = useCallback((changes: any) => {
    setDoc((d) => ({ ...d, edges: applyEdgeChanges(changes, d.edges) }));
  }, []);
  const onConnect = useCallback((conn: Connection) => {
    setDoc((d) => ({ ...d, edges: addEdge({ ...conn, animated: true }, d.edges) }));
  }, []);

  const addNode = (kind: NodeKind) => {
    const id = `${kind}-${Date.now()}`;
    const newNode: Node = {
      id,
      type: kind,
      position: { x: 250 + Math.random() * 100, y: 200 + Math.random() * 100 },
      data: structuredClone(NODE_META[kind].defaultData),
    };
    setDoc((d) => ({ ...d, nodes: [...d.nodes, newNode] }));
  };

  const selectedNode = useMemo(() => doc.nodes.find((n) => n.id === selectedId) || null, [doc.nodes, selectedId]);

  const updateNodeData = (patch: any) => {
    if (!selectedId) return;
    setDoc((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (n.id === selectedId ? { ...n, data: { ...(n.data as any), ...patch } } : n)),
    }));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    if (selectedNode?.type === 'trigger') return toast.error('O nó de gatilho não pode ser removido');
    setDoc((d) => ({
      ...d,
      nodes: d.nodes.filter((n) => n.id !== selectedId),
      edges: d.edges.filter((e) => e.source !== selectedId && e.target !== selectedId),
    }));
    setSelectedId(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const trigger = doc.nodes.find((n) => n.type === 'trigger');
      const triggers = (trigger?.data as any)?.triggers || [];
      const payload: any = {
        user_id: user.id,
        name: doc.name,
        description: doc.description,
        enabled: doc.enabled,
        triggers,
        nodes: doc.nodes as any,
        edges: doc.edges as any,
        start_node_id: trigger?.id || null,
      };
      if (doc.id) {
        const { error } = await supabase.from('flows').update(payload).eq('id', doc.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('flows').insert(payload).select().single();
        if (error) throw error;
        setDoc((d) => ({ ...d, id: data.id }));
      }
      toast.success('Fluxo salvo');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <header className="flex items-center justify-between p-3 border-b border-border bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><ArrowLeft className="h-5 w-5" /></button>
          <Input
            className="font-bold text-lg w-72"
            value={doc.name}
            onChange={(e) => setDoc({ ...doc, name: e.target.value })}
          />
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={doc.enabled} onChange={(e) => setDoc({ ...doc, enabled: e.target.checked })} />
            <span className={doc.enabled ? 'text-emerald-600 font-bold' : 'text-muted-foreground'}>
              {doc.enabled ? 'Ativo' : 'Desativado'}
            </span>
          </label>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Palette */}
        <aside className="w-56 border-r border-border bg-card p-3 overflow-y-auto">
          <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Adicionar bloco</h3>
          <div className="flex flex-col gap-2">
            {(['send_message', 'wait_reply', 'delay', 'condition', 'crm_action'] as NodeKind[]).map((k) => {
              const m = NODE_META[k];
              const Icon = m.icon;
              return (
                <button
                  key={k}
                  onClick={() => addNode(k)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-primary hover:bg-muted text-left text-sm"
                >
                  <span className={`w-7 h-7 rounded-md flex items-center justify-center ${m.color} text-white`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Canvas */}
        <div className="flex-1 relative bg-muted/30">
          <ReactFlow
            nodes={doc.nodes}
            edges={doc.edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>

        {/* Inspector */}
        <aside className="w-80 border-l border-border bg-card p-4 overflow-y-auto">
          {selectedNode ? (
            <Inspector node={selectedNode} onChange={updateNodeData} onDelete={deleteSelected} />
          ) : (
            <div className="text-sm text-muted-foreground">
              <p className="mb-2 font-bold text-foreground">Como usar</p>
              <ul className="space-y-1 list-disc pl-4">
                <li>Clique nos blocos da esquerda para adicionar</li>
                <li>Conecte arrastando das bolinhas inferiores até o topo do próximo nó</li>
                <li>Clique em um nó para editar suas opções aqui</li>
                <li>Ative o fluxo no topo quando estiver pronto</li>
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

const Inspector: React.FC<{ node: Node; onChange: (p: any) => void; onDelete: () => void }> = ({ node, onChange, onDelete }) => {
  const data: any = node.data || {};
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm">{NODE_META[node.type as NodeKind]?.label}</h3>
        {node.type !== 'trigger' && (
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-500/10 text-red-500"><Trash2 className="h-4 w-4" /></button>
        )}
      </div>

      {node.type === 'trigger' && <TriggerEditor data={data} onChange={onChange} />}

      {node.type === 'send_message' && (
        <div>
          <label className="text-xs font-bold">Mensagem</label>
          <textarea
            className="w-full mt-1 p-2 rounded border border-border bg-background text-sm h-32"
            value={data.text || ''}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Digite a mensagem. Use {{name}} para o nome do contato."
          />
          <p className="text-[10px] text-muted-foreground mt-1">Variáveis: {'{{name}}'}, {'{{phone}}'}</p>
        </div>
      )}

      {node.type === 'wait_reply' && (
        <div>
          <label className="text-xs font-bold">Timeout (minutos)</label>
          <Input type="number" value={data.timeout_minutes || 60} onChange={(e) => onChange({ timeout_minutes: Number(e.target.value) })} />
          <p className="text-[10px] text-muted-foreground mt-1">Se o lead não responder dentro deste tempo, o fluxo é encerrado.</p>
        </div>
      )}

      {node.type === 'delay' && (
        <div>
          <label className="text-xs font-bold">Esperar (segundos)</label>
          <Input type="number" value={data.seconds || 0} onChange={(e) => onChange({ seconds: Number(e.target.value) })} />
        </div>
      )}

      {node.type === 'condition' && (
        <div className="space-y-2">
          <label className="text-xs font-bold">Tipo de comparação</label>
          <select
            className="w-full p-2 rounded border border-border bg-background text-sm"
            value={data.match_type || 'contains'}
            onChange={(e) => onChange({ match_type: e.target.value })}
          >
            <option value="contains">Contém</option>
            <option value="equals">Igual a</option>
            <option value="starts_with">Começa com</option>
            <option value="regex">Regex</option>
          </select>
          <label className="text-xs font-bold">Palavras-chave (uma por linha)</label>
          <textarea
            className="w-full p-2 rounded border border-border bg-background text-sm h-24"
            value={(data.keywords || []).join('\n')}
            onChange={(e) => onChange({ keywords: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
          />
          <p className="text-[10px] text-muted-foreground">Saída verde = casou, saída vermelha = não casou.</p>
        </div>
      )}

      {node.type === 'crm_action' && (
        <div className="space-y-2">
          <label className="text-xs font-bold">Ação</label>
          <select
            className="w-full p-2 rounded border border-border bg-background text-sm"
            value={data.action || 'add_tag'}
            onChange={(e) => onChange({ action: e.target.value })}
          >
            <option value="add_tag">Adicionar tag ao contato</option>
            <option value="move_deal">Mover deal para etapa</option>
            <option value="create_followup">Criar follow-up</option>
          </select>
          <label className="text-xs font-bold">Valor</label>
          <Input value={data.value || ''} onChange={(e) => onChange({ value: e.target.value })}
            placeholder={data.action === 'move_deal' ? 'ex: qualificado' : data.action === 'create_followup' ? 'mensagem do follow-up' : 'nome da tag'} />
        </div>
      )}
    </div>
  );
};

const TriggerEditor: React.FC<{ data: any; onChange: (p: any) => void }> = ({ data, onChange }) => {
  const triggers: any[] = data.triggers || [];
  const update = (i: number, patch: any) => {
    const next = triggers.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
    onChange({ triggers: next });
  };
  const add = () => onChange({ triggers: [...triggers, { type: 'keyword', keywords: [] }] });
  const remove = (i: number) => onChange({ triggers: triggers.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">O fluxo inicia quando QUALQUER um destes gatilhos for satisfeito.</p>
      {triggers.map((t, i) => (
        <div key={i} className="border border-border rounded-lg p-2 space-y-2">
          <div className="flex items-center gap-2">
            <select
              className="flex-1 p-1.5 rounded border border-border bg-background text-xs"
              value={t.type}
              onChange={(e) => update(i, { type: e.target.value, keywords: e.target.value === 'keyword' ? [] : undefined })}
            >
              <option value="broadcast_reply">Resposta a uma transmissão</option>
              <option value="keyword">Palavra-chave recebida</option>
            </select>
            <button onClick={() => remove(i)} className="p-1 rounded hover:bg-red-500/10 text-red-500"><Trash2 className="h-3 w-3" /></button>
          </div>
          {t.type === 'keyword' && (
            <>
              <select
                className="w-full p-1.5 rounded border border-border bg-background text-xs"
                value={t.match_type || 'contains'}
                onChange={(e) => update(i, { match_type: e.target.value })}
              >
                <option value="contains">Contém</option>
                <option value="equals">Igual a</option>
                <option value="starts_with">Começa com</option>
                <option value="regex">Regex</option>
              </select>
              <textarea
                className="w-full p-1.5 rounded border border-border bg-background text-xs h-20"
                placeholder="Uma palavra/frase por linha"
                value={(t.keywords || []).join('\n')}
                onChange={(e) => update(i, { keywords: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
              />
            </>
          )}
          {t.type === 'broadcast_reply' && (
            <p className="text-[10px] text-muted-foreground">Dispara quando um lead responder a uma mensagem enviada por uma transmissão.</p>
          )}
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add}><Plus className="h-3 w-3 mr-1" />Adicionar gatilho</Button>
    </div>
  );
};

const FlowEditor: React.FC<Props> = (props) => (
  <ReactFlowProvider>
    <FlowEditorInner {...props} />
  </ReactFlowProvider>
);

export default FlowEditor;
