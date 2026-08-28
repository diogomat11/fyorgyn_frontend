import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Trash2, Plus, Edit, Search, X, Check, Stethoscope, User, HelpCircle, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Pagination from '../components/Pagination';

// Design System
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import Badge from '../components/ui/Badge';

const TIPO_TABS = [
    { key: 'profissionais', label: 'Profissionais', tipo: 'profissional', icon: User, hint: 'Profissionais técnicos e demais especialidades' },
    { key: 'medicos', label: 'Médicos', tipo: 'medico', icon: Stethoscope, hint: 'Médicos solicitantes / assistentes (importados via CRM)' }
];

export default function CorpoClinico() {
    const [profissionais, setProfissionais] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Abas Profissionais | Médicos
    const [activeTab, setActiveTab] = useState('profissionais');
    const activeTipo = TIPO_TABS.find(t => t.key === activeTab)?.tipo || 'profissional';

    // Modal state (cadastro/edição)
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProf, setEditingProf] = useState(null);

    // Modal state (vínculos N:N)
    const [vinculosOpen, setVinculosOpen] = useState(false);
    const [vinculosProf, setVinculosProf] = useState(null);
    const [vinculosLoading, setVinculosLoading] = useState(false);
    const [vinculosSaving, setVinculosSaving] = useState(false);
    const [vinculosError, setVinculosError] = useState('');
    const [areasCatalog, setAreasCatalog] = useState([]);
    const [conveniosCatalog, setConveniosCatalog] = useState([]);
    const [usersCatalog, setUsersCatalog] = useState([]);
    const [procedimentosCatalog, setProcedimentosCatalog] = useState([]);
    const [vinculosForm, setVinculosForm] = useState({ id_areas: [], id_convenios: [], id_procedimentos: [], user_ids: [] });

    // Form fields (cadastro)
    const [formData, setFormData] = useState({
        nome: '',
        cpf: '',
        area: '',
        conselho: '',
        registro: '',
        UF: '',
        CBO: '',
        codigo_ipasgo: '',
        tipo_profissional: 'profissional'
    });

    const fetchProfissionais = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page,
                pageSize,
                search: searchQuery.trim() || undefined,
                tipo: activeTipo
            };
            const res = await api.get('/agendamentos/profissionais', { params });
            if (res.data && Array.isArray(res.data.data)) {
                setProfissionais(res.data.data);
                setTotal(res.data.total || 0);
            } else if (Array.isArray(res.data)) {
                setProfissionais(res.data);
                setTotal(res.data.length);
            } else {
                setProfissionais([]);
                setTotal(0);
            }
        } catch (error) {
            console.error("Error fetching profissionais", error);
            alert("Erro ao carregar corpo clínico: " + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, searchQuery, activeTipo]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProfissionais();
        }, 200);
        return () => clearTimeout(timer);
    }, [fetchProfissionais]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, activeTab]);

    const resetForm = () => ({
        nome: '',
        cpf: '',
        area: '',
        conselho: '',
        registro: '',
        UF: '',
        CBO: '',
        codigo_ipasgo: '',
        tipo_profissional: activeTipo
    });

    const handleOpenCreateModal = () => {
        setEditingProf(null);
        setFormData(resetForm());
        setModalOpen(true);
    };

    const handleOpenEditModal = (prof) => {
        setEditingProf(prof);
        setFormData({
            nome: prof.nome || '',
            cpf: prof.cpf || '',
            area: prof.area || '',
            conselho: prof.conselho || '',
            registro: prof.registro || '',
            UF: prof.UF || '',
            CBO: prof.CBO || '',
            codigo_ipasgo: prof.codigo_ipasgo || '',
            tipo_profissional: prof.tipo_profissional || activeTipo
        });
        setModalOpen(true);
    };

    const handleDeleteProf = async (id, area) => {
        const confirmed = window.confirm("Deseja realmente desativar este profissional do corpo clínico?");
        if (!confirmed) return;

        try {
            await api.delete(`/agendamentos/profissionais/${id}?area=${encodeURIComponent(area || '')}`);
            alert("Profissional desativado com sucesso!");
            fetchProfissionais();
        } catch (error) {
            console.error("Error deleting profissional", error);
            alert("Erro ao remover profissional: " + (error.response?.data?.detail || error.message));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nome.trim()) {
            alert("O nome do profissional é obrigatório.");
            return;
        }

        try {
            if (editingProf) {
                await api.put(`/agendamentos/profissionais/${editingProf.id_profissional}?area=${encodeURIComponent(editingProf.area || '')}`, formData);
                alert("Profissional atualizado com sucesso!");
            } else {
                await api.post('/agendamentos/profissionais', formData);
                alert("Profissional cadastrado com sucesso!");
            }
            setModalOpen(false);
            fetchProfissionais();
        } catch (error) {
            console.error("Error saving profissional", error);
            alert("Erro ao salvar profissional: " + (error.response?.data?.detail || error.message));
        }
    };

    // ── Vínculos (N:N áreas / convênios / procedimentos / usuários) ──

    const fetchProcedimentosForConvenios = async (idConvenios, idAreas) => {
        if (!idConvenios.length) {
            setProcedimentosCatalog([]);
            return;
        }
        try {
            const results = await Promise.all(
                idConvenios.map(cid => api.get(`/agendamentos/procedimentos?id_convenio=${cid}`).catch(() => ({ data: [] })))
            );
            // Procedimentos dos convênios selecionados, filtrados pelas áreas selecionadas (quando houver)
            const procs = results.flatMap(r => Array.isArray(r.data) ? r.data : (r.data?.data || []));
            const filtrados = idAreas.length
                ? procs.filter(p => p.id_area && idAreas.includes(p.id_area))
                : procs;
            // Dedup por id_procedimento
            const seen = new Set();
            setProcedimentosCatalog(filtrados.filter(p => {
                const key = p.id_procedimento;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }));
        } catch {
            setProcedimentosCatalog([]);
        }
    };

    const handleOpenVinculosModal = async (prof) => {
        setVinculosProf(prof);
        setVinculosOpen(true);
        setVinculosError('');
        setVinculosLoading(true);
        try {
            const [vincRes, areasRes, convRes, usrRes] = await Promise.all([
                api.get(`/agendamentos/profissionais/${prof.id}/vinculos`).catch(() => ({ data: null })),
                api.get('/agendamentos/areas').catch(() => ({ data: [] })),
                api.get('/convenios/all').catch(() => api.get('/convenios/').catch(() => ({ data: [] }))),
                api.get('/auth/admin/users').catch(() => api.get('/auth/users').catch(() => ({ data: [] })))
            ]);

            const v = vincRes.data || { id_areas: [], id_convenios: [], id_procedimentos: [], user_ids: [] };
            setVinculosForm({
                id_areas: v.id_areas || [],
                id_convenios: v.id_convenios || [],
                id_procedimentos: v.id_procedimentos || [],
                user_ids: v.user_ids || []
            });
            setAreasCatalog(areasRes.data || []);
            setConveniosCatalog(Array.isArray(convRes.data) ? convRes.data : []);
            setUsersCatalog(Array.isArray(usrRes.data) ? usrRes.data : []);
            await fetchProcedimentosForConvenios(v.id_convenios || [], v.id_areas || []);
        } catch (error) {
            setVinculosError("Erro ao carregar vínculos: " + (error.response?.data?.detail || error.message));
        } finally {
            setVinculosLoading(false);
        }
    };

    const toggleVinculo = (field, value) => {
        setVinculosForm(prev => {
            const list = prev[field];
            const next = list.includes(value) ? list.filter(v => v !== value) : [...list, value];
            return { ...prev, [field]: next };
        });
    };

    // Ao mudar convênios/áreas, recarrega procedimentos elegíveis (áreas ∩ convênios)
    const handleVinculoConvenioOrArea = async (field, value) => {
        toggleVinculo(field, value);
        const nextForm = {
            ...vinculosForm,
            [field]: vinculosForm[field].includes(value)
                ? vinculosForm[field].filter(v => v !== value)
                : [...vinculosForm[field], value]
        };
        if (field === 'id_convenios') {
            await fetchProcedimentosForConvenios(nextForm.id_convenios, nextForm.id_areas);
        } else if (field === 'id_areas') {
            await fetchProcedimentosForConvenios(nextForm.id_convenios, nextForm.id_areas);
            // Remove procedimentos selecionados que saíram da lista elegível
            setProcedimentosCatalog(prev => {
                const eligibleIds = new Set(prev.map(p => p.id_procedimento));
                setVinculosForm(f => ({ ...f, id_procedimentos: f.id_procedimentos.filter(id => eligibleIds.has(id)) }));
                return prev;
            });
        }
    };

    const handleSaveVinculos = async (e) => {
        e.preventDefault();
        if (!vinculosProf?.id) return;
        setVinculosSaving(true);
        setVinculosError('');
        try {
            await api.put(`/agendamentos/profissionais/${vinculosProf.id}/vinculos`, vinculosForm);
            alert("Vínculos atualizados com sucesso!");
            setVinculosOpen(false);
            fetchProfissionais();
        } catch (error) {
            setVinculosError("Erro ao salvar vínculos: " + (error.response?.data?.detail || error.message));
        } finally {
            setVinculosSaving(false);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <Stethoscope className="text-primary" /> Corpo Clínico
                    </h1>
                    <p className="text-sm text-text-secondary">Cadastro e gestão dos profissionais de saúde da clínica</p>
                </div>
                <Button variant="primary" onClick={handleOpenCreateModal} className="flex items-center gap-2">
                    <Plus size={18} /> {activeTab === 'medicos' ? 'Novo Médico' : 'Novo Profissional'}
                </Button>
            </div>

            {/* Abas Profissionais | Médicos */}
            <div className="flex border-b border-border gap-4">
                {TIPO_TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            title={tab.hint}
                            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
                                activeTab === tab.key
                                    ? 'border-primary text-primary font-bold'
                                    : 'border-transparent text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            <Icon size={18} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <Card className="p-4 bg-slate-900/60 border-slate-800 backdrop-blur-md">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <Search size={18} />
                        </span>
                        <Input
                            type="text"
                            placeholder="Buscar por nome, registro, conselho, CBO..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 w-full"
                        />
                    </div>
                    <div className="flex items-center text-xs text-text-secondary">
                        Exibindo <strong className="text-slate-200 px-1">{TIPO_TABS.find(t => t.key === activeTab)?.label}</strong>
                        (tipo fixo ao criar nesta aba)
                    </div>
                </div>
            </Card>

            {/* Main Table Card */}
            <Card className="overflow-hidden bg-slate-900/40 border-slate-800 backdrop-blur-md">
                {loading ? (
                    <div className="py-20 text-center text-text-secondary">Carregando corpo clínico...</div>
                ) : profissionais.length === 0 ? (
                    <div className="py-20 text-center text-text-secondary">Nenhum registro encontrado nesta aba.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-slate-900/80 text-text-secondary text-xs uppercase font-semibold">
                                    <th className="px-6 py-3 text-left">Nome</th>
                                    <th className="px-6 py-3 text-left">Conselho / Registro</th>
                                    {activeTab === 'medicos' ? (
                                        <th className="px-6 py-3 text-left">Situação CRM</th>
                                    ) : (
                                        <th className="px-6 py-3 text-left">Área de Atuação</th>
                                    )}
                                    <th className="px-6 py-3 text-left">CBO</th>
                                    <th className="px-6 py-3 text-left">Cód IPASGO</th>
                                    <th className="px-6 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {profissionais.map(p => (
                                    <tr key={`${p.id_profissional}-${p.area}`} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-text-primary whitespace-nowrap">
                                            {p.nome}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
                                            {p.conselho ? `${p.conselho} - ${p.registro || ''} / ${p.UF || ''}` : '-'}
                                        </td>
                                        {activeTab === 'medicos' ? (
                                            <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                <Badge variant={p.situacao === 'ativo' ? 'success' : 'secondary'}>
                                                    {p.situacao ? p.situacao.charAt(0).toUpperCase() + p.situacao.slice(1) : 'N/D'}
                                                </Badge>
                                            </td>
                                        ) : (
                                            <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap font-medium">
                                                {p.area || '-'}
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap font-mono">
                                            {p.CBO || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap font-mono">
                                            {p.codigo_ipasgo || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenVinculosModal(p)}
                                                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                                    title="Vínculos (áreas, convênios, procedimentos, usuários)"
                                                >
                                                    <Link2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenEditModal(p)}
                                                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProf(p.id_profissional, p.area)}
                                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Footer */}
                {total > 0 && (
                    <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs text-text-secondary">
                            Mostrando <span className="font-medium text-slate-200">{(page - 1) * pageSize + 1}</span> a <span className="font-medium text-slate-200">{Math.min(page * pageSize, total)}</span> de <span className="font-medium text-slate-200">{total}</span> registros
                        </div>
                        <Pagination
                            currentPage={page}
                            totalPages={Math.ceil(total / pageSize) || 1}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </Card>

            {/* Modal de Cadastro/Edição */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-slate-900/50">
                                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                    {editingProf ? <Edit size={20} className="text-primary" /> : <Plus size={20} className="text-primary" />}
                                    {editingProf ? 'Editar' : 'Novo'} {activeTab === 'medicos' ? 'Médico' : 'Profissional'}
                                </h2>
                                <button onClick={() => setModalOpen(false)} className="text-text-secondary hover:text-red-400 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1">
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Nome Completo *</label>
                                    <Input
                                        type="text"
                                        value={formData.nome}
                                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                        placeholder="Ex: Dr. João da Silva"
                                        required
                                        className="w-full"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">CPF</label>
                                        <Input
                                            type="text"
                                            value={formData.cpf}
                                            onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                            placeholder="Ex: 000.000.000-00"
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Tipo de Profissional</label>
                                        <Input type="text" value={activeTab === 'medicos' ? 'Médico' : 'Profissional Técnico'} disabled className="w-full opacity-60" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Conselho</label>
                                        <Select
                                            value={formData.conselho}
                                            onChange={(e) => setFormData({ ...formData, conselho: e.target.value })}
                                            className="w-full"
                                        >
                                            <option value="">Nenhum</option>
                                            <option value="CRM">CRM (Médico)</option>
                                            <option value="CREFITO">CREFITO (Fisioterapia/TO)</option>
                                            <option value="COREN">COREN (Enfermagem)</option>
                                            <option value="CRP">CRP (Psicologia)</option>
                                            <option value="CRFA">CRFA (Fonoaudiologia)</option>
                                            <option value="CRN">CRN (Nutrição)</option>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Registro / Conselho</label>
                                        <Input
                                            type="text"
                                            value={formData.registro}
                                            onChange={(e) => setFormData({ ...formData, registro: e.target.value })}
                                            placeholder="Ex: 12345"
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">UF Conselho</label>
                                        <Input
                                            type="text"
                                            value={formData.UF}
                                            onChange={(e) => setFormData({ ...formData, UF: e.target.value })}
                                            placeholder="Ex: GO"
                                            maxLength={2}
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Área de Atuação</label>
                                        <Input
                                            type="text"
                                            value={formData.area}
                                            onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                            placeholder="Ex: Fisioterapia, Cardiologia"
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">CBO (Código de Ocupação)</label>
                                        <Input
                                            type="text"
                                            value={formData.CBO}
                                            onChange={(e) => setFormData({ ...formData, CBO: e.target.value })}
                                            placeholder="Ex: 225112"
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Código IPASGO</label>
                                    <Input
                                        type="text"
                                        value={formData.codigo_ipasgo}
                                        onChange={(e) => setFormData({ ...formData, codigo_ipasgo: e.target.value })}
                                        placeholder="Ex: 987654"
                                        className="w-full"
                                    />
                                </div>

                                <div className="pt-4 border-t border-border flex justify-end gap-2">
                                    <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" variant="primary">
                                        Salvar
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal de Vínculos (áreas / convênios / procedimentos / usuários) */}
            <AnimatePresence>
                {vinculosOpen && vinculosProf && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-slate-900/50">
                                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                    <Link2 size={20} className="text-primary" />
                                    Vínculos — {vinculosProf.nome}
                                </h2>
                                <button onClick={() => setVinculosOpen(false)} className="text-text-secondary hover:text-red-400 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {vinculosLoading ? (
                                <div className="p-12 text-center text-text-secondary">Carregando vínculos...</div>
                            ) : (
                                <form onSubmit={handleSaveVinculos} className="overflow-y-auto p-6 space-y-6 flex-1">
                                    {vinculosError && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{vinculosError}</div>
                                    )}

                                    {/* Áreas de Atuação */}
                                    <div>
                                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">Áreas de Atuação</label>
                                        <div className="flex flex-wrap gap-2">
                                            {areasCatalog.map(a => {
                                                const checked = vinculosForm.id_areas.includes(a.id_area);
                                                return (
                                                    <label key={a.id_area} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer border transition-all select-none ${checked ? 'bg-primary/20 text-primary border-primary/50' : 'bg-slate-950/60 text-slate-500 border-slate-800 hover:border-slate-700'}`}>
                                                        <input type="checkbox" checked={checked} onChange={() => handleVinculoConvenioOrArea('id_areas', a.id_area)} className="rounded border-slate-700 focus:ring-0 bg-slate-900 w-3.5 h-3.5 cursor-pointer" />
                                                        {a.nome}
                                                    </label>
                                                );
                                            })}
                                            {areasCatalog.length === 0 && <span className="text-xs text-slate-500 italic">Nenhuma área cadastrada.</span>}
                                        </div>
                                    </div>

                                    {/* Convênios Atendidos */}
                                    <div>
                                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">Convênios Atendidos</label>
                                        <div className="flex flex-wrap gap-2">
                                            {conveniosCatalog.map(c => {
                                                const checked = vinculosForm.id_convenios.includes(c.id_convenio);
                                                return (
                                                    <label key={c.id_convenio} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer border transition-all select-none ${checked ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : 'bg-slate-950/60 text-slate-500 border-slate-800 hover:border-slate-700'}`}>
                                                        <input type="checkbox" checked={checked} onChange={() => handleVinculoConvenioOrArea('id_convenios', c.id_convenio)} className="rounded border-slate-700 focus:ring-0 bg-slate-900 w-3.5 h-3.5 cursor-pointer" />
                                                        {c.nome}
                                                    </label>
                                                );
                                            })}
                                            {conveniosCatalog.length === 0 && <span className="text-xs text-slate-500 italic">Nenhum convênio disponível.</span>}
                                        </div>
                                    </div>

                                    {/* Procedimentos Habilitados (filtrados por áreas ∩ convênios) */}
                                    <div>
                                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-1 flex items-center gap-1">
                                            Procedimentos Habilitados
                                            <span className="font-normal normal-case text-[10px] text-slate-500">(filtrados pelos convênios e áreas selecionados)</span>
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {procedimentosCatalog.map(p => {
                                                const checked = vinculosForm.id_procedimentos.includes(p.id_procedimento);
                                                return (
                                                    <label key={p.id_procedimento} title={p.nome} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer border transition-all select-none ${checked ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : 'bg-slate-950/60 text-slate-500 border-slate-800 hover:border-slate-700'}`}>
                                                        <input type="checkbox" checked={checked} onChange={() => toggleVinculo('id_procedimentos', p.id_procedimento)} className="rounded border-slate-700 focus:ring-0 bg-slate-900 w-3.5 h-3.5 cursor-pointer" />
                                                        {p.codigo_procedimento || p.id_procedimento}
                                                    </label>
                                                );
                                            })}
                                            {procedimentosCatalog.length === 0 && (
                                                <span className="text-xs text-slate-500 italic">Selecione convênios (e áreas) para listar procedimentos elegíveis.</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Usuários vinculados (multi-tenant) */}
                                    {usersCatalog.length > 0 && (
                                        <div>
                                            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1 flex items-center gap-1">
                                                Usuários Vinculados
                                                <HelpCircle size={12} className="text-slate-500" title="Um profissional pode estar vinculado a mais de um usuário/tenant" />
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {usersCatalog.map(u => {
                                                    const checked = vinculosForm.user_ids.includes(u.id);
                                                    return (
                                                        <label key={u.id} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer border transition-all select-none ${checked ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-slate-950/60 text-slate-500 border-slate-800 hover:border-slate-700'}`}>
                                                            <input type="checkbox" checked={checked} onChange={() => toggleVinculo('user_ids', u.id)} className="rounded border-slate-700 focus:ring-0 bg-slate-900 w-3.5 h-3.5 cursor-pointer" />
                                                            {u.username || `#${u.id}`}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-border flex justify-end gap-2">
                                        <Button type="button" variant="secondary" onClick={() => setVinculosOpen(false)}>
                                            Cancelar
                                        </Button>
                                        <Button type="submit" variant="primary" disabled={vinculosSaving}>
                                            {vinculosSaving ? 'Salvando...' : 'Salvar Vínculos'}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
