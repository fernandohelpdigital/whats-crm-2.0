
import React, { useState, useEffect, useCallback } from 'react';
import { AuthConfig, Instance, FeatureFlags } from '../types';
import { Button, Input, Avatar } from './ui/Shared';
import { Shield, Search, RefreshCw, Smartphone, LayoutDashboard, Kanban, Zap, CalendarClock, Save, Palette, Type, Plus, X, Loader2, MessageSquare, Users, Hash, AlertCircle, CheckCircle2 } from 'lucide-react';
import UserManagementPanel from './UserManagementPanel';
import { fetchAllInstances, createInstance } from '../services/evolutionClient';
import toast from 'react-hot-toast';
import { useBranding } from '../index';
import { supabase } from '@/src/integrations/supabase/client';

interface AdminPageProps {
  config: AuthConfig;
}

const DEFAULT_FLAGS: FeatureFlags = {
    dashboard: true,
    kanban: true,
    proposals: true,
    followup: true,
    chat: true
};

const AdminPage: React.FC<AdminPageProps> = ({ config }) => {
  const { branding, updateBranding, resetBranding } = useBranding();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [featureFlagsMap, setFeatureFlagsMap] = useState<Record<string, FeatureFlags & { id?: string }>>({});
  
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'close' | 'connecting'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newInstanceToken, setNewInstanceToken] = useState('');
  const [creating, setCreating] = useState(false);
  const [brandForm, setBrandForm] = useState(branding);

  useEffect(() => {
      setBrandForm(branding);
  }, [branding]);

  const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const apiInstances = await fetchAllInstances(config);
            setInstances(apiInstances);

            // Load feature flags from Supabase
            const { data: flagsData } = await supabase
              .from('instance_feature_flags')
              .select('*');
            
            const flagsMap: Record<string, FeatureFlags & { id?: string }> = {};
            (flagsData || []).forEach(f => {
              flagsMap[f.instance_name] = {
                id: f.id,
                dashboard: f.dashboard ?? true,
                kanban: f.kanban ?? true,
                proposals: f.proposals ?? true,
                followup: f.followup ?? true,
                chat: f.chat ?? true,
              };
            });
            
            // Ensure all instances have flags
            apiInstances.forEach(inst => {
                const name = inst.name || (inst as any).instanceName;
                if (name && !flagsMap[name]) {
                    flagsMap[name] = { ...DEFAULT_FLAGS };
                }
            });

            setFeatureFlagsMap(flagsMap);

            // Load branding from Supabase
            const { data: brandingData } = await supabase
              .from('system_branding')
              .select('*')
              .limit(1)
              .single();
            
            if (brandingData) {
              setBrandForm({
                systemName: brandingData.system_name,
                primaryColor: brandingData.primary_color,
              });
            }
        } catch (error: any) {
            console.error("Admin Load Error:", error);
            toast.error("Erro ao sincronizar dados.");
        } finally {
            setLoading(false);
        }
  }, [config]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveConfig = async () => {
      try {
        // Save feature flags to Supabase
        for (const [instanceName, flags] of Object.entries(featureFlagsMap)) {
          const { id, ...flagValues } = flags;
          if (id) {
            await supabase.from('instance_feature_flags').update(flagValues).eq('id', id);
          } else {
            const { data } = await supabase.from('instance_feature_flags')
              .insert({ instance_name: instanceName, ...flagValues })
              .select()
              .single();
            if (data) {
              setFeatureFlagsMap(prev => ({
                ...prev,
                [instanceName]: { ...flagValues, id: data.id }
              }));
            }
          }
        }

        // Save branding to Supabase
        const { data: existing } = await supabase.from('system_branding').select('id').limit(1).single();
        if (existing) {
          await supabase.from('system_branding').update({
            system_name: brandForm.systemName,
            primary_color: brandForm.primaryColor,
          }).eq('id', existing.id);
        } else {
          await supabase.from('system_branding').insert({
            system_name: brandForm.systemName,
            primary_color: brandForm.primaryColor,
          });
        }

        updateBranding(brandForm);
        toast.success("Configurações salvas com sucesso!");
      } catch (e: any) {
        toast.error("Erro ao salvar: " + e.message);
      }
  };

  const handleCreateInstance = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newInstanceName.trim()) {
          toast.error("Nome é obrigatório.");
          return;
      }
      setCreating(true);
      try {
          await createInstance(config, newInstanceName, newInstanceToken);
          toast.success(`Instância '${newInstanceName}' criada!`);
          setIsCreateModalOpen(false);
          setNewInstanceName('');
          setNewInstanceToken('');
          loadData();
      } catch (error: any) {
          toast.error("Erro ao criar: " + (error.response?.data?.message || error.message));
      } finally {
          setCreating(false);
      }
  };

  const toggleFeature = (instanceName: string, feature: keyof FeatureFlags) => {
      setFeatureFlagsMap(prev => {
          const currentFlags = prev[instanceName] || { ...DEFAULT_FLAGS };
          return {
              ...prev,
              [instanceName]: {
                  ...currentFlags,
                  [feature]: !currentFlags[feature]
              }
          };
      });
  };

  const filteredInstances = instances.filter(inst => {
      const name = inst.name || (inst as any).instanceName || '';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inst.connectionStatus === statusFilter;
      return matchesSearch && matchesStatus;
  });

  return (
    <div className="h-full flex flex-col bg-[#f0f2f5] dark:bg-[#0b141a] p-4 md:p-8 overflow-y-auto animate-fade-in relative">
      
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-slide-up">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
                <Shield className="text-primary h-8 w-8" />
            </div>
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-[#111b21] dark:text-[#e9edef] tracking-tight">
                    Painel Central Global
                </h1>
                <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase bg-muted/50 px-2 py-0.5 rounded border border-border/50 shadow-sm">
                        <Smartphone className="w-3 h-3" /> {instances.length} Instâncias
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-green-600 uppercase bg-green-100/50 px-2 py-0.5 rounded border border-green-200/50">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> {instances.filter(i => i.connectionStatus === 'open').length} Conectadas
                    </span>
                </div>
            </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Button onClick={() => setIsCreateModalOpen(true)} className="flex-1 md:flex-none bg-[#00a884] hover:bg-[#008f6f] text-white gap-2 h-11 px-6 font-bold shadow-lg shadow-green-500/10">
                <Plus className="w-5 h-5" /> Nova Instância
            </Button>
            <Button onClick={handleSaveConfig} className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white font-bold h-11 px-6 shadow-lg shadow-primary/20 gap-2">
                <Save className="w-5 h-5" /> Salvar Alterações
            </Button>
        </div>
      </div>

      <div className="space-y-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
        
        {/* White Label Branding Section */}
        <div className="bg-white dark:bg-[#202c33] rounded-[2rem] shadow-sm border border-border p-6 md:p-8">
            <h2 className="text-lg font-black text-[#111b21] dark:text-[#e9edef] mb-8 flex items-center gap-2 uppercase tracking-widest text-primary">
                <Palette className="w-5 h-5" /> Branding & White-Label
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                        <Type className="w-4 h-4" /> Nome Institucional do Sistema
                    </label>
                    <Input 
                        value={brandForm.systemName}
                        onChange={(e) => setBrandForm(prev => ({ ...prev, systemName: e.target.value }))}
                        className="h-14 bg-muted/20 border-border focus:ring-primary/20 text-lg font-bold"
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                        <Palette className="w-4 h-4" /> Cor Mestra (Primária)
                    </label>
                    <div className="flex items-center gap-4">
                        <div className="relative w-14 h-14 rounded-2xl border-4 border-white dark:border-gray-800 overflow-hidden shadow-xl ring-1 ring-border">
                            <input 
                                type="color" 
                                value={brandForm.primaryColor}
                                onChange={(e) => setBrandForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                                className="absolute -inset-2 w-20 h-20 cursor-pointer border-0 p-0"
                            />
                        </div>
                        <div className="flex-1">
                            <Input 
                                value={brandForm.primaryColor}
                                onChange={(e) => setBrandForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                                className="h-14 font-mono uppercase tracking-widest text-center text-lg"
                                maxLength={7}
                            />
                        </div>
                        <Button variant="ghost" size="sm" onClick={resetBranding} className="h-14 px-4 text-xs font-black text-primary hover:bg-primary/5 uppercase">
                            Reset
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        {/* User Management */}
        <UserManagementPanel />

        {/* Instâncias */}
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-black text-[#111b21] dark:text-[#e9edef] flex items-center gap-2 uppercase tracking-tighter">
                    <Smartphone className="w-6 h-6 text-primary" /> Inventário Global ({instances.length})
                </h2>
                
                <div className="flex items-center gap-2 bg-white dark:bg-[#202c33] p-1.5 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 px-3 border-r border-border">
                        <Search className="w-5 h-5 text-muted-foreground" />
                        <input 
                            placeholder="Pesquisar instância..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent text-sm font-medium focus:outline-none w-40 md:w-60"
                        />
                    </div>
                    <select 
                        className="bg-transparent text-xs font-black text-primary px-4 focus:outline-none cursor-pointer uppercase"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                        <option value="all">Filtrar: Todos</option>
                        <option value="open">Ativos</option>
                        <option value="close">Inativos</option>
                        <option value="connecting">Aguardando</option>
                    </select>
                    <Button onClick={loadData} variant="ghost" size="icon" className="rounded-xl h-9 w-9 text-muted-foreground hover:text-primary">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#202c33] rounded-[2.5rem] shadow-2xl border border-border overflow-hidden">
                {loading ? (
                    <div className="p-32 flex flex-col items-center justify-center gap-6">
                        <Loader2 className="w-16 h-16 text-primary animate-spin" />
                        <span className="text-lg font-black text-foreground uppercase tracking-widest">Sincronizando...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="text-[10px] text-[#54656f] dark:text-[#8696a0] uppercase font-black bg-gray-50/50 dark:bg-black/40 border-b border-border">
                                <tr>
                                    <th className="px-8 py-6 tracking-widest">Identificação</th>
                                    <th className="px-6 py-6 tracking-widest text-center">Volume</th>
                                    <th className="px-6 py-6 tracking-widest text-center">Status</th>
                                    <th className="px-8 py-6 tracking-widest text-center">Permissões</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {filteredInstances.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center font-bold text-muted-foreground/50 text-lg uppercase italic">
                                            Nenhuma unidade localizada.
                                        </td>
                                    </tr>
                                ) : filteredInstances.map((inst) => {
                                    const name = inst.name || (inst as any).instanceName;
                                    const isConnected = inst.connectionStatus === 'open';
                                    const isConnecting = inst.connectionStatus === 'connecting';
                                    const flags = featureFlagsMap[name] || { ...DEFAULT_FLAGS };
                                    const stats = inst._count || { Message: 0, Contact: 0, Chat: 0 };

                                    return (
                                        <tr key={name} className="hover:bg-primary/[0.02] transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-5">
                                                    <Avatar src={inst.profilePicUrl} alt={name} fallback={name} className="h-14 w-14 shadow-lg border-2 border-white dark:border-gray-800" />
                                                    <div className="min-w-0">
                                                        <div className="font-black text-[#111b21] dark:text-[#e9edef] text-lg tracking-tight truncate leading-none">{name}</div>
                                                        <div className="text-[11px] text-primary font-bold opacity-70 mt-1 truncate uppercase tracking-tighter">
                                                            {inst.ownerJid || 'AGUARDANDO SYNC'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center justify-center gap-4">
                                                    <StatItem icon={<MessageSquare className="w-3.5 h-3.5"/>} value={stats.Message} label="Msgs" />
                                                    <StatItem icon={<Users className="w-3.5 h-3.5"/>} value={stats.Contact} label="Leads" />
                                                    <StatItem icon={<Hash className="w-3.5 h-3.5"/>} value={stats.Chat} label="Chats" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                    isConnected ? 'bg-green-100 text-green-700' : 
                                                    isConnecting ? 'bg-amber-100 text-amber-700' : 
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : isConnecting ? 'bg-amber-500 animate-bounce' : 'bg-red-500'}`} />
                                                    {isConnected ? 'Ativa' : isConnecting ? 'Sinc' : 'Inativa'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center justify-center gap-2">
                                                    <ModuleToggle active={flags.dashboard} icon={<LayoutDashboard className="w-4 h-4" />} label="Dash" onClick={() => toggleFeature(name, 'dashboard')} />
                                                    <ModuleToggle active={flags.chat} icon={<MessageSquare className="w-4 h-4" />} label="Chat" onClick={() => toggleFeature(name, 'chat')} />
                                                    <ModuleToggle active={flags.kanban} icon={<Kanban className="w-4 h-4" />} label="Kanban" onClick={() => toggleFeature(name, 'kanban')} />
                                                    <ModuleToggle active={flags.proposals} icon={<Zap className="w-4 h-4" />} label="Vendas" onClick={() => toggleFeature(name, 'proposals')} />
                                                    <ModuleToggle active={flags.followup} icon={<CalendarClock className="w-4 h-4" />} label="Follow" onClick={() => toggleFeature(name, 'followup')} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* MODAL CRIAR INSTÂNCIA */}
      {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
              <div className="bg-white dark:bg-[#202c33] rounded-[2.5rem] w-full max-w-md shadow-2xl p-10 border border-white/10 animate-zoom-in">
                  <div className="flex justify-between items-center mb-10">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <Plus className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-[#111b21] dark:text-white">Nova Unidade</h2>
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsCreateModalOpen(false)}>
                          <X className="w-6 h-6" />
                      </Button>
                  </div>
                  
                  <form onSubmit={handleCreateInstance} className="space-y-8">
                      <div className="space-y-6">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Identificador da Instância</label>
                              <Input 
                                  value={newInstanceName}
                                  onChange={(e) => setNewInstanceName(e.target.value)}
                                  placeholder="Ex: Comercial_Agente_01"
                                  className="h-14 text-xl font-bold border-border bg-muted/20 focus:ring-primary/20"
                              />
                          </div>
                      </div>

                      <div className="flex flex-col gap-3 pt-4">
                          <Button type="submit" disabled={creating} className="bg-primary text-white h-16 text-xl font-black uppercase tracking-widest shadow-2xl shadow-primary/30">
                              {creating ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Criar Instância'}
                          </Button>
                          <Button type="button" variant="ghost" className="h-14 font-bold uppercase text-xs opacity-50" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

const StatItem = ({ icon, value, label }: any) => (
    <div className="flex flex-col items-center min-w-[60px]">
        <div className="flex items-center gap-1.5 text-xs font-black text-foreground mb-0.5">
            <span className="text-primary">{icon}</span>
            {Number(value || 0).toLocaleString()}
        </div>
        <span className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-tighter leading-none">{label}</span>
    </div>
);

const ModuleToggle = ({ active, icon, label, onClick }: any) => (
    <button
        onClick={onClick}
        title={label}
        className={`
            flex flex-col items-center justify-center gap-1 w-15 h-15 p-2 rounded-xl border-2 transition-all duration-300
            ${active 
                ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/5' 
                : 'bg-muted/10 border-transparent text-muted-foreground opacity-20 grayscale'
            }
        `}
    >
        {icon}
        <span className="text-[7px] font-black uppercase tracking-widest leading-none text-center">{label}</span>
    </button>
);

export default AdminPage;
