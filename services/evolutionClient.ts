
import axios from 'axios';
import { AuthConfig, SendMessagePayload, Contact, Message, Instance } from '../types';

// Helper to sanitize URL
const cleanUrl = (url: string) => url.replace(/\/$/, '');

/**
 * Resolve o JID correto para o chat.
 */
export const getValidRemoteJid = (data: any): string => {
    const rawJid = data.remoteJid || data.id || data.key?.remoteJid;
    if (!rawJid || typeof rawJid !== 'string') return '';

    if (rawJid.includes('@lid')) {
        const altJid = 
            data.lastMessage?.key?.remoteJidAlt ||
            data.key?.remoteJidAlt ||
            data.remoteJidAlt;

        if (altJid) return altJid;
    }
    return rawJid;
};

// 1. POST /api/auth/setup
export const setupAuth = async (config: AuthConfig): Promise<boolean> => {
  try {
    const baseUrl = cleanUrl(config.baseUrl);

    // Se for admin, testa direto o endpoint de instâncias
    if (config.instanceName === 'admin') {
        const adminUrl = `${baseUrl}/instance/fetchInstances`;
        await axios.get(adminUrl, { headers: { 'apikey': config.apiKey } });
        return true;
    }

    // Caso contrário, testa a conexão da instância específica
    const url = `${baseUrl}/instance/connectionState/${config.instanceName}`;
    await axios.get(url, { headers: { 'apikey': config.apiKey } });
    return true;
  } catch (error: any) {
    console.error("Auth Setup Error:", error);
    // Retorna mensagem mais limpa
    const msg = error.response?.data?.message || error.response?.data?.error || error.message;
    throw new Error(msg || "Falha ao conectar na API");
  }
};

// 2. POST /message/sendText
export const sendMessage = async (config: AuthConfig, payload: SendMessagePayload): Promise<any> => {
  try {
    const url = `${cleanUrl(config.baseUrl)}/message/sendText/${config.instanceName}`;
    
    let targetNumber = payload.number;
    if (targetNumber.includes('@s.whatsapp.net')) {
        targetNumber = targetNumber.split('@')[0];
    }

    const body = {
      number: targetNumber,
      text: payload.text,
      delay: payload.delay || 1200,
      linkPreview: payload.linkPreview || true
    };

    const response = await axios.post(url, body, {
      headers: {
        'apikey': config.apiKey,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error: any) {
    console.error("Send Message Error:", error);
    throw error;
  }
};

// NEW: POST /message/sendMedia
export const sendMedia = async (config: AuthConfig, number: string, base64: string, fileName: string, mediaType: 'image' | 'document'): Promise<any> => {
    try {
        const url = `${cleanUrl(config.baseUrl)}/message/sendMedia/${config.instanceName}`;
        const targetNumber = number.split('@')[0];
        
        const body = {
            number: targetNumber,
            media: base64,
            mediatype: mediaType,
            fileName: fileName,
            caption: "" 
        };

        const response = await axios.post(url, body, {
            headers: {
                'apikey': config.apiKey,
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error: any) {
        console.error("Send Media Error:", error);
        throw error;
    }
};

// 5. POST /chat/findChats/{instance}
export const fetchChats = async (config: AuthConfig): Promise<Contact[]> => {
  try {
    const baseUrl = cleanUrl(config.baseUrl);
    
    const chatsUrl = `${baseUrl}/chat/findChats/${config.instanceName}`;
    const chatsResponse = await axios.post(chatsUrl, { where: {} }, { 
      headers: { 'apikey': config.apiKey, 'Content-Type': 'application/json' }
    });

    const contactsUrl = `${baseUrl}/chat/findContacts/${config.instanceName}`;
    const contactsResponse = await axios.post(contactsUrl, { where: {} }, {
        headers: { 'apikey': config.apiKey, 'Content-Type': 'application/json' }
    });

    const chatsRaw = Array.isArray(chatsResponse.data) ? chatsResponse.data : (chatsResponse.data?.data || []);
    const contactsRaw = Array.isArray(contactsResponse.data) ? contactsResponse.data : (contactsResponse.data?.data || []);

    const pushNamesMap = new Map<string, string>();
    contactsRaw.forEach((c: any) => {
        const jid = c.id || c.remoteJid;
        if (jid && c.pushName) {
            pushNamesMap.set(jid, c.pushName);
        }
    });

    const groupedChats = new Map<string, Contact>();

    chatsRaw.forEach((chat: any) => {
        const rawId = chat.remoteJid || chat.id;
        if (!rawId) return;

        const resolvedJid = getValidRemoteJid(chat);
        const isGroup = resolvedJid.includes('@g.us');
        
        // For contacts, extract phone from @s.whatsapp.net JID
        let phoneNumber = '';
        if (!isGroup) {
            // Try to find the @s.whatsapp.net JID from mergedIds or rawId
            const allJids = [rawId, resolvedJid, ...(chat.mergedIds || [])];
            const sWhatsappJid = allJids.find((j: string) => j?.includes('@s.whatsapp.net'));
            phoneNumber = sWhatsappJid ? sWhatsappJid.split('@')[0] : resolvedJid.split('@')[0];
        }
        
        const identifier = isGroup ? resolvedJid : phoneNumber;
        const timestampRaw = Number(chat.conversationTimestamp || chat.lastMessageTimestamp) || 0;
        const unreadCount = Number(chat.unreadCount) || Number(chat.count) || 0;

        let lastMessageText = '';
        const msgContent = chat.lastMessage?.message || chat.lastMessage;
        if (typeof chat.lastMessage === 'string') {
            lastMessageText = chat.lastMessage;
        } else if (msgContent) {
            lastMessageText = 
                msgContent.conversation || 
                msgContent.extendedTextMessage?.text || 
                (msgContent.imageMessage ? '📷 Foto' : null) ||
                (msgContent.audioMessage ? '🎤 Áudio' : null) ||
                (msgContent.videoMessage ? '🎥 Vídeo' : null) ||
                'Nova mensagem';
        }

        const pushName = pushNamesMap.get(resolvedJid) || pushNamesMap.get(rawId) || chat.pushName || chat.name || chat.verifiedName || identifier;

        if (groupedChats.has(identifier)) {
            const existing = groupedChats.get(identifier)!;
            if (!existing.mergedIds?.includes(rawId)) existing.mergedIds?.push(rawId);

            if (timestampRaw > (existing.timestampRaw || 0)) {
                existing.lastMessage = lastMessageText || existing.lastMessage;
                existing.lastMessageTime = timestampRaw ? new Date(timestampRaw * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : existing.lastMessageTime;
                existing.timestampRaw = timestampRaw;
                existing.name = pushName; 
            }
            existing.unreadCount = (existing.unreadCount || 0) + unreadCount;
            if (rawId.includes('@s.whatsapp.net') && !existing.id.includes('@s.whatsapp.net')) existing.id = rawId; 
        } else {
            groupedChats.set(identifier, {
                id: rawId,
                name: pushName,
                number: identifier,
                avatarUrl: chat.profilePictureUrl,
                lastMessage: lastMessageText,
                lastMessageTime: timestampRaw ? new Date(timestampRaw * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '',
                unreadCount: unreadCount,
                timestampRaw: timestampRaw,
                isGroup: isGroup,
                mergedIds: [rawId]
            });
        }
    });

    return Array.from(groupedChats.values()).sort((a, b) => (b.timestampRaw || 0) - (a.timestampRaw || 0));
  } catch (error: any) {
    console.error("Fetch Chats Error:", error);
    return [];
  }
};

export const fetchMessages = async (config: AuthConfig, contactIds: string | string[], page: number = 1, limit: number = 20): Promise<Message[]> => {
  try {
    const url = `${cleanUrl(config.baseUrl)}/chat/findMessages/${config.instanceName}`;
    const targets = Array.isArray(contactIds) ? contactIds : [contactIds];
    const requests = targets.map(jid => {
        const body = { where: { key: { remoteJid: jid } }, page: page, offset: limit };
        return axios.post(url, body, {
            headers: { 'apikey': config.apiKey, 'Content-Type': 'application/json' }
        }).then(res => res.data).catch(err => []);
    });
    const results = await Promise.all(requests);
    let allMessages: any[] = [];
    results.forEach(rawData => {
        let msgs: any[] = [];
        if (rawData?.messages?.records) msgs = rawData.messages.records;
        else if (rawData?.messages) msgs = rawData.messages;
        else if (Array.isArray(rawData)) msgs = rawData;
        else if (rawData?.data) msgs = rawData.data;
        allMessages = [...allMessages, ...msgs];
    });
    const uniqueMap = new Map();
    allMessages.forEach((msg: any) => {
        const keyId = msg.key?.id;
        if (keyId && !uniqueMap.has(keyId)) uniqueMap.set(keyId, msg);
    });
    return Array.from(uniqueMap.values()).map((msg: any): Message => {
        const content = msg.message || {};
        const key = msg.key || {};
        const text = content.conversation || content.extendedTextMessage?.text || content.imageMessage?.caption || (content.imageMessage ? '📷 [Foto]' : null) || (content.audioMessage ? '🎤 [Áudio]' : null) || (content.videoMessage ? '🎥 [Vídeo]' : null) || (content.stickerMessage ? '👾 [Sticker]' : null) || (content.documentMessage ? `📄 [Arquivo] ${content.documentMessage.title || ''}` : null) || 'Mensagem não suportada';
        const isMe = key.fromMe === true;
        let ts = msg.messageTimestamp;
        if (typeof ts === 'object' && ts?.low) ts = ts.low;
        if (ts && ts < 10000000000) ts = ts * 1000;
        let normalizedStatus: 'sending' | 'sent' | 'error' | 'read' = isMe ? 'sent' : 'read';
        return {
            id: key.id || Math.random().toString(),
            text: typeof text === 'string' ? text : String(text || ''),
            sender: isMe ? 'me' : 'them',
            timestamp: new Date(Number(ts) || Date.now()),
            status: normalizedStatus,
            fromUid: key.remoteJid 
        };
    }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()); 
  } catch (error: any) {
    console.error("[FetchMessages] Error:", error);
    throw error;
  }
};

export const fetchProfilePictureUrl = async (config: AuthConfig, numberOrJid: string): Promise<string | undefined> => {
    try {
        const url = `${cleanUrl(config.baseUrl)}/chat/fetchProfilePictureUrl/${config.instanceName}`;
        const response = await axios.post(url, { number: numberOrJid }, {
            headers: { 'apikey': config.apiKey, 'Content-Type': 'application/json' }
        });
        return response.data?.profilePictureUrl;
    } catch (error) { return undefined; }
};

export const markMessagesAsRead = async (config: AuthConfig, messages: Message[]): Promise<boolean> => {
    try {
        const url = `${cleanUrl(config.baseUrl)}/chat/markMessageAsRead/${config.instanceName}`;
        const readMessages = messages.filter(m => m.sender === 'them' && m.id && m.fromUid).map(m => ({ remoteJid: m.fromUid, fromMe: false, id: m.id }));
        if (readMessages.length === 0) return true;
        await axios.post(url, { readMessages }, { headers: { 'apikey': config.apiKey, 'Content-Type': 'application/json' } });
        return true;
    } catch (error) { return false; }
};

export const fetchAllInstances = async (config: AuthConfig): Promise<Instance[]> => {
    try {
        const url = `${cleanUrl(config.baseUrl)}/instance/fetchInstances`;
        // Usa a chave da configuração atual, não uma global hardcoded
        const response = await axios.get(url, { 
            headers: { 'apikey': config.apiKey } 
        });
        
        const data = response.data;
        if (Array.isArray(data)) {
            return data;
        }
        return data?.data || [];
    } catch (error: any) { 
        console.error("Fetch All Instances Error:", error);
        throw error; 
    }
};

export const createInstance = async (config: AuthConfig, instanceName: string, token?: string): Promise<any> => {
    try {
        const url = `${cleanUrl(config.baseUrl)}/instance/create`;
        const body = { instanceName: instanceName, token: token, qrcode: true, integration: "WHATSAPP-BAILEYS" };
        const response = await axios.post(url, body, { 
            headers: { 
                'Content-Type': 'application/json', 
                'apikey': config.apiKey 
            } 
        });
        return response.data;
    } catch (error: any) { throw error; }
};

export const connectInstance = async (config: AuthConfig): Promise<any> => {
    try {
        const url = `${cleanUrl(config.baseUrl)}/instance/connect/${config.instanceName}`;
        const response = await axios.get(url, { headers: { 'apikey': config.apiKey } });
        return response.data;
    } catch (error: any) { throw error; }
};

export const fetchConnectionState = async (config: AuthConfig): Promise<any> => {
    try {
        const url = `${cleanUrl(config.baseUrl)}/instance/connectionState/${config.instanceName}`;
        const response = await axios.get(url, { headers: { 'apikey': config.apiKey } });
        return response.data;
    } catch (error: any) { return null; }
};
