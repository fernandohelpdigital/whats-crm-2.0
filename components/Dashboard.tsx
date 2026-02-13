
import React, { useState, useMemo } from 'react';
import { Deal, DealStatus } from '../types';
import { Card, Button } from './ui/Shared';
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
  MoreHorizontal
} from 'lucide-react';

interface DashboardProps {
  leads: Deal[];
  onOpenMenu: () => void;
}

type DateFilter = 'today' | 'yesterday' | '7days' | '30days' | 'all';

// Mapeamento de cores para SVG (Tailwind classes para fill)
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

const Dashboard: React.FC<DashboardProps> = ({ leads, onOpenMenu }) => {
  const [filter, setFilter] = useState<DateFilter>('all');

  // Lógica de Filtro de Data
  const filteredLeads = useMemo(() => {
    const now = new Date();
    return leads.filter(lead => {
      const date = new Date(lead.date);
      if (filter === 'all') return true;
      if (filter === 'today') return date.toDateString() === now.toDateString();
      if (filter === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return date.toDateString() === yesterday.toDateString();
      }
      if (filter === '7days') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return date >= weekAgo;
      }
      if (filter === '30days') {
        const monthAgo = new Date(now);
        monthAgo.setDate(now.getDate() - 30);
        return date >= monthAgo;
      }
      return true;
    });
  }, [leads, filter]);

  // KPIs
  const totalLeads = filteredLeads.length;
  const closedLeads = filteredLeads.filter(l => l.status === 'fechado_aprovado').length;
  const conversionRate = totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0;
  const totalValue = filteredLeads.reduce((acc, curr) => acc + (curr.averageBillValue || curr.value || 0), 0);

  // Dados para o Funil
  const funnelData = STAGES.map(stage => ({
    ...stage,
    count: filteredLeads.filter(l => l.status === stage.id).length
  }));

  const maxCount = Math.max(...funnelData.map(d => d.count), 1);

  const generateFunnelPaths = () => {
    const heightPerStage = 45; 
    const totalHeight = heightPerStage * funnelData.length;
    const centerX = 200; 
    const maxWidth = 360; 

    return funnelData.map((stage, i) => {
      const currentMetric = stage.count;
      const minVisualWidth = 40; 
      
      const currentWidth = ((currentMetric / maxCount) * maxWidth) || minVisualWidth;
      const nextStageCount = i < funnelData.length - 1 ? funnelData[i+1].count : (currentMetric * 0.5);
      const nextWidth = ((nextStageCount / maxCount) * maxWidth) || minVisualWidth;

      const yTop = i * heightPerStage;
      const yBottom = (i + 1) * heightPerStage - 4; // Espaçamento entre camadas

      const xTopLeft = centerX - (currentWidth / 2);
      const xTopRight = centerX + (currentWidth / 2);
      
      const xBottomLeft = centerX - (nextWidth / 2);
      const xBottomRight = centerX + (nextWidth / 2);

      const path = `
        M ${xTopLeft},${yTop} 
        L ${xTopRight},${yTop}
        L ${xBottomRight},${yBottom}
        L ${xBottomLeft},${yBottom}
        Z
      `;

      return {
        path,
        color: stage.hex,
        count: stage.count,
        label: stage.label,
        yCenter: yTop + (heightPerStage / 2),
        width: currentWidth
      };
    });
  };

  const funnelPaths = generateFunnelPaths();
  const totalSvgHeight = funnelPaths.length * 45;

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
                <p className="text-muted-foreground text-sm mt-1 font-medium">Visão geral do desempenho do pipeline solar.</p>
            </div>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-[#202c33] p-1.5 rounded-2xl shadow-sm border border-border">
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
        <KPICard 
            title="Total de Leads" 
            value={totalLeads} 
            icon={<Users className="h-6 w-6 text-white" />} 
            color="bg-blue-500"
            trend="+8%"
            trendUp={true}
            delay={100}
        />
        <KPICard 
            title="Volume Estimado" 
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalValue)} 
            icon={<DollarSign className="h-6 w-6 text-white" />} 
            color="bg-emerald-500"
            trend="+12%"
            trendUp={true}
            delay={200}
        />
        <KPICard 
            title="Taxa de Conversão" 
            value={`${conversionRate.toFixed(1)}%`} 
            icon={<TrendingUp className="h-6 w-6 text-white" />} 
            color="bg-orange-500"
            trend="+1.2%"
            trendUp={true}
            delay={300}
        />
        <KPICard 
            title="Vendas (Concluído)" 
            value={closedLeads} 
            icon={<CheckCircle className="h-6 w-6 text-white" />} 
            color="bg-purple-500"
            trend="+3"
            trendUp={true}
            delay={400}
        />
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
            
            {/* Labels Laterais */}
            <div className="hidden md:flex flex-col justify-between h-[540px] text-right py-2">
                 {funnelPaths.map((stage) => (
                     <div key={stage.label} className="flex flex-col justify-center h-[45px]">
                         <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stage.label}</span>
                     </div>
                 ))}
            </div>

            {/* SVG Funnel */}
            <div className="relative w-full max-w-[400px]">
                <svg 
                    viewBox={`0 0 400 ${totalSvgHeight}`} 
                    className="w-full h-auto drop-shadow-2xl"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <defs>
                        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="rgba(0,0,0,0.15)"/>
                        </filter>
                    </defs>
                    
                    {funnelPaths.map((stage, idx) => (
                        <g key={stage.label} className="group transition-all duration-300 hover:opacity-90 cursor-pointer">
                            <path 
                                d={stage.path} 
                                fill={stage.color}
                                className="transition-all duration-500 ease-in-out opacity-90 group-hover:opacity-100"
                                style={{ filter: 'url(#shadow)' }}
                            />
                            <text 
                                x="200" 
                                y={stage.yCenter} 
                                textAnchor="middle" 
                                dominantBaseline="middle" 
                                fill="white" 
                                className="text-xs font-bold drop-shadow-md pointer-events-none"
                            >
                                {stage.count}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>

             {/* Conversão por etapa */}
             <div className="hidden md:flex flex-col justify-between h-[540px] py-2 text-left">
                 {funnelPaths.map((stage, idx) => {
                     const prevCount = idx > 0 ? funnelPaths[idx-1].count : 0;
                     const conversion = idx > 0 && prevCount > 0 
                        ? ((stage.count / prevCount) * 100).toFixed(0) 
                        : null;
                     
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
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${colors[idx]}`} 
                                        style={{ width: `${percentage}%` }} 
                                    />
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
    </div>
  );
};

const KPICard = ({ title, value, icon, color, trend, trendUp, delay = 0 }: any) => (
  <Card 
    className="p-6 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all duration-300 border-none bg-white dark:bg-[#1e293b] animate-slide-up opacity-0 group relative overflow-hidden"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10 transition-transform group-hover:scale-110 ${color}`} />
    
    <div className="flex items-start justify-between mb-4 relative z-10">
      <div className={`p-3 rounded-2xl shadow-lg ${color}`}>
          {icon}
      </div>
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
