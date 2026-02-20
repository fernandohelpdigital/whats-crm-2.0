
import React, { useState, useEffect, useCallback } from 'react';
import { AuthConfig } from '../types';
import { supabase } from '@/src/integrations/supabase/client';
import { Button } from './ui/Shared';
import { Loader2, Menu, Download, Users, Tag, CheckCircle2, RefreshCcw, Search, UserCircle, ArrowLeft, CheckSquare, Square, MinusSquare, X } from 'lucide-react';
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
  const [search, setSearch] = useState('');
  const [extractedCounts, setExtractedCounts] = useState<Record<string, number>>({});

  // Preview state
  const [previewGroup, setPreviewGroup] = useState<GroupInfo | null>(null);
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [participantSearch, setParticipantSearch] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

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

  const handleOpenPreview = async (group: GroupInfo) => {
    setPreviewGroup(group);
    setParticipants([]);
    setSelectedParticipants(new Set());
    setParticipantSearch('');
    setTagInput('');
    setLoadingParticipants(true);

    try {
      const url = `${cleanUrl(config.baseUrl)}/group/findGroupInfos/${config.instanceName}?groupJid=${encodeURIComponent(group.id)}`;
      const response = await axios.get(url, {
        headers: { 'apikey': config.apiKey }
      });

      const rawParticipants = Array.isArray(response.data)
        ? response.data
        : (response.data?.participants || response.data?.data || []);

      const parsed: GroupParticipant[] = rawParticipants
        .map((p: any) => {
          const jid = p.id || p.jid || '';
          const phone = jid.split('@')[0];
          if (!phone || jid.includes('@g.us')) return null;
          return { id: jid, name: p.name || p.pushName || phone, phone };
        })
        .filter(Boolean) as GroupParticipant[];

      setParticipants(parsed);
      setSelectedParticipants(new Set(parsed.map(p => p.phone)));

      if (parsed.length === 0) {
        toast.error('Nenhum participante encontrado neste grupo');
      }
    } catch (e: any) {
      toast.error('Erro ao carregar participantes: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoadingParticipants(false);
    }
  };

  const toggleParticipant = (phone: string) => {
    setSelectedParticipants(prev => {
      const next = new Set(prev);
      next.has(phone) ? next.delete(phone) : next.add(phone);
      return next;
    });
  };

  const filteredParticipants = participants.filter(p =>
    (p.name || p.phone).toLowerCase().includes(participantSearch.toLowerCase()) ||
    p.phone.includes(participantSearch)
  );

  const toggleSelectAllParticipants = () => {
    if (selectedParticipants.size === filteredParticipants.length) {
      setSelectedParticipants(new Set());
    } else {
      setSelectedParticipants(new Set(filteredParticipants.map(p => p.phone)));
    }
  };

  const handleSaveSelected = async () => {
    if (selectedParticipants.size === 0) {
      toast.error('Selecione pelo menos um participante');
      return;
    }
    if (!tagInput.trim()) {
      toast.error('Informe uma tag para marcar os contatos');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Usuário não autenticado'); setSaving(false); return; }

      const trimmedTag = tagInput.trim();
      const selected = participants.filter(p => selectedParticipants.has(p.phone));

      const { data: existingContacts } = await supabase
        .from('contacts')
        .select('phone, tags')
        .eq('user_id', user.id)
        .in('phone', selected.map(p => p.phone));

      const existingMap = new Map<string, string[]>();
      (existingContacts || []).forEach((c: any) => {
        existingMap.set(c.phone, c.tags || []);
      });

      const contactsToUpsert = selected.map(p => {
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

      let saved = 0;
      for (let i = 0; i < contactsToUpsert.length; i += 100) {
        const batch = contactsToUpsert.slice(i, i + 100);
        const { error } = await supabase
          .from('contacts')
          .upsert(batch, { onConflict: 'phone,user_id' });
        if (error) throw error;
        saved += batch.length;
      }

      if (previewGroup) {
        setExtractedCounts(prev => ({ ...prev, [previewGroup.id]: saved }));
      }
      toast.success(`${saved} contatos salvos com a tag "${trimmedTag}"`);
      setPreviewGroup(null);
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
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

  // Participant preview view
  if (previewGroup) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
          <button className="p-2 rounded-lg hover:bg-muted" onClick={() => setPreviewGroup(null)}>
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-foreground truncate">{previewGroup.subject}</h1>
            <p className="text-xs text-muted-foreground">{participants.length} participantes encontrados</p>
          </div>
        </header>

        {/* Tag input + actions */}
        <div className="px-4 md:px-6 py-3 space-y-3 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Nome da tag (obrigatório)"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Buscar participante..."
                value={participantSearch}
                onChange={e => setParticipantSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {selectedParticipants.size} de {filteredParticipants.length} selecionados
            </span>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={toggleSelectAllParticipants}>
              {selectedParticipants.size === filteredParticipants.length && filteredParticipants.length > 0 ? 'Desmarcar todos' : 'Selecionar todos'}
            </Button>
            <Button variant="default" size="sm" onClick={handleSaveSelected} disabled={saving || selectedParticipants.size === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
              Salvar {selectedParticipants.size} contato(s)
            </Button>
          </div>
        </div>

        {/* Participant list */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4">
          {loadingParticipants ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <UserCircle className="h-16 w-16 opacity-30" />
              <p className="text-sm">Nenhum participante encontrado</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden mt-3">
              <div className="grid grid-cols-[40px_1fr_1fr] items-center gap-4 px-4 py-3 border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <button onClick={toggleSelectAllParticipants} className="flex items-center justify-center">
                  {selectedParticipants.size === filteredParticipants.length && filteredParticipants.length > 0 ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : selectedParticipants.size > 0 ? (
                    <MinusSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
                <span>Nome</span>
                <span>Telefone</span>
              </div>
              {filteredParticipants.map(p => (
                <div
                  key={p.phone}
                  onClick={() => toggleParticipant(p.phone)}
                  className={`grid grid-cols-[40px_1fr_1fr] items-center gap-4 px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer ${selectedParticipants.has(p.phone) ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex items-center justify-center">
                    {selectedParticipants.has(p.phone) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                      <UserCircle className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">{p.name || p.phone}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">+{p.phone}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Group list view
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
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
                  onClick={() => handleOpenPreview(g)}
                >
                  <Download className="h-4 w-4 mr-1" />
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
