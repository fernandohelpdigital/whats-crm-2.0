
import React, { useState, useEffect, useCallback } from 'react';
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
import { supabase } from '@/src/integrations/supabase/client';
import { useAuth } from '../src/hooks/useAuth';

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
  const { user } = useAuth();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLead, setEditingLead] = useState<Deal | null>(null);
  const [chattingLead, setChattingLead] = useState<Deal | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load deals from Supabase
  const loadDeals = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const mapped: Deal[] = (data || []).map(d => ({
        id: d.id,
        title: d.title,
        company: d.company,
        tags: d.tags || [],
        value: Number(d.value) || 0,
        status: d.status as DealStatus,
        date: new Date(d.date || d.created_at),
        contactId: d.contact_id || undefined,
        avatarUrl: d.avatar_url || undefined,
        phone: d.phone || undefined,
        email: d.email || undefined,
        zipCode: d.zip_code || undefined,
        address: d.address || undefined,
        numberAddress: d.number_address || undefined,
        complement: d.complement || undefined,
        neighborhood: d.neighborhood || undefined,
        city: d.city || undefined,
        state: d.state || undefined,
        source: d.source || undefined,
        averageBillValue: Number(d.average_bill_value) || undefined,
        budgetPresented: d.budget_presented || false,
        notes: d.notes || undefined,
        clientType: (d as any).client_type || undefined,
        cpfCnpj: (d as any).cpf_cnpj || undefined,
        position: (d as any).position || undefined,
        website: (d as any).website || undefined,
        priority: (d as any).priority || undefined,
        segment: (d as any).segment || undefined,
        mainNeed: (d as any).main_need || undefined,
        servicesInterest: (d as any).services_interest || undefined,
      }));
      setLeads(mapped);
    } catch (e: any) {
      console.error("Erro ao carregar deals:", e);
      toast.error("Erro ao carregar deals");
    } finally {
      setLoading(false);
    }
  }, [user, setLeads]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

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

  const handleDrop = async (e: React.DragEvent, targetStatus: DealStatus) => {
    e.preventDefault();
    if (!draggedLeadId) return;
    
    // Optimistic update
    setLeads(leads.map(lead => lead.id === draggedLeadId ? { ...lead, status: targetStatus } : lead));
    setDraggedLeadId(null);
    
    const { error } = await supabase
      .from('deals')
      .update({ status: targetStatus })
      .eq('id', draggedLeadId);
    
    if (error) {
      toast.error("Erro ao mover lead");
      loadDeals(); // Revert
    } else {
      toast.success(`Lead movido.`);
    }
  };

  const handleUpdateLeadForm = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingLead) return;
      
      // Optimistic update
      setLeads(leads.map(l => l.id === editingLead.id ? editingLead : l));
      setEditingLead(null);
      
      const { error } = await supabase
        .from('deals')
        .update({
          title: editingLead.title,
          company: editingLead.company,
          tags: editingLead.tags,
          value: editingLead.value,
          status: editingLead.status,
          email: editingLead.email || null,
          zip_code: editingLead.zipCode || null,
          address: editingLead.address || null,
          number_address: editingLead.numberAddress || null,
          complement: editingLead.complement || null,
          neighborhood: editingLead.neighborhood || null,
          city: editingLead.city || null,
          state: editingLead.state || null,
          average_bill_value: editingLead.averageBillValue || null,
          budget_presented: editingLead.budgetPresented || false,
          notes: editingLead.notes || null,
          client_type: editingLead.clientType || null,
          cpf_cnpj: editingLead.cpfCnpj || null,
          position: editingLead.position || null,
          website: editingLead.website || null,
          priority: editingLead.priority || null,
          segment: editingLead.segment || null,
          main_need: editingLead.mainNeed || null,
          services_interest: editingLead.servicesInterest || null,
        } as any)
        .eq('id', editingLead.id);
      
      if (error) {
        toast.error("Erro ao salvar");
        loadDeals();
      } else {
        toast.success("Informações atualizadas!");
      }
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
                      
                      {/* Dados Pessoais */}
                      <div>
                        <label className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-1.5 mb-3">
                           <User className="w-3 h-3" /> Dados do Cliente
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-muted-foreground">Nome do Cliente</label>
                              <Input value={editingLead.title} onChange={e => setEditingLead({...editingLead, title: e.target.value})} className="h-10 font-bold" />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-muted-foreground">Empresa</label>
                              <Input value={editingLead.company || ''} onChange={e => setEditingLead({...editingLead, company: e.target.value})} className="h-10" placeholder="Nome da empresa" />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-muted-foreground">Tipo de Cliente</label>
                              <select 
                                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium"
                                  value={editingLead.clientType || ''}
                                  onChange={e => setEditingLead({...editingLead, clientType: e.target.value})}
                              >
                                  <option value="">Selecione...</option>
                                  <option value="pf">Pessoa Física</option>
                                  <option value="pj">Pessoa Jurídica</option>
                              </select>
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-muted-foreground">CPF / CNPJ</label>
                              <Input value={editingLead.cpfCnpj || ''} onChange={e => setEditingLead({...editingLead, cpfCnpj: e.target.value})} className="h-10" placeholder="000.000.000-00" />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-muted-foreground">E-mail</label>
                              <Input value={editingLead.email || ''} onChange={e => setEditingLead({...editingLead, email: e.target.value})} className="h-10" placeholder="exemplo@email.com" />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-muted-foreground">Telefone</label>
                              <Input value={editingLead.phone || ''} readOnly className="h-10 bg-muted/30 cursor-not-allowed font-mono text-sm" />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-muted-foreground">Cargo / Função</label>
                              <Input value={editingLead.position || ''} onChange={e => setEditingLead({...editingLead, position: e.target.value})} className="h-10" placeholder="Ex: Diretor de TI" />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-muted-foreground">Site</label>
                              <Input value={editingLead.website || ''} onChange={e => setEditingLead({...editingLead, website: e.target.value})} className="h-10" placeholder="https://..." />
                          </div>
                        </div>
                      </div>

                      {/* Endereço */}
                      <div className="border-t border-border pt-4">
                        <label className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-1.5 mb-3">
                           <MapPin className="w-3 h-3" /> Endereço
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground">CEP</label>
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
                                <label className="text-[11px] font-semibold text-muted-foreground">Logradouro</label>
                                <Input value={editingLead.address || ''} onChange={e => setEditingLead({...editingLead, address: e.target.value})} className="h-10" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground">Número</label>
                                <Input value={editingLead.numberAddress || ''} onChange={e => setEditingLead({...editingLead, numberAddress: e.target.value})} className="h-10" />
                            </div>
                            <div className="space-y-1.5 md:col-span-3">
                                <label className="text-[11px] font-semibold text-muted-foreground">Complemento</label>
                                <Input value={editingLead.complement || ''} onChange={e => setEditingLead({...editingLead, complement: e.target.value})} className="h-10" />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[11px] font-semibold text-muted-foreground">Cidade</label>
                                <Input value={editingLead.city || ''} onChange={e => setEditingLead({...editingLead, city: e.target.value})} className="h-10" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground">Estado</label>
                                <Input value={editingLead.state || ''} onChange={e => setEditingLead({...editingLead, state: e.target.value})} className="h-10" maxLength={2} />
                            </div>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="border-t border-border pt-4">
                        <label className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-1.5 mb-3">
                           <Tag className="w-3 h-3" /> Tags & Etiquetas
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_TAGS.map(tag => {
                                const selected = editingLead.tags?.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => handleToggleTag(tag)}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all
                                            ${selected 
                                                ? `${getTagColor(tag)} ring-2 ring-primary ring-offset-1` 
                                                : 'bg-muted/30 text-muted-foreground border-transparent hover:border-muted-foreground/40'
                                            }`}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>
                      </div>

                      {/* Dados Comerciais & Qualificação */}
                      <div className="border-t border-border pt-4">
                        <label className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-1.5 mb-3">
                           <DollarSign className="w-3 h-3" /> Qualificação & Comercial
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground">Origem do Lead</label>
                                <select 
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium"
                                    value={editingLead.source || ''}
                                    onChange={e => setEditingLead({...editingLead, source: e.target.value})}
                                >
                                    <option value="">Selecione...</option>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="indicacao">Indicação</option>
                                    <option value="google">Google</option>
                                    <option value="instagram">Instagram</option>
                                    <option value="facebook">Facebook</option>
                                    <option value="site">Site</option>
                                    <option value="linkedin">LinkedIn</option>
                                    <option value="outro">Outro</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground">Etapa do Funil</label>
                                <select 
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium"
                                    value={editingLead.status}
                                    onChange={e => setEditingLead({...editingLead, status: e.target.value as DealStatus})}
                                >
                                    {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground">Prioridade</label>
                                <select 
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium"
                                    value={editingLead.priority || ''}
                                    onChange={e => setEditingLead({...editingLead, priority: e.target.value})}
                                >
                                    <option value="">Selecione...</option>
                                    <option value="baixa">🟢 Baixa</option>
                                    <option value="media">🟡 Média</option>
                                    <option value="alta">🟠 Alta</option>
                                    <option value="urgente">🔴 Urgente</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground">Segmento / Nicho</label>
                                <Input value={editingLead.segment || ''} onChange={e => setEditingLead({...editingLead, segment: e.target.value})} className="h-10" placeholder="Ex: Saúde, Varejo, Indústria..." />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[11px] font-semibold text-muted-foreground">Necessidade Principal</label>
                                <Input value={editingLead.mainNeed || ''} onChange={e => setEditingLead({...editingLead, mainNeed: e.target.value})} className="h-10" placeholder="Ex: Migração para nuvem, suporte técnico..." />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[11px] font-semibold text-muted-foreground">Serviços de Interesse</label>
                                <Input value={editingLead.servicesInterest || ''} onChange={e => setEditingLead({...editingLead, servicesInterest: e.target.value})} className="h-10" placeholder="Ex: Firewall, backup, CFTV, cabeamento..." />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground">Valor Estimado (R$)</label>
                                <Input 
                                    type="number" 
                                    value={editingLead.value || ''} 
                                    onChange={e => setEditingLead({...editingLead, value: Number(e.target.value)})} 
                                    className="h-10 text-lg font-bold text-primary"
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground">Orçamento Disponível (R$)</label>
                                <Input 
                                    type="number" 
                                    value={editingLead.averageBillValue || ''} 
                                    onChange={e => setEditingLead({...editingLead, averageBillValue: Number(e.target.value)})} 
                                    className="h-10"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>
                      </div>

                      {/* Observações */}
                      <div className="border-t border-border pt-4">
                          <label className="text-[11px] font-semibold text-muted-foreground">Observações Gerais</label>
                          <textarea 
                            className="w-full min-h-[100px] mt-1.5 p-3 rounded-lg border border-input bg-muted/10 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Anotações sobre reuniões, perfil técnico, resistências do lead..."
                            value={editingLead.notes || ''}
                            onChange={e => setEditingLead({...editingLead, notes: e.target.value})}
                          />
                      </div>

                      {/* Timestamps */}
                      <div className="flex items-center gap-6 text-[10px] text-muted-foreground pt-2">
                          <span>Criado em: {new Date(editingLead.date).toLocaleDateString('pt-BR')}</span>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-4 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-[#202c33] pb-2">
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
