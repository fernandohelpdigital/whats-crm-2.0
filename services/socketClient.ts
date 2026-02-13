
import { io, Socket } from "socket.io-client";
import { AuthConfig } from '../types';
import { fetchConnectionState } from './evolutionClient';

let socket: Socket | null = null;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;
let isRetrying = false;

// Array de callbacks para logs de debug
type LogCallback = (event: string, data: any) => void;
const logListeners: LogCallback[] = [];

export const initSocket = (config: AuthConfig): Socket | null => {
    // Se já estiver conectado na mesma instância, reaproveita
    if (socket?.connected) {
        const currentNs = (socket as any).nsp?.replace('/', '') ?? '';
        if (currentNs === config.instanceName.trim()) {
            return socket;
        }
    }

    // Limpeza completa antes de nova tentativa
    disconnectSocket();

    const baseUrl = config.baseUrl.replace(/\/$/, '').trim();
    const instanceName = config.instanceName.trim();
    
    // Encoding URI component é crucial para nomes com espaços
    const socketUrl = `${baseUrl}/${encodeURIComponent(instanceName)}`;

    console.log(`[Socket] Inicializando: ${socketUrl}`);

    socket = io(socketUrl, {
        transports: ["websocket", "polling"], // Websocket primeiro para evitar problemas de proxy
        path: "/socket.io/",
        query: {
            apikey: config.apiKey,
        },
        auth: {
            token: config.apiKey
        },
        // Configurações de reconexão automática do Socket.IO
        // Nota: Invalid Namespace geralmente NÃO dispara reconexão automática, por isso tratamos manualmente
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        forceNew: true 
    });

    // Debug Global
    socket.onAny((event, ...args) => {
        logListeners.forEach(cb => cb(event, args));
    });

    socket.on("connect", () => {
        console.log(`[Socket] Conectado: ${instanceName} [ID: ${socket?.id}]`);
        isRetrying = false; // Reset da flag de retry manual
        if (retryTimeout) clearTimeout(retryTimeout);
    });

    socket.on("connect_error", async (err) => {
        if (err.message === "xhr poll error") return; // Ignora erros transientes de polling
        
        console.error(`[Socket] Erro: ${err.message}`);

        // ERRO CRÍTICO: Namespace não existe (Instância offline/hibernando)
        if (err.message === "Invalid namespace") {
            // Evita loops paralelos de retry manual
            if (isRetrying) return;
            isRetrying = true;
            
            // Impede que o socket.io fique tentando reconectar inutilmente no mesmo objeto socket falho
            socket?.disconnect();

            console.warn(`[Socket] Instância '${instanceName}' não carregada. Tentando acordar via API...`);

            // 1. Tenta acordar a instância via REST
            try {
                await fetchConnectionState(config);
                console.log("[Socket] Ping de wake-up enviado com sucesso.");
            } catch (e) {
                console.error("[Socket] Falha no wake-up:", e);
            }

            // 2. Agenda recriação total do socket
            if (retryTimeout) clearTimeout(retryTimeout);
            retryTimeout = setTimeout(() => {
                console.log("[Socket] Tentando reconectar após espera...");
                isRetrying = false;
                initSocket(config);
            }, 5000); // 5 segundos para dar tempo da instância carregar
        }
    });

    socket.on("disconnect", (reason) => {
        if (reason === "io server disconnect") {
            // Desconexão forçada pelo servidor (ex: logout remoto)
            // Tenta reconectar a menos que tenha sido manual
            socket?.connect();
        }
        console.warn(`[Socket] Desconectado: ${reason}`);
    });

    return socket;
};

export const getSocket = (): Socket | null => {
    return socket;
};

export const disconnectSocket = () => {
    if (retryTimeout) clearTimeout(retryTimeout);
    isRetrying = false;
    
    if (socket) {
        socket.removeAllListeners();
        socket.close();
        socket = null;
        console.log("[Socket] Encerrado.");
    }
};

export const subscribeToAllEvents = (callback: LogCallback) => {
    logListeners.push(callback);
    return () => {
        const index = logListeners.indexOf(callback);
        if (index > -1) {
            logListeners.splice(index, 1);
        }
    };
};
