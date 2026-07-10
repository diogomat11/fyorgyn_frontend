import React, { useEffect, useState } from 'react';
import { RefreshCcw, Download, Settings, ChevronRight, XOctagon, Database, Loader } from 'lucide-react';

// Design System
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

// Feature Components
import UploadZone from '../components/UploadZone';
import ProtocoloDashboard from '../components/ProtocoloDashboard';
import ProtocoloResultsTable from '../components/ProtocoloResultsTable';
import ProtocoloItensTab from '../components/ProtocoloItensTab';

// Hooks
import useProtocoloLote from '../hooks/useProtocoloLote';

// API
import protocoloApi from '../services/protocolo';

// Global state to track zip downloading across unmounts/tab switches
let globalDownloadingZipId = null;
let globalDownloadingZipListeners = [];

const setGlobalDownloadingZipId = (id) => {
    globalDownloadingZipId = id;
    if (id) {
        localStorage.setItem('downloadingZipId', String(id));
    } else {
        localStorage.removeItem('downloadingZipId');
    }
    globalDownloadingZipListeners.forEach(listener => listener(id));
};

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
        gravarArquivo,
        gravarLote,
        clearLote,
        setActiveLoteId,
    } = useProtocoloLote();

    const [config, setConfig] = useState(null);
    const [showConfig, setShowConfig] = useState(false);
    const [activeTab, setActiveTab] = useState('importacao'); // 'importacao' | 'lotes'
    const [showHistory, setShowHistory] = useState(false);
    const [convenio, setConvenio] = useState('unimed_goiania');
    const [downloadingZipId, setDownloadingZipId] = useState(() => {
        const saved = localStorage.getItem('downloadingZipId');
        return saved ? parseInt(saved) : globalDownloadingZipId;
    });

    useEffect(() => {
        const listener = (id) => {
            setDownloadingZipId(id);
        };
        globalDownloadingZipListeners.push(listener);
        return () => {
            globalDownloadingZipListeners = globalDownloadingZipListeners.filter(l => l !== listener);
        };
    }, []);

    // Local filters for processing results list
    const [filtroPaciente, setFiltroPaciente] = useState('');
    const [filtroGuia, setFiltroGuia] = useState('');
    const [filtroAssinatura, setFiltroAssinatura] = useState('');

    const handleClear = () => {
        clearLote();
        setFiltroPaciente('');
        setFiltroGuia('');
        setFiltroAssinatura('');
    };

    const handleSelectLote = async (loteId) => {
        // Reset filters when switching sessions to prevent stale criteria
        setFiltroPaciente('');
        setFiltroGuia('');
        setFiltroAssinatura('');

        await selectLote(loteId);
        const lote = lotes.find(l => l.id === loteId);
        if (lote && lote.convenio) {
            setConvenio(lote.convenio);
        }
    };

    const filteredLotes = lotes.filter(l => l.convenio === convenio);

    // Sync convenio state with the active loteStatus convenio to prevent UI desync
    useEffect(() => {
        if (loteStatus && loteStatus.convenio) {
            setConvenio(loteStatus.convenio);
        }
    }, [loteStatus]);

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
            await uploadFiles(files, convenio);
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
        
        setGlobalDownloadingZipId(loteIdToDownload);
        try {
            if (loteIdToDownload !== activeLoteId) {
                await handleSelectLote(loteIdToDownload);
            }
            const totalParts = await downloadZip(loteIdToDownload, 1);
            // If multiple parts, download the rest
            if (totalParts && totalParts > 1) {
                for (let i = 2; i <= totalParts; i++) {
                    await downloadZip(loteIdToDownload, i);
                }
            }
        } catch (err) {
            console.error("Erro ao baixar zip:", err);
        } finally {
            setGlobalDownloadingZipId(null);
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Protocolo SADT</h1>
                    <span className="text-text-secondary text-sm">
                        Extração inteligente de guias médicas via Gemini AI
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    {/* Select de Convênio Global */}
                    <div className="flex items-center gap-2 bg-slate-800/60 border border-border rounded-lg px-3 py-1.5">
                        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Convênio:</span>
                        <select
                            value={convenio}
                            onChange={(e) => setConvenio(e.target.value)}
                            className="bg-transparent border-none text-text-primary text-sm font-medium focus:outline-none cursor-pointer"
                        >
                            <option value="unimed_goiania" className="bg-slate-900">Unimed Goiânia</option>
                            <option value="ipasgo" className="bg-slate-900">IPASGO</option>
                        </select>
                    </div>

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
                <button
                    className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'itens'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-text-secondary hover:text-text-primary'
                    }`}
                    onClick={() => setActiveTab('itens')}
                >
                    Itens Protocolados (Sessões)
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
                        <div className="space-y-4">
                            <UploadZone
                                onFilesSelected={handleUpload}
                                disabled={uploading}
                                maxFiles={100}
                            />
                        </div>
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
                                    {hasSuccess && !isProcessing && (<>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                if (!loteStatus || !loteStatus.arquivos) return;

                                                // 1. Se possuir itens pendentes de revisão, não permite gravar
                                                const temRevisao = loteStatus.arquivos.some(arq => arq.status === 'revisao');
                                                if (temRevisao) {
                                                    alert("Não é possível gravar. Existem itens com dados pendentes de revisão. Corrija as datas destacadas em amarelo antes de prosseguir.");
                                                    return;
                                                }

                                                // 2. Se houver itens pendentes de assinatura
                                                const successfulFiles = loteStatus.arquivos.filter(arq => arq.status === 'sucesso');
                                                const temPendentesAssinatura = successfulFiles.some(
                                                    arq => arq.atendimentos && arq.atendimentos.some(a => a.assinatura === 'Não')
                                                );

                                                if (temPendentesAssinatura) {
                                                    const querRevisao = window.confirm("Existem itens pendentes de assinatura. Deseja realizar a revisão das assinaturas?");
                                                    if (querRevisao) {
                                                        // Se sim: interrompe a gravação para que o usuário revise
                                                        return;
                                                    } else {
                                                        // Se não: pergunta se deseja ignorar pendentes ou gravar todos
                                                        const ignorarPendentes = window.confirm("Deseja ignorar os itens pendentes de assinatura e gravar apenas os que estão assinados?\n\n- Clique em OK (Sim) para ignorar pendentes e gravar apenas os assinados.\n- Clique em Cancelar (Não) para gravar todos os itens (inclusive os não assinados).");
                                                        if (ignorarPendentes) {
                                                            gravarLote(activeLoteId, true);
                                                        } else {
                                                            gravarLote(activeLoteId, false);
                                                        }
                                                    }
                                                } else {
                                                    if (window.confirm("Deseja gravar todos os atendimentos extraídos com sucesso na aba de itens protocolados?")) {
                                                        gravarLote(activeLoteId, false);
                                                    }
                                                }
                                            }}
                                            className="bg-emerald-600 hover:bg-emerald-500"
                                            title="Gravar atendimentos extraídos na base de itens protocolados"
                                            disabled={downloadingZipId !== null}
                                        >
                                            <Database size={14} className="mr-1.5" />
                                            Gravar Todos os Itens
                                        </Button>

                                        <Button
                                            size="sm"
                                            onClick={() => handleDownloadZip(activeLoteId)}
                                            className="bg-emerald-700 hover:bg-emerald-600 text-white"
                                            disabled={downloadingZipId !== null}
                                            title="Baixar arquivo ZIP com todos os PDFs extraídos com sucesso na sessão"
                                        >
                                            {downloadingZipId === activeLoteId ? (
                                                <>
                                                    <Loader size={14} className="mr-1.5 animate-spin" />
                                                    Gerando ZIP...
                                                </>
                                            ) : (
                                                <>
                                                    <Download size={14} className="mr-1.5" />
                                                    Baixar ZIP do Lote
                                                </>
                                            )}
                                        </Button>

                                        {downloadingZipId === activeLoteId && (
                                            <span className="flex items-center gap-1.5 text-xs text-emerald-400 animate-pulse font-medium ml-2">
                                                <Loader size={12} className="animate-spin text-emerald-500" />
                                                Gerando ZIP (aguarde)...
                                            </span>
                                        )}
                                    </>
                                )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleClear}
                                        className="text-slate-400 hover:text-slate-200"
                                        title="Limpar todos os dados da tela"
                                    >
                                        Limpar Tela
                                    </Button>
                                </div>
                            </div>

                            {/* Local Filters Bar for Active Session */}
                            <div className="p-4 border-b border-border bg-slate-900/10 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-text-secondary font-semibold uppercase">Filtrar Paciente</label>
                                    <input
                                        type="text"
                                        placeholder="Pesquisar por nome do paciente..."
                                        value={filtroPaciente}
                                        onChange={(e) => setFiltroPaciente(e.target.value)}
                                        className="bg-slate-800 border border-border text-text-primary text-xs px-2.5 py-1.5 rounded-lg w-full focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-text-secondary font-semibold uppercase">Filtrar Guia</label>
                                    <input
                                        type="text"
                                        placeholder="Pesquisar por número de guia ou senha..."
                                        value={filtroGuia}
                                        onChange={(e) => setFiltroGuia(e.target.value)}
                                        className="bg-slate-800 border border-border text-text-primary text-xs px-2.5 py-1.5 rounded-lg w-full focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-text-secondary font-semibold uppercase">Filtro Status Assinatura</label>
                                    <select
                                        value={filtroAssinatura}
                                        onChange={(e) => setFiltroAssinatura(e.target.value)}
                                        className="bg-slate-800 border border-border text-text-primary text-xs px-2.5 py-1.5 rounded-lg w-full focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="">Todos os status</option>
                                        <option value="assinados">Assinados (Totalmente Assinadas)</option>
                                        <option value="pendentes">Pendentes (Pendente Assinatura)</option>
                                    </select>
                                </div>
                            </div>

                            {activeLoteId && loteStatus && (() => {
                                const filteredArquivos = (loteStatus.arquivos || []).filter(arq => {
                                    if (filtroPaciente.trim()) {
                                        const nome = arq.nome_beneficiario || '';
                                        if (!nome.toLowerCase().includes(filtroPaciente.toLowerCase().trim())) {
                                            return false;
                                        }
                                    }
                                    if (filtroGuia.trim()) {
                                        const gNormalizada = arq.guia_normalizada || '';
                                        const gPrestador = arq.numero_guia_prestador || '';
                                        const gPrincipal = arq.numero_guia_principal || '';
                                        const query = filtroGuia.toLowerCase().trim();
                                        if (
                                            !gNormalizada.toLowerCase().includes(query) &&
                                            !gPrestador.toLowerCase().includes(query) &&
                                            !gPrincipal.toLowerCase().includes(query)
                                        ) {
                                            return false;
                                        }
                                    }
                                    if (filtroAssinatura === 'assinados') {
                                        if (!arq.atendimentos || arq.atendimentos.length === 0) return false;
                                        if (arq.atendimentos.some(a => a.assinatura !== 'Sim')) return false;
                                    } else if (filtroAssinatura === 'pendentes') {
                                        if (!arq.atendimentos || arq.atendimentos.length === 0) return false;
                                        if (!arq.atendimentos.some(a => a.assinatura === 'Não')) return false;
                                    }
                                    return true;
                                });

                                return (
                                    <ProtocoloResultsTable
                                        loteId={activeLoteId}
                                        arquivos={filteredArquivos}
                                        onUpdateFileName={updateFileName}
                                        onUpdateAtendimentos={updateAtendimentos}
                                        onDeleteFile={deleteFile}
                                        onDownloadFile={downloadFile}
                                        onGravarArquivo={gravarArquivo}
                                    />
                                );
                            })()}

                            {/* Collapsible History Section */}
                            <div className="pt-8 border-t border-border/50">
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm font-medium mb-4"
                                >
                                    <ChevronRight size={18} className={`transition-transform duration-200 ${showHistory ? 'rotate-90' : ''}`} />
                                    Sessões Anteriores ({filteredLotes.length})
                                </button>

                                {showHistory && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Card noPadding className="bg-slate-900/50">
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead className="bg-slate-950/50 text-text-secondary text-xs uppercase">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left">ID</th>
                                                            <th className="px-6 py-3 text-left">Convênio</th>
                                                            <th className="px-6 py-3 text-left">Data</th>
                                                            <th className="px-6 py-3 text-left">Arquivos</th>
                                                            <th className="px-6 py-3 text-left">Status</th>
                                                            <th className="px-6 py-3 text-left">Ações</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border">
                                                        {filteredLotes.slice(0, 10).map(lote => (
                                                            <tr key={lote.id} className="hover:bg-slate-800/30 transition-colors">
                                                                <td className="px-6 py-4 text-sm text-text-primary">#{lote.id}</td>
                                                                <td className="px-6 py-4 text-sm text-text-primary">
                                                                    <Badge variant="info">
                                                                        {lote.convenio === 'ipasgo' ? 'IPASGO' : 'Unimed Goiânia'}
                                                                    </Badge>
                                                                </td>
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
                                                                        onClick={() => { handleSelectLote(lote.id); setShowHistory(false); }}
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
                        {filteredLotes.length === 0 ? (
                            <p className="text-text-secondary text-sm">Nenhuma sessão encontrada para este convênio.</p>
                        ) : (
                            <div className="space-y-3">
                                {filteredLotes.map(lote => {
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
                                                    <Badge variant="info">
                                                        {lote.convenio === 'ipasgo' ? 'IPASGO' : 'Unimed Goiânia'}
                                                    </Badge>
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
                                                {downloadingZipId === lote.id && (
                                                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 animate-pulse font-medium mr-2">
                                                        <Loader size={12} className="animate-spin text-emerald-500" />
                                                        Gerando ZIP (aguarde)...
                                                    </span>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => { handleSelectLote(lote.id); setActiveTab('importacao'); }}
                                                    disabled={downloadingZipId !== null}
                                                >
                                                    Ver Detalhes
                                                </Button>
                                                {isComplete && temSucesso && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleDownloadZip(lote.id)}
                                                        className="bg-emerald-600 hover:bg-emerald-500"
                                                        disabled={downloadingZipId !== null}
                                                        title="Baixar arquivo ZIP com todos os PDFs da sessão"
                                                    >
                                                        {downloadingZipId === lote.id ? (
                                                            <>
                                                                <Loader size={14} className="mr-1.5 animate-spin" />
                                                                Gerando...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Download size={14} className="mr-1.5" />
                                                                Baixar ZIP do Lote
                                                            </>
                                                        )}
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

            {/* TAB 3: Protocolo Itens */}
            {activeTab === 'itens' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <ProtocoloItensTab convenioGlobal={convenio} />
                </div>
            )}
        </div>
    );
}
