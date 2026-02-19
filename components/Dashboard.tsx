
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Deal, DealStatus } from '../types';
import { Card, Button, Input, Avatar } from './ui/Shared';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  Filter, 
  Menu, 
  ArrowUpRight, 
  ArrowDownRight,
  Sun,
  Calendar,
  MoreHorizontal,
  X,
  Save,
  User,
  MapPin,
  Tag,
  Loader2,
  Search,
  Phone,
  Eye
} from 'lucide-react';
import { supabase } from '@/src/integrations/supabase/client';
import { useAuth } from '../src/hooks/useAuth';
import toast from 'react-hot-toast';
import axios from 'axios';

interface DashboardProps {
  leads: Deal[];
  onOpenMenu: () => void;
}

type DateFilter = 'today' | 'yesterday' | '7days' | '30days' | 'all';

const STAGES: { id: DealStatus; label: string; hex: string }[] = [
  { id: 'lead_capturado', label: 'Lead Capturado', hex: '#94a3b8' },
  { id: 'contato_inicial', label: 'Contato Inicial', hex: '#60a5fa' },
  { id: 'diagnostico_levantamento', label: 'Diagnóstico', hex: '#818cf8' },
  { id: 'proposta_construcao', label: 'Proposta em Construção', hex: '#f59e0b' },
  { id: 'proposta_enviada', label: 'Proposta Enviada', hex: '#f97316' },
  { id: 'negociacao', label: 'Negociação / Ajustes', hex: '#a855f7' },
  { id: 'fechado_aprovado', label: 'Fechado – Aprovado', hex: '#10b981' },
  { id: 'em_execucao', label: 'Em Execução', hex: '#06b6d4' },
  { id: 'entrega_homologacao', label: 'Entrega / Homologação', hex: '#14b8a6' },
  { id: 'pos_venda', label: 'Pós-venda / Suporte', hex: '#0ea5e9' },
  { id: 'em_followup', label: 'Em Follow-up', hex: '#64748b' },
  { id: 'perdido', label: 'Perdido', hex: '#ef4444' }
];

const COLUMNS = STAGES;

const AVAILABLE_TAGS = [
  "WhatsApp Lead", "🔥 Quente", "❄️ Frio", "⚠️ Urgente", "💎 VIP",
  "⏳ Aguardando Cliente", "📞 Tentar Novamente", "📅 Reunião Agendada",
  "🤝 Indicação", "🚫 Desqualificado", "💬 Prefere WhatsApp"
];

const getTagColor = (tag: string) => {
  if (tag.includes('Quente') || tag.includes('Urgente')) return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
  if (tag.includes('Frio')) return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
  if (tag.includes('VIP')) return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
  if (tag.includes('WhatsApp')) return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
  return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
};

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const Dashboard: React.FC<DashboardProps> = ({ leads: propLeads, onOpenMenu }) => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<DateFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLead, setEditingLead] = useState<Deal | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [leads, setLeads] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDeals = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const mapped: Deal[] = (data || []).map((d: any) => ({
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
        clientType: d.client_type || undefined,
        cpfCnpj: d.cpf_cnpj || undefined,
        position: d.position || undefined,
        website: d.website || undefined,
        priority: d.priority || undefined,
        segment: d.segment || undefined,
        mainNeed: d.main_need || undefined,
        servicesInterest: d.services_interest || undefined,
      }));
      setLeads(mapped);
    } catch (e: any) {
      console.error("Erro ao carregar deals:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const filteredLeads = useMemo(() => {
    const now = new Date();
    return leads.filter(lead => {
      const date = new Date(lead.date);
      let dateMatch = true;
      if (filter === 'today') dateMatch = date.toDateString() === now.toDateString();
      else if (filter === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        dateMatch = date.toDateString() === yesterday.toDateString();
      }
      else if (filter === '7days') { const d = new Date(now); d.setDate(now.getDate() - 7); dateMatch = date >= d; }
      else if (filter === '30days') { const d = new Date(now); d.setDate(now.getDate() - 30); dateMatch = date >= d; }
      
      const term = searchTerm.toLowerCase();
      const searchMatch = !term || lead.title.toLowerCase().includes(term) || (lead.phone && lead.phone.includes(term)) || (lead.company && lead.company.toLowerCase().includes(term));
      
      return dateMatch && searchMatch;
    });
  }, [leads, filter, searchTerm]);

  // KPIs
  const totalLeads = filteredLeads.length;
  const closedLeads = filteredLeads.filter(l => l.status === 'fechado_aprovado').length;
  const conversionRate = totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0;
  const totalValue = filteredLeads.reduce((acc, curr) => acc + (curr.averageBillValue || curr.value || 0), 0);

  const funnelData = STAGES.map(stage => ({
    ...stage,
    count: filteredLeads.filter(l => l.status === stage.id).length
  }));

  const maxCount = Math.max(...funnelData.map(d => d.count), 1);

  const generateFunnelPaths = () => {
    const heightPerStage = 45; 
    const centerX = 200; 
    const maxWidth = 360; 

    return funnelData.map((stage, i) => {
      const currentMetric = stage.count;
      const minVisualWidth = 40; 
      const currentWidth = ((currentMetric / maxCount) * maxWidth) || minVisualWidth;
      const nextStageCount = i < funnelData.length - 1 ? funnelData[i+1].count : (currentMetric * 0.5);
      const nextWidth = ((nextStageCount / maxCount) * maxWidth) || minVisualWidth;
      const yTop = i * heightPerStage;
      const yBottom = (i + 1) * heightPerStage - 4;
      const xTopLeft = centerX - (currentWidth / 2);
      const xTopRight = centerX + (currentWidth / 2);
      const xBottomLeft = centerX - (nextWidth / 2);
      const xBottomRight = centerX + (nextWidth / 2);
      const path = `M ${xTopLeft},${yTop} L ${xTopRight},${yTop} L ${xBottomRight},${yBottom} L ${xBottomLeft},${yBottom} Z`;
      return { path, color: stage.hex, count: stage.count, label: stage.label, yCenter: yTop + (heightPerStage / 2), width: currentWidth };
    });
  };

  const funnelPaths = generateFunnelPaths();
  const totalSvgHeight = funnelPaths.length * 45;

  const handleCepSearch = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8 && editingLead) {
      setLoadingCep(true);
      try {
        const response = await axios.get(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = response.data;
        if (!data.erro) {
          setEditingLead({ ...editingLead, zipCode: data.cep, address: data.logradouro, complement: data.complemento, neighborhood: data.bairro, city: data.localidade, state: data.uf });
          toast.success("Endereço preenchido!");
        } else toast.error("CEP não encontrado.");
      } catch { toast.error("Erro ao buscar CEP."); }
      finally { setLoadingCep(false); }
    }
  };

  const handleToggleTag = (tag: string) => {
    if (!editingLead) return;
    const currentTags = editingLead.tags || [];
    const newTags = currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag];
    setEditingLead({ ...editingLead, tags: newTags });
  };

  const handleUpdateLeadForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    
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
        source: editingLead.source || null,
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

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    const colors: Record<string, string> = {
      baixa: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      media: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      alta: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      urgente: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    const labels: Record<string, string> = { baixa: '🟢 Baixa', media: '🟡 Média', alta: '🟠 Alta', urgente: '🔴 Urgente' };
    return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${colors[priority] || ''}`}>{labels[priority] || priority}</span>;
  };

  const getStatusLabel = (status: DealStatus) => STAGES.find(s => s.id === status)?.label || status;

  return (
    <div className="h-full w-full overflow-y-auto p-6 md:p-10 space-y-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-slide-up">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMenu}>
                <Menu className="h-6 w-6" />
            </Button>
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    Dashboard Estratégico 
                    <span className="bg-primary/10 text-primary p-1.5 rounded-lg"><Sun className="h-5 w-5" /></span>
                </h1>
                <p className="text-muted-foreground text-sm mt-1 font-medium">Visão geral do desempenho do pipeline.</p>
            </div>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-card p-1.5 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center px-3 py-1.5 text-sm font-medium text-muted-foreground border-r border-border gap-2">
            <Calendar className="h-4 w-4" />
            <span>Filtro:</span>
          </div>
          <select 
                className="bg-transparent text-sm font-bold text-foreground focus:outline-none cursor-pointer pr-8 py-1.5"
                value={filter}
                onChange={(e) => setFilter(e.target.value as DateFilter)}
            >
                <option value="today">Hoje</option>
                <option value="yesterday">Ontem</option>
                <option value="7days">Últimos 7 dias</option>
                <option value="30days">Últimos 30 dias</option>
                <option value="all">Todo o período</option>
            </select>
          <Button size="sm" className="bg-primary text-white rounded-xl shadow-lg shadow-primary/20">
            <TrendingUp className="h-4 w-4 mr-2" /> Gerar Relatório
          </Button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total de Leads" value={totalLeads} icon={<Users className="h-6 w-6 text-white" />} color="bg-blue-500" trend="+8%" trendUp={true} delay={100} />
        <KPICard title="Volume Estimado" value={formatCurrency(totalValue)} icon={<DollarSign className="h-6 w-6 text-white" />} color="bg-emerald-500" trend="+12%" trendUp={true} delay={200} />
        <KPICard title="Taxa de Conversão" value={`${conversionRate.toFixed(1)}%`} icon={<TrendingUp className="h-6 w-6 text-white" />} color="bg-orange-500" trend="+1.2%" trendUp={true} delay={300} />
        <KPICard title="Vendas (Concluído)" value={closedLeads} icon={<CheckCircle className="h-6 w-6 text-white" />} color="bg-purple-500" trend="+3" trendUp={true} delay={400} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FUNNEL CHART */}
        <Card className="lg:col-span-2 p-8 shadow-lg border-border/50 animate-slide-up opacity-0 relative overflow-hidden" style={{ animationDelay: '500ms' }}>
          <div className="absolute top-0 right-0 p-6 opacity-5">
              <TrendingUp className="w-32 h-32" />
          </div>
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2">Funil de Vendas</h2>
                <p className="text-sm text-muted-foreground">Conversão por etapa do pipeline</p>
            </div>
            <Button variant="ghost" size="icon"><MoreHorizontal className="w-5 h-5 text-muted-foreground"/></Button>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center w-full gap-8">
            <div className="hidden md:flex flex-col justify-between h-[540px] text-right py-2">
                 {funnelPaths.map((stage) => (
                     <div key={stage.label} className="flex flex-col justify-center h-[45px]">
                         <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stage.label}</span>
                     </div>
                 ))}
            </div>

            <div className="relative w-full max-w-[400px]">
                <svg viewBox={`0 0 400 ${totalSvgHeight}`} className="w-full h-auto drop-shadow-2xl" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="rgba(0,0,0,0.15)"/>
                        </filter>
                    </defs>
                    {funnelPaths.map((stage) => (
                        <g key={stage.label} className="group transition-all duration-300 hover:opacity-90 cursor-pointer">
                            <path d={stage.path} fill={stage.color} className="transition-all duration-500 ease-in-out opacity-90 group-hover:opacity-100" style={{ filter: 'url(#shadow)' }} />
                            <text x="200" y={stage.yCenter} textAnchor="middle" dominantBaseline="middle" fill="white" className="text-xs font-bold drop-shadow-md pointer-events-none">{stage.count}</text>
                        </g>
                    ))}
                </svg>
            </div>

             <div className="hidden md:flex flex-col justify-between h-[540px] py-2 text-left">
                 {funnelPaths.map((stage, idx) => {
                     const prevCount = idx > 0 ? funnelPaths[idx-1].count : 0;
                     const conversion = idx > 0 && prevCount > 0 ? ((stage.count / prevCount) * 100).toFixed(0) : null;
                     return (
                        <div key={stage.label} className="flex flex-col justify-center h-[45px]">
                            {conversion && (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    <ArrowUpRight className="w-3 h-3" /> {conversion}%
                                </div>
                            )}
                        </div>
                     );
                 })}
            </div>
          </div>
        </Card>

        {/* TOP SOURCES / TAGS */}
        <div className="flex flex-col gap-6 animate-slide-up opacity-0" style={{ animationDelay: '600ms' }}>
            <Card className="p-6 shadow-lg border-border/50 flex-1">
                <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                    <h2 className="text-lg font-bold">Perfil dos Leads</h2>
                    <Filter className="h-4 w-4 opacity-30" />
                </div>
                <div className="space-y-6">
                    {['🔥 Quente', '💎 VIP', 'WhatsApp Lead', 'Indicação'].map((tag, idx) => {
                        const count = filteredLeads.filter(l => l.tags?.includes(tag)).length;
                        const percentage = (count / (totalLeads || 1)) * 100;
                        const colors = ['bg-red-500', 'bg-purple-500', 'bg-emerald-500', 'bg-blue-500'];
                        return (
                            <div key={tag} className="group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${colors[idx]}`} />
                                        <span className="text-sm font-medium">{tag}</span>
                                    </div>
                                    <span className="text-sm font-bold">{count}</span>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-1000 ease-out ${colors[idx]}`} style={{ width: `${percentage}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            <div className="p-6 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl border border-primary/20 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-xs font-black text-primary mb-2 uppercase tracking-wider">
                        <TrendingUp className="h-4 w-4" /> Insight IA
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                        Você tem <strong>{funnelData[0].count}</strong> novos leads no topo do funil. A taxa de conversão global está em <strong>{conversionRate.toFixed(1)}%</strong>. Focar na etapa de "Diagnóstico" pode aumentar o fechamento.
                    </p>
                </div>
                <div className="absolute -bottom-4 -right-4 bg-primary/10 w-24 h-24 rounded-full blur-2xl"></div>
            </div>
        </div>
      </div>

      {/* LEADS LIST */}
      <Card className="p-6 shadow-lg border-border/50 animate-slide-up opacity-0" style={{ animationDelay: '700ms' }}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Leads Recentes</h2>
            <p className="text-sm text-muted-foreground">Clique em um lead para abrir a ficha completa</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10 bg-muted/20 border-border h-9 text-sm" placeholder="Buscar por nome, fone ou empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Nenhum lead encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Cliente</th>
                  <th className="pb-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground hidden md:table-cell">Empresa</th>
                  <th className="pb-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Telefone</th>
                  <th className="pb-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Etapa</th>
                  <th className="pb-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground hidden md:table-cell">Prioridade</th>
                  <th className="pb-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Valor</th>
                  <th className="pb-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.slice(0, 20).map((lead) => (
                  <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer group" onClick={() => setEditingLead(lead)}>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={lead.avatarUrl} alt={lead.title} fallback={lead.title} className="h-8 w-8" />
                        <div>
                          <p className="font-bold text-foreground text-xs">{lead.title}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(lead.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 hidden md:table-cell text-xs text-muted-foreground">{lead.company || '—'}</td>
                    <td className="py-3 hidden lg:table-cell text-xs font-mono text-muted-foreground">{lead.phone || '—'}</td>
                    <td className="py-3">
                      <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-muted text-foreground">{getStatusLabel(lead.status)}</span>
                    </td>
                    <td className="py-3 hidden md:table-cell">{getPriorityBadge(lead.priority)}</td>
                    <td className="py-3 hidden lg:table-cell text-xs font-bold text-primary">{formatCurrency(lead.value || 0)}</td>
                    <td className="py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="h-4 w-4 text-primary" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLeads.length > 20 && (
              <p className="text-center text-xs text-muted-foreground mt-4">Mostrando 20 de {filteredLeads.length} leads</p>
            )}
          </div>
        )}
      </Card>

      {/* LEAD DETAIL MODAL */}
      {editingLead && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingLead(null)} />
          <div className="bg-white dark:bg-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative animate-zoom-in flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
              <div className="flex items-center gap-2 font-bold text-lg">
                <User className="w-5 h-5 text-primary" /> Ficha do Lead
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setEditingLead(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handleUpdateLeadForm} className="p-6 overflow-y-auto space-y-6">
              
              {/* Dados do Cliente */}
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
                    <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium" value={editingLead.clientType || ''} onChange={e => setEditingLead({...editingLead, clientType: e.target.value})}>
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
                    <label className="text-[11px] font-semibold text-muted-foreground">Telefone / WhatsApp</label>
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
                      <Input value={editingLead.zipCode || ''} onChange={e => { setEditingLead({...editingLead, zipCode: e.target.value}); handleCepSearch(e.target.value); }} className="h-10" placeholder="00000-000" />
                      {loadingCep && <Loader2 className="absolute right-2 top-2.5 w-5 h-5 animate-spin text-primary" />}
                    </div>
                  </div>
                  <div className="space-y-1.5 md:col-span-3">
                    <label className="text-[11px] font-semibold text-muted-foreground">Logradouro</label>
                    <Input value={editingLead.address || ''} onChange={e => setEditingLead({...editingLead, address: e.target.value})} className="h-10" />
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
                  <Tag className="w-3 h-3" /> Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TAGS.map(tag => {
                    const selected = editingLead.tags?.includes(tag);
                    return (
                      <button key={tag} type="button" onClick={() => handleToggleTag(tag)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${selected ? `${getTagColor(tag)} ring-2 ring-primary ring-offset-1` : 'bg-muted/30 text-muted-foreground border-transparent hover:border-muted-foreground/40'}`}>
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Qualificação & Comercial */}
              <div className="border-t border-border pt-4">
                <label className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-1.5 mb-3">
                  <DollarSign className="w-3 h-3" /> Qualificação & Comercial
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground">Origem do Lead</label>
                    <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium" value={editingLead.source || ''} onChange={e => setEditingLead({...editingLead, source: e.target.value})}>
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
                    <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium" value={editingLead.status} onChange={e => setEditingLead({...editingLead, status: e.target.value as DealStatus})}>
                      {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground">Prioridade</label>
                    <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium" value={editingLead.priority || ''} onChange={e => setEditingLead({...editingLead, priority: e.target.value})}>
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
                    <Input type="number" value={editingLead.value || ''} onChange={e => setEditingLead({...editingLead, value: Number(e.target.value)})} className="h-10 text-lg font-bold text-primary" placeholder="0,00" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground">Orçamento Disponível (R$)</label>
                    <Input type="number" value={editingLead.averageBillValue || ''} onChange={e => setEditingLead({...editingLead, averageBillValue: Number(e.target.value)})} className="h-10" placeholder="0,00" />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="border-t border-border pt-4">
                <label className="text-[11px] font-semibold text-muted-foreground">Observações Gerais</label>
                <textarea className="w-full min-h-[100px] mt-1.5 p-3 rounded-lg border border-input bg-muted/10 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Anotações sobre reuniões, perfil técnico..." value={editingLead.notes || ''} onChange={e => setEditingLead({...editingLead, notes: e.target.value})} />
              </div>

              {/* Timestamps */}
              <div className="flex items-center gap-6 text-[10px] text-muted-foreground pt-2">
                <span>Criado em: {new Date(editingLead.date).toLocaleDateString('pt-BR')}</span>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-card pb-2">
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

const KPICard = ({ title, value, icon, color, trend, trendUp, delay = 0 }: any) => (
  <Card 
    className="p-6 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all duration-300 border-none bg-white dark:bg-card animate-slide-up opacity-0 group relative overflow-hidden"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10 transition-transform group-hover:scale-110 ${color}`} />
    <div className="flex items-start justify-between mb-4 relative z-10">
      <div className={`p-3 rounded-2xl shadow-lg ${color}`}>{icon}</div>
      <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700'}`}>
        {trendUp ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
        {trend}
      </div>
    </div>
    <div className="relative z-10">
      <h3 className="text-3xl font-black tracking-tight text-foreground">{value}</h3>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{title}</p>
    </div>
  </Card>
);

export default Dashboard;
