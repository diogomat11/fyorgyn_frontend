import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquareText, Plus, RefreshCw, X, Send, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import Button from './ui/Button';
import api from '../services/api';
import { formatDateTime } from '../utils/formatters';

/**
 * Célula de ações da aba Solicitações (IPASGO):
 * - Histórico de observações da guia no regulador (frame por DataHora);
 * - "+" envia justificativa (job OP15 EnviarJustificativa);
 * - Refresh reimporta a guia (job OP11) para atualizar o status.
 *
 * O popover é renderizado via portal em document.body com posição fixa
 * calculada a partir do ícone: assim ele escapa do clip do contêiner
 * `overflow-x-auto` da tabela (com a lista filtrada a tabela encurta e um
 * popover absoluto das últimas linhas ficava por baixo da tabela/paginação)
 * e do backdrop-blur do Card, que aprisionava o backdrop fixo.
 */

const POPOVER_W = 380;
// Altura estimada de cada painel (cabeçalho + conteúdo), usada para decidir
// se há espaço para abrir abaixo do ícone ou se deve abrir para cima.
const PANEL_H = { historico: 380, nova: 300 };

// O portal devolve a observação com <br>; converte para quebras de linha reais
const observacaoParaTexto = (html) =>
    String(html || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&nbsp;/gi, ' ')
        .trim();

export default function SolicitacaoObservacoesCell({ solicitacao, onJobCreated }) {
    const [openPanel, setOpenPanel] = useState(null); // 'historico' | 'nova' | null
    const [panelPos, setPanelPos] = useState(null);   // {top, left} em px, relativo ao viewport
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [feedback, setFeedback] = useState(null); // {tipo: 'ok'|'erro', msg}
    const [refreshOk, setRefreshOk] = useState(false);
    const anchorRef = useRef(null);

    const historico = Array.isArray(solicitacao.historico_observacoes)
        ? solicitacao.historico_observacoes
        : [];
    const isJobRow = String(solicitacao.id || '').startsWith('job-');
    const guia = solicitacao.guia && !isJobRow ? solicitacao.guia : null;

    const criarJob = async (payload) => {
        await api.post('/jobs/', payload);
        if (onJobCreated) onJobCreated();
    };

    const handleEnviarJustificativa = async () => {
        const obs = texto.trim();
        if (!obs) return;
        setEnviando(true);
        setFeedback(null);
        try {
            await criarJob({
                type: 'single',
                carteirinha_ids: null,
                id_convenio: solicitacao.id_convenio,
                rotina: 'op15_enviar_justificativa',
                params: JSON.stringify({
                    guia: solicitacao.guia,
                    guia_prestador: solicitacao.guia_prestador || '',
                    observacao: obs
                })
            });
            setFeedback({ tipo: 'ok', msg: 'Justificativa enviada! O status da guia será atualizado em instantes.' });
            setTexto('');
        } catch (e) {
            const detail = e?.response?.data?.detail || 'Falha ao criar o job.';
            setFeedback({ tipo: 'erro', msg: detail });
        } finally {
            setEnviando(false);
        }
    };

    const handleAtualizarGuia = async () => {
        setEnviando(true);
        try {
            await criarJob({
                type: 'single',
                carteirinha_ids: null,
                id_convenio: solicitacao.id_convenio,
                rotina: '11',
                params: JSON.stringify({ guia: solicitacao.guia })
            });
            setRefreshOk(true);
            setTimeout(() => setRefreshOk(false), 3000);
        } catch (e) {
            const detail = e?.response?.data?.detail || 'Falha ao criar o job de importação.';
            setFeedback({ tipo: 'erro', msg: detail });
            setOpenPanel('nova');
        } finally {
            setEnviando(false);
        }
    };

    const fecharPanel = () => {
        setOpenPanel(null);
        setPanelPos(null);
        setFeedback(null);
        setTexto('');
    };

    const computePanelPos = (panel) => {
        const rect = anchorRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const h = PANEL_H[panel] || 320;
        let top = rect.bottom + 8;
        // Sem espaço abaixo (última linha de tabela filtrada): abre para cima
        if (window.innerHeight - top < h && rect.top > h) {
            top = Math.max(8, rect.top - h - 8);
        }
        top = Math.min(top, Math.max(8, window.innerHeight - h - 8));
        const left = Math.min(Math.max(8, rect.left), window.innerWidth - POPOVER_W - 8);
        return { top, left };
    };

    const togglePanel = (panel) => {
        if (openPanel === panel) {
            fecharPanel();
            return;
        }
        setPanelPos(computePanelPos(panel));
        setFeedback(null);
        setTexto('');
        setOpenPanel(panel);
    };

    // Mantém o popover colado ao ícone ao rolar a página/tabela ou redimensionar
    useEffect(() => {
        if (!openPanel) return undefined;
        const reposition = () => {
            const pos = computePanelPos(openPanel);
            setPanelPos(prev => (prev && pos && prev.top === pos.top && prev.left === pos.left) ? prev : pos);
        };
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);
        return () => {
            window.removeEventListener('scroll', reposition, true);
            window.removeEventListener('resize', reposition);
        };
    }, [openPanel]);

    if (!guia) {
        return <span className="text-slate-600" title="Disponível após a importação da guia">—</span>;
    }

    return (
        <div ref={anchorRef} className="relative flex items-center gap-1">
            {/* Histórico de observações */}
            <button
                onClick={() => togglePanel('historico')}
                className="relative p-1 hover:text-primary transition-colors"
                title="Histórico de Observações"
            >
                <MessageSquareText size={16} className={historico.length ? 'text-amber-400' : 'text-text-secondary'} />
                {historico.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                        {historico.length}
                    </span>
                )}
            </button>

            {/* Nova observação / justificativa */}
            <button
                onClick={() => togglePanel('nova')}
                className="p-1 hover:text-primary transition-colors"
                title="Enviar Justificativa / Observação"
            >
                <Plus size={16} />
            </button>

            {/* Atualizar guia (OP11) */}
            <button
                onClick={handleAtualizarGuia}
                disabled={enviando}
                className="p-1 hover:text-primary transition-colors disabled:opacity-50"
                title="Atualizar status da guia (importação OP11)"
            >
                {refreshOk
                    ? <CheckCircle2 size={16} className="text-emerald-400" />
                    : <RefreshCw size={16} className={enviando ? 'animate-spin' : ''} />}
            </button>

            {openPanel && panelPos && createPortal(
                <>
                    <div className="fixed inset-0 z-40" onClick={fecharPanel} />
                    <div
                        style={{ top: panelPos.top, left: panelPos.left }}
                        className="fixed z-50 w-[380px] bg-slate-900 border border-blue-500/50 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    >
                        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-slate-800/80">
                            <div>
                                <h3 className="text-sm font-bold text-text-primary">
                                    {openPanel === 'historico' ? 'Histórico de Observações' : 'Enviar Justificativa'}
                                </h3>
                                <p className="text-[10px] text-text-secondary truncate max-w-[240px]">
                                    Guia {solicitacao.guia}
                                </p>
                            </div>
                            <button onClick={fecharPanel} className="text-text-secondary hover:text-red-400 p-1 rounded-full transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        {openPanel === 'historico' ? (
                            <div className="p-4 max-h-[320px] overflow-y-auto custom-scrollbar bg-slate-950/50 space-y-3">
                                {historico.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-border rounded-lg text-text-secondary">
                                        <p className="text-xs">Nenhuma observação registrada para esta guia.</p>
                                        <p className="text-[10px] mt-1">Use o ícone + para enviar uma justificativa ou atualize a guia (ícone atualizar) para buscar o histórico mais recente.</p>
                                    </div>
                                ) : (
                                    historico.map((item, idx) => (
                                        <div key={idx} className="p-2.5 bg-slate-800/40 rounded border border-border/30">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="text-[10px] font-mono text-indigo-300">{formatDateTime(item.data_hora)}</span>
                                                <span className="text-[10px] text-text-secondary truncate">{item.login || item.usuario || '—'}</span>
                                            </div>
                                            <p className="text-[11px] text-text-primary whitespace-pre-line leading-relaxed">
                                                {observacaoParaTexto(item.observacao) || '—'}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-950/50 space-y-3">
                                <p className="text-[10px] text-text-secondary">
                                    A justificativa é registrada no regulador do IPASGO e a guia será reimportada em seguida para atualizar o status.
                                </p>
                                <textarea
                                    value={texto}
                                    onChange={(e) => setTexto(e.target.value)}
                                    placeholder="Digite a justificativa / observação..."
                                    rows={5}
                                    maxLength={4000}
                                    className="w-full bg-slate-900 border border-border/50 text-text-primary text-xs px-3 py-2 rounded focus:border-blue-500 outline-none transition-colors resize-y custom-scrollbar"
                                />
                                {feedback && (
                                    <div className={`flex items-start gap-1.5 text-[11px] ${feedback.tipo === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {feedback.tipo === 'ok'
                                            ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                                            : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
                                        <span>{feedback.msg}</span>
                                    </div>
                                )}
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={fecharPanel}
                                        className="text-xs text-text-secondary hover:text-text-primary px-3 py-1.5"
                                        disabled={enviando}
                                    >
                                        Cancelar
                                    </button>
                                    <Button
                                        size="sm"
                                        onClick={handleEnviarJustificativa}
                                        disabled={enviando || !texto.trim()}
                                        className="bg-blue-600 hover:bg-blue-500 h-8 px-4"
                                    >
                                        {enviando
                                            ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> Enviando</>
                                            : <><Send size={14} className="mr-1.5" /> Enviar</>}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}
