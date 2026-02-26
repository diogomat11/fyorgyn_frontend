import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';
import { Search, Calendar, FileText, CheckCircle, XCircle, Clock, AlertCircle, ChevronDown, Filter, Trash2, Network, X, Play } from 'lucide-react';
import { formatDate } from '../utils/formatters';

// Design System components matching the app's aesthetic
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';

export default function Agendamentos() {
    const [agendamentos, setAgendamentos] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [loading, setLoading] = useState(false);

    // Filters
    const [convenios, setConvenios] = useState([]);
    const [procedimentos, setProcedimentos] = useState([]);
    const [filters, setFilters] = useState({
        paciente: '',
        id_convenio: '',
        data_inicio: '',
        data_fim: '',
        status: '',
        procedimento: ''
    });

    // Subscriptions for Batches
    const [selectedIds, setSelectedIds] = useState([]);
    const [capturaModal, setCapturaModal] = useState({ isOpen: false, resolve: null });

    const confirmCaptura = () => new Promise((resolve) => {
        setCapturaModal({ isOpen: true, resolve });
    });

    const handleCapturaChoice = (choice) => {
        if (capturaModal.resolve) capturaModal.resolve(choice);
        setCapturaModal({ isOpen: false, resolve: null });
    };

    // KPIs
    const [kpis, setKpis] = useState({ total: 0, confirmados: 0, a_confirmar: 0, faltas: 0 });

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
            const resCap = await api.post('/agendamentos/capturar', { agendamento_id: agenda.id_agendamento });
            await api.post('/agendamentos/executar', { agendamento_id: agenda.id_agendamento, depending_id: resCap.data.job_id });
            alert("Jobs de Captura e Execução orquestrados em cadeia de dependência!");
            loadData();
        } catch (error) {
            console.error(error);
            alert("Erro ao disparar Captura.");
        } finally {
            setLoading(false);
        }
    };

    const handleExecutar = async (agenda) => {
        if (agenda.id_convenio === 3) {
            if (!agenda.timestamp_captura) {
                alert("ERRO: Guia não possui Captura. Realize a Captura restrita primeiramente.");
                return;
            }
            if (!window.confirm("Confirma a Execução da guia no painel SGUCard?")) {
                return;
            }

            try {
                setLoading(true);
                await api.post('/agendamentos/executar', { agendamento_id: agenda.id_agendamento, depending_id: null });
                alert("Job de Execução Direta enfileirado com sucesso.");
                loadData();
            } catch (error) {
                alert("Erro ao disparar Execução.");
            } finally {
                setLoading(false);
            }

        } else if (agenda.id_convenio === 2) {
            try {
                setLoading(true);
                const resCap = await api.post('/agendamentos/capturar', { agendamento_id: agenda.id_agendamento });
                await api.post('/agendamentos/executar', { agendamento_id: agenda.id_agendamento, depending_id: resCap.data.job_id });
                alert("Jobs em Cascata disparados para Unimed Anápolis (sem restrição de timestamp).");
                loadData();
            } catch (error) {
                alert("Erro ao orquestrar Jobs Unimed Anápolis.");
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="p-8 space-y-6 max-w-7xl mx-auto pb-24 animate-fade-in">
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
                <div className="flex items-center gap-3">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 flex flex-col justify-center items-center bg-slate-800/50">
                    <span className="text-sm text-text-secondary text-center">Total de Agendamentos</span>
                    <span className="text-2xl font-bold text-slate-100">{kpis.total}</span>
                </Card>
                <Card className="p-4 flex flex-col justify-center items-center bg-emerald-500/10 border-emerald-500/20">
                    <span className="text-sm text-emerald-400 text-center">Confirmados</span>
                    <span className="text-2xl font-bold text-emerald-300">{kpis.confirmados}</span>
                </Card>
                <Card className="p-4 flex flex-col justify-center items-center bg-amber-500/10 border-amber-500/20">
                    <span className="text-sm text-amber-400 text-center">A Confirmar</span>
                    <span className="text-2xl font-bold text-amber-300">{kpis.a_confirmar}</span>
                </Card>
                <Card className="p-4 flex flex-col justify-center items-center bg-red-500/10 border-red-500/20">
                    <span className="text-sm text-red-400 text-center">Faltas</span>
                    <span className="text-2xl font-bold text-red-300">{kpis.faltas}</span>
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
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Input placeholder="Buscar Paciente..." icon={<Search className="w-4 h-4" />} value={filters.paciente} onChange={(e) => handleFilterChange('paciente', e.target.value)} />
                    <Select value={filters.id_convenio} onChange={(e) => handleFilterChange('id_convenio', e.target.value)}>
                        <option value="">Todos os Convênios</option>
                        {convenios.map(c => <option key={c.id_convenio} value={c.id_convenio}>{c.nome}</option>)}
                    </Select>
                    <Select value={filters.procedimento} onChange={(e) => handleFilterChange('procedimento', e.target.value)} disabled={!filters.id_convenio}>
                        <option value="">Todos Procedimentos</option>
                        {procedimentos.map((p, i) => <option key={i} value={p}>{p}</option>)}
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
                            <CheckCircle className="w-4 h-4 mr-2" /> Confirmar
                        </Button>
                        <Button variant="outline" size="sm" className="bg-red-600/20 text-red-400 hover:bg-red-600/40 border-red-500/50" onClick={() => handleBatchAction('falta')}>
                            <XCircle className="w-4 h-4 mr-2" /> Falta
                        </Button>
                        <Button variant="outline" size="sm" className="bg-primary hover:bg-primary-hover text-white border-transparent" onClick={() => handleBatchAction('faturar')}>
                            <Play className="w-4 h-4 mr-2" /> Faturar OP=3
                        </Button>
                        <Button variant="outline" size="sm" className="hover:bg-red-900/40 text-red-400 border-red-500/30" onClick={() => handleBatchAction('excluir')}>
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
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
                                <th className="p-4 w-10">
                                    <input type="checkbox" className="rounded border-slate-600 bg-slate-900 text-primary focus:ring-primary focus:ring-offset-slate-900" checked={agendamentos.length > 0 && selectedIds.length === agendamentos.length} onChange={handleSelectAll} />
                                </th>
                                <th className="p-4 font-medium uppercase tracking-wider text-[11px]">Paciente</th>
                                <th className="p-4 font-medium uppercase tracking-wider text-[11px]">Data</th>
                                <th className="p-4 font-medium uppercase tracking-wider text-[11px]">Horário</th>
                                <th className="p-4 font-medium uppercase tracking-wider text-[11px]">Profissional</th>
                                <th className="p-4 font-medium uppercase tracking-wider text-[11px]">Guia Vinculada</th>
                                <th className="p-4 font-medium uppercase tracking-wider text-[11px]">Cód Faturamento</th>
                                <th className="p-4 font-medium uppercase tracking-wider text-[11px]">Status</th>
                                <th className="p-4 font-medium uppercase text-right tracking-wider text-[11px]">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {agendamentos.map(agenda => (
                                <tr key={agenda.id_agendamento} className={`hover: bg - slate - 800 / 30 transition - colors ${selectedIds.includes(agenda.id_agendamento) ? 'bg-primary/5' : ''} `}>
                                    <td className="p-4">
                                        <input type="checkbox" className="rounded border-slate-600 bg-slate-900 text-primary focus:ring-primary focus:ring-offset-slate-900" checked={selectedIds.includes(agenda.id_agendamento)} onChange={() => toggleSelect(agenda.id_agendamento)} />
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium text-slate-200">{agenda.Nome_Paciente}</div>
                                        <div className="text-xs text-slate-500">{agenda.carteirinha}</div>
                                    </td>
                                    <td className="p-4 text-slate-300">{formatDate(agenda.data)}</td>
                                    <td className="p-4 text-slate-300">{agenda.hora_inicio ? agenda.hora_inicio.substring(0, 5) : '-'}</td>
                                    <td className="p-4">
                                        <div className="text-slate-300">{agenda.Nome_profissional}</div>
                                        <div className="text-xs text-slate-500">{agenda.nome_convenio}</div>
                                    </td>
                                    <td className="p-4">
                                        {agenda.numero_guia ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                {agenda.numero_guia} (S: {agenda.saldo_guia})
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                                S/ Guia
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="group relative inline-block cursor-help">
                                            <span className="border-b border-dashed border-slate-500 text-slate-300">{agenda.cod_procedimento_fat || '-'}</span>
                                            {agenda.nome_procedimento && (
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max max-w-[250px] whitespace-normal bg-slate-800 text-slate-100 text-xs rounded p-2 z-10 shadow-lg border border-slate-700">
                                                    {agenda.nome_procedimento}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline - flex items - center px - 2.5 py - 1 rounded - full text - xs font - medium border ${agenda.Status === 'Confirmado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            agenda.Status === 'Falta' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                agenda.Status === 'Faturado' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    agenda.Status === 'Faturamento Solicitado' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            } `}>
                                            {agenda.Status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            {/* Botão Capturar (Só Unimed GO e Unimed AN) */}
                                            {(agenda.id_convenio == 2 || agenda.id_convenio == 3) && (
                                                <Button variant="ghost" size="sm"
                                                    disabled={agenda.execucao_status === 'sucesso' || agenda.timestamp_captura}
                                                    onClick={() => handleCapturar(agenda)}
                                                    className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 disabled:opacity-30 disabled:pointer-events-none"
                                                >
                                                    {agenda.timestamp_captura ? "Capturado" : "Capturar"}
                                                </Button>
                                            )}

                                            {/* Botão Executar/Faturar (Só Unimed GO e Unimed AN) */}
                                            {(agenda.id_convenio == 2 || agenda.id_convenio == 3) && (
                                                <Button variant="ghost" size="sm"
                                                    disabled={agenda.execucao_status === 'sucesso' || agenda.execucao_status === 'pendente'}
                                                    onClick={() => handleExecutar(agenda)}
                                                    className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-30 disabled:pointer-events-none"
                                                >
                                                    {agenda.execucao_status === 'sucesso' ? "Executado" :
                                                        agenda.execucao_status === 'pendente' ? "Pendente..." : "Executar"}
                                                </Button>
                                            )}

                                            <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover hover:bg-primary/10" onClick={() => {
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
                                                                } else {
                                                                    // silencioso para alteracoes sem Jobs automaticos
                                                                }
                                                                loadData();
                                                            })
                                                            .catch(err => alert("Erro ao atualizar o status"));
                                                    };
                                                    executeStatus();
                                                }
                                            }}>
                                                Status
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {agendamentos.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-slate-500">
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
        </div>
    );
}
