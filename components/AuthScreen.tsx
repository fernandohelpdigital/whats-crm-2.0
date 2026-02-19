
import React, { useState } from 'react';
import { useAuth } from '../src/hooks/useAuth';
import { supabase } from '../src/integrations/supabase/client';
import { Button, Input } from './ui/Shared';
import { Loader2, Moon, Sun, ChevronRight, Eye, EyeOff, ShieldCheck, Globe, Mail, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme, useBranding } from '../index';

const AuthScreen: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { branding } = useBranding();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Preencha todos os campos.');
      return;
    }
    if (isSignUp && form.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { display_name: form.displayName || form.email },
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpError) throw signUpError;

        const newUserId = signUpData?.user?.id;
        if (newUserId) {
          toast.success('Conta criada! Criando sua instância...');
          
          // Call edge function directly without auth (uses service role internally)
          const res = await supabase.functions.invoke('create-user-instance', {
            body: {
              user_id: newUserId,
              display_name: form.displayName || form.email.split('@')[0],
              token: form.password,
            },
          });

          if (res.error || res.data?.error) {
            console.error('Instance creation error:', res.error || res.data?.error);
            toast.error('Conta criada, mas houve erro ao criar a instância. Contate o suporte.');
          } else {
            toast.success('Instância criada com sucesso! Verifique seu e-mail para confirmar.');
          }
        } else {
          toast.success('Conta criada! Verifique seu e-mail para confirmar.');
        }
      } else {
        await signIn(form.email, form.password);
        toast.success('Login realizado com sucesso!');
      }
    } catch (error: any) {
      const msg = error.message || 'Erro na autenticação';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background font-sans selection:bg-primary/20">
      
      {/* LADO ESQUERDO - VISUAL */}
      <div className="hidden lg:flex w-1/2 relative bg-[#1F1F1F] overflow-hidden">
         <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] hover:scale-110"
            style={{ backgroundImage: "url('https://helpdigitalti.com.br/wp-content/uploads/2021/02/4884451-scaled.jpg')" }}
         />
         <div className="absolute inset-0 bg-gradient-to-t from-[#F05A22]/90 via-black/50 to-black/80 mix-blend-multiply" />
         
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
            
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="flex justify-center mb-6">
                     <img 
                        src="https://helpdigitalti.com.br/wp-content/uploads/2020/05/logo-2.png.webp" 
                        alt="Logo HelpDigital" 
                        className="h-20 w-auto object-contain drop-shadow-sm hover:scale-105 transition-transform duration-300"
                    />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                    {isSignUp ? 'Criar sua conta' : 'Acesse sua conta'}
                </h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    Bem-vindo ao ecossistema {branding.systemName}.
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    
                    {isSignUp && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="displayName">Nome</label>
                        <div className="relative group">
                            <div className="absolute left-3 top-3.5 text-muted-foreground group-focus-within:text-primary transition-colors">
                                <User className="h-5 w-5" />
                            </div>
                            <Input 
                                id="displayName"
                                name="displayName" 
                                placeholder="Seu nome" 
                                value={form.displayName} 
                                onChange={handleChange}
                                className="h-12 pl-11 bg-muted/30 border-input focus:bg-background focus:ring-[#F05A22] focus:border-[#F05A22] transition-all rounded-lg"
                            />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="email">E-mail</label>
                        <div className="relative group">
                            <div className="absolute left-3 top-3.5 text-muted-foreground group-focus-within:text-primary transition-colors">
                                <Mail className="h-5 w-5" />
                            </div>
                            <Input 
                                id="email"
                                name="email" 
                                type="email"
                                placeholder="seu@email.com" 
                                value={form.email} 
                                onChange={handleChange}
                                className="h-12 pl-11 bg-muted/30 border-input focus:bg-background focus:ring-[#F05A22] focus:border-[#F05A22] transition-all rounded-lg"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="password">Senha</label>
                        <div className="relative group">
                            <div className="absolute left-3 top-3.5 text-muted-foreground group-focus-within:text-primary transition-colors">
                                <Lock className="h-5 w-5" />
                            </div>
                            <Input 
                                id="password"
                                name="password" 
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••" 
                                value={form.password} 
                                onChange={handleChange} 
                                className="h-12 pl-11 pr-10 bg-muted/30 border-input focus:bg-background focus:ring-[#F05A22] focus:border-[#F05A22] transition-all rounded-lg"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
                        {isSignUp ? 'Criando conta...' : 'Entrando...'}
                    </div>
                    ) : (
                    <div className="flex items-center justify-center gap-2">
                        {isSignUp ? 'Criar Conta' : 'Entrar no Sistema'} <ChevronRight className="h-5 w-5" />
                    </div>
                    )}
                </Button>
            </form>

            {/* Toggle Sign In / Sign Up */}
            <div className="pt-6 text-center border-t border-border">
                <p className="text-sm text-muted-foreground">
                    {isSignUp ? 'Já tem uma conta?' : 'Não tem uma conta?'}{' '}
                    <button 
                        onClick={() => setIsSignUp(!isSignUp)} 
                        className="text-primary hover:underline font-semibold"
                    >
                        {isSignUp ? 'Fazer login' : 'Criar conta'}
                    </button>
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                   Precisa de suporte? <a href="#" className="text-primary hover:underline">Fale com a HelpDigital</a>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
