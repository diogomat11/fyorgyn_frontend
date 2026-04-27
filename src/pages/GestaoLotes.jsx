import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Layers, Plus, X, Search, RefreshCw, XCircle, CheckCircle, HelpCircle, Download } from 'lucide-react';

export default function GestaoLotes() {
    const [lotes, setLotes] = useState([]);
    const [convenios, setConvenios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedConvenio, setSelectedConvenio] = useState('');
    
    // Modal Novo Lote
    const [showNovoModal, setShowNovoModal] = useState(false);
    const [novoLoteForm, setNovoLoteForm] = useState({ data_fim: '', cod_prestador: '' });
    
    const [showItensModal, setShowItensModal] = useState(false);
    const [selectedLote, setSelectedLote] = useState(null);
    const [itensLote, setItensLote] = useState([]);
    const [loadingItens, setLoadingItens] = useState(false);
    
    // Filtros do modal de itens
    const [filtroGuia, setFiltroGuia] = useState('');
    const [filtroDetalhe, setFiltroDetalhe] = useState('');
    const [filtroBeneficiario, setFiltroBeneficiario] = useState('');
    const [filtroStatusConf, setFiltroStatusConf] = useState('');

    useEffect(() => {
        loadConvenios();
    }, []);

    useEffect(() => {
        if (selectedConvenio) {
            loadLotes();
        } else {
            setLotes([]);
        }
    }, [selectedConvenio]);

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
            alert("Solicitação de criação de lote enviada (Job OP13).");
            setShowNovoModal(false);
            setNovoLoteForm({ data_fim: '', cod_prestador: '' });
            loadLotes();
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

    const totalItens = filteredItens.length;
    const totalStatus67 = filteredItens.filter(i => i.StatusConferencia == 67).length;
    const totalStatus78 = filteredItens.filter(i => i.StatusConferencia == 78).length;
    const totalStatus82 = filteredItens.filter(i => i.StatusConferencia == 82).length;
    const totalConciliados = filteredItens.filter(i => i.StatusConciliacao?.toLowerCase() === 'conciliado').length;

    const handleExportExcel = () => {
        if (filteredItens.length === 0) return;
        const headers = ['Detalhe ID', 'Guia', 'Beneficiário', 'Data Realização', 'Status Conf.', 'Conciliação'];
        const rows = filteredItens.map(item => [
            item.detalheId,
            item.Guia,
            item.nome_beneficiario || item.CodigoBeneficiario,
            item.dataRealizacao || '',
            item.StatusConferencia == 67 ? 'Conferido' : item.StatusConferencia == 78 ? 'Não Conferido' : item.StatusConferencia == 82 ? 'Removido' : item.StatusConferencia,
            item.StatusConciliacao || ''
        ]);
        const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lote_${selectedLote?.numero_lote || selectedLote?.id_lote}_itens.csv`;
        a.click();
        URL.revokeObjectURL(url);
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
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                            lote.status === 'Aberto' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            lote.status === 'Cancelado' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                            'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                        }`}>
                                            {lote.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{lote.data_fim ? new Date(lote.data_fim).toLocaleDateString('pt-BR') : '-'}</td>
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
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[80vh]">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 shrink-0">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                    Itens do Lote {selectedLote.numero_lote || selectedLote.id_lote}
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Status do Lote: {selectedLote.status}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={handleExportExcel}
                                    disabled={filteredItens.length === 0}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded border border-emerald-500/30 text-xs transition-colors disabled:opacity-50"
                                    title="Exportar para CSV/Excel"
                                >
                                    <Download size={14} /> Exportar
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
                                    <div className="bg-slate-800/80 p-4 border-b border-slate-700 grid grid-cols-5 gap-3 shrink-0">
                                        <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600/50 flex flex-col items-center justify-center">
                                            <span className="text-xs text-slate-400 uppercase font-semibold">Total Itens</span>
                                            <span className="text-2xl font-bold text-slate-100">{totalItens}</span>
                                        </div>
                                        <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 flex flex-col items-center justify-center">
                                            <span className="text-xs text-emerald-500/80 uppercase font-semibold">Conferido</span>
                                            <span className="text-2xl font-bold text-emerald-400">{totalStatus67}</span>
                                        </div>
                                        <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 flex flex-col items-center justify-center">
                                            <span className="text-xs text-amber-500/80 uppercase font-semibold">Não Conferido</span>
                                            <span className="text-2xl font-bold text-amber-400">{totalStatus78}</span>
                                        </div>
                                        <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20 flex flex-col items-center justify-center">
                                            <span className="text-xs text-red-400 uppercase font-semibold">Removido</span>
                                            <span className="text-2xl font-bold text-red-400">{totalStatus82}</span>
                                        </div>
                                        <div className="bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20 flex flex-col items-center justify-center">
                                            <span className="text-xs text-indigo-400 uppercase font-semibold">Conciliados</span>
                                            <span className="text-2xl font-bold text-indigo-400">{totalConciliados}</span>
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
                                                    <th className="px-4 py-3">Nome</th>
                                                    <th className="px-4 py-3">Data Realização</th>
                                                    <th className="px-4 py-3">Status Conf.</th>
                                                    <th className="px-4 py-3">Conciliação</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700/50">
                                                {filteredItens.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                                                            Nenhum item encontrado.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredItens.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                                            <td className="px-4 py-2 font-mono text-xs">{item.detalheId}</td>
                                                            <td className="px-4 py-2">{item.Guia}</td>
                                                            <td className="px-4 py-2">{item.CodigoBeneficiario}</td>
                                                            <td className="px-4 py-2 text-xs">{item.nome_beneficiario || '-'}</td>
                                                            <td className="px-4 py-2">{item.dataRealizacao}</td>
                                                            <td className="px-4 py-2">
                                                                {item.StatusConferencia == 67 ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                                        <CheckCircle size={12} /> Conferido
                                                                    </span>
                                                                ) : item.StatusConferencia == 78 ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                                        <HelpCircle size={12} /> Não Conferido
                                                                    </span>
                                                                ) : item.StatusConferencia == 82 ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                                                                        <XCircle size={12} /> Removido
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300">
                                                                        {item.StatusConferencia || '-'}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.StatusConciliacao?.toLowerCase() === 'conciliado' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-700 text-slate-300'}`}>
                                                                    {item.StatusConciliacao}
                                                                </span>
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
