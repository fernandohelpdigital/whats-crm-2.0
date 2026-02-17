
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AuthConfig, Contact, Deal, FeatureFlags } from '../types';
import { fetchChats } from '../services/evolutionClient';
import { initSocket, disconnectSocket, getSocket } from '../services/socketClient';
import SalesKanban from './SalesKanban';
import ProposalGenerator from './ProposalGenerator';
import Dashboard from './Dashboard';
import FollowUpCalendar from './FollowUpCalendar';
import SettingsPage from './SettingsPage';
import AdminPage from './AdminPage';
import ChatPage from './ChatPage';
import ContactsPage from './ContactsPage';
import { Loader2, LayoutDashboard, Kanban, Settings, LogOut, Moon, Sun, X, Zap, Menu, CalendarClock, Shield, MessageSquare, ChevronRight, ChevronLeft, LogIn, Users } from 'lucide-react';
import { Button, Avatar } from './ui/Shared';
import { useTheme, useBranding } from '../index';
import { useAuth } from '../src/hooks/useAuth';
import { supabase } from '@/src/integrations/supabase/client';
import toast from 'react-hot-toast';

interface ChatDashboardProps {
  config: AuthConfig | null;
  onLogout: () => void;
}

const DEFAULT_FLAGS: FeatureFlags = {
    dashboard: true,
    kanban: true,
    proposals: true,
    followup: true,
    chat: true
};

const ChatDashboard: React.FC<ChatDashboardProps> = ({ config, onLogout }) => {
  const { theme, toggleTheme } = useTheme();
  const { branding } = useBranding();
  const { isAdmin, profile, signOut } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Menu States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const [currentView, setCurrentView] = useState<'dashboard' | 'kanban' | 'proposals' | 'followup' | 'settings' | 'admin' | 'chat' | 'contacts'>('dashboard');
  
  // Feature Flags State
  const [features, setFeatures] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const contactsRef = useRef<Contact[]>([]);

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  // Load feature flags from Supabase
  useEffect(() => {
    const loadFeatures = async () => {
        if (isAdmin) {
            setFeatures(DEFAULT_FLAGS);
            return;
        }

        const instanceName = config?.instanceName;
        if (!instanceName) return;

        try {
          const { data } = await supabase
            .from('instance_feature_flags')
            .select('*')
            .eq('instance_name', instanceName)
            .single();
          
          if (data) {
            const userFlags: FeatureFlags = {
              dashboard: data.dashboard ?? true,
              kanban: data.kanban ?? true,
              proposals: data.proposals ?? true,
              followup: data.followup ?? true,
              chat: data.chat ?? true,
            };
            setFeatures(userFlags);
            if (!userFlags[currentView as keyof FeatureFlags] && currentView !== 'settings') {
              setCurrentView('settings');
            }
          }
        } catch (e) {
          console.error("Erro ao ler features", e);
        }
    };

    loadFeatures();
  }, [config?.instanceName, isAdmin, currentView]);

  const syncContactsToSupabase = useCallback(async (chatContacts: Contact[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const validContacts = chatContacts.filter(c => c.number && !c.isGroup);
      if (validContacts.length === 0) return;

      const contactsToUpsert = validContacts.map(c => ({
        phone: c.number,
        name: c.name || c.number,
        avatar_url: c.avatarUrl || null,
        user_id: user.id,
      }));

      // Upsert in batches of 100
      for (let i = 0; i < contactsToUpsert.length; i += 100) {
        const batch = contactsToUpsert.slice(i, i + 100);
        await supabase
          .from('contacts')
          .upsert(batch, { onConflict: 'phone,user_id', ignoreDuplicates: true });
      }
    } catch (e) {
      console.error("Erro ao sincronizar contatos:", e);
    }
  }, []);

  const refreshData = useCallback(async (isInitial = false) => {
      try {
        if (!config) {
          setContacts([]);
          setLeads([]);
          if (isInitial) setLoading(false);
          return;
        }

        if (!isInitial) toast.loading('Atualizando...', { id: 'refresh-chats' });
        
        // Admins com instância configurada também carregam dados

        const data = await fetchChats(config);
        
        setContacts(data);
        
        // Sincronizar contatos do chat para o Supabase
        syncContactsToSupabase(data);
        
        if (isInitial) {
            const initialLeads: Deal[] = data.map(c => ({
              id: `lead_${c.id}`,
              title: c.name,
              company: 'Lead do WhatsApp',
              tags: ['WhatsApp Lead'],
              value: 0, 
              status: 'lead_capturado', 
              date: new Date(c.timestampRaw ? c.timestampRaw * 1000 : Date.now()),
              contactId: c.id,
              avatarUrl: c.avatarUrl,
              phone: c.number
            }));
            setLeads(initialLeads);
        }
        if (!isInitial) toast.success('Atualizado', { id: 'refresh-chats' });
      } catch (e: any) {
        console.error("Erro no refresh:", e);
        if (isInitial) toast.error(`Falha ao carregar dados: ${e.message}`);
        else toast.error('Erro ao atualizar', { id: 'refresh-chats' });
      } finally {
        if (isInitial) setLoading(false);
      }
  }, [config, isAdmin]);

  // Inicialização de Dados
  useEffect(() => {
    refreshData(true);
  }, [refreshData]);

  // Socket em useEffect separado com controle de StrictMode
  useEffect(() => {
    if (!config) return;
    
    let cancelled = false;
    
    // Pequeno delay para evitar que o StrictMode mate o socket imediatamente
    const timer = setTimeout(() => {
      if (cancelled) return;
      const socket = initSocket(config);
      if (!socket) return;

      const handleMessageEvent = (payload: any) => {
        let eventData = payload;
        if (Array.isArray(payload)) {
            eventData = payload[0];
        }
        const msgData = eventData.data || eventData;
        const key = msgData.key;
        if (!key || !key.remoteJid) return;
        const remoteJid = key.remoteJid;
        const normalizedRemoteJid = remoteJid.split('@')[0];
        const fromMe = key.fromMe;
        if (remoteJid === 'status@broadcast') return;
        const messageContent = msgData.message || msgData;
        let previewText = 'Nova mensagem';
        if (messageContent.conversation) previewText = messageContent.conversation;
        else if (messageContent.extendedTextMessage?.text) previewText = messageContent.extendedTextMessage.text;
        else if (messageContent.imageMessage) previewText = '📷 Foto';
        else if (messageContent.audioMessage) previewText = '🎤 Áudio';
        else if (messageContent.videoMessage) previewText = '🎥 Vídeo';
        else if (messageContent.documentMessage) previewText = '📄 Arquivo';
        else if (messageContent.stickerMessage) previewText = '👾 Sticker';

        setContacts((prevContacts) => {
            const existingIndex = prevContacts.findIndex(c => 
                c.id === remoteJid || 
                c.id.split('@')[0] === normalizedRemoteJid
            );
            const now = new Date();
            const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            if (existingIndex > -1) {
                const oldContact = prevContacts[existingIndex];
                const updatedContact = {
                    ...oldContact,
                    lastMessage: previewText,
                    lastMessageTime: timeString,
                    timestampRaw: Math.floor(now.getTime() / 1000),
                    unreadCount: fromMe ? oldContact.unreadCount : (oldContact.unreadCount || 0) + 1
                };
                const newList = [...prevContacts];
                newList.splice(existingIndex, 1);
                return [updatedContact, ...newList];
            } else {
                const newContact: Contact = {
                    id: remoteJid, 
                    name: msgData.pushName || normalizedRemoteJid,
                    number: normalizedRemoteJid,
                    lastMessage: previewText,
                    lastMessageTime: timeString,
                    timestampRaw: Math.floor(now.getTime() / 1000),
                    unreadCount: fromMe ? 0 : 1,
                    isGroup: remoteJid.includes('@g.us'),
                    sourceDevice: 'web'
                };
                // Sincronizar novo contato do socket para o Supabase
                if (!remoteJid.includes('@g.us')) {
                  syncContactsToSupabase([newContact]);
                }
                return [newContact, ...prevContacts];
            }
        });
      };
      socket.on("MESSAGES_UPSERT", handleMessageEvent);
      socket.on("messages.upsert", handleMessageEvent);
    }, 100);

    return () => {
        cancelled = true;
        clearTimeout(timer);
        disconnectSocket();
    };
  }, [config, isAdmin]);

  const handleUpdateLeads = useCallback((newLeads: Deal[]) => {
    setLeads(newLeads);
  }, []);

  const handleMarkAsRead = useCallback((contactId: string) => {
    setContacts(prev => prev.map(c => 
        c.id === contactId ? { ...c, unreadCount: 0 } : c
    ));
  }, []);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
             <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                <img src="https://helpdigitalti.com.br/wp-content/uploads/2020/05/logo-2.png.webp" alt="Loading" className="h-20 w-auto object-contain relative z-10 animate-pulse" />
             </div>
             <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium tracking-wide">Iniciando Sistema...</span>
             </div>
        </div>
      </div>
    );
  }

  const isExpanded = isMobileMenuOpen || isSidebarExpanded;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      
      {/* MOBILE OVERLAY */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeMobileMenu}
      />

      {/* MODERN SIDEBAR */}
      <aside className={`
            fixed md:relative z-50 h-full flex flex-col transition-all duration-300 ease-in-out
            bg-card border-r border-border
            ${isMobileMenuOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full md:translate-x-0'} 
            ${!isMobileMenuOpen && (isSidebarExpanded ? 'md:w-[260px]' : 'md:w-[80px]')}
      `}>
         
         {/* BRAND HEADER */}
         <div className="h-20 flex items-center px-6 border-b border-border/50">
            <div className={`flex items-center gap-3 w-full transition-all duration-300 ${isExpanded ? 'justify-start' : 'justify-center'}`}>
               <img 
                  src="https://helpdigitalti.com.br/wp-content/uploads/2020/05/logo-2.png.webp" 
                  alt="Logo" 
                  className={`object-contain transition-all duration-300 ${isExpanded ? 'h-8' : 'h-8 w-8'}`}
               />
               {isExpanded && (
                   <div className="flex flex-col animate-fade-in">
                       <span className="font-bold text-foreground leading-none">HelpDigital</span>
                       <span className="text-[10px] text-muted-foreground font-medium tracking-wider">CRM SYSTEM</span>
                   </div>
               )}
            </div>
            
            {/* Mobile Close */}
            <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden ml-auto" 
                onClick={closeMobileMenu}
            >
                <X className="h-5 w-5" />
            </Button>
         </div>

         {/* NAVIGATION */}
         <div className="flex-1 py-6 px-3 flex flex-col gap-2 overflow-y-auto scrollbar-none">
             
              {features.dashboard && (
                  <SidebarButton 
                     active={currentView === 'dashboard'}
                     icon={<LayoutDashboard className="h-5 w-5" />}
                     label="Dashboard"
                     expanded={isExpanded}
                     onClick={() => { setCurrentView('dashboard'); closeMobileMenu(); }}
                  />
              )}

              <SidebarButton 
                 active={currentView === 'contacts'}
                 icon={<Users className="h-5 w-5" />}
                 label="Contatos"
                 expanded={isExpanded}
                 onClick={() => { setCurrentView('contacts'); closeMobileMenu(); }}
              />
              
              {features.chat && (
                 <SidebarButton 
                    active={currentView === 'chat'}
                    icon={<MessageSquare className="h-5 w-5" />}
                    label="Conversas"
                    badge={contacts.reduce((acc, c) => acc + (c.unreadCount || 0), 0)}
                    expanded={isExpanded}
                    onClick={() => { setCurrentView('chat'); closeMobileMenu(); }}
                 />
             )}

             {features.kanban && (
                 <SidebarButton 
                    active={currentView === 'kanban'}
                    icon={<Kanban className="h-5 w-5" />}
                    label="Pipeline CRM"
                    expanded={isExpanded}
                    onClick={() => { setCurrentView('kanban'); closeMobileMenu(); }}
                 />
             )}

             {features.proposals && (
                 <SidebarButton 
                    active={currentView === 'proposals'}
                    icon={<Zap className="h-5 w-5" />}
                    label="Propostas"
                    expanded={isExpanded}
                    onClick={() => { setCurrentView('proposals'); closeMobileMenu(); }}
                 />
             )}

             {features.followup && (
                 <SidebarButton 
                    active={currentView === 'followup'}
                    icon={<CalendarClock className="h-5 w-5" />}
                    label="Agenda Follow-up"
                    expanded={isExpanded}
                    onClick={() => { setCurrentView('followup'); closeMobileMenu(); }}
                 />
             )}
         </div>

         {/* USER & SETTINGS */}
         <div className="p-3 border-t border-border/50 flex flex-col gap-2">
            
            {isAdmin && (
                <SidebarButton 
                    active={currentView === 'admin'}
                    icon={<Shield className="h-5 w-5" />}
                    label="Administração"
                    expanded={isExpanded}
                    onClick={() => { setCurrentView('admin'); closeMobileMenu(); }}
                 />
            )}

            <SidebarButton 
                active={currentView === 'settings'}
                icon={<Settings className="h-5 w-5" />}
                label="Configurações"
                expanded={isExpanded}
                onClick={() => { setCurrentView('settings'); closeMobileMenu(); }}
            />
            
            <button 
                onClick={toggleTheme}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:bg-muted ${isExpanded ? 'justify-start' : 'justify-center'}`}
                title="Alternar Tema"
            >
                {theme === 'dark' ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-slate-700" />}
                {isExpanded && <span className="text-sm font-medium text-muted-foreground">Modo {theme === 'dark' ? 'Claro' : 'Escuro'}</span>}
            </button>

            <div className={`mt-2 flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border/50 ${isExpanded ? '' : 'justify-center p-2'}`}>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {(profile?.display_name || config?.instanceName || 'U').charAt(0).toUpperCase()}
                </div>
                {isExpanded && (
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{profile?.display_name || config?.instanceName || 'Usuário'}</p>
                        <p className="text-[10px] text-muted-foreground">{config?.instanceName || 'Online'}</p>
                    </div>
                )}
                {isExpanded && (
                    <button onClick={async () => { await signOut(); }} className="text-muted-foreground hover:text-red-500 transition-colors">
                        <LogOut className="h-4 w-4" />
                    </button>
                )}
            </div>
            
            {/* Collapse Toggle */}
            <div className="hidden md:flex justify-end mt-2">
                <button 
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                    onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                >
                    <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isSidebarExpanded ? 'rotate-180' : ''}`} />
                </button>
            </div>
         </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-[#F8FAFC] dark:bg-[#0b141a]">
        {/* Background Decorative Mesh */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none z-0" />
        
        <div className="flex-1 relative z-10 overflow-hidden flex flex-col">
            <div key={currentView} className="h-full w-full flex flex-col animate-slide-up">
                {currentView === 'dashboard' && features.dashboard ? (
                     <Dashboard leads={leads} onOpenMenu={() => setIsMobileMenuOpen(true)} />
                 ) : currentView === 'contacts' ? (
                     <ContactsPage onOpenMenu={() => setIsMobileMenuOpen(true)} />
                 ) : currentView === 'chat' && features.chat && config ? (
                    <ChatPage 
                        contacts={contacts} 
                        config={config} 
                        onOpenMenu={() => setIsMobileMenuOpen(true)}
                        onLogout={async () => { await signOut(); }}
                        onMarkAsRead={handleMarkAsRead}
                        onRefresh={() => refreshData(false)}
                    />
                ) : currentView === 'kanban' && features.kanban && config ? (
                    <SalesKanban 
                        leads={leads}
                        setLeads={handleUpdateLeads}
                        contacts={contacts}
                        onOpenMenu={() => setIsMobileMenuOpen(true)}
                        config={config}
                    />
                ) : currentView === 'proposals' && features.proposals ? (
                    <ProposalGenerator contacts={contacts} />
                ) : currentView === 'followup' && features.followup ? (
                    <FollowUpCalendar contacts={contacts} />
                ) : currentView === 'admin' && isAdmin ? (
                    <AdminPage config={config || { instanceName: '', apiKey: '', baseUrl: 'https://api.automacaohelp.com.br' }} />
                ) : config ? (
                    <SettingsPage config={config} />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <p>Configure sua instância nas Configurações do perfil.</p>
                    </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
};

const SidebarButton = ({ active, icon, label, expanded, onClick, badge }: any) => {
    return (
        <button 
            onClick={onClick}
            title={!expanded ? label : undefined}
            className={`
                relative flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group
                ${active 
                    ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                    : 'text-muted-foreground hover:bg-white hover:text-foreground dark:hover:bg-white/5'
                }
                ${expanded ? 'w-full' : 'justify-center'}
            `}
        >
            <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                {icon}
            </div>
            
            {expanded && (
                <span className="text-sm font-semibold tracking-wide flex-1 text-left">{label}</span>
            )}

            {badge > 0 && (
                <span className={`
                    absolute top-2 right-2 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold rounded-full px-1
                    ${active ? 'bg-white text-primary' : 'bg-primary text-white'}
                    ${!expanded ? 'top-0 right-0' : ''}
                `}>
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
        </button>
    );
};

export default ChatDashboard;
