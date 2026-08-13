import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import Pagination from '../components/Pagination';
import { Search, Calendar, FileText, CheckCircle, XCircle, Clock, AlertCircle, ChevronDown, Filter, Trash2, Network, X, Play, Download, Edit3, Shield, RefreshCw, Printer } from 'lucide-react';
import { formatDate } from '../utils/formatters';

// Design System components matching the app's aesthetic
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';

// ── TimeoutPie: indicador visual de timeout de captura (Goiânia) ──
// 0-40min = verde, 40-50min = amarelo, 50min+ = vermelho
// Timeout esgotado (59min) = contorno vermelho + tooltip "Guia não capturada"
const TIMEOUT_MINUTES = 59;
function TimeoutPie({ timestampCaptura }) {
    // Sem timestamp = guia não capturada → exibe ícone expirado
    if (!timestampCaptura) {
        return (
            <span title="Guia não capturada" style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 6, cursor: 'help' }}>
                <svg width={20} height={20} viewBox="0 0 20 20">
                    <circle cx={10} cy={10} r={8} fill="none" stroke="#ef4444" strokeWidth="2" />
                </svg>
            </span>
        );
    }

    const capturedAt = new Date(timestampCaptura);
    const now = new Date();
    const elapsedMs = now - capturedAt;
    const elapsedMin = elapsedMs / 60000;
    const remainingMin = Math.max(0, TIMEOUT_MINUTES - elapsedMin);
    const expired = elapsedMin >= TIMEOUT_MINUTES;
    const fraction = Math.min(elapsedMin / TIMEOUT_MINUTES, 1);

    // Cor baseada no tempo decorrido
    let color = '#22c55e'; // green
    if (elapsedMin >= 50) color = '#ef4444'; // red
    else if (elapsedMin >= 40) color = '#eab308'; // yellow

    const tooltip = expired
        ? 'Guia não capturada (timeout esgotado)'
        : `${Math.round(remainingMin)}min restantes`;

    // SVG pie chart arc
    const size = 20;
    const r = 8;
    const cx = size / 2;
    const cy = size / 2;
    const angle = fraction * 360;
    const rad = (angle - 90) * (Math.PI / 180);
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    const largeArc = angle > 180 ? 1 : 0;

    if (expired) {
        return (
            <span title={tooltip} style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 6, cursor: 'help' }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth="2" />
                </svg>
            </span>
        );
    }

    const pathD = angle >= 360
        ? `M ${cx},${cy - r} A ${r},${r} 0 1,1 ${cx - 0.01},${cy - r} Z`
        : `M ${cx},${cy} L ${cx},${cy - r} A ${r},${r} 0 ${largeArc},1 ${x},${y} Z`;

    return (
        <span title={tooltip} style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 6, cursor: 'help' }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334155" strokeWidth="1.5" />
                <path d={pathD} fill={color} />
            </svg>
        </span>
    );
}

export default function Agendamentos() {
    const location = useLocation();
    const [agendamentos, setAgendamentos] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [loading, setLoading] = useState(false);

    // Reset de paginação ao trocar de rota/página
    useEffect(() => {
        setPage(1);
    }, [location.pathname]);

    // Filters
    const [convenios, setConvenios] = useState([]);
    const [procedimentos, setProcedimentos] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [filters, setFilters] = useState({
        paciente: '',
        id_convenio: '',
        id_unidade: '',
        data_inicio: '',
        data_fim: '',
        status: '',
        procedimento: ''
    });

    useEffect(() => {
        api.get('/unidades/').then(res => setUnidades(res.data)).catch(console.error);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams();
        if (filters.data_inicio) params.append('data_inicio', filters.data_inicio);
        if (filters.data_fim) params.append('data_fim', filters.data_fim);
        api.get(`/convenios/active-in-range?${params.toString()}`)
            .then(res => setConvenios(res.data))
            .catch(console.error);
    }, [filters.data_inicio, filters.data_fim]);

    const handleGerarComprovante = async () => {
        if (!selectedIds.length) {
            alert("Selecione ao menos um agendamento para gerar o comprovante.");
            return;
        }
        try {
            const response = await api.post('/comprovante/gerar', { agendamento_ids: selectedIds }, { responseType: 'blob' });
            const isZip = response.headers['content-type']?.includes('zip');
            const fileName = isZip ? 'comprovantes_unimed.zip' : 'comprovante_unimed.pdf';
            
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert("Erro ao gerar comprovante: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleImprimirIpasgo = async (id) => {
        try {
            const res = await api.post('/agendamentos/imprimir-ipasgo', { agendamento_id: id });
            alert(res.data.message || "Job OP12 de impressão IPASGO enfileirado!");
            loadData();
        } catch (err) {
            alert("Erro ao solicitar impressão IPASGO: " + (err.response?.data?.detail || err.message));
        }
    };

    const exportToXLSX = () => {
        if (!agendamentos.length) {
            alert("Nenhum dado para exportar.");
            return;
        }
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "Paciente;Carteirinha;Data;Hora;Profissional;Convenio;Guia;Procedimento;Status\n";

        agendamentos.forEach(a => {
            const row = [
                `"${a.Nome_Paciente || ''}"`,
                `"${a.carteirinha || ''}"`,
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
        link.setAttribute("download", `agendamentos_export_${new Date().toISOString().substring(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Subscriptions for Batches
    const [selectedIds, setSelectedIds] = useState([]);
    const [capturaModal, setCapturaModal] = useState({ isOpen: false, resolve: null });

    // Modal de Sincronização ABA_clmf
    const [syncModal, setSyncModal] = useState({
        isOpen: false,
        data_inicio: '',
        data_fim: '',
        id_paciente: ''
    });

    const confirmCaptura = () => new Promise((resolve) => {
        setCapturaModal({ isOpen: true, resolve });
    });

    const handleCapturaChoice = (choice) => {
        if (capturaModal.resolve) capturaModal.resolve(choice);
        setCapturaModal({ isOpen: false, resolve: null });
    };

    const handleTriggerSync = async () => {
        setLoading(true);
        try {
            const res = await api.post('/agendamentos/sincronizar', {
                data_inicio: syncModal.data_inicio || null,
                data_fim: syncModal.data_fim || null,
                id_paciente: syncModal.id_paciente || "0",
                id_convenio: 101
            });
            alert(res.data.message || "Job de sincronização enfileirado com sucesso!");
            setSyncModal(prev => ({ ...prev, isOpen: false }));
            loadData();
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.detail || "Erro ao solicitar sincronização de agendamentos.";
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    // KPIs
    const [kpis, setKpis] = useState({ total: 0, confirmados: 0, a_confirmar: 0, faltas: 0, sem_carteirinha: 0 });

    useEffect(() => {
        // Load Convenios on mount
        api.get('/convenios/').then(res => setConvenios(res.data)).catch(console.error);
    }, []);

    useEffect(() => {
        if (filters.id_convenio) {
            // Load Procedimentos dynamically when convenio changes
            api.get(`/agendamentos/procedimentos?id_convenio=${filters.id_convenio}`)
                .then(res => setProcedimentos(res.data))
                .catch(console.error);
        } else {
            setProcedimentos([]);
        }
    }, [filters.id_convenio]);

    useEffect(() => {
        loadData();
    }, [page, pageSize, filters]);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                skip: (page - 1) * pageSize,
                limit: pageSize,
                ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
            });
            const response = await api.get(`/agendamentos/?${params.toString()}`);
            setAgendamentos(response.data.data);
            setTotalItems(response.data.total);

            // Calculate pseudo KPIs for the current view (or backend could send totals)
            const list = response.data.data;
            setKpis({
                total: response.data.total,
                confirmados: response.data.kpis.confirmados,
                a_confirmar: response.data.kpis.a_confirmar,
                faltas: response.data.kpis.faltas,
                sem_carteirinha: response.data.kpis.sem_carteirinha || 0
            });
        } catch (error) {
            console.error('Erro ao carregar agendamentos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => {
            const newF = { ...prev, [field]: value };
            if (field === 'id_convenio' && value !== prev.id_convenio) {
                newF.procedimento = ''; // Reset child dropdown
            }
            return newF;
        });
        setPage(1);
    };

    const clearFilters = () => {
        setFilters({
            paciente: '', id_convenio: '', data_inicio: '', data_fim: '', status: '', procedimento: ''
        });
        setPage(1);
    };

    // --- Batch Actions ---
    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(agendamentos.map(a => a.id_agendamento));
        else setSelectedIds([]);
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleBatchAction = async (action) => {
        if (selectedIds.length === 0) return;
        setLoading(true);
        try {
            if (action === 'faturar') {
                await api.post('/agendamentos/faturar', { agendamento_ids: selectedIds });
                alert(`${selectedIds.length} agendamentos enviados para Faturamento!`);
            } else if (action === 'excluir') {
                if (window.confirm(`Tem certeza que deseja excluir ${selectedIds.length} agendamentos ? Isso devolverá o saldo para as guias se possuírem.`)) {
                    await api.delete('/agendamentos/batch', { data: { ids: selectedIds } });
                } else {
                    return;
                }
            } else {
                // Confirmar or Falta (Status Update)
                const targetStatus = action === 'confirmar' ? 'Confirmado' : 'Falta';
                let capturar = true;

                if (action === 'confirmar') {
                    const selectedAgendamentos = agendamentos.filter(a => selectedIds.includes(a.id_agendamento));
                    const containsUnimedGoiania = selectedAgendamentos.some(a => a.id_convenio == 3);
                    if (containsUnimedGoiania) {
                        capturar = await confirmCaptura();
                    }
                }

                const res = await api.put('/agendamentos/batch-status', { ids: selectedIds, status: targetStatus, capturar_guias: capturar });
                if (action === 'confirmar' && res.data && res.data.jobs_created > 0) {
                    alert(`${selectedIds.length} agendamentos confirmados.\nForam disparados ${res.data.jobs_created} Jobs Automáticos (Biometria / Execução).`);
                } else {
                    alert(`Status alterado para ${targetStatus} com sucesso!`);
                }
            }
            setSelectedIds([]);
            loadData();
        } catch (error) {
            console.error(error);
            alert("Erro ao executar ação em lote.");
        } finally {
            setLoading(false);
        }
    };

    const handleVincularGuias = async () => {
        setLoading(true);
        try {
            const res = await api.post('/agendamentos/vincular-guias');
            alert(res.data.message || "Guias vinculadas com sucesso!");
            loadData(); // Recarrega table e KPIs após vinculação massiva
        } catch (error) {
            console.error('Erro ao vincular guias:', error);
            alert("Falha ao comunicar com o servidor para vincular guias.");
        } finally {
            setLoading(false);
        }
    };

    const handleCapturar = async (agenda) => {
        try {
            setLoading(true);
            await api.post('/agendamentos/capturar', { agendamento_id: agenda.id_agendamento });
            alert("Job de Captura enfileirado com sucesso!");
            loadData();
        } catch (error) {
            console.error(error);
            if (error.response && error.response.status === 409) {
                alert(error.response.data.detail || "Já existe um job de Captura ativo para esta guia.");
            } else {
                alert("Erro ao disparar Captura.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleExecutar = async (agenda) => {
        // Para Goiânia e Anápolis: backend auto-cria Captura se necessário
        if (agenda.id_convenio === 2 || agenda.id_convenio === 3 || agenda.id_convenio === 6) {
            if (!window.confirm("Confirma a Execução da guia ?\n(Para Unimed Goiânia/Anápolis, se necessário, um Job de Captura será criado automaticamente antes da Execução.)")) {
                return;
            }
            try {
                setLoading(true);
                const res = await api.post('/agendamentos/executar', { agendamento_id: agenda.id_agendamento });
                const msg = res.data.captura_job_id
                    ? `Jobs Captura (#${res.data.captura_job_id}) → Execução (#${res.data.job_id}) enfileirados!`
                    : `Job de Execução (#${res.data.job_id}) enfileirado!`;
                alert(msg);
                loadData();
            } catch (error) {
                alert("Erro ao disparar Execução.");
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-4 pb-24 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center bg-surface p-6 rounded-2xl border border-border">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                        <Calendar className="text-primary w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Agendamentos</h1>
                        <p className="text-sm text-text-secondary mt-1">Gerencie a agenda, autorizações vinculadas e inicie robôs de faturamento.</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        onClick={exportToXLSX}
                        variant="outline"
                        className="flex items-center gap-2 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10"
                    >
                        <Download className="w-5 h-5 text-emerald-400" />
                        Exportar XLSX
                    </Button>
                    <button
                        onClick={() => setSyncModal({
                            isOpen: true,
                            data_inicio: filters.data_inicio || new Date().toISOString().split('T')[0],
                            data_fim: filters.data_fim || new Date().toISOString().split('T')[0],
                            id_paciente: ''
                        })}
                        disabled={loading}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Sincronizar Agendamentos
                    </button>
                    <button
                        onClick={handleVincularGuias}
                        disabled={loading}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                        <Network className="w-5 h-5" />
                        Vincular Guias à Agenda
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <Card className="p-4 flex flex-col justify-center items-center bg-slate-800/50">
                    <span className="text-xs text-text-secondary text-center">Total Agendamentos</span>
                    <span className="text-xl font-bold text-slate-100">{kpis.total}</span>
                </Card>
                <Card className="p-4 flex flex-col justify-center items-center bg-emerald-500/10 border-emerald-500/20">
                    <span className="text-xs text-emerald-400 text-center">Confirmados</span>
                    <span className="text-xl font-bold text-emerald-300">{kpis.confirmados}</span>
                </Card>
                <Card className="p-4 flex flex-col justify-center items-center bg-amber-500/10 border-amber-500/20">
                    <span className="text-xs text-amber-400 text-center">A Confirmar</span>
                    <span className="text-xl font-bold text-amber-300">{kpis.a_confirmar}</span>
                </Card>
                <Card className="p-4 flex flex-col justify-center items-center bg-red-500/10 border-red-500/20">
                    <span className="text-xs text-red-400 text-center">Faltas</span>
                    <span className="text-xl font-bold text-red-300">{kpis.faltas}</span>
                </Card>
                <Card className="p-4 flex flex-col justify-center items-center bg-purple-500/10 border-purple-500/20">
                    <span className="text-xs text-purple-400 text-center">Sem Carteirinha</span>
                    <span className="text-xl font-bold text-purple-300">{kpis.sem_carteirinha}</span>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                        <Filter className="w-4 h-4 text-primary" /> Filtros
                    </h3>
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-text-secondary hover:text-text-primary">
                        <X className="w-4 h-4 mr-2" /> Limpar
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <Input placeholder="Buscar Paciente..." icon={<Search className="w-4 h-4" />} value={filters.paciente} onChange={(e) => handleFilterChange('paciente', e.target.value)} />
                    <Select value={filters.id_convenio} onChange={(e) => handleFilterChange('id_convenio', e.target.value)}>
                        <option value="">Todos os Convênios</option>
                        {convenios.map(c => <option key={c.id_convenio} value={c.id_convenio}>{c.nome}</option>)}
                    </Select>
                    <Select value={filters.id_unidade} onChange={(e) => handleFilterChange('id_unidade', e.target.value)}>
                        <option value="">Todas Unidades</option>
                        {unidades.map(u => <option key={u.id_unidade} value={u.id_unidade}>{u.nome || `Unidade #${u.id_unidade}`}</option>)}
                    </Select>
                    <Select value={filters.procedimento} onChange={(e) => handleFilterChange('procedimento', e.target.value)} disabled={!filters.id_convenio}>
                        <option value="">Todos Procedimentos</option>
                        {procedimentos.map((p, i) => <option key={i} value={p.faturamento || p.nome || p}>{p.nome || p}</option>)}
                    </Select>
                    <Select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                        <option value="">Status...</option>
                        <option value="A Confirmar">A Confirmar</option>
                        <option value="Confirmado">Confirmado</option>
                        <option value="Falta">Falta</option>
                        <option value="Faturamento Solicitado">Faturamento Solicitado</option>
                        <option value="Faturado">Faturado</option>
                    </Select>
                    <Input type="date" value={filters.data_inicio} onChange={(e) => handleFilterChange('data_inicio', e.target.value)} />
                    <Input type="date" value={filters.data_fim} onChange={(e) => handleFilterChange('data_fim', e.target.value)} />
                </div>
            </Card>

            {/* Batch Action Bar */}
            {selectedIds.length > 0 && (
                <div className="bg-primary/20 border border-primary/50 text-slate-100 p-3 flex justify-between items-center rounded-lg animate-fade-in">
                    <span className="font-medium text-sm">
                        {selectedIds.length} item(s) selecionado(s)
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 border-emerald-500/50" onClick={() => handleBatchAction('confirmar')}>
                            <CheckCircle className="w-4 h-4 mr-1.5" /> Confirmar
                        </Button>
                        <Button variant="outline" size="sm" className="bg-red-600/20 text-red-400 hover:bg-red-600/40 border-red-500/50" onClick={() => handleBatchAction('falta')}>
                            <XCircle className="w-4 h-4 mr-1.5" /> Falta
                        </Button>
                        <Button variant="outline" size="sm" className="bg-primary hover:bg-primary-hover text-white border-transparent" onClick={() => handleBatchAction('faturar')}>
                            <Play className="w-4 h-4 mr-1.5" /> Faturar OP=3
                        </Button>
                        {(filters.id_convenio === '3' || filters.id_convenio === '21' || !filters.id_convenio) && (
                            <Button variant="outline" size="sm" className="bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/40 border-cyan-500/50" onClick={handleGerarComprovante}>
                                <Download className="w-4 h-4 mr-1.5" /> Imprimir Comprovante (Unimed)
                            </Button>
                        )}
                        <Button variant="outline" size="sm" className="hover:bg-red-900/40 text-red-400 border-red-500/30" onClick={() => handleBatchAction('excluir')}>
                            <Trash2 className="w-4 h-4 mr-1.5" /> Excluir
                        </Button>
                    </div>
                </div>
            )}

            {/* Table Area */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-800/50 border-b border-slate-700/50 text-slate-400">
                            <tr>
                                <th className="px-2 py-2 w-8">
                                    <input type="checkbox" className="rounded border-slate-600 bg-slate-900 text-primary focus:ring-primary focus:ring-offset-slate-900" checked={agendamentos.length > 0 && selectedIds.length === agendamentos.length} onChange={handleSelectAll} />
                                </th>
                                <th className="px-2 py-2 font-medium uppercase tracking-wider text-[10px]">Paciente</th>
                                <th className="px-1 py-2 font-medium uppercase tracking-wider text-[10px] w-20">Data/Hora</th>
                                <th className="px-2 py-2 font-medium uppercase tracking-wider text-[10px]">Profissional</th>
                                <th className="px-2 py-2 font-medium uppercase tracking-wider text-[10px]">Convênio</th>
                                <th className="px-1.5 py-2 font-medium uppercase tracking-wider text-[10px]">Unidade</th>
                                <th className="px-2 py-2 font-medium uppercase tracking-wider text-[10px]">Guia</th>
                                <th className="px-2 py-2 font-medium uppercase tracking-wider text-[10px]">
                                    <div>Status Captura</div>
                                    <div className="flex items-center gap-1.5 mt-0.5 font-normal normal-case tracking-normal">
                                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="0-40min"></span>
                                        <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" title="40-50min"></span>
                                        <span className="inline-block w-2 h-2 rounded-full bg-red-500" title="50min+"></span>
                                        <span className="inline-block w-2 h-2 rounded-full border border-red-500" title="Expirado / Não capturada"></span>
                                    </div>
                                </th>
                                <th className="px-2 py-2 font-medium uppercase tracking-wider text-[10px]">Cód Fat.</th>
                                <th className="px-2 py-2 font-medium uppercase tracking-wider text-[10px]">Status</th>
                                <th className="px-2 py-2 font-medium uppercase tracking-wider text-[10px]">Exec.</th>
                                <th className="px-2 py-2 font-medium uppercase text-center tracking-wider text-[10px]">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {agendamentos.map(agenda => (
                                <tr key={agenda.id_agendamento} className={`hover:bg-slate-800/30 transition-colors ${selectedIds.includes(agenda.id_agendamento) ? 'bg-primary/5' : ''}`}>
                                    <td className="px-2 py-1.5">
                                        <input type="checkbox" className="rounded border-slate-600 bg-slate-900 text-primary focus:ring-primary focus:ring-offset-slate-900" checked={selectedIds.includes(agenda.id_agendamento)} onChange={() => toggleSelect(agenda.id_agendamento)} />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <div className="font-medium text-slate-100 text-xs min-w-[180px] max-w-[280px] truncate" title={agenda.Nome_Paciente}>{agenda.Nome_Paciente}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">{agenda.carteirinha}</div>
                                    </td>
                                    <td className="px-1 py-1.5 text-slate-300 text-[11px] whitespace-nowrap">
                                        <div>{formatDate(agenda.data)}</div>
                                        <div className="text-[10px] text-slate-500">{agenda.hora_inicio ? agenda.hora_inicio.substring(0, 5) : '-'}</div>
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <div className="text-slate-300 text-xs min-w-[140px] max-w-[220px] truncate" title={agenda.Nome_profissional}>{agenda.Nome_profissional}</div>
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                            {agenda.nome_convenio || '—'}
                                        </span>
                                    </td>
                                    <td className="px-1.5 py-1.5 text-slate-300 text-[11px] font-medium">
                                        {agenda.nome_unidade || (agenda.id_unidade ? `Unid. #${agenda.id_unidade}` : '-')}
                                    </td>
                                    <td className="px-2 py-1.5">
                                        {agenda.numero_guia ? (
                                            <span title={`Saldo da guia: ${agenda.saldo_guia ?? '-'}`} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 cursor-help">
                                                {agenda.numero_guia}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-slate-500">—</span>
                                        )}
                                    </td>
                                    <td className="px-2 py-1.5">
                                        {agenda.id_convenio === 3 && agenda.numero_guia ? (
                                            <TimeoutPie timestampCaptura={agenda.timestamp_captura} />
                                        ) : agenda.timestamp_captura ? (
                                            <span className="text-[10px] text-emerald-400">✓</span>
                                        ) : (
                                            <span className="text-[10px] text-slate-600">—</span>
                                        )}
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <div className="group relative inline-block cursor-help">
                                            <span className="text-xs text-slate-300">{agenda.cod_procedimento_fat || '-'}</span>
                                            {agenda.nome_procedimento && (
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max max-w-[200px] whitespace-normal bg-slate-800 text-slate-100 text-[10px] rounded p-1.5 z-10 shadow-lg border border-slate-700">
                                                    {agenda.nome_procedimento}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${agenda.Status === 'Confirmado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            agenda.Status === 'Falta' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                agenda.Status === 'Faturado' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    agenda.Status === 'Faturamento Solicitado' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                            {agenda.Status}
                                        </span>
                                    </td>
                                    <td className="px-2 py-1.5">
                                        {agenda.execucao_status ? (
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${agenda.execucao_status === 'sucesso' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                agenda.execucao_status === 'erro' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                }`}>
                                                {agenda.execucao_status === 'sucesso' ? '✓' :
                                                    agenda.execucao_status === 'erro' ? '✗' :
                                                        '⏳'}
                                            </span>
                                        ) : (
                                            <span className="text-slate-600 text-[10px]">—</span>
                                        )}
                                    </td>
                                    <td className="px-2 py-1.5 text-center">
                                        <div className="flex justify-center items-center gap-1">
                                            {(agenda.id_convenio == 2 || agenda.id_convenio == 3) && (
                                                <button
                                                    title={agenda.timestamp_captura ? 'Capturado' : 'Capturar'}
                                                    disabled={agenda.execucao_status === 'sucesso' || agenda.timestamp_captura}
                                                    onClick={() => handleCapturar(agenda)}
                                                    className="p-1 rounded hover:bg-indigo-500/10 text-indigo-400 hover:text-indigo-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                                >
                                                    <Shield size={14} />
                                                </button>
                                            )}
                                            {(agenda.id_convenio == 2 || agenda.id_convenio == 3 || agenda.id_convenio == 6) && (
                                                <button
                                                    title={agenda.execucao_status === 'sucesso' ? 'Executado' : agenda.execucao_status === 'pendente' ? 'Pendente...' : 'Executar'}
                                                    disabled={agenda.execucao_status === 'sucesso' || agenda.execucao_status === 'pendente'}
                                                    onClick={() => handleExecutar(agenda)}
                                                    className="p-1 rounded hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                                >
                                                    <Play size={14} />
                                                </button>
                                            )}
                                            {(agenda.id_convenio == 6 || agenda.id_convenio == 31) && (
                                                <button
                                                    title="Imprimir Guia IPASGO (OP12)"
                                                    onClick={() => handleImprimirIpasgo(agenda.id_agendamento)}
                                                    className="p-1 rounded hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-300 transition-colors"
                                                >
                                                    <Printer size={14} />
                                                </button>
                                            )}
                                            <button
                                                title="Alterar Status"
                                                className="p-1 rounded hover:bg-primary/10 text-primary hover:text-primary-hover transition-colors"
                                                onClick={() => {
                                                    const newStatus = window.prompt("Digite o novo status (Confirmado, Falta, A Confirmar):", agenda.Status);
                                                    if (newStatus && newStatus !== agenda.Status) {
                                                        const executeStatus = async () => {
                                                            let capturar = true;
                                                            if (newStatus === 'Confirmado' && agenda.id_convenio == 3) {
                                                                capturar = await confirmCaptura();
                                                            }
                                                            api.put('/agendamentos/batch-status', { ids: [agenda.id_agendamento], status: newStatus, capturar_guias: capturar })
                                                                .then((res) => {
                                                                    if (newStatus === 'Confirmado' && res.data && res.data.jobs_created > 0) {
                                                                        alert(`Status alterado para Confirmado. ${res.data.jobs_created} Jobs automáticos iniciados!`);
                                                                    }
                                                                    loadData();
                                                                })
                                                                .catch(err => alert("Erro ao atualizar o status"));
                                                        };
                                                        executeStatus();
                                                    }
                                                }}
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {agendamentos.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="11" className="p-8 text-center text-slate-500">
                                        Nenhum agendamento encontrado com os filtros atuais.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
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

            {/* Modal de Confirmação de Captura */}
            {capturaModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg shadow-xl max-w-sm w-full">
                        <h3 className="text-lg font-semibold text-white mb-2">Orquestração de Job</h3>
                        <p className="text-slate-300 mb-6 font-medium">
                            Deseja realizar a rotina de captura SGUCard para as guias selecionadas?
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => handleCapturaChoice(false)} className="bg-slate-700 hover:bg-slate-600 text-white">
                                Não
                            </Button>
                            <Button variant="primary" onClick={() => handleCapturaChoice(true)} className="bg-primary hover:bg-primary-hover text-white">
                                Sim
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Sincronização de Agendamentos (Portal ABA) */}
            {syncModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl max-w-md w-full">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <RefreshCw className="w-5 h-5 text-emerald-400" />
                                Sincronizar Agendamentos
                            </h3>
                            <button
                                onClick={() => setSyncModal(prev => ({ ...prev, isOpen: false }))}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-400 mb-4">
                            Busque e sincronize atendimentos diretamente do portal ABA_clmf para o período selecionado.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">ID do Paciente (Opcional)</label>
                                <Input
                                    placeholder="Deixe 0 para buscar todos os pacientes"
                                    value={syncModal.id_paciente}
                                    onChange={(e) => setSyncModal(prev => ({ ...prev, id_paciente: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Data Início</label>
                                    <Input
                                        type="date"
                                        value={syncModal.data_inicio}
                                        onChange={(e) => setSyncModal(prev => ({ ...prev, data_inicio: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Data Fim</label>
                                    <Input
                                        type="date"
                                        value={syncModal.data_fim}
                                        onChange={(e) => setSyncModal(prev => ({ ...prev, data_fim: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <Button
                                variant="secondary"
                                onClick={() => setSyncModal(prev => ({ ...prev, isOpen: false }))}
                                className="bg-slate-700 hover:bg-slate-600 text-white"
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                disabled={loading}
                                onClick={handleTriggerSync}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Sincronizar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
