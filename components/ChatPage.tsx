
import React, { useState } from 'react';
import { AuthConfig, Contact } from '../types';
import SidebarContacts from './SidebarContacts';
import ChatArea from './ChatArea';
import ContactInfo from './ContactInfo';
import { MessageSquareDashed } from 'lucide-react';

interface ChatPageProps {
  contacts: Contact[];
  config: AuthConfig;
  onOpenMenu: () => void;
  onLogout: () => void;
  onMarkAsRead?: (contactId: string) => void;
  onRefresh?: () => void;
}

const ChatPage: React.FC<ChatPageProps> = ({ contacts, config, onOpenMenu, onLogout, onMarkAsRead, onRefresh }) => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactInfo, setShowContactInfo] = useState(false);

  // Lógica para lidar com seleção em mobile vs desktop
  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowContactInfo(false); // Reseta info ao trocar de chat
  };

  const handleBackToContacts = () => {
    setSelectedContact(null);
  };

  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative">
      
      {/* 
         COLUNA 1: Lista de Contatos 
         Escondida no mobile se houver contato selecionado
      */}
      <div className={`
        w-full md:w-[350px] lg:w-[400px] h-full border-r border-border bg-white dark:bg-[#111b21] flex-col z-20
        ${selectedContact ? 'hidden md:flex' : 'flex'}
        animate-slide-right opacity-0
      `}>
        <SidebarContacts 
            contacts={contacts}
            selectedContactId={selectedContact?.id}
            onSelectContact={handleSelectContact}
            config={config}
            onLogout={onLogout}
            onOpenMenu={onOpenMenu}
            onRefresh={onRefresh}
        />
      </div>

      {/* 
         COLUNA 2: Área de Chat 
         Escondida no mobile se NÃO houver contato selecionado (mostra lista)
      */}
      <div className={`
        flex-1 h-full flex flex-col bg-[#efeae2] dark:bg-[#0b141a] relative
        ${!selectedContact ? 'hidden md:flex' : 'flex'}
        animate-fade-in
      `}>
          {selectedContact ? (
              <ChatArea 
                  contact={selectedContact}
                  config={config}
                  onToggleInfo={() => setShowContactInfo(!showContactInfo)}
                  onBack={handleBackToContacts}
                  onMarkAsRead={onMarkAsRead}
              />
          ) : (
              // Empty State
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-b-[6px] border-[#25D366]/40 animate-zoom-in opacity-0" style={{ animationDelay: '200ms' }}>
                  <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                      <MessageSquareDashed className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-light text-foreground mb-4">Bate-papo Via Leads</h2>
                  <p className="text-muted-foreground max-w-md text-sm">
                      Envie e receba mensagens sem precisar manter seu celular conectado. <br/>
                      Use o WhatsApp em até 4 aparelhos e 1 celular ao mesmo tempo.
                  </p>
                  <div className="mt-8 text-xs text-muted-foreground flex items-center gap-2">
                      <div className="w-3 h-3 bg-muted-foreground/30 rounded-full animate-pulse"></div>
                      End-to-end encrypted
                  </div>
              </div>
          )}
      </div>

      {/* 
         COLUNA 3: Info do Contato (Opcional)
         Slide-over ou coluna fixa dependendo da largura
      */}
      {showContactInfo && selectedContact && (
          <div className="absolute inset-0 md:static md:inset-auto w-full md:w-[320px] z-30 bg-background border-l border-border h-full shadow-xl md:shadow-none animate-slide-left opacity-0">
              <ContactInfo 
                  contact={selectedContact} 
                  onClose={() => setShowContactInfo(false)} 
                  config={config}
              />
          </div>
      )}

    </div>
  );
};

export default ChatPage;
