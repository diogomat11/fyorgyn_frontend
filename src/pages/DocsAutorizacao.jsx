import React, { useState, useEffect, useCallback } from 'react';
import { 
    FileText, Plus, DownloadCloud, Search, Eye, Edit2, CalendarDays, 
    Power, Trash2, CheckCircle2, AlertCircle, RefreshCw, X, Check
} from 'lucide-react';
import Button from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Pagination from '../components/Pagination';
import DocUploadModal from '../components/DocUploadModal';
import DocViewerModal from '../components/DocViewerModal';
import api from '../services/api';

function ActionButton({ icon: Icon, onClick, className, tooltip }) {
    return (
        <div className="relative group/tip flex items-center justify-center">
            <button
                type="button"
                onClick={onClick}
                className={`p-1.5 rounded-lg transition-all duration-150 ${className}`}
            >
                <Icon size={16} />
            </button>
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tip:flex flex-col items-center z-50">
                <span className="whitespace-nowrap rounded-md bg-slate-950 px-2.5 py-1 text-[11px] font-medium text-slate-100 shadow-2xl border border-slate-700">
                    {tooltip}
                </span>
                <span className="w-1.5 h-1.5 -mt-0.5 rotate-45 bg-slate-950 border-r border-b border-slate-700"></span>
            </div>
        </div>
    );
}

export default function DocsAutorizacao({ tipo, titulo }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [total, setTotal] = useState(0);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [statusFilter, setStatusFilter] = useState(''); // '' | 'true' | 'false'

    // Modals
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadModalMode, setUploadModalMode] = useState('create');
    const [selectedDoc, setSelectedDoc] = useState(null);

    const [showViewerModal, setShowViewerModal] = useState(false);
    const [viewingDoc, setViewingDoc] = useState(null);

    // Inline Date Update
    const [editingDateId, setEditingDateId] = useState(null);
    const [tempDate, setTempDate] = useState('');
    const [savingDate, setSavingDate] = useState(false);

    // Import State
    const [importing, setImporting] = useState(false);

    const isRM = tipo === 'RM';
    const baseUrl = isRM ? '/docs/rm' : '/docs/clinicos';

    const fetchDocs = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = {
                page,
                page_size: pageSize,
                search: searchQuery.trim() || undefined,
                data_inicio: dataInicio || undefined,
                data_fim: dataFim || undefined,
                is_active: statusFilter === '' ? undefined : statusFilter === 'true'
            };

            if (!isRM) {
                params.tipo_relatorio = tipo;
            }

            const res = await api.get(baseUrl, { params });
            setItems(res.data.items || []);
            setTotal(res.data.total || 0);
        } catch (err) {
            console.error('Erro ao listar documentos:', err);
            setError('Falha ao carregar documentos. Tente recarregar a página.');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, searchQuery, dataInicio, dataFim, statusFilter, isRM, baseUrl, tipo]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDocs();
        }, 250);
        return () => clearTimeout(timer);
    }, [fetchDocs]);

    // Handle Toggle Active
    const handleToggleActive = async (item) => {
        try {
            await api.patch(`${baseUrl}/${item.id}/toggle`);
            setItems(prev => prev.map(d => d.id === item.id ? { ...d, is_active: !d.is_active } : d));
            setSuccessMessage(`Documento ${item.is_active ? 'inativado' : 'ativado'} com sucesso.`);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Erro ao alternar status:', err);
            alert('Não foi possível alterar o status do documento.');
        }
    };

    // Handle Delete
    const handleDelete = async (item) => {
        const confirmMsg = `Deseja realmente excluir o documento de ${item.nome_paciente || 'paciente'}?`;
        if (!window.confirm(confirmMsg)) return;

        try {
            await api.delete(`${baseUrl}/${item.id}`);
            setSuccessMessage('Documento excluído com sucesso.');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchDocs();
        } catch (err) {
            console.error('Erro ao excluir documento:', err);
            alert('Não foi possível excluir o documento.');
        }
    };

    // Handle Inline Date Save (com disparo de Job para o Evoluir)
    const handleSaveDate = async (id) => {
        if (!tempDate) return;
        setSavingDate(true);
        try {
            const res = await api.patch(`${baseUrl}/${id}/data`, { [isRM ? 'data_relatorio' : 'data']: tempDate });
            setItems(prev => prev.map(d => {
                if (d.id === id) {
                    return isRM ? { ...d, data_relatorio: tempDate } : { ...d, data: tempDate };
                }
                return d;
            }));
            setEditingDateId(null);
            
            const msg = res.data.message || (res.data.job_enqueued 
                ? 'Data atualizada e job de sincronização enviado ao Evoluir!' 
                : 'Data atualizada com sucesso.');
            setSuccessMessage(msg);
            setTimeout(() => setSuccessMessage(''), 4000);
        } catch (err) {
            console.error('Erro ao atualizar data:', err);
            alert('Erro ao atualizar a data do documento.');
        } finally {
            setSavingDate(false);
        }
    };

    // Handle Import from Evoluir Portal (only for PTS and ANEXO-II)
    const handleImportFromPortal = async () => {
        if (!window.confirm('Deseja iniciar a importação de relatórios do portal Evoluir para todos os pacientes cadastrados?')) return;
        setImporting(true);
        try {
            const res = await api.post('/docs/clinicos/importar');
            alert(res.data.message || 'Importação enfileirada com sucesso nos servidores de agendamento.');
            fetchDocs();
        } catch (err) {
            console.error('Erro ao solicitar importação:', err);
            alert('Erro ao solicitar importação do portal.');
        } finally {
            setImporting(false);
        }
    };

    const handleOpenCreate = () => {
        setSelectedDoc(null);
        setUploadModalMode('create');
        setShowUploadModal(true);
    };

    const handleOpenEdit = (doc) => {
        setSelectedDoc(doc);
        setUploadModalMode('edit');
        setShowUploadModal(true);
    };

    const handleOpenViewer = (doc) => {
        setViewingDoc(doc);
        setShowViewerModal(true);
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setDataInicio('');
        setDataFim('');
        setStatusFilter('');
        setPage(1);
    };

    const formatDate = (d) => {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
                        <FileText className="text-primary" size={26} />
                        {titulo}
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Gestão e visualização de documentos para instrução de autorizações.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {!isRM && (
                        <Button
                            variant="secondary"
                            onClick={handleImportFromPortal}
                            isLoading={importing}
                            className="text-xs"
                        >
                            <DownloadCloud size={16} /> Importar do Portal
                        </Button>
                    )}
                    <Button variant="primary" onClick={handleOpenCreate} className="text-xs">
                        <Plus size={16} /> Novo Documento
                    </Button>
                </div>
            </div>

            {/* Notifications */}
            {successMessage && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-sm text-emerald-400">
                    <CheckCircle2 size={18} className="shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}
            {error && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-sm text-red-400">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Filters Card */}
            <Card className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                    {/* Search */}
                    <div className="lg:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Buscar Paciente / Profissional
                        </label>
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Nome do paciente, médico, terapeuta..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary"
                            />
                        </div>
                    </div>

                    {/* Data Início */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Data Início
                        </label>
                        <input
                            type="date"
                            value={dataInicio}
                            onChange={(e) => { setDataInicio(e.target.value); setPage(1); }}
                            className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-primary"
                        />
                    </div>

                    {/* Data Fim */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Data Fim
                        </label>
                        <input
                            type="date"
                            value={dataFim}
                            onChange={(e) => { setDataFim(e.target.value); setPage(1); }}
                            className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-primary"
                        />
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-primary"
                        >
                            <option value="">Todos</option>
                            <option value="true">Ativos</option>
                            <option value="false">Inativos</option>
                        </select>
                    </div>
                </div>

                {(searchQuery || dataInicio || dataFim || statusFilter) && (
                    <div className="mt-3 pt-3 border-t border-slate-800 flex justify-end">
                        <button
                            onClick={handleClearFilters}
                            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                        >
                            <X size={13} /> Limpar filtros
                        </button>
                    </div>
                )}
            </Card>

            {/* Data Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="px-4 py-3.5">Paciente</th>
                                <th className="px-4 py-3.5">Data Doc</th>
                                <th className="px-4 py-3.5">{isRM ? 'Médico / Especialidade' : 'Profissional'}</th>
                                {!isRM && <th className="px-4 py-3.5">Carga</th>}
                                <th className="px-4 py-3.5 text-center">Status</th>
                                <th className="px-4 py-3.5 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                            {loading ? (
                                <tr>
                                    <td colSpan={isRM ? 5 : 6} className="px-4 py-12 text-center text-slate-500">
                                        <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-primary" />
                                        Carregando documentos...
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={isRM ? 5 : 6} className="px-4 py-12 text-center text-slate-500">
                                        <FileText size={32} className="mx-auto mb-2 text-slate-600" />
                                        Nenhum documento encontrado para os filtros selecionados.
                                    </td>
                                </tr>
                            ) : (
                                items.map((doc) => {
                                    const docDate = doc.data || doc.data_relatorio;
                                    const isEditingThisDate = editingDateId === doc.id;

                                    return (
                                        <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                                            {/* Paciente */}
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-100">
                                                    {doc.nome_paciente || 'Paciente Não Identificado'}
                                                </div>
                                                {doc.id_paciente && (
                                                    <div className="text-[10px] text-slate-500 font-mono truncate max-w-xs">
                                                        ID: {doc.id_paciente}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Data (com edição rápida inline) */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {isEditingThisDate ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="date"
                                                            value={tempDate}
                                                            onChange={(e) => setTempDate(e.target.value)}
                                                            className="px-2 py-1 text-xs bg-slate-900 border border-primary rounded text-slate-200 focus:outline-none"
                                                        />
                                                        <button
                                                            onClick={() => handleSaveDate(doc.id)}
                                                            disabled={savingDate}
                                                            className="p-1 rounded bg-primary/20 text-primary hover:bg-primary/30"
                                                            title="Salvar Data"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingDateId(null)}
                                                            className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200"
                                                            title="Cancelar"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-slate-200">
                                                            {formatDate(docDate)}
                                                        </span>
                                                        <div className="relative group/tip flex items-center">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingDateId(doc.id);
                                                                    setTempDate(docDate || new Date().toISOString().split('T')[0]);
                                                                }}
                                                                className="text-slate-500 hover:text-primary transition-colors p-0.5 rounded"
                                                            >
                                                                <CalendarDays size={13} />
                                                            </button>
                                                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tip:flex flex-col items-center z-50">
                                                                <span className="whitespace-nowrap rounded-md bg-slate-950 px-2 py-0.5 text-[10px] font-medium text-slate-100 shadow-xl border border-slate-700">
                                                                    Alterar Data (Sincroniza com Evoluir)
                                                                </span>
                                                                <span className="w-1 h-1 -mt-0.5 rotate-45 bg-slate-950 border-r border-b border-slate-700"></span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Profissional / Médico */}
                                            <td className="px-4 py-3">
                                                {isRM ? (
                                                    <div>
                                                        <div className="font-medium text-slate-200">
                                                            {doc.nome_medico || '-'}
                                                        </div>
                                                        {doc.especialidade && (
                                                            <div className="text-[10px] text-slate-400">
                                                                {doc.especialidade}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="font-medium text-slate-200">
                                                        {doc.nome_profissional || '-'}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Carga (se PTS / Anexo II) */}
                                            {!isRM && (
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {doc.carga ? (
                                                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                                                            {doc.carga} ({doc.tipo_carga_horaria || 'semanal'})
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-600">-</span>
                                                    )}
                                                </td>
                                            )}

                                            {/* Status */}
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <Badge variant={doc.is_active ? 'success' : 'secondary'}>
                                                    {doc.is_active ? 'Ativo' : 'Inativo'}
                                                </Badge>
                                            </td>

                                            {/* Botões de Ação com Tooltip Instantâneo */}
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    {/* Visualizar */}
                                                    <ActionButton
                                                        icon={Eye}
                                                        onClick={() => handleOpenViewer(doc)}
                                                        className="text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                                                        tooltip="Visualizar documento em tela cheia (PDF)"
                                                    />

                                                    {/* Editar */}
                                                    <ActionButton
                                                        icon={Edit2}
                                                        onClick={() => handleOpenEdit(doc)}
                                                        className="text-slate-400 hover:text-amber-400 hover:bg-slate-800"
                                                        tooltip="Editar informações do documento"
                                                    />

                                                    {/* Ativar / Inativar */}
                                                    <ActionButton
                                                        icon={Power}
                                                        onClick={() => handleToggleActive(doc)}
                                                        className={
                                                            doc.is_active 
                                                                ? 'text-emerald-400 hover:text-red-400 hover:bg-red-500/10' 
                                                                : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                                                        }
                                                        tooltip={doc.is_active ? 'Inativar documento' : 'Ativar documento'}
                                                    />

                                                    {/* Excluir */}
                                                    <ActionButton
                                                        icon={Trash2}
                                                        onClick={() => handleDelete(doc)}
                                                        className="text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                                                        tooltip="Excluir documento permanentemente"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > 0 && (
                    <div className="p-4 border-t border-slate-800 bg-slate-950/20">
                        <Pagination
                            currentPage={page}
                            totalItems={total}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
                        />
                    </div>
                )}
            </Card>

            {/* Modais */}
            <DocUploadModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onSuccess={fetchDocs}
                tipo={tipo}
                docToEdit={selectedDoc}
                modalMode={uploadModalMode}
            />

            <DocViewerModal
                isOpen={showViewerModal}
                onClose={() => setShowViewerModal(false)}
                doc={viewingDoc}
                titulo={titulo}
            />
        </div>
    );
}
