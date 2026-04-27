import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Calendar, Plus, X, Search, Eye, Package, Loader2 } from 'lucide-react';

export default function LotesAgendamentos() {
    const [convenios, setConvenios] = useState([]);
    const [selectedConvenio, setSelectedConvenio] = useState('');
    const [lotes, setLotes] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal Gerar Lote
    const [showGerarModal, setShowGerarModal] = useState(false);
    const [gerarForm, setGerarForm] = useState({ data_inicio: '', data_fim: '' });
    const [gerando, setGerando] = useState(false);

    // Modal Ver Itens
    const [showItensModal, setShowItensModal] = useState(false);
    const [selectedLote, setSelectedLote] = useState(null);
    const [itensLote, setItensLote] = useState([]);
    const [loadingItens, setLoadingItens] = useState(false);

    // Filtro de itens
    const [filtroPaciente, setFiltroPaciente] = useState('');

    useEffect(() => {
        loadConvenios();
    }, []);

    useEffect(() => {
        if (selectedConvenio) loadLotes();
        else setLotes([]);
    }, [selectedConvenio]);

    const loadConvenios = async () => {
        try {
            const res = await api.get('/convenios/');
            setConvenios(res.data);
            if (res.data.length > 0) {
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
            const res = await api.get(`/conciliacao/lote-agendamentos?id_convenio=${selectedConvenio}`);
            setLotes(res.data.data);
        } catch (error) {
            alert("Erro ao carregar lotes de agendamento");
        } finally {
            setLoading(false);
        }
    };

    const handleGerarLote = async (e) => {
        e.preventDefault();
        setGerando(true);
        try {
            const res = await api.post('/conciliacao/gerar-lote-agendamento', {
                id_convenio: parseInt(selectedConvenio),
                data_inicio: gerarForm.data_inicio,
                data_fim: gerarForm.data_fim
            });
            setShowGerarModal(false);
            setGerarForm({ data_inicio: '', data_fim: '' });
            loadLotes();
            alert(res.data.message);
        } catch (error) {
            alert(error.response?.data?.detail || "Erro ao gerar lote");
        } finally {
            setGerando(false);
        }
    };

    const handleVerItens = async (lote) => {
        setSelectedLote(lote);
        setShowItensModal(true);
        setLoadingItens(true);
        setFiltroPaciente('');
        try {
            const res = await api.get(`/conciliacao/itens/${lote.id_lote_ag}?limit=10000`);
            setItensLote(res.data.data);
        } catch (error) {
            alert("Erro ao carregar itens do lote");
        } finally {
            setLoadingItens(false);
        }
    };

    const filteredItens = itensLote.filter(item => {
        return !filtroPaciente || item.paciente?.toLowerCase().includes(filtroPaciente.toLowerCase());
    });

    return (
        <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100">Lotes de Agendamentos</h1>
                        <p className="text-sm text-slate-400">Gere lotes a partir dos agendamentos confirmados para conciliação.</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <select
                        value={selectedConvenio}
                        onChange={(e) => setSelectedConvenio(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-primary focus:border-primary px-3 py-2"
                    >
                        <option value="">Selecione o convênio</option>
                        {convenios.map(c => (
                            <option key={c.id_convenio} value={c.id_convenio}>{c.nome}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowGerarModal(true)}
                        disabled={!selectedConvenio}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Plus size={16} /> Gerar Lote
                    </button>
                </div>
            </div>

            {/* Tabela de Lotes */}
            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                    <div className="text-center text-slate-500 py-12">Carregando lotes...</div>
                ) : lotes.length === 0 ? (
                    <div className="text-center text-slate-500 py-12">
                        <Package size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Nenhum lote de agendamento encontrado.</p>
                        <p className="text-xs mt-1">Clique em "Gerar Lote" para criar um novo.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="text-xs uppercase bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
                            <tr>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Período</th>
                                <th className="px-4 py-3">Itens</th>
                                <th className="px-4 py-3">Conciliados</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Criado em</th>
                                <th className="px-4 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {lotes.map((lote) => (
                                <tr key={lote.id_lote_ag} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{lote.id_lote_ag}</td>
                                    <td className="px-4 py-3 text-xs">
                                        {lote.data_inicio} → {lote.data_fim}
                                    </td>
                                    <td className="px-4 py-3 font-semibold">{lote.total_itens}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${lote.total_conciliados > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'}`}>
                                            {lote.total_conciliados} / {lote.total_itens}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-medium border ${
                                            lote.status === 'Aberto' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                        }`}>
                                            {lote.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-400">
                                        {lote.created_at ? new Date(lote.created_at).toLocaleDateString('pt-BR') : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleVerItens(lote)}
                                            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs"
                                        >
                                            <Eye size={14} /> Ver Itens
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal Gerar Lote */}
            {showGerarModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-slate-100">Gerar Lote de Agendamentos</h3>
                            <button onClick={() => setShowGerarModal(false)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleGerarLote} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Data Início</label>
                                <input
                                    type="date"
                                    value={gerarForm.data_inicio}
                                    onChange={e => setGerarForm({...gerarForm, data_inicio: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-primary focus:border-primary"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Data Fim</label>
                                <input
                                    type="date"
                                    value={gerarForm.data_fim}
                                    onChange={e => setGerarForm({...gerarForm, data_fim: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-primary focus:border-primary"
                                    required
                                />
                            </div>
                            <p className="text-xs text-slate-500">Serão incluídos todos os agendamentos com status "Confirmado" do convênio selecionado neste período.</p>
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800 mt-4">
                                <button type="button" onClick={() => setShowGerarModal(false)} disabled={gerando} className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg disabled:opacity-50">Cancelar</button>
                                <button type="submit" disabled={gerando} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                                    {gerando ? <><Loader2 size={14} className="animate-spin" /> Gerando...</> : 'Gerar Lote'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Overlay de processamento */}
            {gerando && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 flex flex-col items-center gap-4 shadow-2xl">
                        <Loader2 size={40} className="animate-spin text-indigo-400" />
                        <div className="text-center">
                            <p className="text-lg font-semibold text-slate-100">Gerando Lote de Agendamentos</p>
                            <p className="text-sm text-slate-400 mt-1">Buscando agendamentos confirmados e criando itens...</p>
                        </div>
                        <div className="w-48 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: '70%' }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Ver Itens */}
            {showItensModal && selectedLote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[80vh]">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 shrink-0">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100">
                                    Itens do Lote #{selectedLote.id_lote_ag}
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Período: {selectedLote.data_inicio} → {selectedLote.data_fim} | Total: {itensLote.length} itens
                                </p>
                            </div>
                            <button onClick={() => setShowItensModal(false)} className="text-slate-400 hover:text-white p-1">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-0 overflow-auto flex-1 flex flex-col">
                            {loadingItens ? (
                                <div className="flex justify-center items-center h-full text-slate-500">Carregando itens...</div>
                            ) : (
                                <>
                                    {/* Filtro */}
                                    <div className="bg-slate-800 p-3 border-b border-slate-700 shrink-0">
                                        <input
                                            type="text"
                                            placeholder="Filtrar por paciente..."
                                            className="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-full max-w-xs"
                                            value={filtroPaciente}
                                            onChange={e => setFiltroPaciente(e.target.value)}
                                        />
                                    </div>

                                    {/* Tabela */}
                                    <div className="overflow-auto flex-1 relative">
                                        <table className="w-full text-left text-sm text-slate-300">
                                            <thead className="text-xs uppercase bg-slate-800/80 text-slate-400 font-semibold sticky top-0 border-b border-slate-700 z-10">
                                                <tr>
                                                    <th className="px-4 py-3">Paciente</th>
                                                    <th className="px-4 py-3">Data</th>
                                                    <th className="px-4 py-3">Horário</th>
                                                    <th className="px-4 py-3">Procedimento</th>
                                                    <th className="px-4 py-3">Guia</th>
                                                    <th className="px-4 py-3">Conciliação</th>
                                                    <th className="px-4 py-3">Verificação</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700/50">
                                                {filteredItens.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                                                            Nenhum item encontrado.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredItens.map((item) => (
                                                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                                                            <td className="px-4 py-2 font-medium text-slate-200 text-xs">{item.paciente}</td>
                                                            <td className="px-4 py-2 text-xs">{item.data}</td>
                                                            <td className="px-4 py-2 text-xs">{item.horario}</td>
                                                            <td className="px-4 py-2 font-mono text-xs">{item.cod_procedimento_fat}</td>
                                                            <td className="px-4 py-2 text-xs">{item.numero_guia || '-'}</td>
                                                            <td className="px-4 py-2">
                                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                                    item.status_conciliacao === 'Conciliado' 
                                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                                }`}>
                                                                    {item.status_conciliacao}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                                                    item.status_verificacao?.apto
                                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                                }`}>
                                                                    {item.status_verificacao?.icone} {item.status_verificacao?.texto}
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
