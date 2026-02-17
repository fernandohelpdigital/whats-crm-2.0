
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { Loader2, Search, Plus, UserCircle, Phone, Mail, Tag, Trash2, Edit2, X, Menu, Users } from 'lucide-react';
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

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
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
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold text-foreground">Contatos</h1>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{contacts.length}</span>
        <div className="flex-1" />
        <Button variant="default" size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </header>

      {/* Search */}
      <div className="px-4 md:px-6 py-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
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

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <UserCircle className="h-16 w-16 opacity-30" />
            <p className="text-sm">{search ? 'Nenhum contato encontrado' : 'Nenhum contato salvo ainda'}</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(c => (
              <div key={c.id} className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow group">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                    {c.avatar_url ? <img src={c.avatar_url} className="h-10 w-10 rounded-full object-cover" /> : c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{c.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Phone className="h-3 w-3" /> {c.phone}
                    </div>
                    {c.email && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Mail className="h-3 w-3" /> <span className="truncate">{c.email}</span>
                      </div>
                    )}
                    {c.tags && c.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.tags.map((t, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(c)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {c.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{c.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactsPage;
