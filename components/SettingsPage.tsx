
import React, { useState, useEffect, useRef } from 'react';
import { AuthConfig } from '../types';
import { Button, Card, Input } from './ui/Shared';
import { QrCode, Wifi, RefreshCw, Smartphone, CheckCircle2, AlertCircle, Settings as SettingsIcon, Terminal, Activity, Trash2, PauseCircle, PlayCircle } from 'lucide-react';
import { connectInstance, fetchConnectionState } from '../services/evolutionClient';
import { getSocket, subscribeToAllEvents } from '../services/socketClient';
import toast from 'react-hot-toast';

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
  const [activeTab, setActiveTab] = useState<'connection' | 'debug'>('connection');
  
  // States Tab Connection
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connecting' | 'connected' | 'disconnected'>('unknown');

  // States Tab Debug
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [socketStatus, setSocketStatus] = useState<string>('Verificando...');
  const [isPaused, setIsPaused] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const checkStatus = async () => {
      try {
          const statusData = await fetchConnectionState(config);
          const state = statusData?.instance?.state;

          if (state === 'open') {
              setConnectionStatus('connected');
              setQrCode(null);
          } else if (state === 'connecting') {
              setConnectionStatus('connecting');
          } else {
              setConnectionStatus('disconnected');
          }
      } catch (error) {
          console.error("Falha ao checar status:", error);
          setConnectionStatus('disconnected');
      }
  };

  // Check status on mount
  useEffect(() => {
      checkStatus();
  }, [config]);

  // Socket Debug Logic
  useEffect(() => {
    // Atualiza status do socket periodicamente
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

    // Subscreve aos logs
    const unsubscribe = subscribeToAllEvents((event, data) => {
        if (isPaused) return;
        
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            event,
            data
        };

        setLogs(prev => [newLog, ...prev].slice(0, 50)); // Mantém apenas os ultimos 50 logs
    });

    return () => {
        clearInterval(interval);
        unsubscribe();
    };
  }, [isPaused]);

  const handleGenerateQRCode = async () => {
    setIsLoading(true);
    setQrCode(null);
    try {
      const data = await connectInstance(config);
      if (data && data.base64) {
        setQrCode(data.base64);
        setConnectionStatus('connecting');
        toast.success("QR Code gerado com sucesso!");
      } 
      else if (data && (data.instance?.status === 'open' || data.instance?.state === 'open')) {
         setConnectionStatus('connected');
         toast.success("Instância já está conectada!");
      } else {
         await checkStatus();
      }
    } catch (error: any) {
      console.error(error);
      if (error.response?.data?.message?.includes('already connected') || error.message?.includes('connected')) {
          setConnectionStatus('connected');
          toast.success("WhatsApp já conectado!");
      } else {
          toast.error("Erro ao gerar QR Code. Verifique o console.");
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
            Gerencie a conexão e monitore eventos em tempo real.
            </p>
        </div>
        
        {/* Tabs Switcher */}
        <div className="flex p-1 bg-white dark:bg-[#202c33] rounded-lg border border-border">
            <button 
                onClick={() => setActiveTab('connection')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'connection' ? 'bg-[#00a884] text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
            >
                Conexão
            </button>
            <button 
                onClick={() => setActiveTab('debug')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'debug' ? 'bg-[#00a884] text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
            >
                <Terminal className="w-4 h-4" /> Debug WebSocket
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'connection' ? (
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

                        {/* Área do QR Code */}
                        <div className="min-h-[260px] flex items-center justify-center bg-[#f0f2f5] dark:bg-[#111b21] rounded-xl border-2 border-dashed border-border mt-6 relative group">
                            {isLoading ? (
                                <div className="flex flex-col items-center gap-2 animate-pulse">
                                    <RefreshCw className="w-8 h-8 text-[#00a884] animate-spin" />
                                    <span className="text-xs text-[#54656f]">Verificando...</span>
                                </div>
                            ) : qrCode ? (
                                <div className="relative p-2 bg-white rounded-lg shadow-sm animate-zoom-in">
                                    <img src={qrCode} alt="QR Code WhatsApp" className="w-60 h-60 object-contain" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg backdrop-blur-sm">
                                        <p className="text-white font-bold text-sm">Escaneie com seu celular</p>
                                    </div>
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
                </Card>
             </div>
        ) : (
             <div className="flex flex-col h-full animate-slide-up space-y-4">
                 {/* Status Bar */}
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

                 {/* Console Log */}
                 <div className="flex-1 bg-[#1e1e1e] rounded-xl border border-gray-800 p-4 font-mono text-xs overflow-hidden flex flex-col shadow-inner">
                     <div className="flex items-center gap-2 border-b border-gray-700 pb-2 mb-2">
                         <Terminal className="w-4 h-4 text-green-500" />
                         <span className="text-gray-300 font-bold">Terminal de Eventos ({logs.length})</span>
                     </div>
                     <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-700">
                         {logs.length === 0 ? (
                             <div className="text-gray-500 italic p-4 text-center">Aguardando eventos... (Envie uma mensagem no WhatsApp para testar)</div>
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
                 
                 <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-3 rounded-lg text-xs border border-yellow-200 dark:border-yellow-900/50">
                     <strong>Dica de Debug:</strong> Se o evento <code>MESSAGES_UPSERT</code> aparece aqui mas a mensagem não aparece no chat, verifique se a estrutura JSON dentro de <code>data</code> corresponde ao que o código <code>ChatDashboard.tsx</code> espera (geralmente <code>data.data.message</code> ou <code>data.message</code>).
                 </div>
             </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
