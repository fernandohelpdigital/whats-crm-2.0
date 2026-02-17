
import React, { useState, useEffect, useCallback } from 'react';
import { Contact, FollowUpTask } from '../types';
import { Button, Input, Card, Avatar } from './ui/Shared';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Plus, 
  MessageSquare, 
  Phone, 
  Search, 
  X, 
  Check, 
  Send,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/src/integrations/supabase/client';
import { useAuth } from '../src/hooks/useAuth';

interface FollowUpCalendarProps {
  contacts: Contact[];
}

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const FollowUpCalendar: React.FC<FollowUpCalendarProps> = ({ contacts }) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState<{
    contactId: string;
    message: string;
    time: string;
    type: 'whatsapp' | 'call';
  }>({ contactId: '', message: '', time: '09:00', type: 'whatsapp' });
  const [contactSearch, setContactSearch] = useState('');

  const loadTasks = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('follow_up_tasks')
        .select('*')
        .order('scheduled_at', { ascending: true });
      
      if (error) throw error;
      
      const mapped: FollowUpTask[] = (data || []).map(t => ({
        id: t.id,
        contactId: t.contact_id || '',
        contactName: t.contact_name,
        avatarUrl: t.avatar_url || undefined,
        scheduledAt: new Date(t.scheduled_at),
        message: t.message,
        status: t.status as 'pending' | 'sent' | 'cancelled',
        type: t.type as 'whatsapp' | 'call' | 'email',
      }));
      setTasks(mapped);
    } catch (e: any) {
      console.error("Erro ao carregar tasks:", e);
      toast.error("Erro ao carregar agendamentos");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month);
    const days = [];

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 md:h-32 border border-border/40 bg-muted/10" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = new Date().toDateString() === date.toDateString();
      const isSelected = selectedDate.toDateString() === date.toDateString();
      const dayTasks = tasks.filter(t => new Date(t.scheduledAt).toDateString() === date.toDateString());

      days.push(
        <div 
          key={day} 
          onClick={() => setSelectedDate(date)}
          className={`
            h-24 md:h-32 border border-border/40 p-2 relative cursor-pointer transition-colors group
            ${isSelected ? 'bg-[#00a884]/5 ring-1 ring-inset ring-[#00a884]' : 'hover:bg-muted/20'}
            ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
          `}
        >
          <div className="flex justify-between items-start">
            <span className={`
                text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full
                ${isToday ? 'bg-blue-500 text-white' : 'text-muted-foreground group-hover:text-foreground'}
            `}>
              {day}
            </span>
            {dayTasks.length > 0 && (
                <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                    {dayTasks.length}
                </span>
            )}
          </div>

          <div className="mt-2 space-y-1 overflow-y-auto max-h-[calc(100%-2rem)] scrollbar-hide">
            {dayTasks.map(task => (
                <div key={task.id} className="text-[10px] bg-white dark:bg-[#202c33] border border-border p-1 rounded shadow-sm flex items-center gap-1 truncate">
                    {task.type === 'whatsapp' ? <MessageSquare className="w-3 h-3 text-[#00a884]" /> : <Phone className="w-3 h-3 text-blue-500" />}
                    <span className="truncate">{task.contactName}</span>
                </div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  const handleSaveTask = async () => {
      if (!newTask.contactId || !newTask.message || !user) {
          toast.error("Selecione um contato e escreva uma mensagem.");
          return;
      }

      const selectedContact = contacts.find(c => c.id === newTask.contactId);
      const [hours, minutes] = newTask.time.split(':');
      const scheduledDate = new Date(selectedDate);
      scheduledDate.setHours(parseInt(hours), parseInt(minutes));

      const { data, error } = await supabase
        .from('follow_up_tasks')
        .insert({
          user_id: user.id,
          contact_id: newTask.contactId,
          contact_name: selectedContact?.name || 'Desconhecido',
          avatar_url: selectedContact?.avatarUrl || null,
          message: newTask.message,
          scheduled_at: scheduledDate.toISOString(),
          type: newTask.type,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        toast.error("Erro ao salvar agendamento");
        console.error(error);
        return;
      }

      const task: FollowUpTask = {
          id: data.id,
          contactId: newTask.contactId,
          contactName: selectedContact?.name || 'Desconhecido',
          avatarUrl: selectedContact?.avatarUrl,
          message: newTask.message,
          scheduledAt: scheduledDate,
          status: 'pending',
          type: newTask.type
      };

      setTasks([...tasks, task]);
      setIsModalOpen(false);
      setNewTask({ contactId: '', message: '', time: '09:00', type: 'whatsapp' });
      toast.success("Follow-up agendado com sucesso!");
  };

  const modalContacts = contacts.filter(c => 
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) || 
      c.number.includes(contactSearch)
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background p-4 md:p-6 overflow-hidden">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-[#00a884]" /> Follow-up Agendado
          </h1>
          <p className="text-muted-foreground text-sm">Organize e automatize seus contatos futuros.</p>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex items-center bg-card border border-border rounded-lg shadow-sm">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth}><ChevronLeft className="h-5 w-5"/></Button>
                <div className="w-40 text-center font-bold text-lg">
                    {MONTHS[currentDate.getMonth()]} <span className="text-muted-foreground text-sm">{currentDate.getFullYear()}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleNextMonth}><ChevronRight className="h-5 w-5"/></Button>
            </div>
            <Button className="bg-[#00a884] text-white hover:bg-[#008f6f] gap-2 shadow-lg shadow-green-500/20" onClick={() => setIsModalOpen(true)}>
                <Plus className="h-5 w-5" /> Novo Agendamento
            </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
          
          {/* CALENDÁRIO GRID */}
          <div className="flex-1 bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
             <div className="grid grid-cols-7 border-b border-border bg-muted/30">
                {DAYS_OF_WEEK.map(day => (
                    <div key={day} className="py-2 text-center text-xs font-bold uppercase text-muted-foreground tracking-wider">
                        {day}
                    </div>
                ))}
             </div>
             <div className="flex-1 grid grid-cols-7 overflow-y-auto">
                 {renderCalendarDays()}
             </div>
          </div>

          {/* SIDEBAR DE DETALHES DO DIA */}
          <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
             <Card className="p-4 bg-card border-border shadow-sm flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                    <div>
                        <h3 className="font-bold text-lg">
                            {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}
                        </h3>
                        <p className="text-xs text-muted-foreground">{DAYS_OF_WEEK[selectedDate.getDay()]}</p>
                    </div>
                    <div className="bg-[#00a884]/10 text-[#00a884] p-2 rounded-lg">
                        <Clock className="h-5 w-5" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                    {tasks.filter(t => new Date(t.scheduledAt).toDateString() === selectedDate.toDateString()).length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <p className="text-sm">Nenhum agendamento para este dia.</p>
                            <Button variant="link" className="text-[#00a884] text-xs mt-2" onClick={() => setIsModalOpen(true)}>
                                + Agendar agora
                            </Button>
                        </div>
                    ) : (
                        tasks
                        .filter(t => new Date(t.scheduledAt).toDateString() === selectedDate.toDateString())
                        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                        .map(task => (
                            <div key={task.id} className="group bg-muted/20 hover:bg-muted/40 p-3 rounded-lg border border-border transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <Avatar src={task.avatarUrl} alt={task.contactName} fallback={task.contactName} className="h-6 w-6" />
                                        <span className="text-sm font-bold truncate max-w-[120px]">{task.contactName}</span>
                                    </div>
                                    <span className="text-xs font-mono font-medium text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                                        {new Date(task.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                                <div className="text-xs text-muted-foreground line-clamp-2 bg-background p-2 rounded border border-border/50 italic mb-2">
                                    "{task.message}"
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${task.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {task.status === 'sent' ? 'Enviado' : 'Pendente'}
                                    </span>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <Button size="icon" variant="ghost" className="h-6 w-6"><MoreHorizontal className="h-3 w-3" /></Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
             </Card>
          </div>
      </div>

      {/* MODAL DE AGENDAMENTO */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
              <div className="bg-background w-full max-w-md rounded-xl shadow-2xl border border-border flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-border flex justify-between items-center">
                      <h3 className="font-bold flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#00a884]" /> Agendar Mensagem
                      </h3>
                      <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}><X className="w-5 h-5"/></Button>
                  </div>
                  
                  <div className="p-4 space-y-4 overflow-y-auto">
                      
                      {/* Seleção de Data/Hora */}
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-xs font-bold uppercase text-muted-foreground">Data</label>
                              <div className="text-sm font-medium border border-input rounded-md px-3 py-2 bg-muted/20 flex items-center gap-2">
                                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                                  {selectedDate.toLocaleDateString()}
                              </div>
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold uppercase text-muted-foreground">Horário</label>
                              <Input 
                                type="time" 
                                value={newTask.time} 
                                onChange={(e) => setNewTask({...newTask, time: e.target.value})}
                                className="bg-background" 
                              />
                          </div>
                      </div>

                      {/* Seleção de Contato */}
                      <div className="space-y-2">
                          <label className="text-xs font-bold uppercase text-muted-foreground">Destinatário</label>
                          {!newTask.contactId ? (
                             <div className="relative">
                                 <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                 <Input 
                                    placeholder="Buscar contato..." 
                                    className="pl-9"
                                    value={contactSearch}
                                    onChange={(e) => setContactSearch(e.target.value)}
                                    autoFocus
                                 />
                                 {contactSearch && (
                                     <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-popover border border-border rounded-md shadow-lg z-10">
                                         {modalContacts.map(c => (
                                             <div 
                                                key={c.id} 
                                                className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm"
                                                onClick={() => {
                                                    setNewTask({...newTask, contactId: c.id});
                                                    setContactSearch('');
                                                }}
                                             >
                                                 <Avatar src={c.avatarUrl} alt={c.name} fallback={c.name} className="h-6 w-6" />
                                                 <div className="flex flex-col">
                                                     <span className="font-bold">{c.name}</span>
                                                     <span className="text-xs text-muted-foreground">{c.number}</span>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 )}
                             </div>
                          ) : (
                              <div className="flex items-center justify-between p-2 border border-[#00a884] bg-[#00a884]/5 rounded-md">
                                  <div className="flex items-center gap-2">
                                      <Avatar 
                                        src={contacts.find(c => c.id === newTask.contactId)?.avatarUrl} 
                                        alt="Selected" 
                                        fallback="C" 
                                        className="h-8 w-8"
                                      />
                                      <div className="flex flex-col">
                                          <span className="text-sm font-bold">{contacts.find(c => c.id === newTask.contactId)?.name}</span>
                                          <span className="text-xs text-muted-foreground">Selecionado</span>
                                      </div>
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNewTask({...newTask, contactId: ''})}>
                                      <X className="w-3 h-3" />
                                  </Button>
                              </div>
                          )}
                      </div>

                      {/* Mensagem */}
                      <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-muted-foreground">Mensagem</label>
                          <textarea 
                             className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                             placeholder="Olá, gostaria de confirmar..."
                             value={newTask.message}
                             onChange={(e) => setNewTask({...newTask, message: e.target.value})}
                          />
                      </div>
                  </div>

                  <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/10 rounded-b-xl">
                      <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                      <Button className="bg-[#00a884] text-white hover:bg-[#008f6f]" onClick={handleSaveTask}>
                          <Check className="w-4 h-4 mr-2" /> Confirmar Agendamento
                      </Button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default FollowUpCalendar;
