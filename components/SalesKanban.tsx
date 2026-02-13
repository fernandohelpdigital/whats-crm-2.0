
import React, { useState, useEffect } from 'react';
import { Deal, DealStatus, Contact, AuthConfig } from '../types';
import { Button, Avatar, Input } from './ui/Shared';
import { 
  DollarSign, 
  Calendar, 
  MessageCircle, 
  Menu, 
  Sun, 
  Pencil, 
  X, 
  Save, 
  MapPin, 
  Tag, 
  Loader2, 
  Search, 
  User, 
  Zap, 
  CheckCircle2,
  Phone,
  Home
} from 'lucide-react';
import { fetchProfilePictureUrl } from '../services/evolutionClient';
import toast from 'react-hot-toast';
import ChatArea from './ChatArea';
import axios from 'axios';

interface SalesKanbanProps {
  leads: Deal[];
  setLeads: (leads: Deal[]) => void;
  contacts: Contact[];
  onOpenMenu?: () => void;
  config: AuthConfig;
}

const AVAILABLE_TAGS = [
    "WhatsApp Lead",
    "🔥 Quente",
    "❄️ Frio",
    "⚠️ Urgente",
    "💎 VIP",
    "⏳ Aguardando Cliente",
    "📞 Tentar Novamente",
    "📅 Reunião Agendada",
    "🤝 Indicação",
    "🚫 Desqualificado",
    "💬 Prefere WhatsApp"
];

const COLUMNS: { id: DealStatus; title: string; color: string }[] = [
  { id: 'lead_capturado', title: 'LEAD CAPTURADO', color: 'text-gray-500' },
  { id: 'contato_inicial', title: 'CONTATO INICIAL', color: 'text-blue-400' },
  { id: 'diagnostico_levantamento', title: 'DIAGNÓSTICO / LEVANTAMENTO', color: 'text-indigo-400' },
  { id: 'proposta_construcao', title: 'PROPOSTA EM CONSTRUÇÃO', color: 'text-amber-500' },
  { id: 'proposta_enviada', title: 'PROPOSTA ENVIADA', color: 'text-orange-500' },
  { id: 'negociacao', title: 'NEGOCIAÇÃO / AJUSTES', color: 'text-purple-500' },
  { id: 'fechado_aprovado', title: 'FECHADO – APROVADO', color: 'text-emerald-600' },
  { id: 'em_execucao', title: 'EM EXECUÇÃO', color: 'text-cyan-600' },
  { id: 'entrega_homologacao', title: 'ENTREGA / HOMOLOGAÇÃO', color: 'text-teal-500' },
  { id: 'pos_venda', title: 'PÓS-VENDA / SUPORTE', color: 'text-sky-500' },
  { id: 'em_followup', title: 'EM FOLLOW-UP', color: 'text-slate-500' },
  { id: 'perdido', title: 'PERDIDO', color: 'text-red-600' },
];

const getTagColor = (tag: string) => {
    if (tag.includes('Quente') || tag.includes('Urgente')) return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
    if (tag.includes('Frio')) return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
    if (tag.includes('VIP')) return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
    if (tag.includes('WhatsApp')) return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
    return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
};

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatDate = (date: Date) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date);

const KanbanCard = ({ lead, config, onDragStart, draggedLeadId, onEdit, onViewChat }: any) => {
    const [avatar, setAvatar] = useState<string | undefined>(lead.avatarUrl);

    useEffect(() => {
        let isMounted = true;
        if (!avatar && config && lead.phone) {
             fetchProfilePictureUrl(config, lead.phone as string)
                .then(url => { if (isMounted && url) setAvatar(url); })
                .catch(() => {});
        }
        return () => { isMounted = false; };
    }, [lead.phone, config, avatar]);

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, lead.id)}
            className={`
            bg-white dark:bg-card p-3 rounded-lg shadow-sm border-l-4 border-l-primary cursor-grab active:cursor-grabbing
            hover:shadow-md transition-all duration-200 group relative flex flex-col gap-2 animate-zoom-in opacity-0
            ${draggedLeadId === lead.id ? 'opacity-40 scale-[0.98]' : ''}
            `}
        >
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                 <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-primary text-white" onClick={(e) => { e.stopPropagation(); onViewChat?.(lead); }}><MessageCircle className="w-3.5 h-3.5" /></Button>
                 <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-700 text-muted-foreground" onClick={(e) => { e.stopPropagation(); onEdit?.(lead); }}><Pencil className="w-3.5 h-3.5" /></Button>
            </div>

            <div className="flex items-start gap-3">
                <Avatar src={avatar} alt={lead.title} fallback={lead.title} className="h-10 w-10" />
                <div className="flex-1 min-w-0 pr-6">
                    <h4 className="font-bold text-xs text-[#111b21] dark:text-[#e9edef] leading-tight truncate">{lead.title}</h4>
                    <p className="text-[10px] text-[#667781] dark:text-[#8696a0] truncate font-mono">{lead.phone}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {lead.tags?.slice(0, 3).map((tag: string) => (
                            <span key={tag} className={`text-[8px] font-bold px-1 py-0.5 rounded border ${getTagColor(tag)}`}>{tag}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/20 mt-1">
                <span className="text-xs font-bold text-primary">{formatCurrency(lead.averageBillValue || lead.value || 0)}</span>
                <div className="flex items-center gap-1 text-[9px] text-[#8696a0]"><Calendar className="w-2.5 h-2.5" />{formatDate(new Date(lead.date))}</div>
            </div>
        </div>
    );
};

const SalesKanban: React.FC<SalesKanbanProps> = ({ leads, setLeads, contacts, onOpenMenu, config }) => {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLead, setEditingLead] = useState<Deal | null>(null);
  const [chattingLead, setChattingLead] = useState<Deal | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);

  const filteredLeads = leads.filter(lead => {
    const term = searchTerm.toLowerCase();
    return lead.title.toLowerCase().includes(term) || (lead.phone && lead.phone.includes(term));
  });

  const handleDragStart = (e: React.DragEvent, id: string) => { 
    setDraggedLeadId(id); 
    e.dataTransfer.effectAllowed = 'move'; 
  };
  
  const handleDragOver = (e: React.DragEvent) => { 
    e.preventDefault(); 
  };

  const handleDrop = (e: React.DragEvent, targetStatus: DealStatus) => {
    e.preventDefault();
    if (!draggedLeadId) return;
    setLeads(leads.map(lead => lead.id === draggedLeadId ? { ...lead, status: targetStatus } : lead));
    setDraggedLeadId(null);
    toast.success(`Lead movido.`);
  };

  const handleUpdateLeadForm = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingLead) return;
      setLeads(leads.map(l => l.id === editingLead.id ? editingLead : l));
      setEditingLead(null);
      toast.success("Informações atualizadas!");
  };

  const handleToggleTag = (tag: string) => {
      if (!editingLead) return;
      const currentTags = editingLead.tags || [];
      const newTags = currentTags.includes(tag) 
        ? currentTags.filter(t => t !== tag)
        : [...currentTags, tag];
      setEditingLead({ ...editingLead, tags: newTags });
  };

  const getChatContact = () => {
      if (!chattingLead) return null;
      return contacts.find(c => c.id === chattingLead.contactId);
  };

  const handleCepSearch = async (cep: string) => {
      const cleanCep = cep.replace(/\D/g, '');
      if (cleanCep.length === 8) {
          setLoadingCep(true);
          try {
              const response = await axios.get(`https://viacep.com.br/ws/${cleanCep}/json/`);
              const data = response.data;
              if (data.erro) {
                  toast.error("CEP não encontrado.");
              } else if (editingLead) {
                  setEditingLead({
                      ...editingLead,
                      zipCode: data.cep,
                      address: data.logradouro,
                      complement: data.complemento,
                      neighborhood: data.bairro,
                      city: data.localidade,
                      state: data.uf
                  });
                  toast.success("Endereço preenchido!");
              }
          } catch (error) {
              toast.error("Erro ao buscar CEP.");
          } finally {
              setLoadingCep(false);
          }
      }
  };

  return (
    <div className="h-full flex flex-col bg-[#f0f2f5] dark:bg-[#0b141a] overflow-hidden relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 border-b border-border bg-card shadow-sm z-10 gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMenu}><Menu className="h-6 w-6" /></Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> CRM Kanban
          </h1>
        </div>
        <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10 bg-muted/20 border-border h-9 text-sm" placeholder="Buscar por nome ou fone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full min-w-max">
          {COLUMNS.map((col, idx) => {
            const columnLeads = filteredLeads.filter(lead => lead.status === col.id);
            const totalVal = columnLeads.reduce((acc, curr) => acc + (curr.averageBillValue || curr.value || 0), 0);
            return (
              <div 
                key={col.id} 
                onDragOver={handleDragOver} 
                onDrop={(e) => handleDrop(e, col.id)} 
                className="w-72 flex flex-col h-full bg-muted/20 rounded-xl border border-border/50 animate-slide-right opacity-0"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="p-3 border-b border-border bg-card/40">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-bold text-[10px] uppercase tracking-widest ${col.color}`}>{col.title}</h3>
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{columnLeads.length}</span>
                  </div>
                  <div className="text-[10px] font-medium text-muted-foreground mt-1">Vol: {formatCurrency(totalVal)}</div>
                </div>
                <div className="flex-1 p-2 overflow-y-auto space-y-2">
                  {columnLeads.map(lead => (
                    <KanbanCard 
                        key={lead.id} 
                        lead={lead} 
                        config={config} 
                        onDragStart={handleDragStart} 
                        draggedLeadId={draggedLeadId} 
                        onEdit={(l: any) => setEditingLead(l)}
                        onViewChat={(l: any) => setChattingLead(l)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat History Panel (Slide-over) */}
      {chattingLead && (
        <div className="fixed inset-0 z-[60] flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={() => setChattingLead(null)} />
            <div className="w-full max-w-md bg-white dark:bg-[#0b141a] h-full shadow-2xl relative animate-slide-left">
                {getChatContact() ? (
                    <ChatArea 
                        contact={getChatContact()!} 
                        config={config} 
                        onToggleInfo={() => {}} 
                        onBack={() => setChattingLead(null)} 
                    />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground font-medium">Localizando thread de chat...</p>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Lead Information Modal (Sheet) */}
      {editingLead && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingLead(null)} />
              <div className="bg-white dark:bg-[#202c33] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative animate-zoom-in flex flex-col max-h-[90vh]">
                  
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-border bg-gray-50 dark:bg-black/20 flex justify-between items-center">
                      <div className="flex items-center gap-2 font-bold text-lg">
                          <User className="w-5 h-5 text-primary" /> Perfil do Lead
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setEditingLead(null)}>
                          <X className="w-5 h-5" />
                      </Button>
                  </div>

                  <form onSubmit={handleUpdateLeadForm} className="p-6 overflow-y-auto space-y-6">
                      
                      {/* Personal Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Nome do Responsável</label>
                              <Input value={editingLead.title} onChange={e => setEditingLead({...editingLead, title: e.target.value})} className="h-11 font-bold" />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Empresa</label>
                              <Input value={editingLead.company || ''} onChange={e => setEditingLead({...editingLead, company: e.target.value})} className="h-11" placeholder="Nome da empresa" />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">WhatsApp Principal</label>
                              <div className="relative">
                                  <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                                  <Input value={editingLead.phone || ''} readOnly className="h-11 pl-10 bg-muted/30 cursor-not-allowed font-mono text-sm" />
                              </div>
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">E-mail</label>
                              <Input value={editingLead.email || ''} onChange={e => setEditingLead({...editingLead, email: e.target.value})} className="h-11" placeholder="exemplo@email.com" />
                          </div>
                      </div>

                      {/* TAG SELECTOR SECTION */}
                      <div className="pt-2">
                        <label className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-1.5 mb-3">
                           <Tag className="w-3 h-3" /> Categorização & Etiquetas
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_TAGS.map(tag => {
                                const selected = editingLead.tags?.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => handleToggleTag(tag)}
                                        className={`
                                            px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all
                                            ${selected 
                                                ? `${getTagColor(tag)} ring-2 ring-primary ring-offset-1` 
                                                : 'bg-muted/30 text-muted-foreground border-transparent hover:border-muted-foreground/40'
                                            }
                                        `}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>
                      </div>

                      {/* Financial Info */}
                      <div className="pt-2 border-t border-border pt-4">
                        <label className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-1.5 mb-3">
                           <DollarSign className="w-3 h-3" /> Dados Comerciais
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold">Consumo Médio (R$)</label>
                                <Input 
                                    type="number" 
                                    value={editingLead.averageBillValue || ''} 
                                    onChange={e => setEditingLead({...editingLead, averageBillValue: Number(e.target.value)})} 
                                    className="h-10 text-lg font-bold text-primary"
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold">Orçamento Enviado</label>
                                <select 
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium"
                                    value={editingLead.budgetPresented ? 'sim' : 'nao'}
                                    onChange={e => setEditingLead({...editingLead, budgetPresented: e.target.value === 'sim'})}
                                >
                                    <option value="nao">Aguardando Envio</option>
                                    <option value="sim">Sim, Apresentado</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold">Fase Atual</label>
                                <select 
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium"
                                    value={editingLead.status}
                                    onChange={e => setEditingLead({...editingLead, status: e.target.value as DealStatus})}
                                >
                                    {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </div>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="pt-2 border-t border-border pt-4">
                        <label className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-1.5 mb-3">
                           <MapPin className="w-3 h-3" /> Instalação
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold">CEP</label>
                                <div className="relative">
                                    <Input 
                                        value={editingLead.zipCode || ''} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            setEditingLead({...editingLead, zipCode: val});
                                            handleCepSearch(val);
                                        }} 
                                        className="h-10" 
                                        placeholder="00000-000"
                                    />
                                    {loadingCep && <Loader2 className="absolute right-2 top-2.5 w-5 h-5 animate-spin text-primary" />}
                                </div>
                            </div>
                            <div className="space-y-1.5 md:col-span-3">
                                <label className="text-[11px] font-semibold">Logradouro</label>
                                <Input value={editingLead.address || ''} onChange={e => setEditingLead({...editingLead, address: e.target.value})} className="h-10" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold">Número</label>
                                <Input value={editingLead.numberAddress || ''} onChange={e => setEditingLead({...editingLead, numberAddress: e.target.value})} className="h-10" placeholder="Ex: 123" />
                            </div>
                            <div className="space-y-1.5 md:col-span-3">
                                <label className="text-[11px] font-semibold">Complemento</label>
                                <Input value={editingLead.complement || ''} onChange={e => setEditingLead({...editingLead, complement: e.target.value})} className="h-10" />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[11px] font-semibold">Bairro</label>
                                <Input value={editingLead.neighborhood || ''} onChange={e => setEditingLead({...editingLead, neighborhood: e.target.value})} className="h-10" />
                            </div>
                            <div className="space-y-1.5 md:col-span-1.5">
                                <label className="text-[11px] font-semibold">Cidade</label>
                                <Input value={editingLead.city || ''} onChange={e => setEditingLead({...editingLead, city: e.target.value})} className="h-10" />
                            </div>
                            <div className="space-y-1.5 md:col-span-0.5">
                                <label className="text-[11px] font-semibold">UF</label>
                                <Input value={editingLead.state || ''} onChange={e => setEditingLead({...editingLead, state: e.target.value})} className="h-10" maxLength={2} />
                            </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="space-y-1.5 border-t border-border pt-4">
                          <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Observações Privadas</label>
                          <textarea 
                            className="w-full min-h-[100px] p-3 rounded-lg border border-input bg-muted/10 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Anotações sobre reuniões, perfil ou resistências do lead..."
                            value={editingLead.notes || ''}
                            onChange={e => setEditingLead({...editingLead, notes: e.target.value})}
                          />
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-6 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-[#202c33] pb-2">
                          <Button type="button" variant="ghost" onClick={() => setEditingLead(null)}>Descartar</Button>
                          <Button type="submit" className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-6 shadow-md shadow-primary/20 gap-2">
                              <Save className="w-4 h-4" /> Salvar Cadastro
                          </Button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default SalesKanban;
