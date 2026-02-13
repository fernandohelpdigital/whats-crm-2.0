
import React, { useState, useEffect } from 'react';
import { Contact, AuthConfig } from '../types';
import { Input, Avatar, Button } from './ui/Shared';
import { Search, Menu, MessageSquarePlus, MoreVertical, Filter, RefreshCcw, Users, User } from 'lucide-react';
import { connectInstance, fetchProfilePictureUrl } from '../services/evolutionClient';
import toast from 'react-hot-toast';

interface SidebarContactsProps {
  contacts: Contact[];
  selectedContactId?: string;
  onSelectContact: (contact: Contact) => void;
  onLogout: () => void;
  config: AuthConfig;
  hideHeaderControls?: boolean;
  onOpenMenu?: () => void;
  onRefresh?: () => void;
}

// Sub-component for individual contact row
const ContactRow: React.FC<{
  contact: Contact;
  isSelected: boolean;
  onClick: () => void;
  config: AuthConfig;
}> = ({ contact, isSelected, onClick, config }) => {
  const [avatar, setAvatar] = useState(contact.avatarUrl);

  useEffect(() => {
    if (contact.avatarUrl) {
        setAvatar(contact.avatarUrl);
    }
  }, [contact.avatarUrl]);

  useEffect(() => {
    if (!avatar && contact.id) {
        let isMounted = true;
        const timeoutId = setTimeout(() => {
            fetchProfilePictureUrl(config, contact.id)
                .then((url) => {
                    if (isMounted && url) {
                        setAvatar(url);
                    }
                })
                .catch(() => {});
        }, Math.random() * 500);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }
  }, [contact.id, config, avatar]);

  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] ${
        isSelected ? 'bg-[#f0f2f5] dark:bg-[#2a3942]' : ''
      }`}
    >
      <div className="relative">
          <Avatar src={avatar} alt={contact.name} fallback={contact.name} />
      </div>
      
      <div className="flex-1 min-w-0 border-b border-border/40 pb-3 group-last:border-0 h-full flex flex-col justify-center">
        <div className="flex justify-between items-baseline mb-1">
          <h3 className="font-medium text-[16px] text-[#111b21] dark:text-[#e9edef] truncate">{contact.name}</h3>
          <span className={`text-xs whitespace-nowrap ${contact.unreadCount && contact.unreadCount > 0 ? 'text-[#25D366] font-medium' : 'text-[#667781] dark:text-[#8696a0]'}`}>
              {contact.lastMessageTime}
          </span>
        </div>
        <div className="flex justify-between items-center">
            <p className="text-sm text-[#667781] dark:text-[#8696a0] truncate max-w-[85%]">{contact.lastMessage}</p>
            {contact.unreadCount !== undefined && contact.unreadCount > 0 && (
                <div className="bg-[#25D366] text-white text-[10px] font-bold h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center">
                    {contact.unreadCount}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

const SidebarContacts: React.FC<SidebarContactsProps> = ({ 
    contacts: initialContacts, 
    selectedContactId, 
    onSelectContact, 
    config,
    onOpenMenu,
    onRefresh
}) => {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para controlar a ocultação de grupos, inicializado via localStorage
  const [hideGroups, setHideGroups] = useState(() => {
      return localStorage.getItem('evo_hide_groups') === 'true';
  });

  // Atualiza estado local quando props mudam (carga inicial)
  useEffect(() => {
      setContacts(initialContacts);
  }, [initialContacts]);

  const toggleHideGroups = () => {
      const newValue = !hideGroups;
      setHideGroups(newValue);
      localStorage.setItem('evo_hide_groups', String(newValue));
      toast.success(newValue ? "Grupos ocultos" : "Grupos visíveis", {
          icon: newValue ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />
      });
  };

  const filteredContacts = contacts.filter(c => {
    // Filtro de Busca
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.number.includes(searchTerm);
    
    // Filtro de Grupos
    const isGroup = c.isGroup || c.id.includes('@g.us');
    const matchesGroupFilter = hideGroups ? !isGroup : true;

    return matchesSearch && matchesGroupFilter;
  });

  const checkConnection = async () => {
    try {
        const data = await connectInstance(config);
        if (data && data.base64) {
            toast((t) => (
                <div className="flex flex-col items-center">
                    <p className="font-bold mb-2">Scan QR Code</p>
                    <img src={data.base64} alt="QR" className="w-32 h-32" />
                    <Button size="sm" className="mt-2" onClick={() => toast.dismiss(t.id)}>Close</Button>
                </div>
            ), { duration: 10000 });
        } else {
            toast.success("Instância Conectada");
        }
    } catch (e) {
        toast.error("Erro ao verificar conexão");
    }
  };

  return (
    <div className="w-full flex flex-col h-full bg-white dark:bg-[#111b21]">
      {/* Header */}
      <div className="px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] flex justify-between items-center shrink-0">
         <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden -ml-2 text-[#54656f] dark:text-[#aebac1]" onClick={onOpenMenu}>
                <Menu className="h-6 w-6" />
            </Button>
            <h2 className="font-bold text-xl text-[#111b21] dark:text-[#e9edef]">Chats</h2>
         </div>
         <div className="flex gap-1 text-[#54656f] dark:text-[#aebac1]">
             <Button 
                variant="ghost" 
                size="icon" 
                title={hideGroups ? "Mostrar Grupos" : "Ocultar Grupos"} 
                onClick={toggleHideGroups}
                className={hideGroups ? "text-primary bg-primary/10" : ""}
             >
                 {hideGroups ? <User className="h-5 w-5" /> : <Users className="h-5 w-5" />}
             </Button>
             <Button variant="ghost" size="icon" title="Atualizar Chats" onClick={onRefresh}><RefreshCcw className="h-5 w-5" /></Button>
             <Button variant="ghost" size="icon" title="Mais Opções"><MoreVertical className="h-5 w-5" /></Button>
         </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 bg-white dark:bg-[#111b21] border-b border-border/40">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             <Search className="h-4 w-4 text-[#54656f] dark:text-[#8696a0]" />
          </div>
          <Input 
            placeholder="Pesquisar ou começar nova conversa" 
            className="pl-10 bg-[#f0f2f5] dark:bg-[#202c33] border-none rounded-lg h-9 text-sm placeholder:text-[#54656f] dark:placeholder:text-[#8696a0] focus-visible:ring-0"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center cursor-pointer">
             <Filter className="h-4 w-4 text-[#54656f] dark:text-[#8696a0]" />
          </div>
        </div>
      </div>

      {/* Archive / Status (Optional) */}
      <div className="px-4 py-2 flex items-center gap-4 hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] cursor-pointer">
           <div className="w-8 h-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[#8696a0] rounded-full opacity-40"></div>
           </div>
           <span className="font-semibold text-[#111b21] dark:text-[#e9edef]">Status</span>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50">
        {filteredContacts.map((contact) => (
          <ContactRow 
            key={contact.id}
            contact={contact}
            isSelected={selectedContactId === contact.id}
            onClick={() => onSelectContact(contact)}
            config={config}
          />
        ))}
        
        {filteredContacts.length === 0 && (
            <div className="p-8 text-center text-[#8696a0] text-sm mt-10">
                <p>Nenhuma conversa encontrada.</p>
                {hideGroups && <p className="text-xs mt-1 text-primary">(Grupos estão ocultos)</p>}
                <Button variant="outline" className="mt-4 border-[#00a884] text-[#00a884] hover:bg-[#00a884]/10" onClick={checkConnection}>
                    Verificar Status WhatsApp
                </Button>
            </div>
        )}
      </div>
    </div>
  );
};

export default SidebarContacts;
