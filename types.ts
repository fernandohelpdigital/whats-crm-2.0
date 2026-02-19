
export interface AuthConfig {
  instanceName: string;
  apiKey: string;
  baseUrl: string;
}

export interface Contact {
  id: string; 
  name: string;
  number: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  timestampRaw?: number;
  isGroup?: boolean;
  mergedIds?: string[]; 
  sourceDevice?: 'ios' | 'android' | 'web' | 'unknown';
}

export interface Message {
  id: string;
  text: string;
  sender: 'me' | 'them';
  timestamp: Date;
  status: 'sending' | 'sent' | 'error' | 'read';
  fromUid?: string; 
}

export interface SendMessagePayload {
  number: string;
  text: string;
  delay?: number;
  linkPreview?: boolean;
}

export type DealStatus = 
  | 'lead_capturado'
  | 'contato_inicial'
  | 'diagnostico_levantamento'
  | 'proposta_construcao'
  | 'proposta_enviada'
  | 'negociacao'
  | 'fechado_aprovado'
  | 'em_execucao'
  | 'entrega_homologacao'
  | 'pos_venda'
  | 'em_followup'
  | 'perdido';

export interface Deal {
  id: string;
  title: string; 
  company: string; 
  tags: string[]; 
  value: number; 
  status: DealStatus; 
  date: Date;
  contactId?: string; 
  avatarUrl?: string; 
  phone?: string; 
  
  email?: string;
  zipCode?: string; 
  address?: string; 
  numberAddress?: string;
  complement?: string; 
  neighborhood?: string; 
  city?: string;
  state?: string;
  source?: string; 
  averageBillValue?: number; 
  budgetPresented?: boolean; 
  notes?: string; 

  // IT Professional fields
  clientType?: string;
  cpfCnpj?: string;
  position?: string;
  website?: string;
  priority?: string;
  segment?: string;
  mainNeed?: string;
  servicesInterest?: string;
}

export interface FollowUpTask {
  id: string;
  contactId: string;
  contactName: string;
  avatarUrl?: string;
  scheduledAt: Date; 
  message: string;
  status: 'pending' | 'sent' | 'cancelled';
  type: 'whatsapp' | 'call' | 'email';
}

export interface Instance {
  id: string;
  name: string;
  connectionStatus: 'open' | 'close' | 'connecting';
  ownerJid?: string;
  profileName?: string;
  profilePicUrl?: string;
  integration?: string;
  token?: string;
  _count?: {
      Message: number;
      Contact: number;
      Chat: number;
  };
}

export interface FeatureFlags {
  kanban: boolean;
  proposals: boolean;
  followup: boolean;
  dashboard: boolean;
  chat: boolean; 
}

export interface SystemConfig {
  [instanceName: string]: FeatureFlags;
}

export interface SystemBranding {
    systemName: string;
    primaryColor: string; 
}
