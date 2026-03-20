
import React, { useState, useEffect } from 'react';
import { supabase } from '../src/integrations/supabase/client';
import { Button, Input } from './ui/Shared';
import { Loader2, Lock, Eye, EyeOff, CheckCircle, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../index';

const ResetPasswordPage: React.FC = () => {
  const { theme } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      toast.error('Preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast.success('Senha alterada com sucesso!');
      setTimeout(() => {
        window.location.hash = '';
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao alterar a senha.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-8">
        <div className="w-full max-w-[440px] text-center space-y-6 animate-fade-in">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Senha alterada!</h1>
          <p className="text-muted-foreground">Redirecionando para o login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background font-sans selection:bg-primary/20">
      <div className="hidden lg:flex w-1/2 relative bg-[#1F1F1F] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://helpdigitalti.com.br/wp-content/uploads/2021/02/4884451-scaled.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F05A22]/90 via-black/50 to-black/80 mix-blend-multiply" />
        <div className="relative z-10 flex flex-col justify-between h-full p-12 text-white">
          <div className="flex items-center gap-2 opacity-90">
            <Globe className="w-5 h-5 text-white" />
            <span className="text-sm font-bold tracking-widest uppercase text-white">HelpDigital TI</span>
          </div>
          <div className="space-y-6 max-w-lg">
            <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl">
              <Lock className="w-12 h-12 text-[#F05A22] mb-4" />
              <h2 className="text-3xl font-bold leading-tight mb-2 text-white">
                Redefinir Senha
              </h2>
              <p className="text-gray-200 text-lg leading-relaxed">
                Escolha uma nova senha segura para proteger sua conta.
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} HelpDigital TI. Todos os direitos reservados.
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 relative bg-background">
        <div className="w-full max-w-[440px] space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-6">
              <img
                src="https://helpdigitalti.com.br/wp-content/uploads/2020/05/logo-2.png.webp"
                alt="Logo HelpDigital"
                className="h-20 w-auto object-contain"
              />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Nova Senha
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Digite sua nova senha abaixo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="new-password">Nova senha</label>
                <div className="relative group">
                  <div className="absolute left-3 top-3.5 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="confirm-password">Confirmar senha</label>
                <div className="relative group">
                  <div className="absolute left-3 top-3.5 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 pl-11 bg-muted/30 border-input focus:bg-background focus:ring-[#F05A22] focus:border-[#F05A22] transition-all rounded-lg"
                  />
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
                  Salvando...
                </div>
              ) : (
                'Salvar Nova Senha'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
