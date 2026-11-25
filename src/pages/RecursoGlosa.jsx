import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Eye, Send, Save, Plus, X, Search, AlertCircle, FileWarning, Paperclip, CheckCircle, Clock, XCircle, FolderOpen, ArrowRight, Upload } from 'lucide-react';
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

        // ── Anexos do Recurso de Glosa (OP21) ──
    const [showAnexosModal, setShowAnexosModal] = useState(false);
    const [anexosLote, setAnexosLote] = useState(null);
    const [anexosTab, setAnexosTab] = useState('novo'); // 'novo' (padrão para entrada de arquivos) | 'monitor'
    const [anexosTexto, setAnexosTexto] = useState('');
    const [analisandoAnexos, setAnalisandoAnexos] = useState(false);
    const [anexosPreview, setAnexosPreview] = useState(null);
    const [criandoAnexos, setCriandoAnexos] = useState(false);
    const [anexosResultado, setAnexosResultado] = useState(null);
    const [anexosStatus, setAnexosStatus] = useState(null);
    const [loadingAnexosStatus, setLoadingAnexosStatus] = useState(false);
    const [reprocessandoAnexos, setReprocessandoAnexos] = useState(false);
    const [abortandoAnexos, setAbortandoAnexos] = useState(false);

    const carregarStatusAnexos = async (loteId, silent = false) => {
        if (!silent) setLoadingAnexosStatus(true);
        try {
            const res = await recursoGlosaApi.statusAnexos(loteId);
            setAnexosStatus(res.data);
            return res.data;
        } catch (e) {
            if (!silent) console.error("Erro ao carregar status dos anexos:", e);
            return null;
        } finally {
            if (!silent) setLoadingAnexosStatus(false);
        }
    };

    const handleAbrirAnexos = (lote) => {
        setAnexosLote(lote);
        setAnexosTexto('');
        setAnexosPreview(null);
        setAnexosResultado(null);
        setAnexosStatus(null);
        setAnexosTab('novo'); // Sempre abre direto no campo de input
        setShowAnexosModal(true);
        // Carrega status silenciosamente em background sem travar abertura do modal
        carregarStatusAnexos(lote.id_lote, true);
    };

    useEffect(() => {
        if (!showAnexosModal || !anexosLote) return;
        // Faz polling apenas se estiver na aba monitor e o modal aberto
        const interval = setInterval(async () => {
            if (anexosTab === 'monitor') {
                await carregarStatusAnexos(anexosLote.id_lote, true);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [showAnexosModal, anexosLote, anexosTab]);

    const handleAnalisarAnexos = async () => {
        const caminhos = anexosTexto.split('\n').map(c => c.trim()).filter(Boolean);
        if (caminhos.length === 0) {
            alert('Informe ao menos um caminho de arquivo ou pasta (um por linha).');
            return;
        }
        setAnalisandoAnexos(true);
        setAnexosResultado(null);
        try {
            const res = await recursoGlosaApi.analisarAnexos(anexosLote.id_lote, caminhos);
            setAnexosPreview(res.data);
        } catch (e) {
            alert(e.response?.data?.detail || 'Erro ao analisar caminhos.');
        } finally {
            setAnalisandoAnexos(false);
        }
    };

    const handleCriarAnexos = async () => {
        const caminhos = (anexosPreview?.data || []).filter(d => d.valido).map(d => d.caminho);
        if (caminhos.length === 0) {
            alert('Nenhum caminho válido para criar jobs. Use "Analisar" primeiro.');
            return;
        }
        if (!window.confirm(`Criar ${caminhos.length} job(s) de envio de anexo (OP21) para o protocolo ${anexosLote.protocolo}?`)) return;
        setCriandoAnexos(true);
        try {
            const res = await recursoGlosaApi.criarAnexos(anexosLote.id_lote, caminhos);
            setAnexosResultado(res.data);
            setAnexosPreview(null);
            setAnexosTexto('');
            setAnexosTab('monitor');
            await carregarStatusAnexos(anexosLote.id_lote);
        } catch (e) {
            alert(e.response?.data?.detail || 'Erro ao criar jobs de anexo.');
        } finally {
            setCriandoAnexos(false);
        }
    };

    const handleReprocessarAnexos = async (jobIds = null) => {
        if (!anexosLote) return;
        const msg = jobIds
            ? `Reenviar ${jobIds.length} job(s) de anexo para reprocessamento?`
            : `Reenviar todos os anexos pendentes/abortados deste lote para reprocessamento?`;
        if (!window.confirm(msg)) return;

        setReprocessandoAnexos(true);
        try {
            const res = await recursoGlosaApi.reprocessarAnexos(anexosLote.id_lote, jobIds);
            alert(`Reenviado(s) ${res.data?.reprocessados ?? 0} job(s) para a fila!`);
            await carregarStatusAnexos(anexosLote.id_lote);
        } catch (e) {
            alert(e.response?.data?.detail || "Erro ao reprocessar anexos.");
        } finally {
            setReprocessandoAnexos(false);
        }
    };

    const handleAbortarAnexos = async () => {
        if (!anexosLote) return;
        if (!window.confirm("Deseja abortar imediatamente a fila de envio de anexos deste recurso de glosa?")) return;

        setAbortandoAnexos(true);
        try {
            const res = await recursoGlosaApi.abortarAnexos(anexosLote.id_lote);
            alert(`Fila abortada: ${res.data?.abortados ?? 0} job(s) abortado(s).`);
            await carregarStatusAnexos(anexosLote.id_lote);
        } catch (e) {
            alert(e.response?.data?.detail || "Erro ao abortar fila de anexos.");
        } finally {
            setAbortandoAnexos(false);
        }
    };

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
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleAbrirAnexos(lote)}
                                                disabled={!lote.protocolo}
                                                title={lote.protocolo ? "Enviar ou gerenciar anexos deste recurso de glosa (OP21)" : "Informe o protocolo antes de anexar"}
                                            >
                                                <Paperclip size={13} /> Anexos
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

            {/* ══════════════ Modal de Anexos do Recurso de Glosa (OP21) ══════════════ */}
            {showAnexosModal && anexosLote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-700 bg-slate-800/90 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary">
                                    <Paperclip size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                                        Anexos do Recurso de Glosa (OP21)
                                        <span className="text-xs font-mono font-medium text-slate-400 bg-slate-700/60 px-2 py-0.5 rounded">
                                            Lote #{anexosLote.numero_lote || anexosLote.id_lote}
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Protocolo (Capa): <span className="font-mono text-slate-200 font-semibold">{anexosLote.protocolo}</span>
                                        <span className="text-slate-500 ml-2">• Envio direto por protocolo via NovoWebPlan</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAnexosModal(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-700 bg-slate-900/60 px-5 gap-3 pt-2">
                            <button
                                onClick={() => setAnexosTab('novo')}
                                className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                                    anexosTab === 'novo'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Upload size={15} />
                                1. Selecionar Arquivos / Pastas
                            </button>
                            <button
                                onClick={() => setAnexosTab('monitor')}
                                className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                                    anexosTab === 'monitor'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Clock size={15} />
                                2. Monitor e Fila de Envios
                                <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                                    {anexosStatus?.total ?? 0}
                                </span>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-5">
                            {anexosTab === 'novo' ? (
                                <div className="space-y-4">
                                    <div className="bg-slate-900/60 border border-slate-700/80 rounded-xl p-4 text-xs text-slate-300 space-y-2">
                                        <div className="font-semibold text-white flex items-center gap-1.5">
                                            <FolderOpen size={14} className="text-primary" />
                                            Como funciona o envio de anexos de recurso de glosa:
                                        </div>
                                        <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                                            <li>Cole o caminho completo de <strong>pastas locais</strong> ou de <strong>arquivos .PDF avulsos</strong> (um por linha).</li>
                                            <li>Se informar uma <strong>pasta</strong>, todos os arquivos <code>.pdf</code> existentes nela serão incluídos.</li>
                                            <li>Ao contrário da conferência de faturamento, no recurso de glosa <strong>não é necessário que o nome do arquivo tenha número de guia ou senha</strong> — qualquer PDF válido (até 5MB) é aceito e anexado diretamente ao protocolo.</li>
                                            <li>O worker faz o upload para a pasta temporária do WebPlan e registra o anexo via <code>RecursoGlosa/SaveFile</code> com os cookies da OP0.</li>
                                        </ul>
                                    </div>

                                    <div className="bg-slate-900/80 border-2 border-primary/40 rounded-xl p-4 shadow-lg space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                                                <FolderOpen size={16} className="text-primary" />
                                                Caminho da Pasta ou dos Arquivos PDF (Cole aqui):
                                            </label>
                                            <span className="text-[11px] text-primary/90 font-medium">
                                                Aceita caminho de pasta inteira ou lista de PDFs
                                            </span>
                                        </div>
                                        <textarea
                                            rows={4}
                                            value={anexosTexto}
                                            onChange={(e) => setAnexosTexto(e.target.value)}
                                            placeholder="Cole aqui o caminho da pasta onde estão os PDFs (ex: C:\arquivos\glosas\) ou o caminho direto de cada PDF..."
                                            className="w-full bg-slate-950 border border-slate-700 focus:border-primary rounded-lg p-3 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none resize-y ring-1 ring-white/5"
                                        />
                                        <p className="text-[11px] text-slate-400">
                                            💡 <strong>Dica prática:</strong> Você pode simplesmente colar o caminho de uma pasta (ex.: <code className="text-amber-300 bg-slate-800 px-1 py-0.5 rounded">C:\recursos\anexos</code>) que o sistema encontrará todos os arquivos <code className="text-amber-300 bg-slate-800 px-1 py-0.5 rounded">.pdf</code> dentro dela automaticamente.
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={handleAnalisarAnexos}
                                            disabled={analisandoAnexos || !anexosTexto.trim()}
                                            isLoading={analisandoAnexos}
                                        >
                                            <Search size={14} /> Analisar Caminhos
                                        </Button>

                                        {anexosPreview && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={handleCriarAnexos}
                                                disabled={criandoAnexos || (anexosPreview.validos || 0) === 0}
                                                isLoading={criandoAnexos}
                                            >
                                                <Upload size={14} /> Criar Jobs de Envio ({anexosPreview.validos || 0})
                                            </Button>
                                        )}
                                    </div>

                                    {/* Preview Result */}
                                    {anexosPreview && (
                                        <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-900/40">
                                            <div className="p-3 bg-slate-800/60 border-b border-slate-700 flex items-center justify-between text-xs">
                                                <div className="font-semibold text-slate-300">
                                                    Resultado da Análise: {anexosPreview.validos} válido(s) de {anexosPreview.data?.length || 0}
                                                </div>
                                                {anexosPreview.ignorados_nao_pdf > 0 && (
                                                    <span className="text-[11px] text-slate-500">
                                                        {anexosPreview.ignorados_nao_pdf} arquivo(s) não-PDF ignorados
                                                    </span>
                                                )}
                                            </div>
                                            <div className="max-h-60 overflow-y-auto">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left">Arquivo</th>
                                                            <th className="px-3 py-2 text-left">Status</th>
                                                            <th className="px-3 py-2 text-left">Motivo / Detalhe</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800">
                                                        {anexosPreview.data?.map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-800/40">
                                                                <td className="px-3 py-2 font-mono text-[11px] text-slate-200 break-all max-w-[280px]">
                                                                    {item.arquivo}
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    {item.valido ? (
                                                                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                                                                            <CheckCircle size={12} /> Pronto
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 text-red-400 font-medium text-[11px]">
                                                                            <XCircle size={12} /> Inválido
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2 text-[11px] text-slate-400 max-w-[300px] truncate" title={item.motivo || ''}>
                                                                    {item.motivo || 'Arquivo PDF apto para envio'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* KPI Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3">
                                            <div className="text-[10px] uppercase font-bold text-slate-400">Total Anexos</div>
                                            <div className="text-xl font-bold text-white mt-1">{anexosStatus?.total || 0}</div>
                                        </div>
                                        <div className="bg-slate-900/60 border border-emerald-500/30 rounded-xl p-3">
                                            <div className="text-[10px] uppercase font-bold text-emerald-400">Concluídos</div>
                                            <div className="text-xl font-bold text-emerald-300 mt-1">{anexosStatus?.concluidos || 0}</div>
                                        </div>
                                        <div className="bg-slate-900/60 border border-amber-500/30 rounded-xl p-3">
                                            <div className="text-[10px] uppercase font-bold text-amber-400">Na Fila</div>
                                            <div className="text-xl font-bold text-amber-300 mt-1">{anexosStatus?.pendentes || 0}</div>
                                        </div>
                                        <div className="bg-slate-900/60 border border-blue-500/30 rounded-xl p-3">
                                            <div className="text-[10px] uppercase font-bold text-blue-400">Enviando</div>
                                            <div className="text-xl font-bold text-blue-300 mt-1">{anexosStatus?.processando || 0}</div>
                                        </div>
                                        <div className="bg-slate-900/60 border border-red-500/30 rounded-xl p-3">
                                            <div className="text-[10px] uppercase font-bold text-red-400">Falhas / Pausados</div>
                                            {/* abortados é subconjunto de erros no backend — somar os dois dobrava o número real */}
                                            <div className="text-xl font-bold text-red-300 mt-1" title={`${anexosStatus?.abortados || 0} pausado(s) com reenvio automático`}>
                                                {anexosStatus?.erros || 0}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Alert Banner */}
                                    {((anexosStatus?.abortados || 0) > 0 || anexosStatus?.bloqueio_detectado || anexosStatus?.sessao_rejeitada_detectada) && (
                                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2.5">
                                                <AlertCircle size={18} className="text-amber-400 shrink-0" />
                                                <div>
                                                    <div className="font-semibold text-amber-200">
                                                        {anexosStatus?.bloqueio_detectado
                                                            ? 'Bloqueio momentâneo do IPASGO detectado (403/429)!'
                                                            : anexosStatus?.sessao_rejeitada_detectada
                                                            ? 'Portal IPASGO rejeitando a sessão (401/500) — envio pausado.'
                                                            : 'Envio pausado ou limite de tentativas atingido.'}
                                                    </div>
                                                    <div className="text-[11px] text-amber-300/80 mt-0.5">
                                                        {(anexosStatus?.abortados || anexosStatus?.erros)} anexo(s) pausados. Reenvio automático ativo; use "Reprocessar" para forçar envio imediato.
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleReprocessarAnexos()}
                                                disabled={reprocessandoAnexos}
                                            >
                                                <RefreshCw size={13} className={reprocessandoAnexos ? "animate-spin" : ""} /> Reprocessar
                                            </Button>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center gap-3">
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => setAnexosTab('novo')}
                                                className="shadow-md font-semibold"
                                            >
                                                <Upload size={14} /> + Enviar Novos Anexos
                                            </Button>
                                            <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                                                Arquivos do Recurso ({anexosStatus?.itens?.length || 0})
                                            </span>
                                            {loadingAnexosStatus && (
                                                <span className="text-[10px] text-slate-500 flex items-center gap-1 font-normal">
                                                    <RefreshCw size={10} className="animate-spin" /> Atualizando...
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {((anexosStatus?.pendentes || 0) > 0 || (anexosStatus?.processando || 0) > 0) && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleAbortarAnexos}
                                                    disabled={abortandoAnexos}
                                                    className="text-red-400 hover:text-red-300 border border-red-500/30"
                                                >
                                                    <XCircle size={13} /> {abortandoAnexos ? 'Abortando…' : 'Abortar Fila'}
                                                </Button>
                                            )}
                                            {((anexosStatus?.abortados || 0) > 0 || (anexosStatus?.erros || 0) > 0) && (
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => handleReprocessarAnexos()}
                                                    disabled={reprocessandoAnexos}
                                                >
                                                    <RefreshCw size={13} className={reprocessandoAnexos ? "animate-spin" : ""} /> Reprocessar Todos
                                                </Button>
                                            )}
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => carregarStatusAnexos(anexosLote.id_lote)}
                                            >
                                                <RefreshCw size={13} className={loadingAnexosStatus ? "animate-spin" : ""} />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Table */}
                                    <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-900/40">
                                        {(!anexosStatus?.itens || anexosStatus.itens.length === 0) ? (
                                            <div className="p-8 text-center text-slate-500 text-xs">
                                                Nenhum anexo foi enviado ainda para este protocolo de recurso de glosa.
                                                <div className="mt-2">
                                                    <button
                                                        onClick={() => setAnexosTab('novo')}
                                                        className="text-primary hover:underline font-semibold"
                                                    >
                                                        Carregar pasta com PDFs agora →
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <table className="w-full text-xs">
                                                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700/70">
                                                    <tr>
                                                        <th className="px-3.5 py-2.5 text-left">Arquivo</th>
                                                        <th className="px-3.5 py-2.5 text-center">Tentativas</th>
                                                        <th className="px-3.5 py-2.5 text-left">Status</th>
                                                        <th className="px-3.5 py-2.5 text-left">Detalhe / Erro</th>
                                                        <th className="px-3.5 py-2.5 text-right">Ação</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800">
                                                    {anexosStatus.itens.map((item) => (
                                                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                                                            <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-200 break-all max-w-[280px]" title={item.caminho}>
                                                                {item.arquivo}
                                                            </td>
                                                            <td className="px-3.5 py-2.5 text-center font-mono">
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                    item.attempts >= item.max_attempts
                                                                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                                                        : item.attempts > 0
                                                                        ? 'bg-amber-500/20 text-amber-300'
                                                                        : 'text-slate-500'
                                                                }`}>
                                                                    {item.attempts}/{item.max_attempts}
                                                                </span>
                                                            </td>
                                                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                                                                {item.status === 'success' ? (
                                                                    <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                                                                        <CheckCircle size={12} /> Concluído
                                                                    </span>
                                                                ) : item.status === 'processing' || item.status === 'running' ? (
                                                                    <span className="inline-flex items-center gap-1 text-blue-400 font-semibold text-[11px]">
                                                                        <RefreshCw size={12} className="animate-spin text-blue-400" /> Enviando…
                                                                    </span>
                                                                ) : item.status === 'pending' ? (
                                                                    <span className="inline-flex items-center gap-1 text-amber-400 font-medium text-[11px]">
                                                                        <Clock size={12} /> Na Fila
                                                                    </span>
                                                                ) : item.is_abortado ? (
                                                                    <span className="inline-flex items-center gap-1 text-red-400 font-semibold text-[11px]" title={item.error_message}>
                                                                        <AlertCircle size={12} /> Abortado (Pendente)
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-red-400 font-medium text-[11px]" title={item.error_message}>
                                                                        <XCircle size={12} /> Falhou
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-3.5 py-2.5 text-[11px] text-slate-400 max-w-[300px] truncate" title={item.error_message || ''}>
                                                                {item.status === 'success' ? (
                                                                    <span className="text-emerald-500/80">Anexado ao recurso</span>
                                                                ) : item.error_message && item.error_message.startsWith('[auto-retry') ? (
                                                                    <span className="text-blue-400/80">Reenvio automático agendado</span>
                                                                ) : item.error_message ? (
                                                                    <span className="text-red-400/90">{item.error_message}</span>
                                                                ) : (
                                                                    <span className="text-slate-500">—</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                                                                {(item.status === 'error' || item.is_abortado) && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleReprocessarAnexos([item.id])}
                                                                        disabled={reprocessandoAnexos}
                                                                        title="Reenviar este arquivo agora"
                                                                    >
                                                                        <RefreshCw size={12} />
                                                                    </Button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
