import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Eye, Send, Save, Plus, X, Search, AlertCircle, FileWarning } from 'lucide-react';
import api from '../services/api';
import recursoGlosaApi from '../services/recursoGlosa';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import SearchableSelect from '../components/SearchableSelect';

const ID_CONVENIO_IPASGO = 6;
const STATUS_PENDENTE = 'Pendente';
const STATUS_JUSTIFICATIVA = 'Justificativa Definida';
const STATUS_ENVIADO = 'Enviado';

const STATUS_BADGE = {
    [STATUS_PENDENTE]: 'warning',
    [STATUS_JUSTIFICATIVA]: 'info',
    [STATUS_ENVIADO]: 'success',
};

const fmtMoney = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (s) => (s ? String(s).split('T')[0].split('-').reverse().join('/') : '—');

export default function RecursoGlosa() {
    const [lotes, setLotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Protocolo inline
    const [protocoloEdit, setProtocoloEdit] = useState({});
    const [savingProtocolo, setSavingProtocolo] = useState(null);

    // Polling pós-ação (import/envio): atualiza agregados enquanto o job roda.
    // Refs evitam closures obsoletas (modal de itens aberto depois do start).
    const pollRef = useRef(null);
    const pollTicks = useRef(0);
    const [polling, setPolling] = useState(false);
    const itensModalRef = useRef({ open: false, lote: null, reload: null });

    const loadLotes = useCallback(async () => {
        setLoading(true);
        try {
            const resp = await recursoGlosaApi.listLotes();
            setLotes(resp.data?.data || []);
            setError('');
        } catch (e) {
            setError(e.response?.data?.detail || 'Erro ao carregar lotes do IPASGO.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLotes();
    }, [loadLotes]);

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        setPolling(false);
    }, []);

    const startPolling = useCallback(() => {
        if (pollRef.current) return;
        pollTicks.current = 0;
        setPolling(true);
        pollRef.current = setInterval(async () => {
            pollTicks.current += 1;
            await loadLotes();
            const { open, reload } = itensModalRef.current;
            if (open && reload) await reload(false);
            if (pollTicks.current >= 24) stopPolling(); // ~6 min
        }, 15000);
    }, [loadLotes, stopPolling]);

    useEffect(() => () => stopPolling(), [stopPolling]);

    // ── Protocolo ──
    const handleSaveProtocolo = async (lote) => {
        const protocolo = (protocoloEdit[lote.id_lote] ?? lote.protocolo ?? '').toString().trim();
        if (!protocolo) {
            alert('Informe o protocolo do lote no portal (ex.: 895854).');
            return;
        }
        setSavingProtocolo(lote.id_lote);
        try {
            await recursoGlosaApi.updateProtocolo(lote.id_lote, protocolo);
            alert('Protocolo salvo.');
            loadLotes();
        } catch (e) {
            alert(e.response?.data?.detail || 'Erro ao salvar protocolo.');
        } finally {
            setSavingProtocolo(null);
        }
    };

    // ── Importação (job OP10) ──
    const handleImportar = async (lote) => {
        const protocolo = (lote.protocolo || '').toString().trim();
        if (!protocolo) {
            alert('Informe e salve o protocolo do lote antes de importar.');
            return;
        }
        if (!window.confirm(`Importar itens de recurso de glosa do protocolo ${protocolo}? Isso pode levar alguns minutos.`)) return;
        try {
            await api.post('/jobs/', {
                type: 'single',
                id_convenio: ID_CONVENIO_IPASGO,
                rotina: 'op10_recurso_glosa',
                params: JSON.stringify({
                    protocolo,
                    id_lote_interno: lote.id_lote,
                    codigoPrestador: lote.cod_prestador,
                }),
            });
            alert('Importação acionada. Os itens aparecerão conforme o worker processa o lote.');
            startPolling();
            loadLotes();
        } catch (e) {
            alert(e.response?.data?.detail || 'Erro ao acionar importação.');
        }
    };

    // ════════════════════════ Modal de Itens ════════════════════════
    const [showItensModal, setShowItensModal] = useState(false);
    const [selectedLote, setSelectedLote] = useState(null);
    const [itens, setItens] = useState([]);
    const [itensTotal, setItensTotal] = useState(0);
    const [itensPage, setItensPage] = useState(0);
    const ITENS_LIMIT = 50;
    const [filtros, setFiltros] = useState({ guia: '', paciente: '', data_inicio: '', data_fim: '', status: '' });
    const [filtrosAplicados, setFiltrosAplicados] = useState({});
    const [loadingItens, setLoadingItens] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Submodal de justificativa
    const [showJustModal, setShowJustModal] = useState(false);
    const [justificativas, setJustificativas] = useState([]);
    const [justSelecionada, setJustSelecionada] = useState('');
    const [novaJustText, setNovaJustText] = useState('');
    const [showNovaJust, setShowNovaJust] = useState(false);
    const [savingJust, setSavingJust] = useState(false);
    const [enviando, setEnviando] = useState(false);

    const loadItens = useCallback(async (showLoader = true) => {
        if (!selectedLote) return;
        if (showLoader) setLoadingItens(true);
        try {
            const params = { id_lote: selectedLote.id_lote, limit: ITENS_LIMIT, skip: itensPage * ITENS_LIMIT };
            Object.entries(filtrosAplicados).forEach(([k, v]) => { if (v) params[k] = v; });
            const resp = await recursoGlosaApi.listItens(params);
            setItens(resp.data?.data || []);
            setItensTotal(resp.data?.total || 0);
        } catch (e) {
            alert(e.response?.data?.detail || 'Erro ao carregar itens.');
        } finally {
            setLoadingItens(false);
        }
    }, [selectedLote, itensPage, filtrosAplicados]);

    const kpis = (() => {
        const lote = lotes.find(l => l.id_lote === selectedLote?.id_lote) || selectedLote || {};
        return {
            total: lote.total_itens ?? itensTotal,
            comJust: lote.com_justificativa ?? 0,
            enviados: lote.enviados ?? 0,
            valorGlosado: lote.valor_glosado ?? 0,
            valorRecurso: lote.valor_recurso ?? 0,
        };
    })();

    const openItensModal = (lote) => {
        setSelectedLote(lote);
        setItensPage(0);
        setFiltros({ guia: '', paciente: '', data_inicio: '', data_fim: '', status: '' });
        setFiltrosAplicados({});
        setSelectedIds(new Set());
        setShowItensModal(true);
        // loadItens roda no useEffect abaixo com o estado já atualizado
    };

    useEffect(() => {
        if (showItensModal && selectedLote) loadItens();
    }, [showItensModal, selectedLote, itensPage, filtrosAplicados]); // eslint-disable-line react-hooks/exhaustive-deps

    // Expõe o estado do modal para o polling (sem closures obsoletas)
    itensModalRef.current = { open: showItensModal, lote: selectedLote, reload: loadItens };

    const toggleSelect = (item) => {
        if (item.status === STATUS_ENVIADO) return;
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(item.id) ? next.delete(item.id) : next.add(item.id);
            return next;
        });
    };

    const selecionaveisPagina = itens.filter(i => i.status !== STATUS_ENVIADO);
    const allPageSelected = selecionaveisPagina.length > 0 && selecionaveisPagina.every(i => selectedIds.has(i.id));

    const toggleSelectPage = () => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allPageSelected) {
                selecionaveisPagina.forEach(i => next.delete(i.id));
            } else {
                selecionaveisPagina.forEach(i => next.add(i.id));
            }
            return next;
        });
    };

    // ── Justificativas ──
    const openJustModal = async () => {
        setShowJustModal(true);
        setShowNovaJust(false);
        setNovaJustText('');
        setJustSelecionada('');
        try {
            const resp = await recursoGlosaApi.listJustificativas();
            setJustificativas(resp.data || []);
        } catch (e) {
            alert(e.response?.data?.detail || 'Erro ao carregar justificativas.');
        }
    };

    const handleCreateJustificativa = async () => {
        if (novaJustText.trim().length < 10) {
            alert('Descreva a justificativa (mínimo 10 caracteres).');
            return;
        }
        setSavingJust(true);
        try {
            const resp = await recursoGlosaApi.createJustificativa(novaJustText.trim());
            setJustificativas(prev => [...prev, resp.data]);
            setJustSelecionada(resp.data.id);
            setNovaJustText('');
            setShowNovaJust(false);
        } catch (e) {
            alert(e.response?.data?.detail || 'Erro ao salvar justificativa.');
        } finally {
            setSavingJust(false);
        }
    };

    const handleAplicarJustificativa = async (todos) => {
        if (!justSelecionada) {
            alert('Selecione uma justificativa.');
            return;
        }
        if (!todos && selectedIds.size === 0) {
            alert('Selecione ao menos um item na tabela.');
            return;
        }
        const alvo = todos ? 'TODOS os itens não enviados do lote' : `${selectedIds.size} item(ns) selecionado(s)`;
        if (!window.confirm(`Aplicar a justificativa a ${alvo}?`)) return;

        setSavingJust(true);
        try {
            const payload = {
                id_lote: selectedLote.id_lote,
                justificativa_id: justSelecionada,
                todos,
            };
            if (!todos) payload.item_ids = Array.from(selectedIds);
            const resp = await recursoGlosaApi.aplicarJustificativa(payload);
            alert(`Justificativa aplicada a ${resp.data?.itens_atualizados ?? 0} item(ns).`);
            setShowJustModal(false);
            setSelectedIds(new Set());
            await Promise.all([loadItens(), loadLotes()]);
        } catch (e) {
            alert(e.response?.data?.detail || 'Erro ao aplicar justificativa.');
        } finally {
            setSavingJust(false);
        }
    };

    // ── Envio (job OP16) ──
    const handleEnviar = async () => {
        const usarSelecao = selectedIds.size > 0;
        const prontosSelecionados = itens.filter(i => selectedIds.has(i.id) && i.status === STATUS_JUSTIFICATIVA).length;
        if (usarSelecao && prontosSelecionados === 0) {
            alert('Os itens selecionados não têm justificativa definida.');
            return;
        }
        const msg = usarSelecao
            ? `Enviar recurso de glosa para ${prontosSelecionados} item(ns) selecionado(s) com justificativa?`
            : `Enviar recurso de glosa para TODOS os itens com justificativa definida (${kpis.comJust - kpis.enviados} pronto(s))?`;
        if (!window.confirm(msg)) return;

        setEnviando(true);
        try {
            const resp = await recursoGlosaApi.enviar(selectedLote.id_lote, usarSelecao ? Array.from(selectedIds) : null);
            alert(`Envio acionado para ${resp.data?.servicos ?? 0} serviço(s). O status será atualizado após o processamento.`);
            setSelectedIds(new Set());
            startPolling();
            await Promise.all([loadItens(), loadLotes()]);
        } catch (e) {
            alert(e.response?.data?.detail || 'Erro ao acionar envio.');
        } finally {
            setEnviando(false);
        }
    };

    const justificativaSelecionadaObj = justificativas.find(j => j.id === justSelecionada);

    // ══════════════════════════════ Render ══════════════════════════════
    return (
        <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/95">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <FileWarning size={22} className="text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-100">Recurso de Glosa — IPASGO</h1>
                            <p className="text-sm text-slate-400">
                                Importação dos itens glosados por protocolo do lote, definição de justificativas e envio ao portal.
                                {polling && <span className="ml-2 text-amber-400">• atualizando automaticamente…</span>}
                            </p>
                        </div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={loadLotes} isLoading={loading}>
                        <RefreshCw size={14} /> Atualizar
                    </Button>
                </div>
                {error && (
                    <div className="mt-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}
            </div>

            {/* Tabela de lotes */}
            <div className="flex-1 overflow-auto p-6">
                {lotes.length === 0 && !loading ? (
                    <div className="text-center py-16 text-slate-500">
                        Nenhum lote do IPASGO encontrado. Crie lotes em <span className="text-slate-300">Faturamento → Lotes - Convênios</span>.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="text-slate-400 border-b border-slate-800">
                            <tr>
                                <th className="text-left py-3 px-3">Lote</th>
                                <th className="text-left py-3 px-3">Período</th>
                                <th className="text-left py-3 px-3">Protocolo</th>
                                <th className="text-left py-3 px-3">Itens de Glosa</th>
                                <th className="text-right py-3 px-3">Valor Glosado</th>
                                <th className="text-right py-3 px-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lotes.map(lote => (
                                <tr key={lote.id_lote} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                                    <td className="py-3 px-3">
                                        <div className="text-slate-200 font-medium">#{lote.numero_lote ?? '—'}</div>
                                        <div className="text-xs text-slate-500">{lote.status}</div>
                                    </td>
                                    <td className="py-3 px-3 text-slate-300 text-xs">
                                        {fmtDate(lote.data_inicio)} → {fmtDate(lote.data_fim)}
                                    </td>
                                    <td className="py-3 px-3">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="ex.: 895854"
                                                value={protocoloEdit[lote.id_lote] ?? lote.protocolo ?? ''}
                                                onChange={e => setProtocoloEdit(prev => ({ ...prev, [lote.id_lote]: e.target.value.replace(/\D/g, '') }))}
                                                className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-primary"
                                            />
                                            {(protocoloEdit[lote.id_lote] ?? '') !== (lote.protocolo ?? '') && (
                                                <Button variant="success" size="sm" onClick={() => handleSaveProtocolo(lote)} isLoading={savingProtocolo === lote.id_lote}>
                                                    <Save size={13} />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-3">
                                        <div className="flex flex-wrap gap-1.5">
                                            <Badge variant="default">{lote.total_itens ?? 0} itens</Badge>
                                            {(lote.com_justificativa ?? 0) > 0 && <Badge variant="info">{lote.com_justificativa} c/ justificativa</Badge>}
                                            {(lote.enviados ?? 0) > 0 && <Badge variant="success">{lote.enviados} enviados</Badge>}
                                        </div>
                                    </td>
                                    <td className="py-3 px-3 text-right text-slate-300">{fmtMoney(lote.valor_glosado)}</td>
                                    <td className="py-3 px-3">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleImportar(lote)}
                                                disabled={!lote.protocolo}
                                            >
                                                Importar
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => openItensModal(lote)}
                                                disabled={(lote.total_itens ?? 0) === 0}
                                            >
                                                <Eye size={13} /> Itens
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ══════════════════════ Modal: Itens do Lote ══════════════════════ */}
            {showItensModal && selectedLote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                        {/* Header do modal */}
                        <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-100">
                                    Recurso de Glosa — Lote #{selectedLote.numero_lote ?? selectedLote.id_lote}
                                </h2>
                                <p className="text-xs text-slate-400">
                                    Protocolo {selectedLote.protocolo || '—'} • Período {fmtDate(selectedLote.data_inicio)} → {fmtDate(selectedLote.data_fim)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="primary" size="sm" onClick={openJustModal}>
                                    <Plus size={13} /> Definir Justificativa {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                                </Button>
                                <Button variant="success" size="sm" onClick={handleEnviar} isLoading={enviando}>
                                    <Send size={13} /> Enviar Recurso
                                </Button>
                                <button onClick={() => { setShowItensModal(false); setSelectedLote(null); }} className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* KPIs */}
                        <div className="grid grid-cols-5 gap-3 p-5 pb-3">
                            {[
                                { label: 'Total de itens', value: kpis.total, cls: 'text-slate-200' },
                                { label: 'Com justificativa', value: kpis.comJust, cls: 'text-blue-400' },
                                { label: 'Enviados', value: kpis.enviados, cls: 'text-emerald-400' },
                                { label: 'Valor glosado', value: fmtMoney(kpis.valorGlosado), cls: 'text-amber-400' },
                                { label: 'Valor recurso', value: fmtMoney(kpis.valorRecurso), cls: 'text-amber-400' },
                            ].map(k => (
                                <div key={k.label} className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                                    <div className="text-[10px] uppercase text-slate-500 font-semibold">{k.label}</div>
                                    <div className={`text-lg font-bold ${k.cls}`}>{k.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Filtros */}
                        <div className="px-5 pb-4 flex flex-wrap items-end gap-3">
                            <div>
                                <label className="block text-[10px] uppercase text-slate-500 font-semibold mb-1">Guia</label>
                                <input
                                    type="text" placeholder="Nº da guia"
                                    value={filtros.guia}
                                    onChange={e => setFiltros(f => ({ ...f, guia: e.target.value }))}
                                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 w-32 focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase text-slate-500 font-semibold mb-1">Paciente</label>
                                <input
                                    type="text" placeholder="Nome ou código"
                                    value={filtros.paciente}
                                    onChange={e => setFiltros(f => ({ ...f, paciente: e.target.value }))}
                                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 w-48 focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase text-slate-500 font-semibold mb-1">Data (realização)</label>
                                <div className="flex items-center gap-1">
                                    <input type="date" value={filtros.data_inicio}
                                        onChange={e => setFiltros(f => ({ ...f, data_inicio: e.target.value }))}
                                        className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-primary" />
                                    <span className="text-slate-500 text-xs">até</span>
                                    <input type="date" value={filtros.data_fim}
                                        onChange={e => setFiltros(f => ({ ...f, data_fim: e.target.value }))}
                                        className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-primary" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase text-slate-500 font-semibold mb-1">Status</label>
                                <select
                                    value={filtros.status}
                                    onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}
                                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-primary"
                                >
                                    <option value="">Todos</option>
                                    <option value={STATUS_PENDENTE}>Pendente</option>
                                    <option value={STATUS_JUSTIFICATIVA}>Justificativa Definida</option>
                                    <option value={STATUS_ENVIADO}>Enviado</option>
                                </select>
                            </div>
                            <Button variant="primary" size="sm" onClick={() => { setItensPage(0); setFiltrosAplicados({ ...filtros }); }}>
                                <Search size={13} /> Aplicar Filtros
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setItensPage(0); setFiltros({ guia: '', paciente: '', data_inicio: '', data_fim: '', status: '' }); setFiltrosAplicados({}); }}>
                                Limpar
                            </Button>
                        </div>

                        {/* Tabela de itens */}
                        <div className="flex-1 overflow-auto px-5 pb-5">
                            <table className="w-full text-xs">
                                <thead className="text-slate-400 border-b border-slate-800 sticky top-0 bg-slate-900">
                                    <tr>
                                        <th className="py-2 px-2 w-8">
                                            <input type="checkbox" checked={allPageSelected} onChange={toggleSelectPage} className="accent-primary" />
                                        </th>
                                        <th className="text-left py-2 px-2">Guia</th>
                                        <th className="text-left py-2 px-2">Paciente</th>
                                        <th className="text-left py-2 px-2">Procedimento</th>
                                        <th className="text-left py-2 px-2">Data</th>
                                        <th className="text-right py-2 px-2">Qtde</th>
                                        <th className="text-right py-2 px-2">Vlr Unit.</th>
                                        <th className="text-right py-2 px-2">Vlr Recurso</th>
                                        <th className="text-left py-2 px-2">Justificativa</th>
                                        <th className="text-left py-2 px-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingItens && (
                                        <tr><td colSpan={10} className="py-8 text-center text-slate-500">Carregando itens…</td></tr>
                                    )}
                                    {!loadingItens && itens.length === 0 && (
                                        <tr><td colSpan={10} className="py-8 text-center text-slate-500">Nenhum item com os filtros atuais.</td></tr>
                                    )}
                                    {!loadingItens && itens.map(item => (
                                        <tr key={item.id} className={`border-b border-slate-800/60 hover:bg-slate-800/30 ${item.status === STATUS_ENVIADO ? 'opacity-60' : ''}`}>
                                            <td className="py-2 px-2">
                                                <input
                                                    type="checkbox"
                                                    disabled={item.status === STATUS_ENVIADO}
                                                    checked={selectedIds.has(item.id)}
                                                    onChange={() => toggleSelect(item)}
                                                    className="accent-primary"
                                                />
                                            </td>
                                            <td className="py-2 px-2 text-slate-200 font-mono">{item.guia}</td>
                                            <td className="py-2 px-2 text-slate-300">
                                                <div>{item.nome_segurado || '—'}</div>
                                                <div className="text-[10px] text-slate-500">{item.codigo_segurado}</div>
                                            </td>
                                            <td className="py-2 px-2 text-slate-300">
                                                <div className="font-mono text-[11px] text-slate-400">{item.codigo_amb}</div>
                                                <div className="text-[10px] text-slate-500 truncate max-w-[220px]" title={item.descricao_servico}>{item.descricao_servico}</div>
                                            </td>
                                            <td className="py-2 px-2 text-slate-400">{fmtDate(item.data_realizacao)}</td>
                                            <td className="py-2 px-2 text-right text-slate-300">{item.quantidade_glosada}</td>
                                            <td className="py-2 px-2 text-right text-slate-300">{fmtMoney(item.valor_unitario_glosado)}</td>
                                            <td className="py-2 px-2 text-right text-slate-300">
                                                {item.valor_recurso != null ? fmtMoney(item.valor_recurso) : <span className="text-slate-500">auto</span>}
                                            </td>
                                            <td className="py-2 px-2 max-w-[260px]">
                                                {item.justificativa_texto ? (
                                                    <span className="text-[10px] text-slate-400 block truncate" title={item.justificativa_texto}>
                                                        ✔ {item.justificativa_texto}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-600">—</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-2">
                                                <Badge variant={STATUS_BADGE[item.status] || 'default'}>{item.status}</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Paginação */}
                            {itensTotal > ITENS_LIMIT && (
                                <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
                                    <span>
                                        Página {itensPage + 1} de {Math.ceil(itensTotal / ITENS_LIMIT)} ({itensTotal} itens)
                                    </span>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" size="sm" disabled={itensPage === 0} onClick={() => setItensPage(p => p - 1)}>Anterior</Button>
                                        <Button variant="secondary" size="sm" disabled={(itensPage + 1) * ITENS_LIMIT >= itensTotal} onClick={() => setItensPage(p => p + 1)}>Próxima</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════ Submodal: Definir Justificativa ════════════════ */}
            {showJustModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-slate-100">Definir Justificativa</h3>
                            <button onClick={() => setShowJustModal(false)} className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 overflow-auto">
                            <div>
                                <label className="block text-[10px] uppercase text-slate-500 font-semibold mb-1">Justificativa cadastrada</label>
                                <SearchableSelect
                                    options={justificativas.map(j => ({ id: j.id, descricao: j.descricao }))}
                                    value={justSelecionada}
                                    onChange={setJustSelecionada}
                                    labelKey="descricao"
                                    valueKey="id"
                                    placeholder="Selecione uma justificativa…"
                                    onAddNew={() => setShowNovaJust(true)}
                                    addNewText="Cadastrar nova justificativa (+)"
                                />
                            </div>

                            {justificativaSelecionadaObj && (
                                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                                    <div className="text-[10px] uppercase text-slate-500 font-semibold mb-1">Pré-visualização</div>
                                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{justificativaSelecionadaObj.descricao}</p>
                                </div>
                            )}

                            {showNovaJust && (
                                <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-4 space-y-3">
                                    <div className="text-[10px] uppercase text-slate-500 font-semibold">Nova justificativa</div>
                                    <textarea
                                        rows={6}
                                        value={novaJustText}
                                        onChange={e => setNovaJustText(e.target.value)}
                                        placeholder="Digite o texto da justificativa que será enviada ao IPASGO…"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary resize-y"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => setShowNovaJust(false)}>Cancelar</Button>
                                        <Button variant="primary" size="sm" onClick={handleCreateJustificativa} isLoading={savingJust}>
                                            <Save size={13} /> Salvar justificativa
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-slate-800 flex items-center justify-between">
                            <p className="text-xs text-slate-500">
                                {selectedIds.size > 0
                                    ? `${selectedIds.size} item(ns) selecionado(s) na tabela.`
                                    : 'Sem seleção: use "Aplicar a todos" ou selecione itens na tabela.'}
                            </p>
                            <div className="flex gap-2">
                                <Button variant="secondary" size="sm" onClick={() => handleAplicarJustificativa(true)} isLoading={savingJust}>
                                    Aplicar a todos do lote
                                </Button>
                                <Button variant="primary" size="sm" onClick={() => handleAplicarJustificativa(false)} disabled={selectedIds.size === 0} isLoading={savingJust}>
                                    Aplicar aos selecionados ({selectedIds.size})
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
