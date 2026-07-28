import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import Pagination from '../components/Pagination';
import { 
    Calendar, CheckCircle, XCircle, Clock, AlertCircle, 
    Filter, Trash2, Network, X, Play, Download, Edit3, 
    Shield, RefreshCw, GitBranch, AlertTriangle, FileText,
    ArrowRight, CheckSquare, RotateCcw, UserPlus, Printer, Loader2, Info, Copy, Check
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';

export default function PipelineAgendamentos() {
    const location = useLocation();

    // Default active tab: 'a_confirmar' (Order: Faltas, A Confirmar, Confirmados, Faturados, Pendentes)
    const [activeTab, setActiveTab] = useState('a_confirmar'); 
    const [agendamentos, setAgendamentos] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [loading, setLoading] = useState(false);

    // Track specific agendamentos currently in-flight for job creation
    const [processingIds, setProcessingIds] = useState([]);

    // Track copied carteirinha for visual feedback
    const [copiedId, setCopiedId] = useState(null);

    // Default Today's Date in YYYY-MM-DD
    const todayStr = new Date().toISOString().substring(0, 10);

    // Filters with Unidade & Default Today Date
    const [convenios, setConvenios] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [motivosFalta, setMotivosFalta] = useState([]);
    const [filters, setFilters] = useState({
        paciente: '',
        id_convenio: '',
        id_unidade: '',
        data_inicio: todayStr,
        data_fim: todayStr,
        sem_carteirinha: false
    });

    // Selected Items
    const [selectedIds, setSelectedIds] = useState([]);

    // Modal Registrar Falta
    const [faltaModal, setFaltaModal] = useState({
        isOpen: false,
        agendamento: null,
        motivoId: '',
        docJustificativa: ''
    });

    // KPIs / Counts per tab
    const [counts, setCounts] = useState({
        faltas: 0,
        a_confirmar: 0,
        confirmados: 0,
        faturados: 0,
        pendentes: 0
    });

    useEffect(() => {
        api.get('/unidades/').then(res => setUnidades(res.data)).catch(console.error);
        api.get('/motivos-faltas/').then(res => setMotivosFalta(res.data)).catch(console.error);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams();
        if (filters.data_inicio) params.append('data_inicio', filters.data_inicio);
        if (filters.data_fim) params.append('data_fim', filters.data_fim);
        api.get(`/convenios/active-in-range?${params.toString()}`)
            .then(res => setConvenios(res.data))
            .catch(console.error);
    }, [filters.data_inicio, filters.data_fim]);

    const exportToXLSX = () => {
        if (!agendamentos.length) {
            alert("Nenhum dado para exportar.");
            return;
        }
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "Paciente;Data;Hora;Profissional;Convenio;Guia;Procedimento;Status\n";

        agendamentos.forEach(a => {
            const row = [
                `"${a.Nome_Paciente || ''}"`,
                `"${formatDate(a.data)}"`,
                `"${a.hora_inicio ? a.hora_inicio.substring(0, 5) : ''}"`,
                `"${a.Nome_profissional || ''}"`,
                `"${a.nome_convenio || ''}"`,
                `"${a.numero_guia || ''}"`,
                `"${a.nome_procedimento || a.cod_procedimento_aut || ''}"`,
                `"${a.Status || ''}"`
            ].join(";");
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `pipeline_agendamentos_${todayStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        setPage(1);
        setSelectedIds([]);
    }, [activeTab]);

    useEffect(() => {
        loadData();
    }, [page, pageSize, filters, activeTab]);

    // Polling effect: while any agendamento is being processed, re-fetch every 3s to await Webhook
    const isAnyItemProcessing = agendamentos.some(a => a.execucao_status === 'processando' || processingIds.includes(a.id_agendamento));
    useEffect(() => {
        if (!isAnyItemProcessing) return;
        const interval = setInterval(() => {
            loadData();
        }, 3000);
        return () => clearInterval(interval);
    }, [isAnyItemProcessing, page, pageSize, filters, activeTab]);

    const getStatusFilter = () => {
        switch (activeTab) {
            case 'faltas': return 'Falta';
            case 'a_confirmar': return 'A Confirmar';
            case 'confirmados': return 'Confirmado';
            case 'faturados': return 'Faturado';
            case 'pendentes': return 'Pendentes';
            default: return '';
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                skip: (page - 1) * pageSize,
                limit: pageSize,
                ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
            });

            const status = getStatusFilter();
            if (status) params.append('status', status);

            const response = await api.get(`/agendamentos/?${params.toString()}`);
            const list = response.data.data;

            setAgendamentos(list);
            setTotalItems(response.data.total);

            // Update tab badge counts from server-calculated KPIs
            const kpis = response.data.kpis || {};
            setCounts({
                faltas: kpis.faltas || 0,
                a_confirmar: kpis.a_confirmar || 0,
                confirmados: kpis.confirmados || 0,
                faturados: kpis.faturados || 0,
                pendentes: kpis.pendentes || 0
            });
        } catch (error) {
            console.error('Erro ao carregar pipeline:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAtualizarClick = async () => {
        setLoading(true);
        try {
            await api.post('/agendamentos/sincronizar', {
                data_inicio: filters.data_inicio || null,
                data_fim: filters.data_fim || null,
                id_paciente: "0",
                id_convenio: filters.id_convenio ? parseInt(filters.id_convenio) : 101
            });
        } catch (error) {
            console.error('Erro ao iniciar sincronização:', error);
            const msg = error.response?.data?.detail || "Erro ao solicitar sincronização de agendamentos (OP1).";
            alert(msg);
        } finally {
            loadData();
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setPage(1);
    };

    const clearFilters = () => {
        setFilters({ paciente: '', id_convenio: '', id_unidade: '', data_inicio: todayStr, data_fim: todayStr });
        setPage(1);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(agendamentos.map(a => a.id_agendamento));
        else setSelectedIds([]);
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // Actions
    const handleConfirmarPortal = async (ids = selectedIds, remover = false) => {
        if (ids.length === 0) return;
        setProcessingIds(prev => [...new Set([...prev, ...ids])]);
        try {
            await api.post('/agendamentos/confirmar-portal', {
                agendamento_ids: ids,
                remover
            });
            setSelectedIds([]);
            loadData();
        } catch (err) {
            alert(err.response?.data?.detail || "Erro ao processar confirmação no portal.");
        } finally {
            setProcessingIds(prev => prev.filter(x => !ids.includes(x)));
        }
    };

    const handleOpenFaltaModal = (agendamento = null) => {
        setFaltaModal({
            isOpen: true,
            agendamento,
            motivoId: motivosFalta.length > 0 ? motivosFalta[0].id : '',
            docJustificativa: ''
        });
    };

    const handleConfirmarFalta = async () => {
        const ids = faltaModal.agendamento 
            ? [faltaModal.agendamento.id_agendamento] 
            : selectedIds;

        if (ids.length === 0 || !faltaModal.motivoId) return;

        const firstAg = faltaModal.agendamento || agendamentos.find(a => ids.includes(a.id_agendamento));
        const id_paciente = firstAg?.id_paciente ? parseInt(firstAg.id_paciente) : 0;

        setProcessingIds(prev => [...new Set([...prev, ...ids])]);
        try {
            await api.post('/agendamentos/registrar-falta-portal', {
                agendamento_ids: ids,
                id_paciente,
                motivo_falta_id: parseInt(faltaModal.motivoId),
                doc_justificativa: faltaModal.docJustificativa
            });
            setFaltaModal({ isOpen: false, agendamento: null, motivoId: '', docJustificativa: '' });
            setSelectedIds([]);
            loadData();
        } catch (err) {
            alert(err.response?.data?.detail || "Erro ao registrar falta.");
        } finally {
            setProcessingIds(prev => prev.filter(x => !ids.includes(x)));
        }
    };

    const handleRemoverFalta = async (ids = selectedIds) => {
        if (ids.length === 0) return;
        const firstAg = agendamentos.find(a => ids.includes(a.id_agendamento));
        const id_paciente = firstAg?.id_paciente ? parseInt(firstAg.id_paciente) : 0;

        setProcessingIds(prev => [...new Set([...prev, ...ids])]);
        try {
            await api.post('/agendamentos/remover-falta-portal', {
                agendamento_ids: ids,
                id_paciente
            });
            setSelectedIds([]);
            loadData();
        } catch (err) {
            alert(err.response?.data?.detail || "Erro ao remover falta.");
        } finally {
            setProcessingIds(prev => prev.filter(x => !ids.includes(x)));
        }
    };

    const handleExecutarValidar = async (ids = selectedIds) => {
        if (ids.length === 0) return;
        setProcessingIds(prev => [...new Set([...prev, ...ids])]);
        try {
            let successCount = 0;
            for (const id of ids) {
                await api.post('/agendamentos/executar', { agendamento_id: id });
                successCount++;
            }
            setSelectedIds([]);
            loadData();
        } catch (err) {
            alert("Erro ao disparar Execução/Validação.");
        } finally {
            setProcessingIds(prev => prev.filter(x => !ids.includes(x)));
        }
    };

    const handleCopyCarteirinha = (agenda) => {
        if (agenda.carteirinha) {
            navigator.clipboard.writeText(agenda.carteirinha);
            setCopiedId(agenda.id_agendamento);
            setTimeout(() => setCopiedId(null), 2000);
        }
    };

    const selectedMotivoObj = motivosFalta.find(m => m.id === parseInt(faltaModal.motivoId));

    return (
        <div className="p-4 md:p-6 space-y-4 pb-24 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center bg-surface p-6 rounded-2xl border border-border">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                        <GitBranch className="text-primary w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Workflow de Faturamento</h1>
                        <p className="text-sm text-text-secondary mt-1">
                            Acompanhe o ciclo de faturameno dos agendamentos com fluxos automáticos;
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={exportToXLSX}
                        variant="outline"
                        className="flex items-center gap-2 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10"
                    >
                        <Download className="w-4 h-4 text-emerald-400" />
                        Exportar XLSX
                    </Button>
                    <Button
                        onClick={handleAtualizarClick}
                        disabled={loading}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Pipeline Stage Tabs: FALTAS -> A CONFIRMAR -> CONFIRMADOS -> FATURADOS -> PENDENTES */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <button
                    onClick={() => setActiveTab('faltas')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                        activeTab === 'faltas'
                            ? 'bg-red-500/15 border-red-500/50 text-red-200 shadow-lg shadow-red-500/10'
                            : 'bg-surface border-border text-text-secondary hover:border-slate-700'
                    }`}
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider">Faltas</span>
                        <XCircle className="w-4 h-4 text-red-400" />
                    </div>
                    <span className="text-2xl font-bold text-red-300">{counts.faltas}</span>
                </button>

                <button
                    onClick={() => setActiveTab('a_confirmar')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                        activeTab === 'a_confirmar'
                            ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-lg shadow-amber-500/10'
                            : 'bg-surface border-border text-text-secondary hover:border-slate-700'
                    }`}
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider">A Confirmar</span>
                        <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-2xl font-bold text-amber-300">{counts.a_confirmar}</span>
                </button>

                <button
                    onClick={() => setActiveTab('confirmados')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                        activeTab === 'confirmados'
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200 shadow-lg shadow-emerald-500/10'
                            : 'bg-surface border-border text-text-secondary hover:border-slate-700'
                    }`}
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider">Confirmados</span>
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-2xl font-bold text-emerald-300">{counts.confirmados}</span>
                </button>

                <button
                    onClick={() => setActiveTab('faturados')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                        activeTab === 'faturados'
                            ? 'bg-blue-500/15 border-blue-500/50 text-blue-200 shadow-lg shadow-blue-500/10'
                            : 'bg-surface border-border text-text-secondary hover:border-slate-700'
                    }`}
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider">Faturados</span>
                        <FileText className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-2xl font-bold text-blue-300">{counts.faturados}</span>
                </button>

                <button
                    onClick={() => setActiveTab('pendentes')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                        activeTab === 'pendentes'
                            ? 'bg-purple-500/15 border-purple-500/50 text-purple-200 shadow-lg shadow-purple-500/10'
                            : 'bg-surface border-border text-text-secondary hover:border-slate-700'
                    }`}
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider">Pendentes</span>
                        <AlertCircle className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-2xl font-bold text-purple-300">{counts.pendentes}</span>
                </button>
            </div>

            {/* Filters Area with Unidade and Sem Carteira Checkbox */}
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
                    <Input 
                        placeholder="Buscar Paciente..." 
                        value={filters.paciente} 
                        onChange={(e) => handleFilterChange('paciente', e.target.value)} 
                    />
                    <Select 
                        value={filters.id_convenio} 
                        onChange={(e) => handleFilterChange('id_convenio', e.target.value)}
                    >
                        <option value="">Todos os Convênios</option>
                        {convenios.map(c => <option key={c.id_convenio} value={c.id_convenio}>{c.nome}</option>)}
                    </Select>
                    <Select
                        value={filters.id_unidade}
                        onChange={(e) => handleFilterChange('id_unidade', e.target.value)}
                    >
                        <option value="">Todas as Unidades</option>
                        {unidades.map(u => (
                            <option key={u.id_unidade} value={u.id_unidade}>{u.nome}</option>
                        ))}
                    </Select>
                    <Input 
                        type="date" 
                        value={filters.data_inicio} 
                        onChange={(e) => handleFilterChange('data_inicio', e.target.value)} 
                    />
                    <Input 
                        type="date" 
                        value={filters.data_fim} 
                        onChange={(e) => handleFilterChange('data_fim', e.target.value)} 
                    />
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
                        <input
                            type="checkbox"
                            className="rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
                            checked={filters.sem_carteirinha}
                            onChange={(e) => handleFilterChange('sem_carteirinha', e.target.checked)}
                        />
                        <span className="text-xs font-medium text-amber-300 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            Sem carteira
                        </span>
                    </label>
                </div>
            </Card>

            {/* Batch Action Bar per Active Tab */}
            {selectedIds.length > 0 && (
                <div className="bg-primary/20 border border-primary/50 text-slate-100 p-3 flex justify-between items-center rounded-xl animate-fade-in">
                    <span className="font-medium text-sm">
                        {selectedIds.length} item(s) selecionado(s)
                    </span>
                    <div className="flex gap-2">
                        {activeTab === 'faltas' && (
                            <Button 
                                size="sm" 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white" 
                                onClick={() => handleRemoverFalta(selectedIds)}
                            >
                                <RotateCcw className="w-4 h-4 mr-1.5" /> Remover Falta (OP5)
                            </Button>
                        )}

                        {activeTab === 'a_confirmar' && (
                            <>
                                <Button 
                                    size="sm" 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white" 
                                    onClick={() => handleConfirmarPortal(selectedIds, false)}
                                >
                                    <CheckCircle className="w-4 h-4 mr-1.5" /> Confirmar no Portal (OP3)
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="bg-red-600 hover:bg-red-700 text-white" 
                                    onClick={() => handleOpenFaltaModal(null)}
                                >
                                    <XCircle className="w-4 h-4 mr-1.5" /> Registrar Falta (OP4)
                                </Button>
                            </>
                        )}

                        {activeTab === 'confirmados' && (
                            <>
                                <Button 
                                    size="sm" 
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white" 
                                    onClick={() => handleExecutarValidar(selectedIds)}
                                >
                                    <Play className="w-4 h-4 mr-1.5" /> Executar / Validar
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="bg-red-600 hover:bg-red-700 text-white" 
                                    onClick={() => handleOpenFaltaModal(null)}
                                >
                                    <XCircle className="w-4 h-4 mr-1.5" /> Registrar Falta (OP4)
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="border-amber-500/50 text-amber-300 hover:bg-amber-500/20" 
                                    onClick={() => handleConfirmarPortal(selectedIds, true)}
                                >
                                    <RotateCcw className="w-4 h-4 mr-1.5" /> Remover Confirmação
                                </Button>
                            </>
                        )}

                        {activeTab === 'pendentes' && (
                            <Button 
                                size="sm" 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white" 
                                onClick={() => handleExecutarValidar(selectedIds)}
                            >
                                <Play className="w-4 h-4 mr-1.5" /> Executar
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Table Area (Removed ID Portal and Carteirinha columns) */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-800/50 border-b border-slate-700/50 text-slate-400">
                            <tr>
                                <th className="px-3 py-2.5 w-8">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-600 bg-slate-900 text-primary" 
                                        checked={agendamentos.length > 0 && selectedIds.length === agendamentos.length} 
                                        onChange={handleSelectAll} 
                                    />
                                </th>
                                <th className="px-3 py-2.5 font-medium uppercase text-[10px]">Paciente</th>
                                <th className="px-3 py-2.5 font-medium uppercase text-[10px]">Data / Hora (DD-MM-AAAA)</th>
                                <th className="px-3 py-2.5 font-medium uppercase text-[10px]">Profissional</th>
                                <th className="px-3 py-2.5 font-medium uppercase text-[10px]">Convênio</th>
                                <th className="px-3 py-2.5 font-medium uppercase text-[10px]">Guia</th>
                                <th className="px-3 py-2.5 font-medium uppercase text-[10px]">Procedimento</th>
                                <th className="px-3 py-2.5 font-medium uppercase text-[10px]">Status</th>
                                <th className="px-3 py-2.5 font-medium uppercase text-center text-[10px]">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {agendamentos.map(agenda => {
                                const hasCarteirinha = agenda.carteirinha && agenda.carteirinha.trim() !== '';
                                const isItemProcessing = processingIds.includes(agenda.id_agendamento) || agenda.execucao_status === 'processando';

                                return (
                                    <tr key={agenda.id_agendamento} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-3 py-2">
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-slate-600 bg-slate-900 text-primary" 
                                                checked={selectedIds.includes(agenda.id_agendamento)} 
                                                onChange={() => toggleSelect(agenda.id_agendamento)} 
                                            />
                                        </td>

                                        {/* Paciente Column with Instant Hover Tooltip for Carteirinha and Missing Carteirinha Warning */}
                                        <td className="px-3 py-2 font-medium text-slate-200 text-xs">
                                            <div className="flex items-center gap-1.5 relative group">
                                                <span>{agenda.Nome_Paciente}</span>
                                                
                                                {hasCarteirinha ? (
                                                    <div 
                                                        className="relative cursor-pointer"
                                                        onClick={() => handleCopyCarteirinha(agenda)}
                                                        title="Clique para copiar carteirinha"
                                                    >
                                                        {copiedId === agenda.id_agendamento ? (
                                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                        ) : (
                                                            <Info className="w-3.5 h-3.5 text-indigo-400 hover:text-indigo-300 transition-colors" />
                                                        )}
                                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block bg-slate-950 text-slate-200 text-[10px] font-mono px-2 py-1 rounded shadow-xl border border-slate-700 whitespace-nowrap z-30">
                                                            {copiedId === agenda.id_agendamento ? "Copiado!" : `Carteirinha: ${agenda.carteirinha} (Clique para copiar)`}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="relative cursor-help">
                                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block bg-amber-950/90 text-amber-200 text-[10px] px-2 py-1 rounded shadow-xl border border-amber-600/50 whitespace-nowrap z-30 font-medium">
                                                            Sem carteirinha cadastrada
                                                        </div>
                                                    </div>
                                                )}

                                                {isItemProcessing && (
                                                    <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin ml-1" title="Aguardando retorno do Webhook..." />
                                                )}
                                            </div>
                                        </td>

                                        {/* Data / Hora formatted strictly to DD-MM-YYYY */}
                                        <td className="px-3 py-2 text-xs text-slate-300 font-mono">
                                            {formatDate(agenda.data)} {agenda.hora_inicio ? agenda.hora_inicio.substring(0, 5) : ''}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-300">{agenda.Nome_profissional}</td>
                                        <td className="px-3 py-2 text-xs text-slate-400">{agenda.nome_convenio}</td>
                                        <td className="px-3 py-2 text-xs text-slate-300">{agenda.numero_guia || '—'}</td>
                                        <td className="px-3 py-2 text-xs text-slate-300">{agenda.nome_procedimento || agenda.cod_procedimento_aut || '—'}</td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                                    agenda.Status === 'Confirmado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    agenda.Status === 'Falta' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                    agenda.Status === 'Excluído' ? 'bg-slate-700/40 text-slate-400 border-slate-600' :
                                                    agenda.Status === 'Faturado' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    agenda.Status === 'Faturamento Solicitado' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                    agenda.Status === 'Pendente' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                }`}>
                                                    {agenda.Status}
                                                </span>
                                                {isItemProcessing && (
                                                    <span className="text-[10px] text-indigo-400 animate-pulse font-medium flex items-center gap-1">
                                                        <Loader2 className="w-3 h-3 animate-spin" /> Processando...
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Action Buttons with Instant Tailwind Hover Tooltips */}
                                        <td className="px-3 py-2 text-center">
                                            <div className="flex justify-center items-center gap-1">
                                                {isItemProcessing ? (
                                                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                                                ) : (
                                                    <>
                                                        {activeTab === 'faltas' && (
                                                            <div className="relative group">
                                                                <button
                                                                    onClick={() => handleRemoverFalta([agenda.id_agendamento])}
                                                                    className="p-1 rounded hover:bg-emerald-500/10 text-emerald-400 transition-colors"
                                                                >
                                                                    <RotateCcw size={15} />
                                                                </button>
                                                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block bg-slate-950 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap z-20">
                                                                    Remover Falta (OP5)
                                                                </div>
                                                            </div>
                                                        )}

                                                        {activeTab === 'a_confirmar' && (
                                                            <>
                                                                <div className="relative group">
                                                                    <button
                                                                        onClick={() => handleConfirmarPortal([agenda.id_agendamento], false)}
                                                                        className="p-1 rounded hover:bg-emerald-500/10 text-emerald-400 transition-colors"
                                                                    >
                                                                        <CheckCircle size={15} />
                                                                    </button>
                                                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block bg-slate-950 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap z-20">
                                                                        Confirmar no Portal (OP3)
                                                                    </div>
                                                                </div>
                                                                <div className="relative group">
                                                                    <button
                                                                        onClick={() => handleOpenFaltaModal(agenda)}
                                                                        className="p-1 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                                                                    >
                                                                        <XCircle size={15} />
                                                                    </button>
                                                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block bg-slate-950 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap z-20">
                                                                        Registrar Falta no Portal (OP4)
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}

                                                        {activeTab === 'confirmados' && (
                                                            <>
                                                                <div className="relative group">
                                                                    <button
                                                                        onClick={() => handleExecutarValidar([agenda.id_agendamento])}
                                                                        className="p-1 rounded hover:bg-indigo-500/10 text-indigo-400 transition-colors"
                                                                    >
                                                                        <Play size={15} />
                                                                    </button>
                                                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block bg-slate-950 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap z-20">
                                                                        Executar / Validar
                                                                    </div>
                                                                </div>
                                                                <div className="relative group">
                                                                    <button
                                                                        onClick={() => handleOpenFaltaModal(agenda)}
                                                                        className="p-1 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                                                                    >
                                                                        <XCircle size={15} />
                                                                    </button>
                                                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block bg-slate-950 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap z-20">
                                                                        Registrar Falta (OP4)
                                                                    </div>
                                                                </div>
                                                                <div className="relative group">
                                                                    <button
                                                                        onClick={() => handleConfirmarPortal([agenda.id_agendamento], true)}
                                                                        className="p-1 rounded hover:bg-amber-500/10 text-amber-400 transition-colors"
                                                                    >
                                                                        <RotateCcw size={15} />
                                                                    </button>
                                                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block bg-slate-950 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap z-20">
                                                                        Remover Confirmação (OP3)
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}

                                                        {activeTab === 'pendentes' && (
                                                            <div className="relative group">
                                                                <button
                                                                    onClick={() => handleExecutarValidar([agenda.id_agendamento])}
                                                                    className="p-1 rounded hover:bg-indigo-500/10 text-indigo-400 transition-colors"
                                                                >
                                                                    <Play size={15} />
                                                                </button>
                                                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block bg-slate-950 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap z-20">
                                                                    Executar
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {agendamentos.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-slate-500">
                                        Nenhum agendamento encontrado nesta etapa da pipeline.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-border flex items-center justify-between">
                    <span className="text-sm text-text-secondary">
                        Mostrando {agendamentos.length} de {totalItems} registros
                    </span>
                    <Pagination
                        currentPage={page}
                        totalItems={totalItems}
                        pageSize={pageSize}
                        onPageChange={setPage}
                        onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
                    />
                </div>
            </Card>

            {/* Modal Registrar Falta */}
            {faltaModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl max-w-md w-full">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <XCircle className="w-5 h-5 text-red-400" />
                                Registrar Falta no Portal (OP4)
                            </h3>
                            <button 
                                onClick={() => setFaltaModal({ isOpen: false, agendamento: null, motivoId: '', docJustificativa: '' })}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Motivo da Falta</label>
                                <Select
                                    value={faltaModal.motivoId}
                                    onChange={(e) => setFaltaModal(prev => ({ ...prev, motivoId: e.target.value }))}
                                >
                                    {motivosFalta.map(m => (
                                        <option key={m.id} value={m.id}>
                                            [{m.tipo || 'Geral'}] {m.descricao} (ID Portal: {m.id_mapeado})
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            {selectedMotivoObj && selectedMotivoObj.anexo === 'SIM' && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Documento / Justificativa</label>
                                    <Input
                                        placeholder="Caminho do documento ou justificativa..."
                                        value={faltaModal.docJustificativa}
                                        onChange={(e) => setFaltaModal(prev => ({ ...prev, docJustificativa: e.target.value }))}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <Button 
                                variant="secondary" 
                                onClick={() => setFaltaModal({ isOpen: false, agendamento: null, motivoId: '', docJustificativa: '' })}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                disabled={loading}
                                onClick={handleConfirmarFalta}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                Registrar Falta
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
