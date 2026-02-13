
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Input, Card, Avatar } from './ui/Shared';
import { FileText, Download, X, DollarSign, Calendar, CheckCircle2, Search, MapPin, Loader2, Server, Code, Laptop, Smartphone, Rocket, Clock, ShieldCheck, Database, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { Contact } from '../types';

interface ProposalData {
  // Dados do Projeto TI
  projectTitle: string;
  serviceType: 'development' | 'infrastructure' | 'consulting' | 'support' | 'security';
  description: string;
  techStack: string; // Ex: React, Node, AWS
  timeline: string; // Ex: 4 semanas
  
  // Financeiro
  setupCost: number | string; // Custo Único (Implantação/Desenv)
  monthlyCost: number | string; // Recorrência (Manutenção/Suporte)
  hoursEstimated: number | string;

  // Dados de Endereço (Para contrato)
  cep: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  number: string;
}

interface ProposalGeneratorProps {
  contacts: Contact[];
}

const SERVICE_TYPES = [
    { id: 'development', label: 'Desenvolvimento de Software', icon: <Code className="w-4 h-4"/> },
    { id: 'infrastructure', label: 'Infraestrutura & Redes', icon: <Server className="w-4 h-4"/> },
    { id: 'support', label: 'Suporte Técnico / Helpdesk', icon: <Laptop className="w-4 h-4"/> },
    { id: 'security', label: 'Cibersegurança', icon: <ShieldCheck className="w-4 h-4"/> },
    { id: 'consulting', label: 'Consultoria Estratégica', icon: <Database className="w-4 h-4"/> },
];

const ProposalGenerator: React.FC<ProposalGeneratorProps> = ({ contacts }) => {
  const [selectedLead, setSelectedLead] = useState<Contact | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<ProposalData>({
    projectTitle: '',
    serviceType: 'development',
    description: '',
    techStack: '',
    timeline: '',
    setupCost: 0,
    monthlyCost: 0,
    hoursEstimated: 0,
    cep: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    number: ''
  });

  // Calculated State
  const [calculations, setCalculations] = useState({
    totalFirstYear: 0,
    contractValue: 0
  });

  // Filter contacts based on search
  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.number.includes(searchTerm)
  );

  // Initialize form when lead is selected
  useEffect(() => {
    if (selectedLead) {
      setFormData({
        projectTitle: `Projeto TI - ${selectedLead.name}`,
        serviceType: 'development',
        description: 'Desenvolvimento e implementação de solução tecnológica personalizada.',
        techStack: 'React, Node.js, PostgreSQL',
        timeline: '30 dias',
        setupCost: 0,
        monthlyCost: 0,
        hoursEstimated: 40,
        cep: '',
        address: '',
        neighborhood: '',
        city: '',
        state: '',
        number: ''
      });
    }
  }, [selectedLead]);

  // Recalculate whenever form data changes
  useEffect(() => {
    const setup = Number(formData.setupCost) || 0;
    const monthly = Number(formData.monthlyCost) || 0;

    const totalFirstYear = setup + (monthly * 12);
    // Valor total do contrato (exemplo simples: setup + 12 meses)
    const contractValue = totalFirstYear;

    setCalculations({
      totalFirstYear,
      contractValue
    });
  }, [formData.setupCost, formData.monthlyCost]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (Number(e.target.value) === 0) {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: ''
        }));
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawCep = e.target.value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, cep: rawCep }));

      if (rawCep.length === 8) {
          setLoadingCep(true);
          try {
              const response = await axios.get(`https://viacep.com.br/ws/${rawCep}/json/`);
              if (!response.data.erro) {
                  setFormData(prev => ({
                      ...prev,
                      address: response.data.logradouro,
                      neighborhood: response.data.bairro,
                      city: response.data.localidade,
                      state: response.data.uf
                  }));
                  toast.success("Endereço localizado!");
              } else {
                  toast.error("CEP não encontrado.");
              }
          } catch (error) {
              toast.error("Erro ao buscar CEP.");
          } finally {
              setLoadingCep(false);
          }
      }
  };

  const handleGeneratePDF = () => {
    if (!selectedLead) return;

    const setup = Number(formData.setupCost);
    const monthly = Number(formData.monthlyCost);

    const doc = new jsPDF();
    
    // --- HEADER ---
    // HelpDigital Orange: #F05A22
    doc.setFillColor(240, 90, 34);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('HELPDIGITAL TI', 20, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Soluções em Tecnologia & Inovação', 20, 28);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`Proposta #${Math.floor(Math.random() * 10000)}`, 160, 20);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 160, 26);

    // --- CLIENT INFO ---
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CLIENTE', 20, 55);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${selectedLead.name}`, 20, 65);
    doc.text(`Telefone: ${selectedLead.number}`, 20, 70);
    
    const addressLine = formData.address 
        ? `${formData.address}, ${formData.number || 'S/N'} - ${formData.neighborhood}` 
        : 'Endereço não informado';
    const cityLine = formData.city ? `${formData.city}/${formData.state}` : '';
    
    doc.text(`Local: ${cityLine}`, 20, 75);

    // --- LINE SEPARATOR ---
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 85, 190, 85);

    // --- PROJECT SCOPE ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ESCOPO DO PROJETO', 20, 95);

    doc.setFontSize(11);
    doc.setTextColor(240, 90, 34);
    doc.text(formData.projectTitle.toUpperCase(), 20, 103);
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Description text wrap
    const splitDesc = doc.splitTextToSize(formData.description, 170);
    doc.text(splitDesc, 20, 110);
    
    let currentY = 110 + (splitDesc.length * 5) + 5;

    // --- TECH SPECS TABLE ---
    autoTable(doc, {
      startY: currentY,
      head: [['Categoria', 'Detalhes Técnicos']],
      body: [
        ['Tipo de Serviço', SERVICE_TYPES.find(t => t.id === formData.serviceType)?.label || formData.serviceType],
        ['Stack Tecnológica', formData.techStack || 'N/A'],
        ['Prazo Estimado', formData.timeline],
        ['Horas Estimadas', `${formData.hoursEstimated} horas`],
      ],
      headStyles: { fillColor: [240, 90, 34] },
      theme: 'grid',
    });

    // --- FINANCIAL SUMMARY ---
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFillColor(245, 247, 250); // Light gray
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(20, finalY, 170, 55, 3, 3, 'FD');

    doc.setTextColor(240, 90, 34);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('INVESTIMENTO', 105, finalY + 10, { align: 'center' });

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    // Left Column (Setup)
    doc.text(`Implantação (Setup):`, 30, finalY + 25);
    doc.setFont('helvetica', 'bold');
    doc.text(`R$ ${setup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 30, finalY + 32);

    // Middle Column (Monthly)
    doc.setFont('helvetica', 'normal');
    doc.text(`Mensalidade (Suporte/SaaS):`, 105, finalY + 25, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(`R$ ${monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 105, finalY + 32, { align: 'center' });

    // Right Column (Total Year)
    doc.setFont('helvetica', 'normal');
    doc.text(`Total 1º Ano (Estimado):`, 180, finalY + 25, { align: 'right' });
    doc.setTextColor(240, 90, 34); 
    doc.setFont('helvetica', 'bold');
    doc.text(`R$ ${calculations.totalFirstYear.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 180, finalY + 32, { align: 'right' });

    // --- FOOTER ---
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Esta proposta comercial é válida por 15 dias.', 105, 280, { align: 'center' });
    doc.text('HelpDigital TI - Soluções Inteligentes - www.helpdigitalti.com.br', 105, 285, { align: 'center' });

    doc.save(`Proposta_TI_${selectedLead.name.replace(/\s/g, '_')}.pdf`);
    toast.success("PDF Gerado com sucesso!");
  };

  return (
    <div className="h-full flex flex-col bg-[#f0f2f5] dark:bg-[#0b141a] p-6 overflow-y-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111b21] dark:text-[#e9edef] flex items-center gap-2">
            <Rocket className="text-primary h-8 w-8" />
            Gerador de Propostas TI
          </h1>
          <p className="text-[#54656f] dark:text-[#8696a0] mt-1">
            Crie orçamentos para desenvolvimento, suporte e infraestrutura.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar cliente..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64 bg-white dark:bg-[#202c33] border-none shadow-sm"
                />
            </div>
            <Card className="px-4 py-2 bg-white dark:bg-[#202c33] border-none shadow-sm flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-medium text-sm text-[#111b21] dark:text-[#e9edef]">{new Date().toLocaleDateString()}</span>
            </Card>
        </div>
      </div>

      {/* LEADS TABLE */}
      <div className="bg-white dark:bg-[#202c33] rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#54656f] dark:text-[#8696a0] uppercase bg-gray-50 dark:bg-[#111b21]/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">Cliente / Chat</th>
                <th className="px-6 py-4 font-semibold">Telefone</th>
                <th className="px-6 py-4 font-semibold">Última Interação</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredContacts.length === 0 ? (
                  <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-[#54656f] dark:text-[#8696a0]">
                          Nenhum contato encontrado.
                      </td>
                  </tr>
              ) : (
                filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-[#111b21]/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-[#111b21] dark:text-[#e9edef] flex items-center gap-3">
                        <Avatar src={contact.avatarUrl} alt={contact.name} fallback={contact.name} />
                        <div>
                            <div>{contact.name}</div>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-[#54656f] dark:text-[#aebac1] font-mono">{contact.number}</td>
                    <td className="px-6 py-4">
                        <span className="text-xs text-[#667781] dark:text-[#8696a0]">
                        {contact.lastMessageTime || '-'}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <Button 
                        onClick={() => {
                            setSelectedLead(contact);
                            setIsModalOpen(true);
                        }}
                        className="bg-primary hover:bg-primary/90 text-white gap-2"
                        size="sm"
                        >
                        <FileText className="h-4 w-4" />
                        Nova Proposta
                        </Button>
                    </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE PROPOSTA */}
      {isModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#202c33] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row">
            
            {/* Left Side - Form */}
            <div className="flex-1 p-6 md:p-8 space-y-6">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                    <Avatar src={selectedLead.avatarUrl} alt={selectedLead.name} fallback={selectedLead.name} className="h-10 w-10" />
                    <div>
                        <h2 className="text-xl font-bold text-[#111b21] dark:text-[#e9edef]">
                         Configurar Projeto TI
                        </h2>
                        <p className="text-xs text-[#667781] dark:text-[#8696a0]">Cliente: {selectedLead.name}</p>
                    </div>
                </div>
                <div className="md:hidden">
                    <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}><X/></Button>
                </div>
              </div>

              {/* SEÇÃO 1: ESCOPO DO PROJETO */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
                    <Laptop className="w-4 h-4" /> Escopo do Serviço
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#54656f] dark:text-[#8696a0] uppercase">Título do Projeto</label>
                        <Input 
                            name="projectTitle"
                            value={formData.projectTitle}
                            onChange={handleInputChange}
                            className="font-bold"
                            placeholder="Ex: App Delivery v1.0"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#54656f] dark:text-[#8696a0] uppercase">Tipo de Serviço</label>
                        <select 
                            name="serviceType"
                            value={formData.serviceType}
                            onChange={handleInputChange}
                            className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                        >
                            {SERVICE_TYPES.map(type => (
                                <option key={type.id} value={type.id}>{type.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-semibold text-[#54656f] dark:text-[#8696a0] uppercase">Descrição Detalhada</label>
                        <textarea 
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            className="w-full min-h-[80px] rounded-xl border border-input bg-background p-3 text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none"
                            placeholder="Descreva as funcionalidades e objetivos..."
                        />
                    </div>
                </div>
              </div>

              {/* SEÇÃO 2: TÉCNICO & PRAZOS */}
              <div className="space-y-4 pt-2">
                 <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
                    <Code className="w-4 h-4" /> Técnico & Prazos
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-semibold text-[#54656f] dark:text-[#8696a0] uppercase">Stack Tecnológica / Equipamentos</label>
                        <Input 
                            name="techStack"
                            value={formData.techStack}
                            onChange={handleInputChange}
                            placeholder="Ex: React Native, AWS, Mikrotik..."
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#54656f] dark:text-[#8696a0] uppercase">Prazo de Entrega</label>
                        <Input 
                            name="timeline"
                            value={formData.timeline}
                            onChange={handleInputChange}
                            placeholder="Ex: 45 dias"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#54656f] dark:text-[#8696a0] uppercase">Esforço (Horas)</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                                type="number"
                                name="hoursEstimated"
                                value={formData.hoursEstimated}
                                onChange={handleInputChange}
                                className="pl-9"
                            />
                        </div>
                    </div>
                 </div>
              </div>

              {/* SEÇÃO 3: FINANCEIRO */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
                    <DollarSign className="w-4 h-4" /> Custos & Investimento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#54656f] dark:text-[#8696a0] uppercase">Setup / Implantação (R$)</label>
                        <Input 
                            type="number"
                            name="setupCost"
                            value={formData.setupCost}
                            onChange={handleInputChange}
                            onFocus={handleInputFocus}
                            className="bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800 font-bold text-lg"
                        />
                        <p className="text-[10px] text-muted-foreground">Valor único de desenvolvimento ou instalação.</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#54656f] dark:text-[#8696a0] uppercase">Mensalidade / Suporte (R$)</label>
                        <Input 
                            type="number"
                            name="monthlyCost"
                            value={formData.monthlyCost}
                            onChange={handleInputChange}
                            onFocus={handleInputFocus}
                            className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 font-bold text-lg"
                        />
                         <p className="text-[10px] text-muted-foreground">Valor recorrente mensal.</p>
                    </div>
                </div>
              </div>

              {/* SEÇÃO 4: DADOS CADASTRAIS (MANTER PARA CONTRATO) */}
              <div className="space-y-4 pt-2 opacity-80 hover:opacity-100 transition-opacity">
                 <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
                    <MapPin className="w-4 h-4" /> Dados Cadastrais (Opcional)
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1 md:col-span-1">
                        <label className="text-xs font-semibold text-[#54656f] dark:text-[#8696a0] uppercase">CEP</label>
                        <div className="relative">
                            <Input 
                                value={formData.cep}
                                onChange={handleCepChange}
                                placeholder="00000-000"
                                maxLength={9}
                                className="pl-9"
                            />
                            <div className="absolute left-3 top-2.5">
                                {loadingCep ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Search className="h-4 w-4 text-muted-foreground" />}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                         <label className="text-xs font-semibold text-[#54656f] dark:text-[#8696a0] uppercase">Endereço</label>
                         <Input 
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="Preenchimento automático"
                            readOnly
                            className="bg-muted/20"
                        />
                    </div>
                 </div>
              </div>

            </div>

            {/* Right Side - Preview & Actions */}
            <div className="md:w-[340px] bg-gray-50 dark:bg-[#111b21] border-l border-border p-6 flex flex-col justify-between">
              
              <div className="hidden md:flex justify-end mb-4">
                 <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="text-[#54656f]"><X className="h-5 w-5"/></Button>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-[#111b21] dark:text-[#e9edef] mb-4">Resumo da Proposta</h3>
                
                <Card className="p-4 bg-white dark:bg-[#202c33] border-none shadow-sm space-y-1 border-l-4 border-l-primary">
                   <div className="flex items-center gap-2 text-[#54656f] dark:text-[#8696a0] text-xs uppercase font-bold">
                      <Rocket className="w-4 h-4" /> Implantação
                   </div>
                   <div className="text-2xl font-bold text-primary">
                      R$ {Number(formData.setupCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                   </div>
                </Card>

                <Card className="p-4 bg-white dark:bg-[#202c33] border-none shadow-sm space-y-1 border-l-4 border-l-blue-400">
                   <div className="flex items-center gap-2 text-[#54656f] dark:text-[#8696a0] text-xs uppercase font-bold">
                      <RefreshCw className="w-4 h-4" /> Recorrência Mensal
                   </div>
                   <div className="text-xl font-bold text-[#111b21] dark:text-[#e9edef]">
                      R$ {Number(formData.monthlyCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                   </div>
                </Card>

                 <Card className="p-4 bg-white dark:bg-[#202c33] border-none shadow-sm space-y-1">
                   <div className="flex items-center gap-2 text-[#54656f] dark:text-[#8696a0] text-xs uppercase font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Total 1º Ano
                   </div>
                   <div className="text-lg font-bold text-[#111b21] dark:text-[#e9edef]">
                       R$ {calculations.totalFirstYear.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                   </div>
                </Card>
              </div>

              <div className="mt-8 space-y-3">
                <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-base font-bold shadow-lg shadow-primary/20"
                    onClick={handleGeneratePDF}
                >
                    <Download className="w-5 h-5 mr-2" />
                    Gerar PDF
                </Button>
                <p className="text-center text-xs text-[#54656f] dark:text-[#8696a0]">
                    Exporta proposta técnica e comercial detalhada.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProposalGenerator;
