import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import Button from './ui/Button';
import api from '../services/api';

export default function ProtocoloPDFModal({ isOpen, onClose, file }) {
    const [pdfUrl, setPdfUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && file) {
            setLoading(true);
            setError('');
            
            // Fetch PDF as blob to ensure Authorization headers are sent
            api.get(`/protocolo/arquivos/${file.id}/download`, { responseType: 'blob' })
                .then(res => {
                    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                    setPdfUrl(url);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Error loading PDF:', err);
                    setError('Não foi possível carregar o arquivo. Verifique sua conexão.');
                    setLoading(false);
                });
        }

        return () => {
            if (pdfUrl) {
                window.URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [isOpen, file]);

    if (!isOpen || !file) return null;

    return (
        <div className="bg-slate-900 border border-border rounded-2xl shadow-2xl w-full max-w-4xl h-[75vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-slate-800/50">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                        <ExternalLink size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-text-primary leading-tight">
                            Visualizar Documento
                        </h3>
                        <p className="text-xs text-text-secondary truncate max-w-[300px]">
                            {file.nome_original}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {pdfUrl && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => window.open(pdfUrl, '_blank')}
                            className="hidden md:flex text-text-secondary hover:text-text-primary"
                        >
                            <ExternalLink size={16} className="mr-2" />
                            Abrir em nova aba
                        </Button>
                    )}
                    <button 
                        onClick={onClose} 
                        className="text-text-secondary hover:text-red-400 p-2 hover:bg-red-500/10 rounded-full transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* PDF Viewer Content */}
            <div className="flex-1 bg-slate-950 relative flex items-center justify-center">
                {loading && (
                    <div className="flex flex-col items-center gap-3 text-blue-400">
                        <Loader2 size={40} className="animate-spin" />
                        <span className="text-sm font-medium">Carregando PDF...</span>
                    </div>
                )}
                
                {error && (
                    <div className="text-red-400 text-center p-6">
                        <p className="font-bold mb-2">Erro!</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {!loading && !error && pdfUrl && (
                    <iframe
                        src={`${pdfUrl}#toolbar=1`}
                        className="w-full h-full border-none"
                        title="PDF Viewer"
                    />
                )}
            </div>

            {/* Footer / Info */}
            <div className="px-6 py-3 bg-slate-800/30 border-t border-border flex items-center justify-between text-[11px] text-text-secondary">
                <div className="flex gap-4">
                    <span>ID: {file.id}</span>
                    <span>Status: <span className={file.status === 'sucesso' ? 'text-emerald-400' : 'text-amber-400'}>{file.status?.toUpperCase()}</span></span>
                </div>
                <div className="italic">
                    Use o painel do PDF para zoom e rotação.
                </div>
            </div>
        </div>
    );
}
