
import React, { useState, useEffect, useRef } from 'react';
import { AuthConfig } from '../types';
import { Button, Card, Input } from './ui/Shared';
import { QrCode, Wifi, RefreshCw, Smartphone, CheckCircle2, AlertCircle, Settings as SettingsIcon, Terminal, Activity, Trash2, PauseCircle, PlayCircle, Save, User, Volume2, VolumeX, Bell } from 'lucide-react';
import { connectInstance, fetchConnectionState } from '../services/evolutionClient';
import { getSocket, subscribeToAllEvents } from '../services/socketClient';
import toast from 'react-hot-toast';
import { supabase } from '@/src/integrations/supabase/client';
import { useAuth } from '../src/hooks/useAuth';

interface SettingsPageProps {
  config: AuthConfig;
}

interface LogEntry {
    id: string;
    timestamp: string;
    event: string;
    data: any;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ config }) => {
  const { user, profile, refreshProfile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'connection' | 'notifications' | 'debug'>('profile');
  
  // Notification settings (loaded from DB)
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifVolume, setNotifVolume] = useState(0.5);
  const [notifSound, setNotifSound] = useState('default');
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifLoaded, setNotifLoaded] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load notification settings from Supabase
  useEffect(() => {
    let cancelled = false;
    const loadNotifSettings = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u || cancelled) return;
      const { data } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', u.id)
        .single();
      if (data && !cancelled) {
        setNotifEnabled(data.enabled);
        setNotifVolume(Number(data.volume));
        setNotifSound(data.sound_type);
        // Sync to localStorage for ChatDashboard
        localStorage.setItem('notif_enabled', String(data.enabled));
        localStorage.setItem('notif_volume', String(data.volume));
        localStorage.setItem('notif_sound', data.sound_type);
      }
      if (!cancelled) setNotifLoaded(true);
    };
    loadNotifSettings();
    return () => { cancelled = true; };
  }, []);
  
  // Profile form
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [instanceName, setInstanceName] = useState(profile?.instance_name || '');
  const [baseUrl, setBaseUrl] = useState(profile?.base_url || 'https://api.automacaohelp.com.br');
  const [apiKey, setApiKey] = useState(profile?.api_key || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // States Tab Connection
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connecting' | 'connected' | 'disconnected'>('unknown');

  // States Tab Debug
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [socketStatus, setSocketStatus] = useState<string>('Verificando...');
  const [isPaused, setIsPaused] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setInstanceName(profile.instance_name || '');
      setBaseUrl(profile.base_url || 'https://api.automacaohelp.com.br');
      setApiKey(profile.api_key || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          instance_name: instanceName,
          base_url: baseUrl,
          api_key: apiKey,
        })
        .eq('id', user.id);
      
      if (error) throw error;
      await refreshProfile?.();
      toast.success("Perfil atualizado! Recarregue a página para aplicar as mudanças de instância.");
    } catch (e: any) {
      toast.error("Erro ao salvar perfil: " + e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const checkStatus = async () => {
      if (!config?.instanceName) return;
      try {
          const statusData = await fetchConnectionState(config);
          const state = statusData?.instance?.state;
          if (state === 'open') { setConnectionStatus('connected'); setQrCode(null); }
          else if (state === 'connecting') { setConnectionStatus('connecting'); }
          else { setConnectionStatus('disconnected'); }
      } catch (error) {
          console.error("Falha ao checar status:", error);
          setConnectionStatus('disconnected');
      }
  };

  useEffect(() => {
      if (config?.instanceName) checkStatus();
  }, [config]);

  // Socket Debug Logic
  useEffect(() => {
    const interval = setInterval(() => {
        const sock = getSocket();
        if (sock) {
            setSocketStatus(sock.connected 
                ? `Conectado (ID: ${sock.id}) | Transp: ${sock.io.engine.transport.name}` 
                : 'Desconectado');
        } else {
            setSocketStatus('Instância do Socket não inicializada');
        }
    }, 1000);

    const unsubscribe = subscribeToAllEvents((event, data) => {
        if (isPaused) return;
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            event,
            data
        };
        setLogs(prev => [newLog, ...prev].slice(0, 50));
    });

    return () => { clearInterval(interval); unsubscribe(); };
  }, [isPaused]);

  const handleGenerateQRCode = async () => {
    if (!config?.instanceName) {
      toast.error("Configure o nome da instância no perfil primeiro.");
      return;
    }
    setIsLoading(true);
    setQrCode(null);
    try {
      const data = await connectInstance(config);
      if (data && data.base64) {
        setQrCode(data.base64);
        setConnectionStatus('connecting');
        toast.success("QR Code gerado com sucesso!");
      } else if (data && (data.instance?.status === 'open' || data.instance?.state === 'open')) {
         setConnectionStatus('connected');
         toast.success("Instância já está conectada!");
      } else {
         await checkStatus();
      }
    } catch (error: any) {
      if (error.response?.data?.message?.includes('already connected') || error.message?.includes('connected')) {
          setConnectionStatus('connected');
          toast.success("WhatsApp já conectado!");
      } else {
          toast.error("Erro ao gerar QR Code.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#f0f2f5] dark:bg-[#0b141a] p-6 overflow-hidden animate-fade-in">
      
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-[#111b21] dark:text-[#e9edef] flex items-center gap-2">
            <SettingsIcon className="text-[#00a884] h-8 w-8" />
            Configurações
            </h1>
            <p className="text-[#54656f] dark:text-[#8696a0] mt-1 text-sm">
            Gerencie seu perfil, conexão e monitore eventos.
            </p>
        </div>
        
        {/* Tabs */}
        <div className="flex p-1 bg-white dark:bg-[#202c33] rounded-lg border border-border flex-wrap gap-1">
            <button 
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'profile' ? 'bg-[#00a884] text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
            >
                <User className="w-4 h-4" /> Perfil
            </button>
            <button 
                onClick={() => setActiveTab('connection')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'connection' ? 'bg-[#00a884] text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
            >
                Conexão
            </button>
            <button 
                onClick={() => setActiveTab('notifications')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'notifications' ? 'bg-[#00a884] text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
            >
                <Bell className="w-4 h-4" /> Notificações
            </button>
            <button 
                onClick={() => setActiveTab('debug')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'debug' ? 'bg-[#00a884] text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
            >
                <Terminal className="w-4 h-4" /> Debug
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="flex justify-center pt-4">
            <Card className="w-full max-w-2xl p-6 border-none shadow-md bg-white dark:bg-[#202c33] animate-slide-up">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Dados do Perfil
              </h2>
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Nome de Exibição</label>
                  <Input 
                    value={displayName} 
                    onChange={e => setDisplayName(e.target.value)} 
                    className="h-11" 
                    placeholder="Seu nome"
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Nome da Instância (Help Whats API)</label>
                  <Input 
                    value={instanceName} 
                    onChange={e => setInstanceName(e.target.value)} 
                    className="h-11 font-mono" 
                    placeholder="nome-da-instancia"
                    disabled={!isAdmin}
                  />
                  <p className="text-[10px] text-muted-foreground">Identificador da sua instância na Help Whats API.</p>
                </div>
                {isAdmin && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-muted-foreground">URL Base da API</label>
                      <Input 
                        value={baseUrl} 
                        onChange={e => setBaseUrl(e.target.value)} 
                        className="h-11 font-mono" 
                        placeholder="https://api.automacaohelp.com.br"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-muted-foreground">API Key (Help Whats API)</label>
                      <Input 
                        type="password"
                        value={apiKey} 
                        onChange={e => setApiKey(e.target.value)} 
                        className="h-11 font-mono" 
                        placeholder="Sua chave de API"
                      />
                      <p className="text-[10px] text-muted-foreground">Chave de autenticação para acessar a Help Whats API.</p>
                    </div>
                  </>
                )}
                {isAdmin ? (
                  <Button
                    onClick={handleSaveProfile} 
                    disabled={savingProfile}
                    className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-6 gap-2"
                  >
                    <Save className="w-4 h-4" /> {savingProfile ? 'Salvando...' : 'Salvar Perfil'}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Apenas administradores podem alterar as configurações do perfil.</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* CONNECTION TAB */}
        {activeTab === 'connection' && (
             <div className="flex justify-center pt-4">
                <Card className="w-full max-w-2xl p-6 border-none shadow-md bg-white dark:bg-[#202c33] flex flex-col items-center text-center relative overflow-hidden animate-slide-up">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00a884] to-[#25D366]" />
                    
                    <div className="mb-6 mt-2">
                        <div className="w-16 h-16 bg-[#00a884]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Smartphone className="w-8 h-8 text-[#00a884]" />
                        </div>
                        <h2 className="text-xl font-bold text-[#111b21] dark:text-[#e9edef]">Conexão WhatsApp</h2>
                        <p className="text-sm text-[#54656f] dark:text-[#8696a0] mt-2">
                            Escaneie o QR Code para sincronizar suas mensagens.
                        </p>
                    </div>

                    {!config?.instanceName ? (
                      <div className="text-center p-8 text-muted-foreground">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="font-bold">Configure o nome da instância</p>
                        <p className="text-sm mt-2">Vá para a aba "Perfil" e preencha o nome da sua instância Help Whats API.</p>
                      </div>
                    ) : (
                      <div className="w-full max-w-sm space-y-4">
                        <div className="flex items-center justify-between p-3 bg-[#f0f2f5] dark:bg-[#111b21] rounded-lg border border-border">
                            <span className="text-sm font-semibold text-[#54656f] dark:text-[#8696a0]">Instância:</span>
                            <span className="text-sm font-bold text-[#111b21] dark:text-[#e9edef] font-mono bg-white dark:bg-white/5 px-2 py-1 rounded">
                                {config.instanceName}
                            </span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-[#f0f2f5] dark:bg-[#111b21] rounded-lg border border-border">
                            <span className="text-sm font-semibold text-[#54656f] dark:text-[#8696a0]">Status:</span>
                            <span className={`text-sm font-bold flex items-center gap-1 uppercase ${
                                connectionStatus === 'connected' ? 'text-green-600' : 
                                connectionStatus === 'connecting' ? 'text-yellow-600' : 'text-gray-500'
                            }`}>
                                {connectionStatus === 'connected' ? (
                                    <><CheckCircle2 className="w-4 h-4" /> Conectado</>
                                ) : connectionStatus === 'connecting' ? (
                                    <><Wifi className="w-4 h-4 animate-pulse" /> Aguardando Leitura</>
                                ) : (
                                    <><AlertCircle className="w-4 h-4" /> Desconectado</>
                                )}
                            </span>
                        </div>

                        <div className="min-h-[260px] flex items-center justify-center bg-[#f0f2f5] dark:bg-[#111b21] rounded-xl border-2 border-dashed border-border mt-6 relative group">
                            {isLoading ? (
                                <div className="flex flex-col items-center gap-2 animate-pulse">
                                    <RefreshCw className="w-8 h-8 text-[#00a884] animate-spin" />
                                    <span className="text-xs text-[#54656f]">Verificando...</span>
                                </div>
                            ) : qrCode ? (
                                <div className="relative p-2 bg-white rounded-lg shadow-sm animate-zoom-in">
                                    <img src={qrCode} alt="QR Code WhatsApp" className="w-60 h-60 object-contain" />
                                </div>
                            ) : connectionStatus === 'connected' ? (
                                <div className="flex flex-col items-center gap-3 text-green-600 animate-zoom-in">
                                    <CheckCircle2 className="w-16 h-16" />
                                    <span className="font-bold">Instância Sincronizada</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-[#54656f] dark:text-[#8696a0] opacity-50">
                                    <QrCode className="w-12 h-12" />
                                    <span className="text-sm">QR Code não gerado</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 w-full">
                            {connectionStatus !== 'connected' && (
                                <Button 
                                    onClick={handleGenerateQRCode} 
                                    disabled={isLoading}
                                    className="flex-1 bg-[#00a884] hover:bg-[#008f6f] text-white font-bold h-12 shadow-lg shadow-green-500/20"
                                >
                                    {isLoading ? 'Aguarde...' : 'Gerar Novo QR Code'}
                                </Button>
                            )}
                            <Button 
                                onClick={checkStatus} 
                                variant="outline"
                                disabled={isLoading}
                                className="h-12 w-12 border-border"
                                title="Verificar Status"
                            >
                                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                      </div>
                    )}
                </Card>
             </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="flex justify-center pt-4">
            <Card className="w-full max-w-2xl p-6 border-none shadow-md bg-white dark:bg-[#202c33] animate-slide-up">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> Notificações de Mensagens
              </h2>
              <div className="space-y-6">
                
                {/* Toggle */}
                <div className="flex items-center justify-between p-4 bg-[#f0f2f5] dark:bg-[#111b21] rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    {notifEnabled ? <Volume2 className="w-5 h-5 text-[#00a884]" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
                    <div>
                      <p className="font-bold text-sm">Som de Notificação</p>
                      <p className="text-xs text-muted-foreground">Tocar som ao receber mensagens de chats não abertos</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifEnabled(!notifEnabled)}
                    className={`relative w-12 h-7 rounded-full transition-colors ${notifEnabled ? 'bg-[#00a884]' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${notifEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {/* Volume */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Volume ({Math.round(notifVolume * 100)}%)</label>
                  <div className="flex items-center gap-3">
                    <VolumeX className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={notifVolume}
                      onChange={(e) => setNotifVolume(parseFloat(e.target.value))}
                      disabled={!notifEnabled}
                      className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-[#00a884] bg-gray-200 dark:bg-gray-700 disabled:opacity-40"
                    />
                    <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </div>

                {/* Sound choices */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Tipo de Som</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'default', label: 'Padrão', desc: 'Tom curto', icon: '🔔' },
                      { id: 'soft', label: 'Suave', desc: 'Tom leve', icon: '🔕' },
                      { id: 'alert', label: 'Alerta', desc: 'Tom forte', icon: '🚨' },
                      { id: 'chime', label: 'Sino', desc: 'Campainha', icon: '🛎️' },
                      { id: 'pop', label: 'Pop', desc: 'Bolha', icon: '💬' },
                      { id: 'ding', label: 'Ding', desc: 'Toque rápido', icon: '✨' },
                      { id: 'whistle', label: 'Apito', desc: 'Apito curto', icon: '📢' },
                      { id: 'drop', label: 'Gota', desc: 'Som de gota', icon: '💧' },
                      { id: 'marimba', label: 'Marimba', desc: 'Tom musical', icon: '🎵' },
                    ].map((sound) => (
                      <button
                        key={sound.id}
                        onClick={() => {
                          setNotifSound(sound.id);
                          // Preview the sound
                          localStorage.setItem('notif_sound', sound.id);
                          localStorage.setItem('notif_volume', String(notifVolume));
                          localStorage.setItem('notif_enabled', 'true');
                          const event = new CustomEvent('test-notification-sound');
                          window.dispatchEvent(event);
                        }}
                        disabled={!notifEnabled}
                        className={`p-3 rounded-lg border-2 text-left transition-all disabled:opacity-40 ${
                          notifSound === sound.id
                            ? 'border-[#00a884] bg-[#00a884]/5'
                            : 'border-border hover:border-[#00a884]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{sound.icon}</span>
                          <p className="font-bold text-sm">{sound.label}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{sound.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={async () => {
                      if (!user) return;
                      setSavingNotif(true);
                      try {
                        const settingsData = {
                          user_id: user.id,
                          enabled: notifEnabled,
                          volume: notifVolume,
                          sound_type: notifSound,
                        };
                        const { error } = await supabase
                          .from('notification_settings')
                          .upsert(settingsData, { onConflict: 'user_id' });
                        if (error) throw error;
                        // Sync to localStorage
                        localStorage.setItem('notif_enabled', String(notifEnabled));
                        localStorage.setItem('notif_volume', String(notifVolume));
                        localStorage.setItem('notif_sound', notifSound);
                        toast.success('Configurações de notificação salvas!');
                      } catch (e: any) {
                        toast.error('Erro ao salvar: ' + e.message);
                      } finally {
                        setSavingNotif(false);
                      }
                    }}
                    disabled={savingNotif}
                    className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-6 gap-2"
                  >
                    <Save className="w-4 h-4" /> {savingNotif ? 'Salvando...' : 'Salvar Configurações'}
                  </Button>
                  <Button
                    onClick={() => {
                      localStorage.setItem('notif_enabled', String(notifEnabled));
                      localStorage.setItem('notif_volume', String(notifVolume));
                      localStorage.setItem('notif_sound', notifSound);
                      const event = new CustomEvent('test-notification-sound');
                      window.dispatchEvent(event);
                    }}
                    disabled={!notifEnabled}
                    variant="outline"
                    className="gap-2 h-11 font-bold"
                  >
                    <Volume2 className="w-4 h-4" /> Testar Som
                  </Button>
                </div>

              </div>
            </Card>
          </div>
        )}

        {/* DEBUG TAB */}
        {activeTab === 'debug' && (
             <div className="flex flex-col h-full animate-slide-up space-y-4">
                 <div className="bg-white dark:bg-[#202c33] p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                     <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-full ${socketStatus.includes('Conectado') ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                             <Activity className="w-5 h-5" />
                         </div>
                         <div className="flex flex-col">
                             <span className="text-xs font-bold text-muted-foreground uppercase">Status do Socket</span>
                             <span className="text-sm font-mono font-medium">{socketStatus}</span>
                         </div>
                     </div>
                     <div className="flex gap-2">
                         <Button size="sm" variant={isPaused ? "default" : "outline"} onClick={() => setIsPaused(!isPaused)}>
                             {isPaused ? <PlayCircle className="w-4 h-4 mr-2" /> : <PauseCircle className="w-4 h-4 mr-2" />}
                             {isPaused ? "Retomar" : "Pausar"}
                         </Button>
                         <Button size="sm" variant="destructive" onClick={() => setLogs([])}>
                             <Trash2 className="w-4 h-4 mr-2" /> Limpar
                         </Button>
                     </div>
                 </div>

                 <div className="flex-1 bg-[#1e1e1e] rounded-xl border border-gray-800 p-4 font-mono text-xs overflow-hidden flex flex-col shadow-inner">
                     <div className="flex items-center gap-2 border-b border-gray-700 pb-2 mb-2">
                         <Terminal className="w-4 h-4 text-green-500" />
                         <span className="text-gray-300 font-bold">Terminal de Eventos ({logs.length})</span>
                     </div>
                     <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-700">
                         {logs.length === 0 ? (
                             <div className="text-gray-500 italic p-4 text-center">Aguardando eventos...</div>
                         ) : logs.map((log) => (
                             <div key={log.id} className="group hover:bg-white/5 p-2 rounded transition-colors border-l-2 border-transparent hover:border-blue-500">
                                 <div className="flex items-center gap-2 mb-1">
                                     <span className="text-gray-500">[{log.timestamp}]</span>
                                     <span className="text-blue-400 font-bold">{log.event}</span>
                                 </div>
                                 <pre className="text-green-400 whitespace-pre-wrap break-all pl-4 border-l border-gray-700">
                                     {JSON.stringify(log.data, null, 2)}
                                 </pre>
                             </div>
                         ))}
                         <div ref={logsEndRef} />
                     </div>
                 </div>
             </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
