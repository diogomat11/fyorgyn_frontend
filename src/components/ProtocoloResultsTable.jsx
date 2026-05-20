import React, { useState, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, Loader, AlertTriangle, Download, Edit3, Check, X, Eye, Trash2 } from 'lucide-react';
import Badge from './ui/Badge';
import Button from './ui/Button';
import ProtocoloAtendimentosPopover from './ProtocoloAtendimentosPopover';
import ProtocoloPDFModal from './ProtocoloPDFModal';

/**
 * Results table for Protocolo-Fichas processing.
 * Shows status, extracted data, and actions per file.
 *
 * Props:
 *   arquivos — array from loteStatus.arquivos
 *   onDownloadFile(id, filename) — download handler
 *   onUpdateFileName(id, newName) — rename handler
 *   onDeleteFile(id) — delete handler
 */
export default function ProtocoloResultsTable({ arquivos = [], onDownloadFile, onUpdateFileName, onDeleteFile, onUpdateAtendimentos }) {
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [tooltipId, setTooltipId] = useState(null);
    const [atendimentosModalFile, setAtendimentosModalFile] = useState(null);
    const [viewPdfFile, setViewPdfFile] = useState(null);
    const [popoverTop, setPopoverTop] = useState(0);

    const startEdit = useCallback((arquivo) => {
        setEditingId(arquivo.id);
        setEditValue(arquivo.nome_final || arquivo.nome_original);
    }, []);

    const cancelEdit = useCallback(() => {
        setEditingId(null);
        setEditValue('');
    }, []);

    const saveEdit = useCallback(() => {
        if (editingId && editValue.trim()) {
            onUpdateFileName(editingId, editValue.trim());
            setEditingId(null);
            setEditValue('');
        }
    }, [editingId, editValue, onUpdateFileName]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'sucesso':
                return <Badge variant="success"><CheckCircle size={12} className="mr-1" />Sucesso</Badge>;
            case 'erro':
                return <Badge variant="error"><XCircle size={12} className="mr-1" />Erro</Badge>;
            case 'pendente':
                return <Badge variant="warning"><Clock size={12} className="mr-1" />Pendente</Badge>;
            case 'processando':
                return <Badge variant="info"><Loader size={12} className="mr-1 animate-spin" />Processando</Badge>;
            case 'revisao':
                return (
                    <Badge variant="warning">
                        <AlertTriangle size={12} className="mr-1" />Revisão
                    </Badge>
                );
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const formatAtendimentos = (atendimentos) => {
        if (!atendimentos || atendimentos.length === 0) return null;
        return atendimentos.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-text-primary font-mono">{a.data}</span>
                <span className={a.assinatura === 'Sim' ? 'text-emerald-400' : 'text-red-400'}>
                    {a.assinatura === 'Sim' ? '✓ Assinada' : '✗ Sem assinatura'}
                </span>
            </div>
        ));
    };

    if (arquivos.length === 0) {
        return (
            <div className="text-center py-16 text-text-secondary">
                <FileIcon className="mx-auto mb-3 text-slate-600" size={48} />
                <p className="text-lg font-medium">Nenhum arquivo processado</p>
                <p className="text-sm mt-1">Faça upload de PDFs para começar</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-slate-900/50 text-text-secondary text-xs uppercase tracking-wider">
                    <tr>
                        <th className="px-4 py-3 text-left w-8">#</th>
                        <th className="px-4 py-3 text-left">Arquivo Original</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Guia</th>
                        <th className="px-4 py-3 text-left">Beneficiário</th>
                        <th className="px-4 py-3 text-left">Nome Final</th>
                        <th className="px-4 py-3 text-left">Atendimentos</th>
                        <th className="px-4 py-3 text-left">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {arquivos.map((arquivo, idx) => (
                        <tr
                            key={arquivo.id}
                            className={`hover:bg-slate-800/30 transition-colors ${arquivo.status === 'erro' ? 'bg-red-500/5' :
                                    arquivo.status === 'revisao' ? 'bg-amber-500/5' : ''
                                }`}
                        >
                            {/* Index */}
                            <td className="px-4 py-3 text-sm text-text-secondary font-mono">
                                {idx + 1}
                            </td>

                            {/* Original filename */}
                            <td className="px-4 py-3 text-sm text-text-primary max-w-[200px] truncate" title={arquivo.nome_original}>
                                {arquivo.nome_original}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3 text-sm">
                                {getStatusBadge(arquivo.status)}
                                {arquivo.erro_mensagem && (
                                    <div className="text-xs text-red-400 mt-1 max-w-[200px] truncate" title={arquivo.erro_mensagem}>
                                        {arquivo.erro_mensagem}
                                    </div>
                                )}
                            </td>

                            {/* Guia */}
                            <td className="px-4 py-3 text-sm font-mono text-text-primary">
                                {arquivo.guia_normalizada || arquivo.numero_guia_prestador || '—'}
                            </td>

                            {/* Beneficiary */}
                            <td className="px-4 py-3 text-sm text-text-primary">
                                {arquivo.nome_beneficiario || '—'}
                            </td>

                            {/* Final filename (editable) */}
                            <td className="px-4 py-3 text-sm max-w-[250px]">
                                {editingId === arquivo.id ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveEdit();
                                                if (e.key === 'Escape') cancelEdit();
                                            }}
                                            onFocus={(e) => e.target.setSelectionRange(0, 0)}
                                            className="bg-slate-800 border border-blue-500 text-text-primary text-xs px-2 py-1 rounded w-full"
                                            autoFocus
                                        />
                                        <button onClick={saveEdit} className="text-emerald-400 hover:text-emerald-300 p-1">
                                            <Check size={14} />
                                        </button>
                                        <button onClick={cancelEdit} className="text-red-400 hover:text-red-300 p-1">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-text-secondary text-xs truncate block" title={arquivo.nome_final}>
                                        {arquivo.nome_final || '—'}
                                    </span>
                                )}
                            </td>

                            {/* Atendimentos tooltip */}
                            <td className="px-4 py-3 text-sm relative">
                                {arquivo.atendimentos && arquivo.atendimentos.length > 0 ? (
                                    <div className="relative">
                                        <button
                                            className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 cursor-pointer"
                                            onMouseEnter={() => setTooltipId(arquivo.id)}
                                            onMouseLeave={() => setTooltipId(null)}
                                            onClick={(e) => {
                                                const rect = e.currentTarget.closest('tr').getBoundingClientRect();
                                                setPopoverTop(rect.top + window.scrollY);
                                                setAtendimentosModalFile(arquivo);
                                            }}
                                        >
                                            <Eye size={14} />
                                            {arquivo.atendimentos.length} data(s)
                                            <Edit3 size={12} className="ml-1 opacity-50 group-hover:opacity-100" />
                                        </button>
                                        
                                        {/* View Tooltip (Hover) */}
                                        {tooltipId === arquivo.id && !atendimentosModalFile && (
                                            <div className="absolute z-50 bottom-full left-0 mb-2 bg-slate-800 border border-border rounded-lg p-3 shadow-xl min-w-[220px] animate-in fade-in slide-in-from-bottom-1 duration-200">
                                                <div className="text-xs text-text-secondary font-semibold mb-2 uppercase">
                                                    Datas de Atendimento
                                                </div>
                                                <div className="space-y-1.5">
                                                    {formatAtendimentos(arquivo.atendimentos)}
                                                </div>
                                                {/* Arrow */}
                                                <div className="absolute top-full left-4 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800" />
                                            </div>
                                        )}

                                    </div>
                                ) : (
                                    <span className="text-text-secondary text-xs">—</span>
                                )}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-sm">
                                <div className="flex items-center gap-1">
                                    {/* Edit */}
                                    {(arquivo.status === 'sucesso' || arquivo.status === 'revisao' || arquivo.status === 'erro') && (
                                        <button
                                            onClick={() => startEdit(arquivo)}
                                            className="text-slate-400 hover:text-blue-400 p-1 rounded hover:bg-blue-500/10 transition-colors"
                                            title="Editar nome final"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                    )}
                                    {/* View */}
                                    <button
                                        onClick={(e) => {
                                            const rect = e.currentTarget.closest('tr').getBoundingClientRect();
                                            setPopoverTop(rect.top + window.scrollY);
                                            setViewPdfFile(arquivo);
                                        }}
                                        className="text-slate-400 hover:text-blue-400 p-1 rounded hover:bg-blue-500/10 transition-colors"
                                        title="Visualizar arquivo"
                                    >
                                        <Eye size={14} />
                                    </button>
                                    {/* Download */}
                                    {arquivo.status === 'sucesso' && (
                                        <button
                                            onClick={() => onDownloadFile(arquivo.id, arquivo.nome_final || arquivo.nome_original)}
                                            className="text-slate-400 hover:text-emerald-400 p-1 rounded hover:bg-emerald-500/10 transition-colors"
                                            title="Download"
                                        >
                                            <Download size={14} />
                                        </button>
                                    )}
                                    {/* Delete */}
                                    {(arquivo.status === 'erro' || arquivo.status === 'falha' || arquivo.status === 'pendente') && onDeleteFile && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm("Deseja realmente excluir este arquivo da sessão?")) {
                                                    onDeleteFile(arquivo.id);
                                                }
                                            }}
                                            className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors ml-1"
                                            title="Excluir arquivo"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Global Popovers (Aligned with Row vertically, Centered horizontally) */}
            {atendimentosModalFile && (
                <div 
                    className="fixed inset-0 z-[100] flex justify-center pointer-events-none bg-slate-950/20 backdrop-blur-[1px]"
                >
                    <div 
                        className="pointer-events-auto absolute"
                        style={{ top: Math.max(80, popoverTop - 200) + 'px' }}
                    >
                        <ProtocoloAtendimentosPopover
                            isOpen={true}
                            onClose={() => setAtendimentosModalFile(null)}
                            file={atendimentosModalFile}
                            onSave={onUpdateAtendimentos}
                        />
                    </div>
                </div>
            )}

            {viewPdfFile && (
                <div 
                    className="fixed inset-0 z-[110] flex justify-center pointer-events-none bg-slate-950/40 backdrop-blur-[2px]"
                >
                    <div 
                        className="pointer-events-auto absolute w-full max-w-4xl px-4"
                        style={{ top: Math.max(40, popoverTop - 350) + 'px' }}
                    >
                        <ProtocoloPDFModal
                            isOpen={true}
                            onClose={() => setViewPdfFile(null)}
                            file={viewPdfFile}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// Inline icon fallback
function FileIcon(props) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
        </svg>
    );
}
