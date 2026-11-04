import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, X, AlertTriangle } from 'lucide-react';
import { formatDateTime, formatDate } from '../utils/formatters';

/**
 * Linha do tempo da solicitação (aba Solicitações): ícone antes do número da
 * guia que sinaliza o tempo sem resposta do convênio — acima de DIAS_ATENCAO
 * fica âmbar, acima de DIAS_CRITICO vermelho pulsante (risco de negativa por
 * demora na resposta). Clique abre um popover (padrão visual do PEI) com a
 * barra de tempo, marcos e a última observação recebida.
 *
 * Renderizado via portal (document.body) para escapar do clip do contêiner
 * overflow-x-auto da tabela — mesmo padrão do SolicitacaoObservacoesCell.
 */

// SLA de resposta do convênio usado para a sinalização (EM HORAS).
// Altere aqui: acima de HORAS_ATENCAO o ícone fica âmbar, acima de
// HORAS_CRITICO vermelho pulsante (risco de negativa por demora).
const HORAS_ATENCAO = 24;
const HORAS_CRITICO = 48;
const POPOVER_W = 340;
const POPOVER_H = 330;

// Status que ainda aguardam evolução no convênio e recebem a linha do tempo
const STATUS_ATIVOS = /pendente|an[áa]lise|aguardando/i;

const parseData = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
};

// Formato legível do tempo sem resposta: min / h / d+h
const formatarTempo = (min) => {
    if (min === null || min === undefined) return '—';
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    if (h < 48) return `${h}h`;
    return `${Math.floor(h / 24)}d ${h % 24}h`;
};

export default function SolicitacaoTimeline({ solicitacao }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState(null);
    const anchorRef = useRef(null);

    const status = String(solicitacao?.status_guia || '');

    const historico = (Array.isArray(solicitacao?.historico_observacoes)
        ? solicitacao.historico_observacoes : [])
        .map(o => ({ ...o, _d: parseData(o.data_hora) }))
        .filter(o => o._d)
        .sort((a, b) => a._d - b._d);
    const ultima = historico[historico.length - 1] || null;

    const dSolicitacao = parseData(solicitacao?.data_solicitacao || solicitacao?.created_at);
    // Referência da contagem: o evento mais recente conhecido (solicitação ou
    // última observação do convênio) — é o tempo "sem resposta" a partir dele
    const dRef = ultima?._d && dSolicitacao && ultima._d > dSolicitacao
        ? ultima._d
        : (ultima?._d || dSolicitacao);

    const agora = new Date();
    let minutos = null;
    if (dRef) {
        minutos = Math.max(0, Math.floor((agora - dRef) / 60000));
    }

    const computePos = () => {
        const rect = anchorRef.current?.getBoundingClientRect();
        if (!rect) return null;
        let top = rect.bottom + 8;
        if (window.innerHeight - top < POPOVER_H && rect.top > POPOVER_H) {
            top = Math.max(8, rect.top - POPOVER_H - 8);
        }
        top = Math.min(top, Math.max(8, window.innerHeight - POPOVER_H - 8));
        const left = Math.min(Math.max(8, rect.left), window.innerWidth - POPOVER_W - 8);
        return { top, left };
    };

    const toggle = () => {
        if (open) {
            setOpen(false);
            setPos(null);
        } else {
            setPos(computePos());
            setOpen(true);
        }
    };

    // Mantém o popover colado ao ícone ao rolar/redimensionar
    useEffect(() => {
        if (!open) return undefined;
        const reposition = () => {
            const p = computePos();
            setPos(prev => (prev && p && prev.top === p.top && prev.left === p.left) ? prev : p);
        };
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);
        return () => {
            window.removeEventListener('scroll', reposition, true);
            window.removeEventListener('resize', reposition);
        };
    }, [open]);

    if (!STATUS_ATIVOS.test(status)) return null;

    const horas = minutos === null ? null : minutos / 60;
    const critico = horas !== null && horas >= HORAS_CRITICO;
    const atencao = horas !== null && horas >= HORAS_ATENCAO && !critico;
    const nivel = critico ? 'critico' : (atencao ? 'atencao' : 'ok');

    const cor = nivel === 'critico' ? 'text-rose-400' : (nivel === 'atencao' ? 'text-amber-400' : 'text-emerald-400');
    const corBarra = nivel === 'critico' ? 'bg-rose-500' : (nivel === 'atencao' ? 'bg-amber-500' : 'bg-emerald-500');
    const percent = horas === null ? 0 : Math.min(100, (horas / HORAS_CRITICO) * 100);
    const posAtencao = (HORAS_ATENCAO / HORAS_CRITICO) * 100;
    const tempoSemResposta = formatarTempo(minutos);

    return (
        <div ref={anchorRef} className="relative inline-flex items-center">
            <button
                onClick={toggle}
                className={`p-1 rounded-full hover:bg-slate-800 transition-colors ${cor} ${critico ? 'animate-pulse' : ''} hover:scale-110`}
                title={
                    minutos === null
                        ? 'Linha do tempo da solicitação'
                        : `${tempoSemResposta} sem resposta do convênio${critico ? ' — risco de negativa' : ''}`
                }
            >
                <Clock size={16} strokeWidth={2.5} />
            </button>

            {open && pos && createPortal(
                <>
                    <div className="fixed inset-0 z-40" onClick={toggle} />
                    <div
                        style={{ top: pos.top, left: pos.left }}
                        className="fixed z-50 w-[340px] bg-slate-900 border border-blue-500/50 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    >
                        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-slate-800/80">
                            <div>
                                <h3 className="text-sm font-bold text-text-primary">Linha do Tempo da Solicitação</h3>
                                <p className="text-[10px] text-text-secondary truncate max-w-[240px]">
                                    {String(solicitacao.id || '').startsWith('job-') ? solicitacao.guia : `Guia ${solicitacao.guia}`} · {status}
                                </p>
                            </div>
                            <button onClick={toggle} className="text-text-secondary hover:text-red-400 p-1 rounded-full transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-4 space-y-3 bg-slate-950/50">
                            {/* Tempo sem resposta */}
                            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                <div className="flex justify-between text-[11px] text-slate-300 mb-1 font-medium">
                                    <span>
                                        {ultima
                                            ? `Último contato: ${formatDateTime(ultima.data_hora)}`
                                            : 'Sem interações registradas'}
                                    </span>
                                    <span className="font-semibold text-slate-200">{tempoSemResposta}</span>
                                </div>
                                <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-600/50">
                                    <div
                                        className={`absolute top-0 left-0 h-full ${corBarra} transition-all duration-500`}
                                        style={{ width: `${percent}%` }}
                                    ></div>
                                    <div
                                        className="absolute top-0 bottom-0 w-[2px] bg-amber-400/80 z-10"
                                        style={{ left: `${posAtencao}%` }}
                                        title={`${HORAS_ATENCAO}h`}
                                    ></div>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1.5 flex justify-between">
                                    <span className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> {HORAS_ATENCAO}h
                                        <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span> {HORAS_CRITICO}h
                                    </span>
                                    <span className="font-semibold text-slate-300">
                                        {minutos === null ? 'aguardando' : (critico ? 'sem resposta' : 'no prazo')}
                                    </span>
                                </div>
                            </div>

                            {/* Datas */}
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="bg-slate-800/40 rounded border border-border/30 px-2 py-1.5">
                                    <div className="text-slate-400 text-[10px] uppercase tracking-wider">Solicitada em</div>
                                    <div className="text-text-primary">
                                        {(solicitacao.data_solicitacao && !String(solicitacao.data_solicitacao).includes('T'))
                                            ? formatDate(solicitacao.data_solicitacao)
                                            : (formatDateTime(solicitacao.data_solicitacao || solicitacao.created_at) || '—')}
                                    </div>
                                </div>
                                <div className="bg-slate-800/40 rounded border border-border/30 px-2 py-1.5">
                                    <div className="text-slate-400 text-[10px] uppercase tracking-wider">Status</div>
                                    <div className="text-text-primary truncate" title={status}>{status || '—'}</div>
                                </div>
                            </div>

                            {/* Última observação do convênio */}
                            {ultima && (
                                <div className="p-2.5 bg-slate-800/40 rounded border border-border/30">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400">Última observação</span>
                                        <span className="text-[10px] text-text-secondary truncate">{ultima.login || ultima.usuario || 'Convênio'}</span>
                                    </div>
                                    <p className="text-[11px] text-text-primary whitespace-pre-line leading-relaxed max-h-24 overflow-y-auto custom-scrollbar">
                                        {String(ultima.observacao || '—').trim() || '—'}
                                    </p>
                                </div>
                            )}

                            {critico && (
                                <div className="flex items-start gap-1.5 text-[11px] text-rose-400">
                                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                    <span>
                                        {tempoSemResposta} sem resposta do convênio — risco de negativa.
                                        Envie a justificativa (ícone +) ou atualize a guia (ícone atualizar).
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}
