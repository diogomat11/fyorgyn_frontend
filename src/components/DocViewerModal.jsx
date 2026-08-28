import React, { useState } from 'react';
import { X, ExternalLink, Download, FileText, RefreshCw, AlertCircle } from 'lucide-react';
import Button from './ui/Button';

export default function DocViewerModal({ isOpen, onClose, doc, titulo }) {
    const [iframeLoading, setIframeLoading] = useState(true);
    const [iframeError, setIframeError] = useState(false);

    if (!isOpen || !doc) return null;

    const isRM = doc.tipo_relatorio === 'RM' || (!doc.tipo_relatorio && doc.nome_medico);
    const token = localStorage.getItem('token') || '';
    
    // Resolve URL de stream do backend
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const cleanApiBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    const streamEndpoint = `${cleanApiBase}/docs/${isRM ? 'rm' : 'clinicos'}/${doc.id}/view?token=${encodeURIComponent(token)}`;

    // URL original (para abrir direto no portal caso o usuário prefira)
    const originalUrl = doc.url_arquivo || '';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl h-[92vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/70 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                            <FileText size={22} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2 truncate">
                                <span>{titulo || 'Visualizador de Documento'}</span>
                                <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                    {doc.tipo_relatorio || 'RM'}
                                </span>
                            </h2>
                            <p className="text-xs text-slate-400 truncate">
                                <span className="font-semibold text-slate-200">{doc.nome_paciente || 'Paciente'}</span>
                                {doc.data || doc.data_relatorio ? ` • Data: ${new Date(doc.data || doc.data_relatorio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}` : ''}
                                {doc.nome_profissional || doc.nome_medico ? ` • Profissional: ${doc.nome_profissional || doc.nome_medico}` : ''}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Abrir em Nova Aba (via Proxy autenticado) */}
                        <a
                            href={streamEndpoint}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                            title="Abrir o PDF em tela cheia em nova aba"
                        >
                            <ExternalLink size={14} /> Abrir PDF
                        </a>

                        {/* Link Original do Portal (se for Evoluir) */}
                        {originalUrl && originalUrl.includes('sistemaevoluir.com.br') && (
                            <a
                                href={originalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                                title="Abrir link original direto no portal Evoluir"
                            >
                                <ExternalLink size={14} /> Portal Evoluir
                            </a>
                        )}

                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors ml-2"
                            title="Fechar"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content / Frame */}
                <div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center">
                    {iframeLoading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 text-slate-400 gap-2">
                            <RefreshCw size={28} className="animate-spin text-primary" />
                            <span className="text-xs font-medium">Carregando visualização do documento...</span>
                        </div>
                    )}

                    <iframe
                        src={streamEndpoint}
                        title={titulo || 'Documento'}
                        className="w-full h-full border-0 bg-white"
                        onLoad={() => setIframeLoading(false)}
                        onError={() => {
                            setIframeLoading(false);
                            setIframeError(true);
                        }}
                    />

                    {iframeError && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
                            <AlertCircle size={48} className="text-amber-500 mb-3" />
                            <p className="text-slate-200 font-medium mb-1">Não foi possível carregar a pré-visualização no navegador</p>
                            <p className="text-xs text-slate-400 max-w-md mb-6">
                                Você pode abrir o documento diretamente ou tentar novamente.
                            </p>
                            <div className="flex items-center gap-3">
                                <a
                                    href={streamEndpoint}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-white hover:bg-primary-hover"
                                >
                                    <ExternalLink size={14} /> Abrir PDF em Nova Aba
                                </a>
                                {originalUrl && (
                                    <a
                                        href={originalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
                                    >
                                        <Download size={14} /> Link Original Evoluir
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
