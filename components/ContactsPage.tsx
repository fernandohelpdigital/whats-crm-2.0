
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { Loader2, Search, Plus, UserCircle, Phone, Mail, Tag, Trash2, Edit2, X, Menu, Users, MoreVertical, Filter, ChevronDown } from 'lucide-react';
import { Button } from './ui/Shared';
import toast from 'react-hot-toast';

interface DBContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface ContactsPageProps {
  onOpenMenu: () => void;
}

const ContactsPage: React.FC<ContactsPageProps> = ({ onOpenMenu }) => {
  const [contacts, setContacts] = useState<DBContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<DBContact | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', notes: '', tags: '' });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    contacts.forEach(c => (c.tags || []).forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [contacts]);

  const loadContacts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setContacts((data as DBContact[]) || []);
    } catch (e: any) {
      toast.error('Erro ao carregar contatos: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Usuário não autenticado'); return; }

    const tags = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || null,
      notes: formData.notes.trim() || null,
      tags,
      user_id: user.id,
    };

    try {
      if (editingContact) {
        const { error } = await supabase.from('contacts').update(payload).eq('id', editingContact.id);
        if (error) throw error;
        toast.success('Contato atualizado');
      } else {
        const { error } = await supabase.from('contacts').insert(payload);
        if (error) throw error;
        toast.success('Contato adicionado');
      }
      resetForm();
      loadContacts();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este contato?')) return;
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
      toast.success('Contato excluído');
      loadContacts();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
  };

  const startEdit = (c: DBContact) => {
    setEditingContact(c);
    setFormData({ name: c.name, phone: c.phone, email: c.email || '', notes: c.notes || '', tags: (c.tags || []).join(', ') });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingContact(null);
    setFormData({ name: '', phone: '', email: '', notes: '', tags: '' });
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const filtered = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()));
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => (c.tags || []).includes(tag));

    return matchesSearch && matchesTags;
  });

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
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold text-foreground">Contatos</h1>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{contacts.length}</span>
        <div className="flex-1" />
        <Button variant="default" size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </header>

      {/* Search & Filters */}
      <div className="px-4 md:px-6 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Button
            variant={showTagFilter ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowTagFilter(!showTagFilter)}
            className="gap-1.5"
          >
            <Filter className="h-4 w-4" />
            Tags
            {selectedTags.length > 0 && (
              <span className="bg-primary-foreground text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{selectedTags.length}</span>
            )}
          </Button>
          {selectedTags.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])} className="text-xs text-muted-foreground">
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Tag Filter Panel */}
        {showTagFilter && (
          <div className="flex flex-wrap gap-1.5 p-3 bg-muted/30 rounded-xl border border-border">
            {allTags.length === 0 ? (
              <span className="text-xs text-muted-foreground">Nenhuma tag encontrada</span>
            ) : (
              allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTagFilter(tag)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {tag}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={resetForm}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{editingContact ? 'Editar Contato' : 'Novo Contato'}</h2>
              <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Nome *" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input placeholder="Telefone *" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input placeholder="Email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input placeholder="Tags (separadas por vírgula)" value={formData.tags} onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <textarea placeholder="Observações" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={resetForm}>Cancelar</Button>
              <Button variant="default" size="sm" onClick={handleSave}>{editingContact ? 'Salvar' : 'Adicionar'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Table List */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <UserCircle className="h-16 w-16 opacity-30" />
            <p className="text-sm">{search ? 'Nenhum contato encontrado' : 'Nenhum contato salvo ainda'}</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] items-center gap-4 px-4 py-3 border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="w-5" />
              <span>Usuários</span>
              <span>WhatsApp</span>
              <span>Tags</span>
              <span>Data de inscrição</span>
              <div className="w-8" />
            </div>
            {/* Table Rows */}
            {filtered.map(c => (
              <div key={c.id} className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] items-center gap-4 px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors group">
                <div className="w-5" />
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold shrink-0">
                    {c.avatar_url ? <img src={c.avatar_url} className="h-10 w-10 rounded-full object-cover" /> : <UserCircle className="h-6 w-6" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.phone}</p>
                  </div>
                </div>
                <span className="text-sm text-foreground">+{c.phone}</span>
                <div className="flex flex-wrap gap-1 min-w-0">
                  {(c.tags || []).length === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    (c.tags || []).map(tag => (
                      <span
                        key={tag}
                        onClick={() => { setSelectedTags([tag]); setShowTagFilter(true); }}
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors"
                      >
                        {tag}
                      </span>
                    ))
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString('pt-BR')} {new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      const menu = e.currentTarget.nextElementSibling as HTMLElement;
                      menu.classList.toggle('hidden');
                    }}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  <div className="hidden absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
                    <button onClick={() => { startEdit(c); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted">
                      <Edit2 className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactsPage;
