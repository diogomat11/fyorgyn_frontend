import React, { useEffect, useState } from 'react';
import { RefreshCcw, Download, Settings, ChevronRight, XOctagon } from 'lucide-react';

// Design System
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

// Feature Components
import UploadZone from '../components/UploadZone';
import ProtocoloDashboard from '../components/ProtocoloDashboard';
import ProtocoloResultsTable from '../components/ProtocoloResultsTable';

// Hooks
import useProtocoloLote from '../hooks/useProtocoloLote';

// API
import protocoloApi from '../services/protocolo';

export default function ProtocoloFichas() {
    const {
        activeLoteId,
        loteStatus,
        lotes,
        stats,
        uploading,
        error,
        uploadFiles,
        selectLote,
        fetchLotes,
        fetchStats,
        reprocessErrors,
        cancelLote,
        downloadFile,
        downloadZip,
        updateFileName,
        updateAtendimentos,
        deleteFile,
        clearLote,
        setActiveLoteId,
    } = useProtocoloLote();

    const [config, setConfig] = useState(null);
    const [showConfig, setShowConfig] = useState(false);
    const [activeTab, setActiveTab] = useState('importacao'); // 'importacao' | 'lotes'
    const [showHistory, setShowHistory] = useState(false);

    // Fetch lotes on mount
    useEffect(() => {
        fetchLotes();
        fetchStats();
    }, [fetchLotes, fetchStats]);

    // Fetch config
    useEffect(() => {
        protocoloApi.getConfig()
            .then(res => setConfig(res.data))
            .catch(() => setConfig({ status: 'error', total_keys: 0, models: [] }));
    }, []);

    const handleUpload = async (files) => {
        try {
            await uploadFiles(files);
            setActiveTab('importacao');
        } catch {
            // Error already set in hook
        }
    };

    const handleReprocess = async () => {
        if (!window.confirm('Deseja reprocessar todos os arquivos com erro?')) return;
        await reprocessErrors();
    };

    const handleCancel = async () => {
        if (!window.confirm('Deseja cancelar o processamento em andamento? O lote será abortado.')) return;
        await cancelLote();
    };

    const handleDownloadZip = async (loteIdToDownload = activeLoteId) => {
        if (!loteIdToDownload) return;
        
        if (loteIdToDownload !== activeLoteId) {
            await selectLote(loteIdToDownload);
        }
        const totalParts = await downloadZip(1);
        // If multiple parts, download the rest
        if (totalParts && totalParts > 1) {
            for (let i = 2; i <= totalParts; i++) {
                await downloadZip(i);
            }
        }
    };

    const getStatusLabel = (lote) => {
        if (!lote) return null;
        switch (lote.status) {
            case 'pending': return <Badge variant="warning">Pendente</Badge>;
            case 'processing': return <Badge variant="info">Processando</Badge>;
            case 'error': return <Badge variant="error">Erro</Badge>;
            case 'cancelled': return <Badge variant="error">Cancelado</Badge>;
            case 'completed':
                if (lote.total_arquivos > 0 && lote.total_erro === lote.total_arquivos) {
                    return <Badge variant="error">Falha</Badge>;
                }
                if (lote.total_erro > 0) {
                    return <Badge variant="warning">Parcial</Badge>;
                }
                return <Badge variant="success">Completo</Badge>;
            default: return <Badge>{lote.status}</Badge>;
        }
    };

    const hasErrors = loteStatus && loteStatus.total_erro > 0;
    const hasSuccess = loteStatus && loteStatus.total_sucesso > 0;
    const isProcessing = loteStatus && ['pending', 'processing'].includes(loteStatus.status);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Protocolo — Fichas</h1>
                    <span className="text-text-secondary text-sm">
                        Extração inteligente de guias médicas via Gemini AI
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowConfig(!showConfig)}
                        className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                        <Settings size={16} />
                        <span className="hidden md:inline">
                            {config?.total_keys || 0} chave(s)
                        </span>
                        <span className={`w-2 h-2 rounded-full ${config?.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </button>
                </div>
            </div>

            {/* Config panel */}
            {showConfig && config && (
                <Card className="border-blue-500/30">
                    <div className="flex items-center gap-4 text-sm">
                        <div>
                            <span className="text-text-secondary">Status: </span>
                            <span className={config.status === 'ok' ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                                {config.status}
                            </span>
                        </div>
                        <div>
                            <span className="text-text-secondary">Chaves API: </span>
                            <span className="text-text-primary font-medium">{config.total_keys}</span>
                        </div>
                        <div>
                            <span className="text-text-secondary">Modelos: </span>
                            <span className="text-text-primary font-mono text-xs">
                                {config.models?.join(' → ') || 'N/A'}
                            </span>
                        </div>
                    </div>
                </Card>
            )}

            {/* Error banner */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                    ⚠ {error}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-4 border-b border-border">
                <button
                    className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'importacao'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-text-secondary hover:text-text-primary'
                    }`}
                    onClick={() => setActiveTab('importacao')}
                >
                    Processamento Atual
                </button>
                <button
                    className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'lotes'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-text-secondary hover:text-text-primary'
                    }`}
                    onClick={() => { setActiveTab('lotes'); fetchLotes(); setShowHistory(true); }}
                >
                    Histórico de Sessões
                </button>
            </div>

            {/* TAB 1: Importação */}
            {activeTab === 'importacao' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {activeLoteId && (
                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                onClick={clearLote}
                                className="bg-blue-600 hover:bg-blue-500"
                            >
                                <RefreshCcw size={14} className="mr-2" />
                                Nova Importação
                            </Button>
                        </div>
                    )}

                    {/* Dashboard metrics */}
                    <ProtocoloDashboard loteStatus={loteStatus} stats={stats} />

                    {/* Upload Zone */}
                    {!activeLoteId && (
                        <UploadZone
                            onFilesSelected={handleUpload}
                            disabled={uploading}
                            maxFiles={100}
                        />
                    )}

                    {/* Active lote processing indicator */}
                    {isProcessing && (
                        <Card className="border-blue-500/30 bg-blue-500/5">
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                <div>
                                    <span className="text-text-primary font-medium">Processando Sessão #{activeLoteId}</span>
                                    <span className="text-text-secondary text-sm ml-2">
                                        {loteStatus.total_processado}/{loteStatus.total_arquivos} arquivos
                                    </span>
                                </div>
                                <div className="flex-1 max-w-xs">
                                    <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-blue-500 h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${loteStatus.total_arquivos > 0
                                                    ? (loteStatus.total_processado / loteStatus.total_arquivos) * 100
                                                    : 0}%`
                                            }}
                                        />
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" onClick={handleCancel} className="text-red-400 hover:text-red-300 ml-auto">
                                    <XOctagon size={14} className="mr-1.5" /> Cancelar
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Results Table */}
                    {loteStatus && loteStatus.arquivos && loteStatus.arquivos.length > 0 && (
                        <Card noPadding>
                            <div className="p-4 border-b border-border flex items-center justify-between bg-surface/30">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold text-text-primary">
                                        Resultados — Sessão #{activeLoteId}
                                    </h3>
                                    {getStatusLabel(loteStatus)}
                                </div>
                                <div className="flex items-center gap-2">
                                    {hasErrors && !isProcessing && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleReprocess}
                                            className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                                        >
                                            <RefreshCcw size={14} className="mr-1.5" />
                                            Reprocessar Erros
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={clearLote}
                                        className="text-slate-400 hover:text-slate-200"
                                    >
                                        Limpar Tela
                                    </Button>
                                </div>
                            </div>

                            {activeLoteId && loteStatus && (
                                <ProtocoloResultsTable
                                    loteId={activeLoteId}
                                    arquivos={loteStatus.arquivos || []}
                                    onUpdateFileName={updateFileName}
                                    onUpdateAtendimentos={updateAtendimentos}
                                    onDeleteFile={deleteFile}
                                    downloadFile={downloadFile}
                                />
                            )}

                            {/* Collapsible History Section */}
                            <div className="pt-8 border-t border-border/50">
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm font-medium mb-4"
                                >
                                    <ChevronRight size={18} className={`transition-transform duration-200 ${showHistory ? 'rotate-90' : ''}`} />
                                    Sessões Anteriores ({lotes.length})
                                </button>

                                {showHistory && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Card noPadding className="bg-slate-900/50">
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead className="bg-slate-950/50 text-text-secondary text-xs uppercase">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left">ID</th>
                                                            <th className="px-6 py-3 text-left">Data</th>
                                                            <th className="px-6 py-3 text-left">Arquivos</th>
                                                            <th className="px-6 py-3 text-left">Status</th>
                                                            <th className="px-6 py-3 text-left">Ações</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border">
                                                        {lotes.slice(0, 10).map(lote => (
                                                            <tr key={lote.id} className="hover:bg-slate-800/30 transition-colors">
                                                                <td className="px-6 py-4 text-sm text-text-primary">#{lote.id}</td>
                                                                <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
                                                                    {new Date(lote.created_at).toLocaleString('pt-BR')}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-text-secondary">
                                                                    {lote.total_arquivos}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm">
                                                                    <Badge variant={lote.status === 'completed' ? 'success' : 'warning'}>
                                                                        {lote.status === 'completed' ? 'Finalizado' : lote.status}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => { selectLote(lote.id); setShowHistory(false); }}
                                                                        className="text-blue-400 hover:text-blue-300"
                                                                    >
                                                                        Visualizar
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* TAB 2: Gerar Lotes */}
            {activeTab === 'lotes' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Card>
                        <h3 className="text-lg font-semibold text-text-primary mb-4 border-b border-border pb-2">
                            Lotes Concluídos / Histórico
                        </h3>
                        {lotes.length === 0 ? (
                            <p className="text-text-secondary text-sm">Nenhuma sessão encontrada.</p>
                        ) : (
                            <div className="space-y-3">
                                {lotes.map(lote => {
                                    const isComplete = lote.status === 'completed' || lote.status === 'cancelled';
                                    const temSucesso = lote.total_sucesso > 0;
                                    
                                    return (
                                        <div
                                            key={lote.id}
                                            className="w-full flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-border hover:border-blue-500/30 transition-all"
                                        >
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-text-primary font-bold text-md">
                                                        SESSÃO #{String(lote.id).padStart(3, '0')}
                                                    </span>
                                                    {getStatusLabel(lote)}
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-text-secondary">
                                                    <span>{lote.total_arquivos} arquivo(s) enviados</span>
                                                    <span className="text-emerald-400 font-medium">{lote.total_sucesso} Extraídos ✓</span>
                                                    {lote.total_erro > 0 && (
                                                        <span className="text-red-400">{lote.total_erro} Erros ✗</span>
                                                    )}
                                                    <span>
                                                        {lote.created_at ? new Date(lote.created_at).toLocaleString('pt-BR') : '—'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => { selectLote(lote.id); setActiveTab('importacao'); }}
                                                >
                                                    Ver Detalhes
                                                </Button>
                                                {isComplete && temSucesso && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleDownloadZip(lote.id)}
                                                        className="bg-emerald-600 hover:bg-emerald-500"
                                                    >
                                                        <Download size={14} className="mr-1.5" />
                                                        Baixar ZIP do Lote
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}
