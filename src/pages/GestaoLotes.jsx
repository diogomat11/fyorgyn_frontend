import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { Layers, Plus, X, Search, RefreshCw, XCircle, CheckCircle, HelpCircle, Download, ToggleLeft, ToggleRight, Calendar, Send } from 'lucide-react';

export default function GestaoLotes() {
    const [lotes, setLotes] = useState([]);
    const [convenios, setConvenios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedConvenio, setSelectedConvenio] = useState('');
    
    // Modal Novo Lote
    const [showNovoModal, setShowNovoModal] = useState(false);
    const [novoLoteForm, setNovoLoteForm] = useState({ data_fim: '', cod_prestador: '' });
    const [autoEnvio, setAutoEnvio] = useState(false);
    
    const [showItensModal, setShowItensModal] = useState(false);
    const [selectedLote, setSelectedLote] = useState(null);
    const [itensLote, setItensLote] = useState([]);
    const [loadingItens, setLoadingItens] = useState(false);
    
    // Filtros do modal de itens
    const [filtroGuia, setFiltroGuia] = useState('');
    const [filtroDetalhe, setFiltroDetalhe] = useState('');
    const [filtroBeneficiario, setFiltroBeneficiario] = useState('');
    const [filtroStatusConf, setFiltroStatusConf] = useState('');
    const [conferindoTodos, setConferindoTodos] = useState(false);

    // Ordenação de itens do lote
    const [sortField, setSortField] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Edição inline da data
    const [editingDateItemId, setEditingDateItemId] = useState(null);
    const [editingDateValue, setEditingDateValue] = useState('');

    const pollRef = useRef(null);

    useEffect(() => {
        loadConvenios();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    useEffect(() => {
        if (selectedConvenio) {
            loadLotes();
        } else {
            setLotes([]);
        }
    }, [selectedConvenio]);

    // Auto-polling: every 60s when there are lotes in transitional states
    useEffect(() => {
        const hasTransitional = lotes.some(l => 
            ['Criando', 'Processando', 'Cancelando'].includes(l.status)
        );
        if (hasTransitional && selectedConvenio) {
            if (!pollRef.current) {
                pollRef.current = setInterval(async () => {
                    try {
                        const res = await api.get(`/lotes/?id_convenio=${selectedConvenio}`);
                        setLotes(res.data.data);
                    } catch (e) { /* silently retry */ }
                }, 60000); // 1 minuto
            }
        } else {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        }
    }, [lotes, selectedConvenio]);

    const loadConvenios = async () => {
        try {
            const res = await api.get('/convenios/');
            setConvenios(res.data);
            if (res.data.length > 0) {
                // Tenta selecionar o IPASGO como default ou o primeiro
                const ipasgo = res.data.find(c => c.nome.toLowerCase().includes('ipasgo'));
                if (ipasgo) setSelectedConvenio(ipasgo.id_convenio.toString());
                else setSelectedConvenio(res.data[0].id_convenio.toString());
            }
        } catch (error) {
            alert("Erro ao carregar convênios");
        }
    };

    const loadLotes = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/lotes/?id_convenio=${selectedConvenio}`);
            setLotes(res.data.data);
        } catch (error) {
            alert("Erro ao carregar lotes");
        } finally {
            setLoading(false);
        }
    };

    const handleCriarLote = async (e) => {
        e.preventDefault();
        try {
            await api.post('/lotes/', {
                id_convenio: parseInt(selectedConvenio),
                cod_prestador: novoLoteForm.cod_prestador,
                data_fim: novoLoteForm.data_fim
            });
            setShowNovoModal(false);
            setNovoLoteForm({ data_fim: '', cod_prestador: '' });
            loadLotes(); // Triggers auto-polling via the useEffect above
        } catch (error) {
            alert(error.response?.data?.detail || "Erro ao criar lote");
        }
    };

    const handleCancelarLote = async (lote) => {
        if (!window.confirm(`Tem certeza que deseja cancelar o Lote ${lote.numero_lote || lote.id_lote}?`)) return;
        
        try {
            await api.post(`/lotes/${lote.id_lote}/cancelar`, {
                cod_prestador: lote.cod_prestador
            });
            alert("Solicitação de cancelamento enviada (Job OP14).");
            loadLotes();
        } catch (error) {
            alert(error.response?.data?.detail || "Erro ao cancelar lote");
        }
    };

    const handleVerItens = async (lote) => {
        setSelectedLote(lote);
        setShowItensModal(true);
        setLoadingItens(true);
        setFiltroGuia('');
        setFiltroDetalhe('');
        setFiltroBeneficiario('');
        setFiltroStatusConf('');
        try {
            const res = await api.get(`/lotes/${lote.id_lote}/faturamentos?limit=10000`);
            setItensLote(res.data.data);
        } catch (error) {
            alert("Erro ao carregar itens do lote");
        } finally {
            setLoadingItens(false);
        }
    };
    
    // Calculos do dashboard de itens
    const filteredItens = itensLote.filter(item => {
        const matchGuia = item.Guia?.toLowerCase().includes(filtroGuia.toLowerCase()) || !filtroGuia;
        const matchDetalhe = item.detalheId?.toString().includes(filtroDetalhe) || !filtroDetalhe;
        const matchBenef = item.CodigoBeneficiario?.toLowerCase().includes(filtroBeneficiario.toLowerCase()) || !filtroBeneficiario;
        const matchStatusConf = filtroStatusConf === '' || item.StatusConferencia?.toString() === filtroStatusConf;
        return matchGuia && matchDetalhe && matchBenef && matchStatusConf;
    });

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedItens = [...filteredItens].sort((a, b) => {
        if (!sortField) return 0;
        let valA, valB;
        if (sortField === 'nome') {
            valA = a.nome_beneficiario || '';
            valB = b.nome_beneficiario || '';
        } else if (sortField === 'data') {
            valA = a.dataRealizacao || '';
            valB = b.dataRealizacao || '';
        } else if (sortField === 'status_conf') {
            valA = a.StatusConferencia || 0;
            valB = b.StatusConferencia || 0;
        } else if (sortField === 'conciliacao') {
            valA = a.StatusConciliacao || '';
            valB = b.StatusConciliacao || '';
        }

        if (typeof valA === 'string') {
            return sortDirection === 'asc' 
                ? valA.localeCompare(valB) 
                : valB.localeCompare(valA);
        } else {
            return sortDirection === 'asc'
                ? (valA > valB ? 1 : valA < valB ? -1 : 0)
                : (valB > valA ? 1 : valB < valA ? -1 : 0);
        }
    });

    const totalItens = filteredItens.length;
    const totalStatus67 = filteredItens.filter(i => i.StatusConferencia == 67).length;
    const totalValorConferidos = filteredItens.filter(i => i.StatusConferencia == 67).reduce((acc, i) => acc + (i.ValorProcedimento || 0), 0);
    const totalStatus78 = filteredItens.filter(i => i.StatusConferencia == 78).length;
    const totalStatus82 = filteredItens.filter(i => i.StatusConferencia == 82).length;
    const totalConciliados = filteredItens.filter(i => i.StatusConciliacao?.toLowerCase() === 'conciliado').length;

    const handleExportExcel = () => {
        const headers = ['Detalhe ID', 'Guia', 'Beneficiário', 'Data Realização', 'Valor', 'Status Conf.', 'Conciliação'];
        const csvContent = [headers.join(';')].concat(filteredItens.map(item => [
            item.detalheId,
            item.Guia,
            item.CodigoBeneficiario,
            item.dataRealizacao,
            item.ValorProcedimento || 0,
            item.StatusConferencia == 67 ? 'Conferido' : item.StatusConferencia == 78 ? 'Não Conferido' : item.StatusConferencia == 82 ? 'Removido' : item.StatusConferencia,
            item.StatusConciliacao || ''
        ].join(';'))).join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `lote_${selectedLote.numero_lote || selectedLote.id_lote}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleStatusClick = async (item) => {
        let nextStatus;
        if (item.StatusConferencia == 78) nextStatus = 67;
        else if (item.StatusConferencia == 67) nextStatus = 82;
        else if (item.StatusConferencia == 82) nextStatus = 78;
        else nextStatus = 78;

        try {
            await api.put(`/lotes/itens/${item.id}`, {
                status_conferencia: nextStatus,
                auto_envio: autoEnvio
            });
            setItensLote(prev => prev.map(i => i.id === item.id ? { ...i, StatusConferencia: nextStatus } : i));
        } catch (e) {
            alert(e.response?.data?.detail || "Erro ao atualizar status");
        }
    };

    const formatDateDisplay = (dateStr) => {
        if (!dateStr) return '-';
        const cleanDate = dateStr.split('T')[0];
        const parts = cleanDate.split('-');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
    };

    const handleSaveInlineDate = async (item, newDateVal) => {
        setEditingDateItemId(null);
        if (newDateVal === item.dataRealizacao) return;

        if (newDateVal && !/^\d{4}-\d{2}-\d{2}$/.test(newDateVal)) {
            alert("Formato inválido. Use AAAA-MM-DD.");
            return;
        }

        try {
            await api.put(`/lotes/itens/${item.id}`, { 
                data_realizacao: newDateVal || null,
                auto_envio: autoEnvio
            });
            setItensLote(prev => prev.map(i => i.id === item.id ? { ...i, dataRealizacao: newDateVal } : i));
        } catch (e) {
            alert(e.response?.data?.detail || "Erro ao atualizar data");
        }
    };

    const handleSendOP7 = async (item) => {
        try {
            await api.put(`/lotes/itens/${item.id}`, {
                auto_envio: true
            });
            alert(`Job OP7 enviado com sucesso para o item ${item.detalheId}!`);
        } catch (e) {
            alert(e.response?.data?.detail || "Erro ao enviar Job OP7");
        }
    };

    const handleSyncItens = async () => {
        if (!selectedLote || !selectedLote.numero_lote) {
             alert("Lote ainda não possui número oficial. Aguarde a criação.");
             return;
        }
        try {
             // Create Job OP6
             await api.post('/jobs/', {
                  type: 'single',
                  id_convenio: parseInt(selectedConvenio),
                  rotina: '6',
                  params: JSON.stringify({
                       numero_lote: selectedLote.numero_lote,
                       codigoPrestador: selectedLote.cod_prestador
                  })
             });
             alert("Solicitação de atualização de itens enviada (Job OP6).");
             setShowItensModal(false);
        } catch (error) {
             alert("Erro ao solicitar atualização.");
        }
    };

    const handleConferirTodos = async () => {
        const itensPendentes = filteredItens.filter(i => i.StatusConferencia !== 67);
        if (itensPendentes.length === 0) {
            alert('Todos os itens visíveis já estão conferidos.');
            return;
        }
        const confirmado = window.confirm(
            `Confirmar "Conferido" para ${itensPendentes.length} item(ns)?\n` +
            (autoEnvio ? 'Jobs OP7 serão criados automaticamente para cada item.' : 'Apenas atualiza o status local (ative Envio Automático para criar Jobs OP7).')
        );
        if (!confirmado) return;

        setConferindoTodos(true);
        let sucessos = 0;
        let falhas = 0;
        for (const item of itensPendentes) {
            try {
                await api.put(`/lotes/itens/${item.id}`, {
                    status_conferencia: 67,
                    auto_envio: autoEnvio
                });
                setItensLote(prev => prev.map(i => i.id === item.id ? { ...i, StatusConferencia: 67 } : i));
                sucessos++;
            } catch (e) {
                falhas++;
            }
        }
        setConferindoTodos(false);
        alert(`Concluído! ${sucessos} item(ns) conferido(s)${falhas > 0 ? `, ${falhas} falha(s)` : ''}.${autoEnvio ? '\nJobs OP7 criados para cada item processado.' : ''}`);
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Layers size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100">Gestão de Lotes de Faturamento</h1>
                        <p className="text-sm text-slate-400">Crie, cancele e analise lotes de faturamento do IPASGO.</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <select
                        value={selectedConvenio}
                        onChange={(e) => setSelectedConvenio(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-primary focus:border-primary px-3 py-2"
                    >
                        <option value="">Selecione um Convênio</option>
                        {convenios.map(c => (
                            <option key={c.id_convenio} value={c.id_convenio}>{c.nome}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => setShowNovoModal(true)}
                        disabled={!selectedConvenio}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                        <Plus size={16} /> Novo Lote
                    </button>
                    <button
                        onClick={loadLotes}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Atualizar Lotes"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-6">
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="text-xs uppercase bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
                            <tr>
                                <th className="px-6 py-4">ID Interno</th>
                                <th className="px-6 py-4">Número Lote</th>
                                <th className="px-6 py-4">Prestador</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Data Fim</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {lotes.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                                        Nenhum lote encontrado para este convênio.
                                    </td>
                                </tr>
                            ) : lotes.map((lote) => (
                                <tr key={lote.id_lote} className="hover:bg-slate-700/20 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs">{lote.id_lote}</td>
                                    <td className="px-6 py-4 font-medium text-slate-200">
                                        {lote.numero_lote ? lote.numero_lote : <span className="text-slate-500 italic">Pendente...</span>}
                                    </td>
                                    <td className="px-6 py-4">{lote.cod_prestador}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${
                                            lote.status === 'Aberto' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            lote.status === 'Cancelado' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                            ['Criando', 'Processando', 'Cancelando'].includes(lote.status) ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                            'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                        }`}>
                                            {['Criando', 'Processando', 'Cancelando'].includes(lote.status) && (
                                                <RefreshCw size={12} className="animate-spin" />
                                            )}
                                            {lote.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{lote.data_fim ? lote.data_fim.split('T')[0].split('-').reverse().join('/') : '-'}</td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button 
                                            onClick={() => handleVerItens(lote)}
                                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs transition-colors flex items-center gap-1"
                                        >
                                            <Search size={14} /> Itens
                                        </button>
                                        <button 
                                            onClick={() => handleCancelarLote(lote)}
                                            disabled={lote.status === 'Cancelado' || lote.status === 'Cancelando'}
                                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                        >
                                            <XCircle size={14} /> Cancelar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Novo Lote */}
            {showNovoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                <Plus size={18} className="text-primary" /> Criar Novo Lote
                            </h3>
                            <button onClick={() => setShowNovoModal(false)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCriarLote} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Código Prestador</label>
                                <input 
                                    type="text" 
                                    required
                                    value={novoLoteForm.cod_prestador}
                                    onChange={(e) => setNovoLoteForm({...novoLoteForm, cod_prestador: e.target.value})}
                                    className="w-full bg-slate-800 border-slate-700 text-slate-200 rounded-lg focus:ring-primary focus:border-primary px-3 py-2 text-sm"
                                    placeholder="Ex: 00632-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Data Fim da Competência</label>
                                <input 
                                    type="date" 
                                    required
                                    value={novoLoteForm.data_fim}
                                    onChange={(e) => setNovoLoteForm({...novoLoteForm, data_fim: e.target.value})}
                                    className="w-full bg-slate-800 border-slate-700 text-slate-200 rounded-lg focus:ring-primary focus:border-primary px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800 mt-6">
                                <button type="button" onClick={() => setShowNovoModal(false)} className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">Criar Lote</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Ver Itens */}
            {showItensModal && selectedLote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-11/12 max-w-7xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                    <Layers size={18} className="text-indigo-400" />
                                    Itens do Lote
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">Status do Lote: {selectedLote.status}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setAutoEnvio(!autoEnvio)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${autoEnvio ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}
                                    title="Envio automático de atualizações via API"
                                >
                                    {autoEnvio ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                    Envio Automático
                                </button>
                                <button 
                                    onClick={handleExportExcel}
                                    disabled={filteredItens.length === 0}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded border border-emerald-500/30 text-xs transition-colors disabled:opacity-50"
                                    title="Exportar para CSV/Excel"
                                >
                                    <Download size={14} /> Exportar
                                </button>
                                <button
                                    onClick={handleConferirTodos}
                                    disabled={conferindoTodos || filteredItens.filter(i => i.StatusConferencia !== 67).length === 0}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded border border-emerald-600/30 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={`Marcar todos os itens visíveis como Conferido${autoEnvio ? ' e criar Jobs OP7' : ''}`}
                                >
                                    {conferindoTodos ? (
                                        <RefreshCw size={14} className="animate-spin" />
                                    ) : (
                                        <CheckCircle size={14} />
                                    )}
                                    {conferindoTodos ? 'Conferindo...' : `Conferir todos (${filteredItens.filter(i => i.StatusConferencia !== 67).length})`}
                                </button>
                                <button 
                                    onClick={handleSyncItens}
                                    disabled={!selectedLote.numero_lote}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded border border-indigo-500/30 text-xs transition-colors disabled:opacity-50"
                                    title="Dispara Job OP6 no Worker"
                                >
                                    <RefreshCw size={14} /> Sincronizar (OP6)
                                </button>
                                <button onClick={() => setShowItensModal(false)} className="text-slate-400 hover:text-white p-1">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-0 overflow-auto flex-1 flex flex-col">
                            {loadingItens ? (
                                <div className="flex justify-center items-center h-full text-slate-500">Carregando itens...</div>
                            ) : (
                                <>
                                    {/* Mini Dashboard */}
                                    <div className="bg-slate-800/80 p-4 border-b border-slate-700 grid grid-cols-6 gap-3 shrink-0">
                                        <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600/50 flex flex-col items-center justify-center">
                                            <span className="text-xs text-slate-400 uppercase font-semibold text-center leading-tight">Total Itens</span>
                                            <span className="text-2xl font-bold text-slate-100 mt-1">{totalItens}</span>
                                        </div>
                                        <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 flex flex-col items-center justify-center">
                                            <span className="text-xs text-emerald-500/80 uppercase font-semibold text-center leading-tight">Conferido</span>
                                            <span className="text-2xl font-bold text-emerald-400 mt-1">{totalStatus67}</span>
                                        </div>
                                        <div className="bg-teal-500/10 p-3 rounded-lg border border-teal-500/20 flex flex-col items-center justify-center">
                                            <span className="text-xs text-teal-500/80 uppercase font-semibold text-center leading-tight">Valor Conf.</span>
                                            <span className="text-lg font-bold text-teal-400 mt-1" title={`R$ ${totalValorConferidos.toFixed(2)}`}>
                                                {totalValorConferidos > 1000 ? `R$ ${(totalValorConferidos/1000).toFixed(1)}k` : `R$ ${totalValorConferidos.toFixed(2)}`}
                                            </span>
                                        </div>
                                        <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 flex flex-col items-center justify-center">
                                            <span className="text-xs text-amber-500/80 uppercase font-semibold text-center leading-tight">Não Conferido</span>
                                            <span className="text-2xl font-bold text-amber-400 mt-1">{totalStatus78}</span>
                                        </div>
                                        <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20 flex flex-col items-center justify-center">
                                            <span className="text-xs text-red-400 uppercase font-semibold text-center leading-tight">Removido</span>
                                            <span className="text-2xl font-bold text-red-400 mt-1">{totalStatus82}</span>
                                        </div>
                                        <div className="bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20 flex flex-col items-center justify-center">
                                            <span className="text-xs text-indigo-400 uppercase font-semibold text-center leading-tight">Conciliados</span>
                                            <span className="text-2xl font-bold text-indigo-400 mt-1">{totalConciliados}</span>
                                        </div>
                                    </div>

                                    {/* Filtros */}
                                    <div className="bg-slate-800 p-3 border-b border-slate-700 flex gap-3 shrink-0">
                                        <input 
                                            type="text" 
                                            placeholder="Filtrar por Detalhe ID" 
                                            className="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 flex-1"
                                            value={filtroDetalhe}
                                            onChange={e => setFiltroDetalhe(e.target.value)}
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Filtrar por Guia" 
                                            className="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 flex-1"
                                            value={filtroGuia}
                                            onChange={e => setFiltroGuia(e.target.value)}
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Filtrar por Beneficiário" 
                                            className="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 flex-1"
                                            value={filtroBeneficiario}
                                            onChange={e => setFiltroBeneficiario(e.target.value)}
                                        />
                                        <select
                                            className="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 flex-1"
                                            value={filtroStatusConf}
                                            onChange={e => setFiltroStatusConf(e.target.value)}
                                        >
                                            <option value="">Todos Status Conf.</option>
                                            <option value="67">Conferido</option>
                                            <option value="78">Não Conferido</option>
                                            <option value="82">Removido</option>
                                        </select>
                                    </div>
                                    
                                    {/* Tabela */}
                                    <div className="overflow-auto flex-1 relative">
                                        <table className="w-full text-left text-sm text-slate-300">
                                            <thead className="text-xs uppercase bg-slate-800/80 text-slate-400 font-semibold sticky top-0 border-b border-slate-700 z-10 shadow-sm">
                                                <tr>
                                                    <th className="px-4 py-3">Detalhe ID</th>
                                                    <th className="px-4 py-3">Guia</th>
                                                    <th className="px-4 py-3">Beneficiário</th>
                                                    <th 
                                                        className="px-4 py-3 cursor-pointer hover:bg-slate-700/50 select-none transition-colors"
                                                        onClick={() => handleSort('nome')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <span>Nome</span>
                                                            <span className="text-[10px] text-slate-500">
                                                                {sortField === 'nome' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                                                            </span>
                                                        </div>
                                                    </th>
                                                    <th 
                                                        className="px-4 py-3 cursor-pointer hover:bg-slate-700/50 select-none transition-colors"
                                                        onClick={() => handleSort('data')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <span>Data Realização</span>
                                                            <span className="text-[10px] text-slate-500">
                                                                {sortField === 'data' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                                                            </span>
                                                        </div>
                                                    </th>
                                                    <th className="px-4 py-3">Valor</th>
                                                    <th 
                                                        className="px-4 py-3 cursor-pointer hover:bg-slate-700/50 select-none transition-colors"
                                                        onClick={() => handleSort('status_conf')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <span>Status Conf.</span>
                                                            <span className="text-[10px] text-slate-500">
                                                                {sortField === 'status_conf' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                                                            </span>
                                                        </div>
                                                    </th>
                                                    <th 
                                                        className="px-4 py-3 cursor-pointer hover:bg-slate-700/50 select-none transition-colors"
                                                        onClick={() => handleSort('conciliacao')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <span>Conciliação</span>
                                                            <span className="text-[10px] text-slate-500">
                                                                {sortField === 'conciliacao' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                                                            </span>
                                                        </div>
                                                    </th>
                                                    <th className="px-4 py-3 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700/50">
                                                {sortedItens.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="9" className="px-4 py-8 text-center text-slate-500">
                                                            Nenhum item encontrado.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    sortedItens.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                                            <td className="px-4 py-2 font-mono text-xs">{item.detalheId}</td>
                                                            <td className="px-4 py-2">{item.Guia}</td>
                                                            <td className="px-4 py-2">{item.CodigoBeneficiario}</td>
                                                            <td className="px-4 py-2 text-xs">{item.nome_beneficiario || '-'}</td>
                                                            <td className="px-4 py-2">
                                                                {editingDateItemId === item.id ? (
                                                                    <input 
                                                                        type="date"
                                                                        value={editingDateValue}
                                                                        onChange={e => setEditingDateValue(e.target.value)}
                                                                        onBlur={() => handleSaveInlineDate(item, editingDateValue)}
                                                                        onKeyDown={e => {
                                                                            if (e.key === 'Enter') handleSaveInlineDate(item, editingDateValue);
                                                                            if (e.key === 'Escape') setEditingDateItemId(null);
                                                                        }}
                                                                        className="bg-slate-850 border border-slate-650 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-[130px]"
                                                                        autoFocus
                                                                    />
                                                                ) : (
                                                                    <div 
                                                                        onClick={() => {
                                                                            setEditingDateItemId(item.id);
                                                                            setEditingDateValue(item.dataRealizacao || '');
                                                                        }}
                                                                        className="cursor-pointer hover:bg-slate-800/80 p-1 rounded flex items-center justify-between gap-2 group min-h-[28px]"
                                                                        title="Clique para editar data"
                                                                    >
                                                                        <span>{formatDateDisplay(item.dataRealizacao)}</span>
                                                                        <Calendar size={12} className="opacity-0 group-hover:opacity-100 text-slate-400" />
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2 font-mono text-xs text-slate-100">R$ {item.ValorProcedimento?.toFixed(2)}</td>
                                                            <td className="px-4 py-2">
                                                                <button onClick={() => handleStatusClick(item)} className="focus:outline-none transition-transform hover:scale-105 active:scale-95">
                                                                    {item.StatusConferencia == 67 ? (
                                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                                                                            <CheckCircle size={14} className="text-emerald-500" /> Conferido
                                                                        </span>
                                                                    ) : item.StatusConferencia == 78 ? (
                                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                                                                            <HelpCircle size={16} className="text-blue-500" /> Não Conferido
                                                                        </span>
                                                                    ) : item.StatusConferencia == 82 ? (
                                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400">
                                                                            <XCircle size={14} className="text-red-500" /> Removido
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                                                                            {item.StatusConferencia || '-'}
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.StatusConciliacao?.toLowerCase() === 'conciliado' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-700 text-slate-300'}`}>
                                                                    {item.StatusConciliacao}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2 text-right">
                                                                <button 
                                                                    onClick={() => handleSendOP7(item)}
                                                                    className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"
                                                                    title="Enviar Job OP7 (Portal)"
                                                                >
                                                                    <Send size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
