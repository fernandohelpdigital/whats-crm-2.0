
import React, { useState, useEffect, useCallback } from 'react';
import { AuthConfig } from '../types';
import { supabase } from '@/src/integrations/supabase/client';
import { Button } from './ui/Shared';
import { Loader2, Menu, Download, Users, Tag, CheckCircle2, RefreshCcw, Search, UserCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface GroupInfo {
  id: string;
  subject: string;
  size: number;
  profilePictureUrl?: string;
}

interface GroupParticipant {
  id: string;
  name?: string;
  phone: string;
}

interface GroupExtractorPageProps {
  config: AuthConfig;
  onOpenMenu: () => void;
}

const cleanUrl = (url: string) => url.replace(/\/$/, '');

const GroupExtractorPage: React.FC<GroupExtractorPageProps> = ({ config, onOpenMenu }) => {
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [showTagModal, setShowTagModal] = useState<string | null>(null);
  const [extractedCounts, setExtractedCounts] = useState<Record<string, number>>({});

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${cleanUrl(config.baseUrl)}/group/fetchAllGroups/${config.instanceName}?getParticipants=false`;
      const response = await axios.get(url, {
        headers: { 'apikey': config.apiKey }
      });
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      const mapped: GroupInfo[] = data.map((g: any) => ({
        id: g.id || g.jid,
        subject: g.subject || g.name || 'Grupo sem nome',
        size: g.size || g.participants?.length || 0,
        profilePictureUrl: g.profilePictureUrl || g.pictureUrl,
      }));
      setGroups(mapped);
    } catch (e: any) {
      toast.error('Erro ao carregar grupos: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const handleExtract = async (groupId: string, tag: string) => {
    if (!tag.trim()) {
      toast.error('Informe uma tag para marcar os contatos extraídos');
      return;
    }

    setExtracting(groupId);
    setShowTagModal(null);

    try {
      // Fetch participants
      const url = `${cleanUrl(config.baseUrl)}/group/findGroupInfos/${config.instanceName}?groupJid=${encodeURIComponent(groupId)}`;
      const response = await axios.get(url, {
        headers: { 'apikey': config.apiKey }
      });

      const rawParticipants = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.participants || response.data?.data || []);

      const participants: GroupParticipant[] = rawParticipants
        .map((p: any) => {
          const jid = p.id || p.jid || '';
          const phone = jid.split('@')[0];
          if (!phone || jid.includes('@g.us')) return null;
          return {
            id: jid,
            name: p.name || p.pushName || phone,
            phone,
          };
        })
        .filter(Boolean) as GroupParticipant[];

      if (participants.length === 0) {
        toast.error('Nenhum participante encontrado neste grupo');
        setExtracting(null);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Usuário não autenticado'); setExtracting(null); return; }

      const trimmedTag = tag.trim();

      // Fetch existing contacts for this user to merge tags
      const { data: existingContacts } = await supabase
        .from('contacts')
        .select('phone, tags')
        .eq('user_id', user.id)
        .in('phone', participants.map(p => p.phone));

      const existingMap = new Map<string, string[]>();
      (existingContacts || []).forEach((c: any) => {
        existingMap.set(c.phone, c.tags || []);
      });

      // Upsert contacts with merged tags
      const contactsToUpsert = participants.map(p => {
        const existingTags = existingMap.get(p.phone) || [];
        const mergedTags = existingTags.includes(trimmedTag) 
          ? existingTags 
          : [...existingTags, trimmedTag];

        return {
          phone: p.phone,
          name: p.name || p.phone,
          tags: mergedTags,
          user_id: user.id,
        };
      });

      // Upsert in batches
      let saved = 0;
      for (let i = 0; i < contactsToUpsert.length; i += 100) {
        const batch = contactsToUpsert.slice(i, i + 100);
        const { error } = await supabase
          .from('contacts')
          .upsert(batch, { onConflict: 'phone,user_id' });
        if (error) throw error;
        saved += batch.length;
      }

      setExtractedCounts(prev => ({ ...prev, [groupId]: saved }));
      toast.success(`${saved} contatos extraídos com a tag "${trimmedTag}"`);
    } catch (e: any) {
      toast.error('Erro ao extrair: ' + (e.message || 'Erro desconhecido'));
    } finally {
      setExtracting(null);
    }
  };

  const filtered = groups.filter(g =>
    g.subject.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <button className="md:hidden p-2 rounded-lg hover:bg-muted" onClick={onOpenMenu}>
          <Menu className="h-5 w-5 text-muted-foreground" />
        </button>
        <Download className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold text-foreground">Extrator de Contatos</h1>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{groups.length} grupos</span>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={fetchGroups}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Atualizar
        </Button>
      </header>

      {/* Search */}
      <div className="px-4 md:px-6 py-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar grupo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowTagModal(null)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Selecionar Tag</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Todos os contatos extraídos receberão esta tag na lista de contatos.
            </p>
            <input
              autoFocus
              placeholder="Ex: Grupo Vendas, Lead Frio..."
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleExtract(showTagModal, tagInput); }}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowTagModal(null)}>Cancelar</Button>
              <Button variant="default" size="sm" onClick={() => handleExtract(showTagModal, tagInput)}>
                <Download className="h-4 w-4 mr-1" /> Extrair
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Group List */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Users className="h-16 w-16 opacity-30" />
            <p className="text-sm">{search ? 'Nenhum grupo encontrado' : 'Nenhum grupo disponível'}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(g => (
              <div key={g.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-md transition-all">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {g.profilePictureUrl ? (
                    <img src={g.profilePictureUrl} className="h-12 w-12 rounded-full object-cover" alt="" />
                  ) : (
                    <Users className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{g.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.size > 0 ? `${g.size} participantes` : 'Grupo'}
                  </p>
                </div>

                {extractedCounts[g.id] && (
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {extractedCounts[g.id]} extraídos
                  </div>
                )}

                <Button
                  variant="default"
                  size="sm"
                  disabled={extracting === g.id}
                  onClick={() => { setTagInput(''); setShowTagModal(g.id); }}
                >
                  {extracting === g.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Extrair
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupExtractorPage;
