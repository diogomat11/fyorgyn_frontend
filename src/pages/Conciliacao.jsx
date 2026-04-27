import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { GitMerge, X, CheckCircle, AlertTriangle, XCircle, Edit3, Link2, Search, Loader2 } from 'lucide-react';

export default function Conciliacao() {
    const [convenios, setConvenios] = useState([]);
    const [selectedConvenio, setSelectedConvenio] = useState('');
    const [lotesConvenio, setLotesConvenio] = useState([]);
    const [lotesAgendamento, setLotesAgendamento] = useState([]);
    const [selectedLoteConvenio, setSelectedLoteConvenio] = useState('');
    const [selectedLoteAgendamento, setSelectedLoteAgendamento] = useState('');
    const [itens, setItens] = useState([]);
    const [loadingItens, setLoadingItens] = useState(false);
    const [filtroPaciente, setFiltroPaciente] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('');
    const [conciliando, setConciliando] = useState(false);
    const [isLinked, setIsLinked] = useState(false);  // true when lote_ag already has a lote_convenio

    const [showEditModal, setShowEditModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [editForm, setEditForm] = useState({ dataRealizacao: '', Guia: '', cod_procedimento_fat: '' });

    const [showManualModal, setShowManualModal] = useState(false);
    const [manualFatId, setManualFatId] = useState(null);
    const [candidatos, setCandidatos] = useState([]);
    const [loadingCandidatos, setLoadingCandidatos] = useState(false);

    // Manual conciliation from agendamento side
    const [showManualAgModal, setShowManualAgModal] = useState(false);
    const [manualAgItem, setManualAgItem] = useState(null);
    const [fatCandidatos, setFatCandidatos] = useState([]);
    const [loadingFatCandidatos, setLoadingFatCandidatos] = useState(false);

    const [resultado, setResultado] = useState(null);

    useEffect(() => { loadConvenios(); }, []);
    useEffect(() => { if (selectedConvenio) { loadLotesConvenio(); loadLotesAgendamento(); } }, [selectedConvenio]);
    useEffect(() => { if (selectedLoteAgendamento) loadItens(); else setItens([]); }, [selectedLoteAgendamento]);

    const loadConvenios = async () => {
        try {
            const res = await api.get('/convenios/');
            setConvenios(res.data);
            if (res.data.length > 0) {
                const ipasgo = res.data.find(c => c.nome.toLowerCase().includes('ipasgo'));
                setSelectedConvenio((ipasgo || res.data[0]).id_convenio.toString());
            }
        } catch { alert("Erro ao carregar convênios"); }
    };

    const loadLotesConvenio = async () => {
        try { const r = await api.get(`/lotes/?id_convenio=${selectedConvenio}&limit=100`); setLotesConvenio(r.data.data.filter(l => l.status !== 'Cancelado')); } catch {}
    };
    const loadLotesAgendamento = async () => {
        try { const r = await api.get(`/conciliacao/lote-agendamentos?id_convenio=${selectedConvenio}`); setLotesAgendamento(r.data.data); } catch {}
    };

    const loadItens = async () => {
        setLoadingItens(true);
        try {
            const res = await api.get(`/conciliacao/itens/${selectedLoteAgendamento}?limit=10000`);
            setItens(res.data.data);
            // Auto-detectar lote convênio já vinculado
            if (res.data.linked_lote_convenio_id) {
                setSelectedLoteConvenio(res.data.linked_lote_convenio_id.toString());
                setIsLinked(true);
            } else {
                setSelectedLoteConvenio('');
                setIsLinked(false);
            }
        } catch { alert("Erro ao carregar itens"); }
        finally { setLoadingItens(false); }
    };

    const handleConciliar = async () => {
        if (!selectedLoteConvenio || !selectedLoteAgendamento) { alert("Selecione ambos os lotes."); return; }
        setConciliando(true);
        try {
            const res = await api.post('/conciliacao/conciliar', { id_lote_convenio: parseInt(selectedLoteConvenio), id_lote_ag: parseInt(selectedLoteAgendamento) });
            setResultado(res.data);
            setIsLinked(true);  // Agora está vinculado
            loadItens();
        } catch (e) { alert(e.response?.data?.detail || "Erro na conciliação"); }
        finally { setConciliando(false); }
    };

    const handleEditarItem = async (e) => {
        e.preventDefault();
        try {
            const res = await api.put(`/conciliacao/editar-item/${editItem.id_faturamento_lote}`, editForm);
            alert(res.data.message + (res.data.auto_conciliado ? ' (Reconciliado automaticamente!)' : ''));
            setShowEditModal(false);
            loadItens();
        } catch (e) { alert(e.response?.data?.detail || "Erro ao editar item"); }
    };

    const handleOpenManual = async (fatId) => {
        setManualFatId(fatId); setShowManualModal(true); setLoadingCandidatos(true);
        try { const r = await api.get(`/conciliacao/candidatos/${fatId}`); setCandidatos(r.data.data); }
        catch { alert("Erro ao buscar candidatos"); }
        finally { setLoadingCandidatos(false); }
    };

    const handleConciliarManual = async (id_agendamento) => {
        try {
            const r = await api.post('/conciliacao/conciliar-manual', { id_faturamento_lote: manualFatId, id_agendamento });
            alert(r.data.message); setShowManualModal(false); loadItens();
        } catch (e) { alert(e.response?.data?.detail || "Erro na conciliação manual"); }
    };

    const handleOpenManualAg = async (item) => {
        setManualAgItem(item); setShowManualAgModal(true); setLoadingFatCandidatos(true);
        try {
            const loteParam = selectedLoteConvenio ? `&id_lote_convenio=${selectedLoteConvenio}` : '';
            const r = await api.get(`/conciliacao/candidatos-fat-por-guia?numero_guia=${item.numero_guia}${loteParam}`);
            setFatCandidatos(r.data.data);
        } catch { alert("Erro ao buscar candidatos de faturamento"); }
        finally { setLoadingFatCandidatos(false); }
    };

    const handleConciliarManualAg = async (fatId) => {
        try {
            const r = await api.post('/conciliacao/conciliar-manual-ag', { id_agendamento: manualAgItem.id_agendamento, id_faturamento_lote: fatId });
            alert(r.data.message); setShowManualAgModal(false); loadItens();
        } catch (e) { alert(e.response?.data?.detail || "Erro"); }
    };

    const filteredItens = itens.filter(i => (!filtroPaciente || i.paciente?.toLowerCase().includes(filtroPaciente.toLowerCase())) && (!filtroStatus || i.status_conciliacao === filtroStatus));
    const totalConc = itens.filter(i => i.status_conciliacao === 'Conciliado').length;
    const totalPend = itens.filter(i => i.status_conciliacao === 'Não Conciliado').length;

    const StatusBadge = ({ sv }) => {
        if (!sv) return <span className="text-slate-500 text-xs">-</span>;
        const cls = sv.apto ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
        return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{sv.icone === 'V' ? <CheckCircle size={11}/> : <AlertTriangle size={11}/>} {sv.texto}</span>;
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400"><GitMerge size={24} /></div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100">Conciliação</h1>
                        <p className="text-sm text-slate-400">Selecione um lote de agendamento, depois vincule com um lote de convênio.</p>
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Convênio</label>
                        <select value={selectedConvenio} onChange={e => setSelectedConvenio(e.target.value)} className="w-full bg-slate-800 border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2">
                            <option value="">Selecione</option>
                            {convenios.map(c => <option key={c.id_convenio} value={c.id_convenio}>{c.nome}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">① Lote Agendamento</label>
                        <select value={selectedLoteAgendamento} onChange={e => setSelectedLoteAgendamento(e.target.value)} className="w-full bg-slate-800 border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2">
                            <option value="">Selecione o lote</option>
                            {lotesAgendamento.map(l => <option key={l.id_lote_ag} value={l.id_lote_ag}>#{l.id_lote_ag} ({l.data_inicio} → {l.data_fim}) - {l.total_itens} itens</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">② Lote Convênio {isLinked && <span className="text-emerald-400 text-[10px] ml-1">🔒 vinculado</span>}</label>
                        <select value={selectedLoteConvenio} onChange={e => setSelectedLoteConvenio(e.target.value)} disabled={isLinked}
                            className={`w-full bg-slate-800 border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 ${isLinked ? 'opacity-60 cursor-not-allowed' : ''}`}>
                            <option value="">Selecione o lote</option>
                            {lotesConvenio.map(l => <option key={l.id_lote} value={l.id_lote}>{l.numero_lote ? `Lote ${l.numero_lote}` : `#${l.id_lote}`} - {l.status}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button onClick={handleConciliar} disabled={!selectedLoteConvenio || !selectedLoteAgendamento || conciliando}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50">
                            {conciliando ? <><Loader2 size={16} className="animate-spin"/> Conciliando...</> : <><Link2 size={16}/> Conciliar</>}
                        </button>
                    </div>
                </div>
                {resultado && <div className="mt-4 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg text-sm text-violet-300">✅ {resultado.message}</div>}
            </div>

            {/* KPIs */}
            {itens.length > 0 && (
                <div className="p-4 bg-slate-800/50 border-b border-slate-700 grid grid-cols-3 gap-4">
                    <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600/50 flex flex-col items-center">
                        <span className="text-xs text-slate-400 uppercase font-semibold">Total</span><span className="text-2xl font-bold text-slate-100">{itens.length}</span>
                    </div>
                    <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 flex flex-col items-center">
                        <span className="text-xs text-emerald-400 uppercase font-semibold">Conciliados</span><span className="text-2xl font-bold text-emerald-400">{totalConc}</span>
                    </div>
                    <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 flex flex-col items-center">
                        <span className="text-xs text-amber-400 uppercase font-semibold">Pendentes</span><span className="text-2xl font-bold text-amber-400">{totalPend}</span>
                    </div>
                </div>
            )}

            {/* Filtros */}
            {itens.length > 0 && (
                <div className="bg-slate-800 p-3 border-b border-slate-700 flex gap-3">
                    <input type="text" placeholder="Filtrar por paciente..." className="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 flex-1" value={filtroPaciente} onChange={e => setFiltroPaciente(e.target.value)} />
                    <select className="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                        <option value="">Todos</option><option value="Conciliado">Conciliado</option><option value="Não Conciliado">Não Conciliado</option>
                    </select>
                </div>
            )}

            {/* Tabela */}
            <div className="flex-1 overflow-auto">
                {loadingItens ? (
                    <div className="flex flex-col justify-center items-center h-full text-slate-500 gap-3"><Loader2 size={32} className="animate-spin text-violet-400"/><p>Carregando itens...</p></div>
                ) : !selectedLoteAgendamento ? (
                    <div className="flex flex-col justify-center items-center h-full text-slate-500"><GitMerge size={48} className="mb-4 opacity-30"/><p>Selecione um Lote de Agendamento para visualizar os itens.</p></div>
                ) : (
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="text-xs uppercase bg-slate-800/80 text-slate-400 font-semibold sticky top-0 border-b border-slate-700 z-10">
                            <tr>
                                <th className="px-3 py-3">Paciente</th><th className="px-3 py-3">Data</th><th className="px-3 py-3">Horário</th>
                                <th className="px-3 py-3">Procedimento</th><th className="px-3 py-3">Guia</th><th className="px-3 py-3">Verificação</th>
                                <th className="px-3 py-3">Conciliação</th><th className="px-3 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {filteredItens.length === 0 ? (
                                <tr><td colSpan="8" className="px-4 py-8 text-center text-slate-500">Nenhum item encontrado.</td></tr>
                            ) : filteredItens.map(item => (
                                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-3 py-2 text-xs font-medium text-slate-200">{item.paciente}</td>
                                    <td className="px-3 py-2 text-xs">{item.data}</td>
                                    <td className="px-3 py-2 text-xs">{item.horario}</td>
                                    <td className="px-3 py-2 font-mono text-xs">{item.cod_procedimento_fat}</td>
                                    <td className="px-3 py-2 text-xs">{item.numero_guia || '-'}</td>
                                    <td className="px-3 py-2"><StatusBadge sv={item.status_verificacao}/></td>
                                    <td className="px-3 py-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.status_conciliacao === 'Conciliado' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>{item.status_conciliacao}</span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex gap-1">
                                            {item.id_faturamento_lote && (
                                                <button onClick={() => { setEditItem(item); setEditForm({ dataRealizacao: item.data || '', Guia: item.numero_guia || '', cod_procedimento_fat: item.cod_procedimento_fat || '' }); setShowEditModal(true); }}
                                                    className="p-1 text-slate-400 hover:text-indigo-400 transition-colors" title="Editar"><Edit3 size={14}/></button>
                                            )}
                                            {item.status_conciliacao !== 'Conciliado' && item.numero_guia && (
                                                <button onClick={() => handleOpenManualAg(item)}
                                                    className="p-1 text-slate-400 hover:text-violet-400 transition-colors" title="Conciliação Manual"><Link2 size={14}/></button>
                                            )}
                                            {item.status_conciliacao === 'Conciliado' && (
                                                <span className="text-[10px] text-emerald-500">✓</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Overlay conciliação */}
            {conciliando && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 flex flex-col items-center gap-4 shadow-2xl">
                        <Loader2 size={40} className="animate-spin text-violet-400"/>
                        <p className="text-lg font-semibold text-slate-100">Processando Conciliação</p>
                        <p className="text-sm text-slate-400">Cruzando itens de faturamento com agendamentos...</p>
                        <div className="w-48 h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-violet-500 rounded-full animate-pulse" style={{width:'70%'}}/></div>
                    </div>
                </div>
            )}

            {/* Modal Editar */}
            {showEditModal && editItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-slate-100">Editar Item de Faturamento</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleEditarItem} className="space-y-4">
                            <div><label className="block text-sm text-slate-400 mb-1">Data</label><input type="date" value={editForm.dataRealizacao} onChange={e => setEditForm({...editForm, dataRealizacao: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"/></div>
                            <div><label className="block text-sm text-slate-400 mb-1">Guia</label><input type="text" value={editForm.Guia} onChange={e => setEditForm({...editForm, Guia: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"/></div>
                            <div><label className="block text-sm text-slate-400 mb-1">Cód. Procedimento</label><input type="text" value={editForm.cod_procedimento_fat} onChange={e => setEditForm({...editForm, cod_procedimento_fat: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"/></div>
                            <p className="text-xs text-slate-500">Após salvar, o sistema tentará conciliar automaticamente.</p>
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Conciliação Manual */}
            {showManualModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 shrink-0">
                            <h3 className="text-lg font-semibold text-slate-100">Conciliação Manual — Candidatos</h3>
                            <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="overflow-auto flex-1 p-4">
                            {loadingCandidatos ? <div className="text-center text-slate-500 py-8">Buscando candidatos...</div>
                            : candidatos.length === 0 ? <div className="text-center text-slate-500 py-8">Nenhum candidato encontrado.</div>
                            : (
                                <table className="w-full text-left text-sm text-slate-300">
                                    <thead className="text-xs uppercase bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
                                        <tr><th className="px-3 py-2">Paciente</th><th className="px-3 py-2">Data</th><th className="px-3 py-2">Guia</th><th className="px-3 py-2">Verificação</th><th className="px-3 py-2">Ação</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {candidatos.map(c => (
                                            <tr key={c.id_agendamento} className="hover:bg-slate-800/30">
                                                <td className="px-3 py-2 text-xs">{c.paciente}</td>
                                                <td className="px-3 py-2 text-xs">{c.data}</td>
                                                <td className="px-3 py-2 text-xs">{c.numero_guia}</td>
                                                <td className="px-3 py-2"><StatusBadge sv={c.status_verificacao}/></td>
                                                <td className="px-3 py-2">
                                                    <button onClick={() => handleConciliarManual(c.id_agendamento)} disabled={!c.apto}
                                                        className="px-2 py-1 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded disabled:opacity-40 disabled:cursor-not-allowed">Vincular</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Conciliação Manual (do lado agendamento → faturamento) */}
            {showManualAgModal && manualAgItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 shrink-0">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100">Vincular Manualmente</h3>
                                <p className="text-xs text-slate-400 mt-1">Paciente: {manualAgItem.paciente} | Guia: {manualAgItem.numero_guia} | Data: {manualAgItem.data}</p>
                            </div>
                            <button onClick={() => setShowManualAgModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="overflow-auto flex-1 p-4">
                            {loadingFatCandidatos ? <div className="text-center text-slate-500 py-8">Buscando itens de faturamento...</div>
                            : fatCandidatos.length === 0 ? <div className="text-center text-slate-500 py-8">Nenhum item de faturamento disponível para esta guia.</div>
                            : (
                                <table className="w-full text-left text-sm text-slate-300">
                                    <thead className="text-xs uppercase bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
                                        <tr><th className="px-3 py-2">ID</th><th className="px-3 py-2">Detalhe</th><th className="px-3 py-2">Guia</th><th className="px-3 py-2">Beneficiário</th><th className="px-3 py-2">Data</th><th className="px-3 py-2">Ação</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {fatCandidatos.map(f => (
                                            <tr key={f.id} className="hover:bg-slate-800/30">
                                                <td className="px-3 py-2 font-mono text-xs">{f.id}</td>
                                                <td className="px-3 py-2 font-mono text-xs">{f.detalheId}</td>
                                                <td className="px-3 py-2 text-xs">{f.Guia}</td>
                                                <td className="px-3 py-2 text-xs">{f.CodigoBeneficiario}</td>
                                                <td className="px-3 py-2 text-xs">{f.dataRealizacao || '-'}</td>
                                                <td className="px-3 py-2">
                                                    <button onClick={() => handleConciliarManualAg(f.id)}
                                                        className="px-2 py-1 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded">Vincular</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
