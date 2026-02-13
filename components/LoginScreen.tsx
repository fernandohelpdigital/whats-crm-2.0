
import React, { useState } from 'react';
import { AuthConfig } from '../types';
import { setupAuth } from '../services/evolutionClient';
import { Button, Input } from './ui/Shared';
import { Server, Key, Loader2, Moon, Sun, ChevronRight, Eye, EyeOff, ShieldCheck, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme, useBranding } from '../index';

interface LoginScreenProps {
  onLoginSuccess: (config: AuthConfig) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { theme, toggleTheme } = useTheme();
  const { branding } = useBranding();
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState<AuthConfig>({
    instanceName: '',
    apiKey: 'e98122d281475fd19bbaf1b65cb6baeb',
    baseUrl: 'https://api.automacaohelp.com.br'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.instanceName || !formData.apiKey || !formData.baseUrl) {
      toast.error("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      await setupAuth(formData);
      toast.success("Conectado com sucesso!");
      onLoginSuccess(formData);
    } catch (error: any) {
      toast.error(`Falha na conexão: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background font-sans selection:bg-primary/20">
      
      {/* LADO ESQUERDO - VISUAL */}
      <div className="hidden lg:flex w-1/2 relative bg-[#1F1F1F] overflow-hidden">
         {/* Background Image */}
         <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] hover:scale-110"
            style={{ 
                backgroundImage: "url('https://helpdigitalti.com.br/wp-content/uploads/2021/02/4884451-scaled.jpg')",
            }}
         />
         
         {/* Gradient Overlay - Ajustado para Laranja/Cinza */}
         <div className="absolute inset-0 bg-gradient-to-t from-[#F05A22]/90 via-black/50 to-black/80 mix-blend-multiply" />
         
         {/* Content Overlay */}
         <div className="relative z-10 flex flex-col justify-between h-full p-12 text-white">
             <div className="flex items-center gap-2 opacity-90">
                 <Globe className="w-5 h-5 text-white" />
                 <span className="text-sm font-bold tracking-widest uppercase text-white">HelpDigital TI</span>
             </div>

             <div className="space-y-6 max-w-lg animate-slide-up">
                 <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl">
                    <div className="mb-4 text-[#F05A22]">
                        <ShieldCheck className="w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-bold leading-tight mb-2 text-white">
                        Gestão Completa de Atendimento
                    </h2>
                    <p className="text-gray-200 text-lg leading-relaxed">
                        Centralize leads, automação e inteligência digital em uma plataforma robusta projetada para o seu sucesso.
                    </p>
                 </div>
                 
                 <div className="flex items-center gap-3 text-sm text-gray-300">
                     <div className="h-1 w-12 bg-[#F05A22] rounded-full"></div>
                     <span>Tecnologia a serviço do seu negócio.</span>
                 </div>
             </div>

             <div className="text-xs text-gray-400">
                 &copy; {new Date().getFullYear()} HelpDigital TI. Todos os direitos reservados.
             </div>
         </div>
      </div>

      {/* LADO DIREITO - FORMULÁRIO */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 relative bg-background transition-colors duration-300">
        
        {/* Theme Toggle */}
        <div className="absolute top-6 right-6">
            <button 
                onClick={toggleTheme} 
                className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
        </div>

        <div className="w-full max-w-[440px] space-y-8 animate-fade-in">
            
            {/* Header Form */}
            <div className="text-center space-y-4">
                <div className="flex justify-center mb-6">
                     <img 
                        src="https://helpdigitalti.com.br/wp-content/uploads/2020/05/logo-2.png.webp" 
                        alt="Logo HelpDigital" 
                        className="h-20 w-auto object-contain drop-shadow-sm hover:scale-105 transition-transform duration-300"
                    />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                    Acesse sua conta
                </h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    Bem-vindo ao ecossistema {branding.systemName}.
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="instanceName">
                            Identificação (Instância)
                        </label>
                        <div className="relative group">
                            <div className="absolute left-3 top-3.5 text-muted-foreground group-focus-within:text-primary transition-colors">
                                <Server className="h-5 w-5" />
                            </div>
                            <Input 
                                id="instanceName"
                                name="instanceName" 
                                placeholder="Ex: Comercial_01" 
                                value={formData.instanceName} 
                                onChange={handleChange}
                                className="h-12 pl-11 bg-muted/30 border-input focus:bg-background focus:ring-[#F05A22] focus:border-[#F05A22] transition-all rounded-lg"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="apiKey">
                            Chave de Acesso (API Key)
                        </label>
                        <div className="relative group">
                            <div className="absolute left-3 top-3.5 text-muted-foreground group-focus-within:text-primary transition-colors">
                                <Key className="h-5 w-5" />
                            </div>
                            <Input 
                                id="apiKey"
                                name="apiKey" 
                                type={showApiKey ? "text" : "password"}
                                placeholder="••••••••••••••••" 
                                value={formData.apiKey} 
                                onChange={handleChange} 
                                className="h-12 pl-11 pr-10 bg-muted/30 border-input focus:bg-background focus:ring-[#F05A22] focus:border-[#F05A22] transition-all rounded-lg font-mono text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                            >
                                {showApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-12 rounded-lg bg-[#F05A22] hover:bg-[#D94E1B] text-white font-bold text-base shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] border-none"
                >
                    {loading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Validando...
                    </div>
                    ) : (
                    <div className="flex items-center justify-center gap-2">
                        Entrar no Sistema <ChevronRight className="h-5 w-5" />
                    </div>
                    )}
                </Button>
            </form>

            {/* Footer Form */}
            <div className="pt-6 text-center border-t border-border">
                 <p className="text-xs text-muted-foreground mb-4">
                    Precisa de suporte? <a href="#" className="text-primary hover:underline">Fale com a HelpDigital</a>
                 </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
