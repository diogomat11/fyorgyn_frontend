import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Plus, Search, Trash2, Edit3, Loader2, Sparkles, FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import relatoriosRmApi from '../services/relatoriosRm';
import api from '../services/api';
import SearchableSelect from '../components/SearchableSelect';
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AREAS_PADRAO = [
    { key: 'carga_psicologia', label: 'Psicologia', short: 'PSI' },
    { key: 'carga_fisioterapia', label: 'Fisioterapia', short: 'FISIO' },
    { key: 'carga_terapia_ocupacional', label: 'Terapia Ocupacional', short: 'TO' },
    { key: 'carga_psicopedagogia', label: 'Psicopedagogia', short: 'PED' },
    { key: 'carga_fonoaudiologia', label: 'Fonoaudiologia', short: 'FONO' },
    { key: 'carga_psicomotricidade', label: 'Psicomotricidade', short: 'MOTRIC' },
    { key: 'carga_musicoterapia', label: 'Musicoterapia', short: 'MUSICO' },
    { key: 'carga_avaliacao_neuropsicologica', label: 'Avaliação Neuropsicológica', short: 'AVAL. NEURO' },
    { key: 'carga_nutricao', label: 'Nutrição', short: 'NUTRI' },
];

const STATUS_CONFIG = {
    TOTAL: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Extraído com Sucesso' },
    PARCIAL: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Parcialmente Extraído' },
    NAO_EXTRAIDO: { icon: XCircle, color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Não Extraído' },
    NAO_PROCESSADO: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Na Fila', animate: false },
    EM_PROCESSAMENTO: { icon: Loader2, color: 'text-indigo-400', bg: 'bg-indigo-500/10', label: 'Processando...', animate: true },
    ERRO: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Erro' },
};

// ---------------------------------------------------------------------------
// Status Badge Component
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.NAO_EXTRAIDO;
    const Icon = config.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`} title={config.label}>
            <Icon size={14} className={config.animate ? "animate-spin" : ""} />
            {config.label}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Modal Component
// ---------------------------------------------------------------------------

function ExtractionModal({ isOpen, onClose, onSave, editData, isExtracting, carteirinhas }) {
    const [form, setForm] = useState({
        id_paciente: '',
        nome_paciente: '',
        url_arquivo: '',
        id_relatorio: '',
        tipo_carga_horaria: 'semanal',
        ...Object.fromEntries(AREAS_PADRAO.map(a => [a.key, ''])),
    });
    const [extracting, setExtracting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (editData) {
            setForm({
                id_paciente: editData.id_paciente || '',
                nome_paciente: editData.nome_paciente || '',
                url_arquivo: editData.url_arquivo || '',
                id_relatorio: editData.id_relatorio || '',
                tipo_carga_horaria: editData.tipo_carga_horaria || 'semanal',
                ...Object.fromEntries(AREAS_PADRAO.map(a => [a.key, editData[a.key] ?? ''])),
            });
        } else {
            setForm({
                id_paciente: '',
                nome_paciente: '',
                url_arquivo: '',
                id_relatorio: '',
                tipo_carga_horaria: 'semanal',
                ...Object.fromEntries(AREAS_PADRAO.map(a => [a.key, ''])),
            });
        }
        setError('');
    }, [editData, isOpen]);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const canExtract = form.id_paciente && form.url_arquivo && !editData;

    const handleExtract = async () => {
        if (!canExtract) return;
        setExtracting(true);
        setError('');
        try {
            await relatoriosRmApi.extrair({
                id_paciente: form.id_paciente,
                url_arquivo: form.url_arquivo,
                nome_paciente: form.nome_paciente || null,
                id_relatorio: form.id_relatorio || null,
            });
            onSave(); // Refresh list
            onClose(); // Close the modal since extraction is now backgrounded
        } catch (err) {
            setError(err.response?.data?.detail || 'Erro ao agendar extração');
        } finally {
            setExtracting(false);
        }
    };

    const handleSave = async () => {
        if (!editData) return; // Save only works for editing
        setSaving(true);
        setError('');
        try {
            const updates = {
                tipo_carga_horaria: form.tipo_carga_horaria,
                nome_paciente: form.nome_paciente,
                id_paciente: form.id_paciente,
                ...Object.fromEntries(
                    AREAS_PADRAO.map(a => [a.key, form[a.key] !== '' ? parseInt(form[a.key]) || 0 : null])
                ),
            };
            await relatoriosRmApi.atualizar(editData.id, updates);
            onSave();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || 'Erro ao salvar');
        } finally {
            setSaving(false);
        }
    };

    const patientOptions = React.useMemo(() => {
        return carteirinhas.map(c => ({
            value: c.id_paciente,
            label: c.paciente || `Sem Nome (ID: ${c.id_paciente})`
        }));
    }, [carteirinhas]);

    const handlePatientSelect = (val) => {
        const selected = carteirinhas.find(c => c.id_paciente === val);
        setForm(prev => ({
            ...prev,
            id_paciente: val,
            nome_paciente: selected ? selected.paciente : ''
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <FileText size={22} className="text-primary" />
                        {editData ? 'Editar Extração' : 'Nova Extração de Terapias'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-2xl leading-none">&times;</button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Paciente + URL */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-1">Paciente *</label>
                            <SearchableSelect
                                options={patientOptions}
                                value={form.id_paciente}
                                onChange={handlePatientSelect}
                                placeholder="Buscar paciente por nome ou ID..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">URL do Relatório Médico *</label>
                        <input
                            type="url"
                            value={form.url_arquivo}
                            onChange={e => handleChange('url_arquivo', e.target.value)}
                            disabled={!!editData}
                            className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50"
                            placeholder="https://..."
                        />
                    </div>

                    {/* Extract Button */}
                    {!editData && (
                        <button
                            onClick={handleExtract}
                            disabled={!canExtract || extracting}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-lg"
                        >
                            {extracting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Extraindo dados com IA...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    Extrair Dados
                                </>
                            )}
                        </button>
                    )}

                    {/* Tipo Carga */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Tipo Carga Horária</label>
                        <select
                            value={form.tipo_carga_horaria}
                            onChange={e => handleChange('tipo_carga_horaria', e.target.value)}
                            className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        >
                            <option value="semanal">Semanal</option>
                            <option value="mensal">Mensal</option>
                        </select>
                    </div>

                    {/* Areas Grid */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-3">Cargas Terapêuticas (horas)</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {AREAS_PADRAO.map(area => (
                                <div key={area.key} className="bg-slate-900/40 rounded-xl p-3 border border-slate-700/50">
                                    <label className="block text-xs font-medium text-slate-400 mb-1.5 truncate" title={area.label}>
                                        {area.label}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form[area.key]}
                                        onChange={e => handleChange(area.key, e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-slate-100 text-center text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                        placeholder="0"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Itens Ignorados */}
                    {editData && editData.itens_ignorados && editData.itens_ignorados.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle size={16} className="text-amber-400" />
                                <label className="block text-sm font-medium text-amber-400">
                                    Itens Ignorados pela IA (Áreas não padrão)
                                </label>
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                                <ul className="space-y-2">
                                    {editData.itens_ignorados.map((item, idx) => (
                                        <li key={idx} className="text-sm text-amber-200/80 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-amber-500/50"></span>
                                            <span className="font-medium text-amber-100">{item.Area || 'Área Desconhecida'}:</span>
                                            <span>{item.area_carga_horaria || 0}h</span>
                                            {item.tipo_carga_horaria && <span className="text-xs opacity-70">({item.tipo_carga_horaria})</span>}
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-xs text-amber-200/50 mt-3 italic">
                                    Estes itens foram encontrados no relatório, mas seus nomes não correspondem às áreas padrão do sistema.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-slate-100 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all"
                    >
                        Cancelar
                    </button>
                    {editData && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/80 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            Salvar Relatório
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}


// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function GestaoTerapias() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [carteirinhas, setCarteirinhas] = useState([]);
    const [filterPaciente, setFilterPaciente] = useState('');
    const [filterArea, setFilterArea] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [total, setTotal] = useState(0);
    const [skip, setSkip] = useState(0);
    const [isPolling, setIsPolling] = useState(false);
    const limit = 50;

    const carteirinhasOptions = React.useMemo(() => {
        return carteirinhas.map(c => ({
            value: c.id_paciente,
            label: c.paciente || `Sem Nome (ID: ${c.id_paciente})`
        }));
    }, [carteirinhas]);

    const fetchRecords = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const params = { limit, skip };
            if (filterPaciente) params.id_paciente = filterPaciente;
            if (filterArea) params.area = filterArea;
            if (filterStatus) params.status = filterStatus;
            
            const res = await relatoriosRmApi.listar(params);
            const fetched = res.data?.data || res.data || [];
            setRecords(fetched);
            setTotal(res.data?.total || 0);

            // Check if any record is still processing
            const hasProcessing = fetched.some(r => r.status_extracao === 'NAO_PROCESSADO' || r.status_extracao === 'EM_PROCESSAMENTO');
            setIsPolling(hasProcessing);
        } catch (err) {
            console.error('Erro ao carregar extrações:', err);
            setIsPolling(false);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [filterPaciente, filterArea, filterStatus, skip]);

    useEffect(() => {
        let interval;
        if (isPolling) {
            interval = setInterval(() => {
                fetchRecords(true); // silent fetch
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isPolling, fetchRecords]);

    useEffect(() => {
        setSkip(0);
    }, [filterPaciente, filterArea, filterStatus]);

    const ensureCarteirinhas = async () => {
        if (carteirinhas.length > 0) return;
        try {
            const res = await api.get('/carteirinhas/?limit=500');
            const uniquePatients = [];
            const ids = new Set();
            for (const c of (res.data.data || res.data || [])) {
                if (c.id_paciente && !ids.has(c.id_paciente)) {
                    ids.add(c.id_paciente);
                    uniquePatients.push(c);
                }
            }
            setCarteirinhas(uniquePatients);
        } catch (err) {
            console.error('Erro ao carregar carteirinhas:', err);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const handleNew = () => {
        setEditData(null);
        setModalOpen(true);
        ensureCarteirinhas();
    };

    const handleEdit = (record) => {
        setEditData(record);
        setModalOpen(true);
        ensureCarteirinhas();
    };

    const handleDelete = async (id) => {
        if (!confirm('Deseja remover esta extração?')) return;
        try {
            await relatoriosRmApi.deletar(id);
            fetchRecords();
        } catch (err) {
            console.error('Erro ao deletar:', err);
        }
    };

    const handleModalSave = () => {
        fetchRecords();
    };

    const exportToExcel = async () => {
        try {
            const params = { limit: 99999, skip: 0 };
            if (filterPaciente) params.id_paciente = filterPaciente;
            if (filterArea) params.area = filterArea;
            if (filterStatus) params.status = filterStatus;
            
            const resRecords = await relatoriosRmApi.listar(params);
            const allRecords = resRecords.data?.data || resRecords.data || [];

            const resConvenios = await api.get('/convenios/');
            const conveniosMap = {};
            for (const conv of (resConvenios.data || [])) {
                conveniosMap[conv.id_convenio] = conv.nome;
            }

            const resCarts = await api.get('/carteirinhas/?limit=99999');
            const allCarts = resCarts.data?.data || resCarts.data || [];
            
            const patientMap = {};
            for (const c of allCarts) {
                if (c.id_paciente && c.id_convenio) {
                    const idStr = String(c.id_paciente);
                    if (!patientMap[idStr]) {
                        patientMap[idStr] = new Set();
                    }
                    patientMap[idStr].add(c.id_convenio);
                }
            }

            const dataToExport = allRecords.map(record => {
                const recIdStr = record.id_paciente ? String(record.id_paciente) : null;
                const conveniosIds = recIdStr && patientMap[recIdStr] ? Array.from(patientMap[recIdStr]) : [];
                
                const conveniosNomes = conveniosIds
                    .map(id => conveniosMap[id])
                    .filter(nome => nome)
                    .join(', ');

                const row = {
                    'Paciente': record.nome_paciente || `Paciente #${record.id_paciente}`,
                    'Convênio': conveniosNomes,
                    'ID Paciente': record.id_paciente,
                    'ID Relatório': record.id_relatorio || '',
                    'Status': STATUS_CONFIG[record.status_extracao]?.label || record.status_extracao,
                    'Tipo Carga': record.tipo_carga_horaria || ''
                };
                
                AREAS_PADRAO.forEach(area => {
                    row[area.label] = record[area.key] || 0;
                });
                
                return row;
            });

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Extrações Terapias");
            XLSX.writeFile(wb, "gestao_terapias_export.xlsx");
        } catch (err) {
            console.error("Erro ao exportar:", err);
            alert("Erro ao exportar dados.");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Gestão Terapias</h1>
                    <p className="text-sm text-slate-400 mt-1">Extração de terapias via relatório médico com IA</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm"
                        title="Exportar Excel"
                    >
                        <Download size={18} />
                        Exportar
                    </button>
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg"
                    >
                        <Plus size={18} />
                        Nova Extração
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Paciente</label>
                        <SearchableSelect
                            options={carteirinhasOptions}
                            value={filterPaciente}
                            onChange={setFilterPaciente}
                            placeholder="Todos os pacientes..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Área Terapêutica</label>
                        <select
                            value={filterArea}
                            onChange={e => setFilterArea(e.target.value)}
                            className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="">Todas as áreas</option>
                            {AREAS_PADRAO.map(a => (
                                <option key={a.key} value={a.key.replace('carga_', '').toUpperCase()}>
                                    {a.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="w-full bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="">Todos os status</option>
                            <option value="TOTAL">Extraído com Sucesso</option>
                            <option value="PARCIAL">Parcialmente Extraído</option>
                            <option value="NAO_EXTRAIDO">Não Extraído</option>
                            <option value="NAO_PROCESSADO">Na Fila</option>
                            <option value="EM_PROCESSAMENTO">Em Processamento</option>
                            <option value="ERRO">Erro</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={fetchRecords}
                            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-100 px-4 py-2 rounded-lg transition-all text-sm font-medium"
                        >
                            <Search size={16} />
                            Buscar
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-700/50">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Paciente</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Relatório</th>
                                {AREAS_PADRAO.map(a => (
                                    <th key={a.key} className="text-center px-2 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider" title={a.label}>
                                        {a.short}
                                    </th>
                                ))}
                                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tipo</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={14} className="text-center py-12">
                                        <Loader2 size={24} className="animate-spin text-slate-500 mx-auto" />
                                        <p className="text-slate-500 mt-2 text-sm">Carregando...</p>
                                    </td>
                                </tr>
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan={14} className="text-center py-12">
                                        <FileText size={32} className="text-slate-600 mx-auto mb-2" />
                                        <p className="text-slate-500 text-sm">Nenhuma extração encontrada</p>
                                    </td>
                                </tr>
                            ) : (
                                records.map(record => (
                                    <tr key={record.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-200">{record.nome_paciente || `Paciente #${record.id_paciente}`}</div>
                                            <div className="text-xs text-slate-500">ID: {record.id_paciente}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-slate-300 text-xs">{record.id_relatorio || '—'}</span>
                                        </td>
                                        {AREAS_PADRAO.map(a => (
                                            <td key={a.key} className="px-2 py-3 text-center">
                                                <span className={`text-xs font-medium ${record[a.key] > 0 ? 'text-indigo-300' : 'text-slate-600'}`}>
                                                    {record[a.key] || '-'}
                                                </span>
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 text-center">
                                            <StatusBadge status={record.status_extracao} />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-xs text-slate-400 capitalize">{record.tipo_carga_horaria || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(record)}
                                                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                    title="Editar"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(record.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {!loading && total > limit && (
                <div className="flex items-center justify-between bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3">
                    <span className="text-sm text-slate-400">
                        Mostrando {skip + 1} a {Math.min(skip + limit, total)} de {total} resultados
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSkip(Math.max(0, skip - limit))}
                            disabled={skip === 0}
                            className="p-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => setSkip(skip + limit)}
                            disabled={skip + limit >= total}
                            className="p-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Modal */}
            <ExtractionModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleModalSave}
                editData={editData}
                carteirinhas={carteirinhas}
            />
        </div>
    );
}
