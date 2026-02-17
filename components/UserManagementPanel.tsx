import React, { useState, useEffect } from 'react';
import { Button } from './ui/Shared';
import { Users, ShieldCheck, ShieldOff, Loader2, RefreshCw, Search } from 'lucide-react';
import { supabase } from '@/src/integrations/supabase/client';
import toast from 'react-hot-toast';

interface ManagedUser {
  id: string;
  email: string;
  display_name: string;
  instance_name: string | null;
  roles: string[];
  created_at: string;
  last_sign_in_at: string | null;
}

const UserManagementPanel: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('manage-user-roles', {
        body: { action: 'list' },
      });
      if (res.error) throw res.error;
      setUsers(res.data || []);
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

  const filtered = users.filter(u =>
    u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.instance_name?.toLowerCase().includes(search.toLowerCase())
  );

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
                <th className="px-4 py-3 text-center tracking-widest">Último Login</th>
                <th className="px-4 py-3 text-center tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map(u => {
                const isAdmin = u.roles.includes('admin');
                return (
                  <tr key={u.id} className="hover:bg-primary/[0.02] transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-bold text-foreground">{u.display_name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-mono text-muted-foreground">
                        {u.instance_name || '—'}
                      </span>
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
                    <td className="px-4 py-4 text-center text-xs text-muted-foreground">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {actionLoading === u.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto text-primary" />
                      ) : isAdmin ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRoleChange(u.id, 'demote')}
                          className="text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                        >
                          <ShieldOff className="w-3 h-3" /> Remover Admin
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRoleChange(u.id, 'promote')}
                          className="text-xs gap-1 text-primary border-primary/30 hover:bg-primary/5"
                        >
                          <ShieldCheck className="w-3 h-3" /> Promover
                        </Button>
                      )}
                    </td>
                  </tr>
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

export default UserManagementPanel;
