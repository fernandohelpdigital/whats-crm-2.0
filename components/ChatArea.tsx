
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Contact, Message, AuthConfig } from '../types';
import { Button, Input, Avatar } from './ui/Shared';
import { Send, Paperclip, Phone, Video, Info, Check, CheckCheck, Loader2, RefreshCcw, AlertCircle, ChevronLeft, Mic, Download, ImageIcon, X, File, Image, Shield } from 'lucide-react';
import { sendMessage, fetchMessages, fetchProfilePictureUrl, markMessagesAsRead, sendMedia } from '../services/evolutionClient';
import { getSocket } from '../services/socketClient';
import toast from 'react-hot-toast';
import axios from 'axios';

interface ChatAreaProps {
  contact: Contact;
  config: AuthConfig;
  onToggleInfo: () => void;
  onBack?: () => void;
  onMarkAsRead?: (contactId: string) => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({ contact, config, onToggleInfo, onBack, onMarkAsRead }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(contact.avatarUrl);
  const [mediaCache, setMediaCache] = useState<{ [key: string]: string }>({});
  const [downloadingMedia, setDownloadingMedia] = useState<{ [key: string]: boolean }>({});
  
  // Media States
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>("*");

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- WebSocket Integration ---
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleMessageUpsert = (payload: any) => {
        let eventData = payload;
        if (Array.isArray(payload)) {
            eventData = payload[0];
        }

        const msgData = eventData.data || eventData;
        const key = msgData.key;

        if (!key || !key.remoteJid) return;

        const incomingJid = key.remoteJid.split('@')[0];
        const currentChatJid = contact.id.split('@')[0];

        if (incomingJid !== currentChatJid) return;

        const isMe = key.fromMe;
        const msgId = key.id;

        const messageContent = msgData.message || msgData;

        setMessages((prev) => {
            if (prev.some(m => m.id === msgId)) {
                if (isMe) {
                    return prev.map(m => m.id === msgId ? { ...m, status: 'sent' } : m);
                }
                return prev;
            }

            let text = 'Mensagem não suportada';
            if (messageContent.conversation) text = messageContent.conversation;
            else if (messageContent.extendedTextMessage?.text) text = messageContent.extendedTextMessage.text;
            else if (messageContent.imageMessage) text = messageContent.imageMessage.caption || '📷 [Foto]';
            else if (messageContent.audioMessage) text = '🎤 [Áudio]';
            else if (messageContent.videoMessage) text = '🎥 [Vídeo]';
            else if (messageContent.documentMessage) text = `📄 [Arquivo] ${messageContent.documentMessage.title || ''}`;
            else if (messageContent.stickerMessage) text = '👾 [Sticker]';

            const newMessage: Message = {
                id: msgId,
                text: text,
                sender: isMe ? 'me' : 'them',
                timestamp: new Date((Number(msgData.messageTimestamp) * 1000) || Date.now()),
                status: isMe ? 'sent' : 'read',
                fromUid: key.remoteJid
            };
            
            if (!isMe) {
                markMessagesAsRead(config, [newMessage]);
                onMarkAsRead?.(contact.id);
            }

            return [...prev, newMessage];
        });
    };

    socket.on("MESSAGES_UPSERT", handleMessageUpsert);
    socket.on("messages.upsert", handleMessageUpsert);
    
    socket.on("MESSAGES_UPDATE", (payload: any) => {
         let data = payload;
         if (Array.isArray(payload)) data = payload[0];

         const updateData = data.data || data;
         
         if (Array.isArray(updateData)) {
             updateData.forEach((update: any) => {
                 const updateJid = update.key.remoteJid?.split('@')[0];
                 const currentChatJid = contact.id.split('@')[0];

                 if (updateJid === currentChatJid) {
                     const statusMap: any = { 3: 'sent', 4: 'read', 5: 'read' }; 
                     const newStatus = statusMap[update.update.status] || 'sent';
                     
                     setMessages(prev => prev.map(m => 
                         m.id === update.key.id ? { ...m, status: newStatus } : m
                     ));
                 }
             });
         }
    });

    return () => {
        socket.off("MESSAGES_UPSERT", handleMessageUpsert);
        socket.off("messages.upsert", handleMessageUpsert);
        socket.off("MESSAGES_UPDATE");
    };
  }, [contact.id, config, onMarkAsRead]);

  useEffect(() => {
    setCurrentAvatar(contact.avatarUrl);
    let isMounted = true;
    const refreshAvatar = async () => {
        if (!contact.id) return;
        const url = await fetchProfilePictureUrl(config, contact.id);
        if (isMounted && url) {
            setCurrentAvatar(url);
        }
    };
    refreshAvatar();
    return () => { isMounted = false; };
  }, [contact, config]);

  const loadMessages = useCallback(async () => {
    if (!contact.id) return;
    setLoadingMessages(true);
    setError(false);
    setMessages([]); 
    try {
        const idsToFetch = contact.mergedIds && contact.mergedIds.length > 0 
            ? contact.mergedIds 
            : [contact.id];
        const history = await fetchMessages(config, idsToFetch, 1, 50);
        setMessages(history);
        if (contact.unreadCount && contact.unreadCount > 0) {
             await markMessagesAsRead(config, history);
             onMarkAsRead?.(contact.id);
        }
    } catch (e) {
        console.error("Failed to load messages:", e);
        setError(true);
        toast.error("Failed to load chat history");
    } finally {
        setLoadingMessages(false);
    }
  }, [contact.id, contact.mergedIds, contact.unreadCount, config, onMarkAsRead]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!loadingMessages) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loadingMessages]);

  const handleDownloadMedia = async (messageId: string, mimeType: string) => {
    setDownloadingMedia(prev => ({ ...prev, [messageId]: true }));
    try {
      const response = await axios.post(
        `${config.baseUrl.replace(/\/$/, '')}/chat/getBase64FromMediaMessage/${config.instanceName}`,
        {
          message: {
            key: {
              id: messageId
            }
          },
          convertToMp4: false
        },
        {
          headers: {
            'apikey': config.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const base64Data = response.data?.base64 || response.data?.data?.base64;
      if (base64Data) {
        const mediaUrl = `data:${mimeType};base64,${base64Data}`;
        setMediaCache(prev => ({ ...prev, [messageId]: mediaUrl }));
      } else {
        throw new Error("Mídia não encontrada na resposta");
      }
    } catch (err) {
      console.error("Erro ao baixar mídia:", err);
      toast.error("Não foi possível carregar a mídia.");
    } finally {
      setDownloadingMedia(prev => ({ ...prev, [messageId]: false }));
    }
  };

  const openFileSelector = (type: 'image' | 'document') => {
      setMediaTypeFilter(type === 'image' ? "image/*" : "*");
      setShowMediaOptions(false);
      setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const mediaType = file.type.startsWith('image/') ? 'image' : 'document';
          
          const tempId = Date.now().toString();
          const newMessage: Message = {
            id: tempId,
            text: mediaType === 'image' ? '📷 [Foto]' : `📄 [Documento] ${file.name}`,
            sender: 'me',
            timestamp: new Date(),
            status: 'sending'
          };
          setMessages(prev => [...prev, newMessage]);

          try {
            await sendMedia(config, contact.id, base64, file.name, mediaType);
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'sent' } : m));
          } catch (err) {
            console.error("Error sending media:", err);
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
            toast.error("Erro ao enviar arquivo.");
          }
      };
      e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          await sendAudioMessage(base64Audio);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      toast.error("Acesso ao microfone negado.");
    }
  };

  const stopRecording = (shouldSend: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (!shouldSend) {
        mediaRecorderRef.current.onstop = null;
      }
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingTime(0);
  };

  const sendAudioMessage = async (base64: string) => {
    const tempId = Date.now().toString();
    const newMessage: Message = {
      id: tempId,
      text: '🎤 [Áudio]',
      sender: 'me',
      timestamp: new Date(),
      status: 'sending'
    };
    setMessages(prev => [...prev, newMessage]);

    const targetNumber = contact.id.split('@')[0];

    try {
      await axios.post(
        `${config.baseUrl.replace(/\/$/, '')}/message/sendWhatsAppAudio/${config.instanceName}`,
        {
          number: targetNumber,
          audio: base64
        },
        {
          headers: {
            'apikey': config.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'sent' } : m));
    } catch (err: any) {
      console.error("Error sending audio:", err);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
      const errMsg = err.response?.data?.message || "Erro ao enviar áudio.";
      toast.error(errMsg);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;
    const tempId = Date.now().toString();
    const newMessage: Message = {
      id: tempId,
      text: inputValue,
      sender: 'me',
      timestamp: new Date(),
      status: 'sending'
    };
    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
    try {
      const response = await sendMessage(config, {
        number: contact.id,
        text: newMessage.text
      });
    } catch (error) {
      setMessages((prev) => 
        prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m)
      );
      toast.error("Failed to send message.");
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden" onClick={() => setShowMediaOptions(false)}>
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept={mediaTypeFilter}
            onChange={handleFileChange}
        />
        
        {/* Background com textura sutil HelpDigital */}
        <div className="absolute inset-0 z-0 bg-[#F8FAFC] dark:bg-[#0b141a]">
             <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
                backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
                backgroundSize: '400px'
            }}></div>
        </div>

      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-white/80 dark:bg-[#111b21]/90 backdrop-blur-md z-10 shadow-sm">
        <div className="flex items-center gap-1 md:gap-3">
          <Button variant="ghost" size="icon" className="md:hidden -ml-2 text-muted-foreground" onClick={onBack}>
             <ChevronLeft className="h-6 w-6" />
          </Button>
          <Avatar src={currentAvatar} alt={contact.name} fallback={contact.name} className="h-10 w-10 ring-2 ring-primary/10" />
          <div className="flex-1 min-w-0 ml-2 cursor-pointer" onClick={onToggleInfo}>
            <h2 className="font-bold text-base text-foreground truncate max-w-[150px] md:max-w-md">{contact.name}</h2>
            <p className="text-xs text-muted-foreground truncate font-medium">
                {contact.isGroup ? 'Grupo' : contact.number}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex rounded-xl"><Video className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex rounded-xl"><Phone className="h-5 w-5" /></Button>
            <div className="w-px h-6 bg-border mx-1"></div>
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={loadMessages}><RefreshCcw className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={onToggleInfo}><Info className="h-5 w-5" /></Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 z-10 scrollbar-thin scrollbar-thumb-border/40">
        {loadingMessages ? (
             <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <span className="text-sm font-medium animate-pulse">Sincronizando conversas...</span>
             </div>
        ) : error ? (
             <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                <AlertCircle className="h-12 w-12 text-red-500/50" />
                <div className="text-center">
                    <p className="font-bold text-lg">Erro ao carregar</p>
                    <p className="text-sm opacity-70">Verifique sua conexão com a API.</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadMessages} className="gap-2">
                    <RefreshCcw className="h-3 w-3" /> Tentar Novamente
                </Button>
             </div>
        ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
                 <div className="bg-white/50 dark:bg-white/5 backdrop-blur border border-border p-6 rounded-2xl text-center max-w-sm shadow-sm">
                    <Shield className="w-12 h-12 mx-auto text-primary mb-3" />
                    <h3 className="font-bold text-lg mb-2">Mensagens Seguras</h3>
                    <span className="text-muted-foreground text-sm leading-relaxed block">
                        As mensagens são protegidas por criptografia de ponta a ponta. Ninguém fora desta conversa pode lê-las.
                    </span>
                 </div>
            </div>
        ) : (
            <>
                {messages.map((msg) => {
                  const isMe = msg.sender === 'me';
                  const isAudio = msg.text.includes('🎤 [Áudio]');
                  const isImage = msg.text.includes('📷 [Foto]');
                  const isDoc = msg.text.includes('📄 [Arquivo]') || msg.text.includes('📄 [Documento]');
                  const mediaUrl = mediaCache[msg.id];
                  const isDownloading = downloadingMedia[msg.id];

                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2 group`}>
                        <div className={`
                            max-w-[85%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 shadow-sm text-[15px] leading-relaxed relative
                            ${isMe 
                                ? 'bg-gradient-to-br from-primary to-orange-600 text-white rounded-br-none shadow-primary/20' 
                                : 'bg-white dark:bg-[#202c33] text-foreground rounded-bl-none border border-border/50'
                            }
                            ${isAudio ? 'min-w-[260px]' : ''}
                            ${isImage ? 'p-1.5' : ''}
                        `}>
                            {isAudio ? (
                              <div className="py-2 flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isMe ? 'bg-white/20' : 'bg-primary/10'}`}>
                                    <Mic className={`w-5 h-5 ${isMe ? 'text-white' : 'text-primary'}`} />
                                  </div>
                                  <div className="flex-1">
                                    {!mediaUrl ? (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => handleDownloadMedia(msg.id, 'audio/ogg')}
                                        disabled={isDownloading}
                                        className={`h-9 gap-2 w-full justify-start ${isMe ? 'hover:bg-white/10 text-white' : 'hover:bg-primary/10'}`}
                                      >
                                        {isDownloading ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Download className="w-4 h-4" />
                                        )}
                                        <span className="text-xs font-bold">Reproduzir Áudio</span>
                                      </Button>
                                    ) : (
                                      <audio controls className="h-8 w-full max-w-[200px]">
                                        <source src={mediaUrl} type="audio/ogg" />
                                      </audio>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : isImage ? (
                                <div className="flex flex-col gap-1 min-w-[200px]">
                                    {!mediaUrl ? (
                                        <div className={`flex flex-col items-center justify-center py-10 gap-3 rounded-xl ${isMe ? 'bg-white/10' : 'bg-muted/50'}`}>
                                            <ImageIcon className={`w-8 h-8 opacity-60 ${isMe ? 'text-white' : 'text-muted-foreground'}`} />
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => handleDownloadMedia(msg.id, 'image/jpeg')}
                                                disabled={isDownloading}
                                                className={`h-9 gap-2 border ${isMe ? 'border-white/30 hover:bg-white/20 text-white' : 'border-border hover:bg-white text-foreground'}`}
                                            >
                                                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                                <span className="text-xs font-bold uppercase tracking-tight">Baixar</span>
                                            </Button>
                                        </div>
                                    ) : (
                                        <img 
                                            src={mediaUrl} 
                                            alt="Mídia" 
                                            className="rounded-xl w-full max-h-[400px] object-contain cursor-pointer transition-transform hover:scale-[1.01]"
                                            onClick={() => window.open(mediaUrl, '_blank')}
                                        />
                                    )}
                                </div>
                            ) : isDoc ? (
                                <div className="flex flex-col gap-2 py-1">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                                            <File className="w-5 h-5" />
                                        </div>
                                        <p className="whitespace-pre-wrap break-words font-medium text-sm">{msg.text.replace('📄 [Arquivo] ', '').replace('📄 [Documento] ', '')}</p>
                                    </div>
                                    {!mediaUrl ? (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => handleDownloadMedia(msg.id, 'application/octet-stream')}
                                            disabled={isDownloading}
                                            className={`h-8 gap-2 w-full ${isMe ? 'hover:bg-white/10 text-white' : 'hover:bg-muted'}`}
                                        >
                                            {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                            <span className="text-xs font-bold">Download</span>
                                        </Button>
                                    ) : (
                                        <Button variant="link" size="sm" asChild className={`h-8 font-bold ${isMe ? 'text-white' : 'text-primary'}`}>
                                            <a href={mediaUrl} download>Abrir Arquivo</a>
                                        </Button>
                                    )}
                                </div>
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                            )}
                            
                            <div className={`flex items-center justify-end gap-1 mt-1 select-none float-right ml-3 ${isImage ? 'mr-1 mb-1' : '-mb-1'}`}>
                                <span className={`text-[10px] font-medium ${isMe ? 'text-white/80' : 'text-muted-foreground'}`}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isMe && (
                                    <span className={msg.status === 'read' ? 'text-blue-200' : 'text-white/60'}>
                                        {msg.status === 'sending' && <span className="text-[10px]">...</span>}
                                        {msg.status === 'sent' && <Check className="w-3.5 h-3.5" />}
                                        {msg.status === 'read' && <CheckCheck className="w-3.5 h-3.5" />}
                                        {msg.status === 'error' && <AlertCircle className="w-3 h-3 text-red-200" />}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
            </>
        )}
      </div>

      {/* INPUT AREA */}
      <div className="px-4 py-3 bg-white dark:bg-[#111b21] z-10 border-t border-border">
         {isRecording ? (
           <div className="flex-1 flex items-center justify-between bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl px-4 h-14 animate-fade-in">
              <div className="flex items-center gap-3">
                 <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-md shadow-red-500/50" />
                 <span className="text-base font-mono font-medium text-red-600 dark:text-red-400">{formatTime(recordingTime)}</span>
                 <span className="text-sm text-red-400 ml-2">Gravando...</span>
              </div>
              <div className="flex items-center gap-3">
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 text-red-500 hover:bg-red-100 rounded-full" 
                    onClick={() => stopRecording(false)}
                 >
                    <X className="h-5 w-5" />
                 </Button>
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 bg-primary text-white hover:bg-primary/90 rounded-full shadow-lg shadow-primary/30" 
                    onClick={() => stopRecording(true)}
                 >
                    <Send className="h-5 w-5" />
                 </Button>
              </div>
           </div>
         ) : (
           <div className="flex items-end gap-2 max-w-5xl mx-auto w-full">
             <div className="relative pb-1">
                {showMediaOptions && (
                    <div className="absolute bottom-14 left-0 bg-white dark:bg-[#202c33] rounded-2xl shadow-xl border border-border p-2 min-w-[180px] animate-slide-up z-[60]">
                        <button 
                            onClick={(e) => { e.stopPropagation(); openFileSelector('image'); }}
                            className="flex items-center gap-3 w-full p-3 hover:bg-muted dark:hover:bg-white/5 rounded-xl transition-colors text-sm font-bold"
                        >
                            <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 p-2 rounded-lg"><Image className="w-4 h-4" /></div>
                            Fotos e Vídeos
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); openFileSelector('document'); }}
                            className="flex items-center gap-3 w-full p-3 hover:bg-muted dark:hover:bg-white/5 rounded-xl transition-colors text-sm font-bold"
                        >
                            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 p-2 rounded-lg"><File className="w-4 h-4" /></div>
                            Documento
                        </button>
                    </div>
                )}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`rounded-xl transition-all ${showMediaOptions ? 'bg-primary/10 text-primary rotate-45' : 'text-muted-foreground hover:bg-muted'}`}
                    onClick={(e) => { e.stopPropagation(); setShowMediaOptions(!showMediaOptions); }}
                >
                    <Paperclip className="h-5 w-5" />
                </Button>
             </div>

            <form onSubmit={handleSend} className="flex-1 flex items-end gap-2 bg-[#f0f2f5] dark:bg-[#202c33] p-1.5 rounded-3xl border border-transparent focus-within:border-primary/30 focus-within:bg-white dark:focus-within:bg-[#2a3942] transition-all duration-300">
                <Input 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Digite sua mensagem..." 
                    className="flex-1 border-none bg-transparent focus-visible:ring-0 py-3 h-auto min-h-[44px] max-h-[120px] resize-none text-[15px] placeholder:text-muted-foreground/70"
                    disabled={loadingMessages || error}
                    autoComplete="off"
                />
                <div className="flex shrink-0 pb-1 pr-1">
                    {inputValue.trim() ? (
                        <Button type="submit" size="icon" className="rounded-full h-10 w-10 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all hover:scale-105" disabled={loadingMessages || error}>
                            <Send className="h-5 w-5 ml-0.5" />
                        </Button>
                    ) : (
                        <Button 
                        type="button" 
                        size="icon" 
                        variant="ghost" 
                        className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        onClick={startRecording}
                        >
                            <Mic className="h-6 w-6" />
                        </Button>
                    )}
                </div>
            </form>
           </div>
         )}
      </div>
    </div>
  );
};

export default ChatArea;
