import React, { useState, useEffect } from 'react';
import { Button, Input } from './ui/Shared';
import { Users, ShieldCheck, ShieldOff, Loader2, RefreshCw, Search, Link2, Key, ChevronDown, ChevronUp, Save, LayoutDashboard, MessageSquare, Kanban, Zap, CalendarClock, Trash2 } from 'lucide-react';
import { Instance, FeatureFlags } from '../types';
import { supabase } from '@/src/integrations/supabase/client';
import toast from 'react-hot-toast';

interface ManagedUser {
  id: string;
  email: string;
  display_name: string;
  instance_name: string | null;
  base_url: string | null;
  roles: string[];
  created_at: string;
  last_sign_in_at: string | null;
}

interface UserManagementPanelProps {
  instances: Instance[];
  adminBaseUrl: string;
}

const DEFAULT_FLAGS: FeatureFlags = {
  dashboard: true,
  kanban: true,
  proposals: true,
  followup: true,
  chat: true,
};

const UserManagementPanel: React.FC<UserManagementPanelProps> = ({ instances, adminBaseUrl }) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [assigningUser, setAssigningUser] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [userFlagsMap, setUserFlagsMap] = useState<Record<string, FeatureFlags & { id?: string }>>({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await supabase.functions.invoke('manage-user-roles', {
        body: { action: 'list' },
      });
      if (res.error) throw res.error;
      const usersData = res.data || [];
      setUsers(usersData);

      // Load user feature flags
      const { data: flagsData } = await supabase.functions.invoke('manage-user-roles', {
        body: { action: 'list_user_flags' },
      });
      
      const fMap: Record<string, FeatureFlags & { id?: string }> = {};
      if (flagsData && Array.isArray(flagsData)) {
        flagsData.forEach((f: any) => {
          fMap[f.user_id] = {
            id: f.id,
            dashboard: f.dashboard ?? true,
            kanban: f.kanban ?? true,
            proposals: f.proposals ?? true,
            followup: f.followup ?? true,
            chat: f.chat ?? true,
          };
        });
      }
      // Ensure all users have flags entry
      usersData.forEach((u: ManagedUser) => {
        if (!fMap[u.id]) {
          fMap[u.id] = { ...DEFAULT_FLAGS };
        }
      });
      setUserFlagsMap(fMap);
    } catch (e: any) {
      toast.error('Erro ao carregar usuários: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId: string, action: 'promote' | 'demote') => {
    setActionLoading(userId);
    try {
      const res = await supabase.functions.invoke('manage-user-roles', {
        body: { action, user_id: userId },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(action === 'promote' ? 'Usuário promovido a admin!' : 'Admin removido com sucesso!');
      await fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao alterar role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignInstance = async (userId: string, instanceName: string | null) => {
    setActionLoading(userId);
    try {
      const res = await supabase.functions.invoke('manage-user-roles', {
        body: {
          action: 'assign_instance',
          user_id: userId,
          instance_name: instanceName,
          base_url: adminBaseUrl,
        },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(instanceName ? `Instância "${instanceName}" associada!` : 'Instância removida!');
      setAssigningUser(null);
      await fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao associar instância');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveApiKey = async (userId: string) => {
    const apiKey = apiKeyInputs[userId];
    if (apiKey === undefined || apiKey.trim() === '') {
      toast.error('Informe a API Key');
      return;
    }
    setActionLoading(userId);
    try {
      const res = await supabase.functions.invoke('manage-user-roles', {
        body: {
          action: 'assign_instance',
          user_id: userId,
          api_key: apiKey.trim(),
        },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      toast.success('API Key salva com sucesso!');
      setExpandedUser(null);
      setApiKeyInputs(prev => ({ ...prev, [userId]: '' }));
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar API Key');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${email}"? Esta ação é irreversível.`)) return;
    setActionLoading(userId);
    try {
      const res = await supabase.functions.invoke('manage-user-roles', {
        body: { action: 'delete_user', user_id: userId },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      toast.success('Usuário excluído com sucesso!');
      await fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao excluir usuário');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUserFeature = (userId: string, feature: keyof FeatureFlags) => {
    setUserFlagsMap(prev => {
      const current = prev[userId] || { ...DEFAULT_FLAGS };
      return { ...prev, [userId]: { ...current, [feature]: !current[feature] } };
    });
  };

  const handleSaveUserFlags = async (userId: string) => {
    setActionLoading(userId);
    try {
      const flags = userFlagsMap[userId];
      if (!flags) return;
      const { id, ...flagValues } = flags;

      const res = await supabase.functions.invoke('manage-user-roles', {
        body: {
          action: 'save_user_flags',
          user_id: userId,
          flags: flagValues,
        },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      
      if (res.data?.id) {
        setUserFlagsMap(prev => ({
          ...prev,
          [userId]: { ...flagValues, id: res.data.id },
        }));
      }
      toast.success('Permissões salvas!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar permissões');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = users.filter(u =>
    u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.instance_name?.toLowerCase().includes(search.toLowerCase())
  );

  const instanceNames = instances.map(i => i.name || (i as any).instanceName).filter(Boolean);

  return (
    <div className="bg-white dark:bg-[#202c33] rounded-[2rem] shadow-sm border border-border p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-black text-foreground flex items-center gap-2 uppercase tracking-widest text-primary">
          <Users className="w-5 h-5" /> Gestão de Usuários ({users.length})
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-muted/30 px-3 py-2 rounded-xl border border-border">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-sm focus:outline-none w-40"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={fetchUsers} className="rounded-xl">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="text-[10px] text-muted-foreground uppercase font-black bg-muted/20 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left tracking-widest">Usuário</th>
                <th className="px-4 py-3 text-left tracking-widest">Instância</th>
                <th className="px-4 py-3 text-center tracking-widest">Role</th>
                <th className="px-4 py-3 text-center tracking-widest">Módulos</th>
                <th className="px-4 py-3 text-center tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map(u => {
                const isAdmin = u.roles.includes('admin');
                const isAssigning = assigningUser === u.id;
                const isExpanded = expandedUser === u.id;
                const flags = userFlagsMap[u.id] || { ...DEFAULT_FLAGS };
                return (
                  <React.Fragment key={u.id}>
                    <tr className="hover:bg-primary/[0.02] transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-bold text-foreground">{u.display_name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-4">
                        {isAssigning ? (
                          <div className="flex flex-col gap-1">
                            <select
                              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              defaultValue={u.instance_name || ''}
                              onChange={e => handleAssignInstance(u.id, e.target.value || null)}
                            >
                              <option value="">— Nenhuma —</option>
                              {instanceNames.map(name => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => setAssigningUser(null)}
                              className="text-[10px] text-muted-foreground hover:text-foreground"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono ${u.instance_name ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                              {u.instance_name || '— Sem instância —'}
                            </span>
                            <button
                              onClick={() => setAssigningUser(u.id)}
                              className="text-primary hover:text-primary/80 transition-colors"
                              title="Associar instância"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          isAdmin
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted/30 text-muted-foreground'
                        }`}>
                          {isAdmin ? <ShieldCheck className="w-3 h-3" /> : null}
                          {isAdmin ? 'Admin' : 'Usuário'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <ModuleToggle active={flags.dashboard} icon={<LayoutDashboard className="w-3.5 h-3.5" />} label="Dash" onClick={() => toggleUserFeature(u.id, 'dashboard')} />
                          <ModuleToggle active={flags.chat} icon={<MessageSquare className="w-3.5 h-3.5" />} label="Chat" onClick={() => toggleUserFeature(u.id, 'chat')} />
                          <ModuleToggle active={flags.kanban} icon={<Kanban className="w-3.5 h-3.5" />} label="Kanban" onClick={() => toggleUserFeature(u.id, 'kanban')} />
                          <ModuleToggle active={flags.proposals} icon={<Zap className="w-3.5 h-3.5" />} label="Vendas" onClick={() => toggleUserFeature(u.id, 'proposals')} />
                          <ModuleToggle active={flags.followup} icon={<CalendarClock className="w-3.5 h-3.5" />} label="Follow" onClick={() => toggleUserFeature(u.id, 'followup')} />
                          <button
                            onClick={() => handleSaveUserFlags(u.id)}
                            disabled={actionLoading === u.id}
                            className="ml-1 p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            title="Salvar permissões"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {actionLoading === u.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          ) : (
                            <>
                              {isAdmin ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRoleChange(u.id, 'demote')}
                                  className="text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                                >
                                  <ShieldOff className="w-3 h-3" /> Remover
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRoleChange(u.id, 'promote')}
                                  className="text-xs gap-1 text-primary border-primary/30 hover:bg-primary/5"
                                >
                                  <ShieldCheck className="w-3 h-3" /> Admin
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                                className="text-xs gap-1 border-border"
                                title="Configurar API Key"
                              >
                                <Key className="w-3 h-3" />
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                className="text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                                title="Excluir usuário"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 bg-muted/10">
                          <div className="flex items-center gap-3 max-w-lg">
                            <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                            <Input
                              type="password"
                              placeholder="Cole a API Key da Evolution API"
                              value={apiKeyInputs[u.id] || ''}
                              onChange={e => setApiKeyInputs(prev => ({ ...prev, [u.id]: e.target.value }))}
                              className="h-9 font-mono text-xs flex-1"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSaveApiKey(u.id)}
                              disabled={actionLoading === u.id}
                              className="bg-primary text-white gap-1 text-xs shrink-0"
                            >
                              <Save className="w-3 h-3" /> Salvar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground italic">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const ModuleToggle = ({ active, icon, label, onClick }: any) => (
  <button
    onClick={onClick}
    title={label}
    className={`
      flex flex-col items-center justify-center gap-0.5 w-11 h-11 p-1 rounded-lg border transition-all duration-200
      ${active
        ? 'bg-primary/10 border-primary text-primary'
        : 'bg-muted/10 border-transparent text-muted-foreground opacity-30 grayscale'
      }
    `}
  >
    {icon}
    <span className="text-[6px] font-black uppercase tracking-widest leading-none">{label}</span>
  </button>
);

export default UserManagementPanel;
