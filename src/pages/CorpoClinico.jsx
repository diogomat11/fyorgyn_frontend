import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Trash2, Plus, Edit, Search, X, Check, Stethoscope, User, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Design System
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import Badge from '../components/ui/Badge';

export default function CorpoClinico() {
    const [profissionais, setProfissionais] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTipo, setFilterTipo] = useState('');

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProf, setEditingProf] = useState(null);
    
    // Form fields
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

    const fetchProfissionais = async () => {
        setLoading(true);
        try {
            const res = await api.get('/agendamentos/profissionais');
            setProfissionais(res.data);
        } catch (error) {
            console.error("Error fetching profissionais", error);
            alert("Erro ao carregar corpo clínico: " + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfissionais();
    }, []);

    const handleOpenCreateModal = () => {
        setEditingProf(null);
        setFormData({
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
            tipo_profissional: prof.tipo_profissional || 'profissional'
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

    const filteredProfissionais = profissionais.filter(p => {
        const matchesSearch = 
            p.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.registro?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.CBO?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.area?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.conselho?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesTipo = !filterTipo || p.tipo_profissional === filterTipo;

        return matchesSearch && matchesTipo;
    });

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
                    <Plus size={18} /> Novo Profissional
                </Button>
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
                    <div>
                        <Select
                            value={filterTipo}
                            onChange={(e) => setFilterTipo(e.target.value)}
                            className="w-full"
                        >
                            <option value="">Todos os Tipos</option>
                            <option value="profissional">Profissional Técnico / Outros</option>
                            <option value="medico">Médico Solicitante / Assistente</option>
                        </Select>
                    </div>
                </div>
            </Card>

            {/* Main Table Card */}
            <Card className="overflow-hidden bg-slate-900/40 border-slate-800 backdrop-blur-md">
                {loading ? (
                    <div className="py-20 text-center text-text-secondary">Carregando corpo clínico...</div>
                ) : filteredProfissionais.length === 0 ? (
                    <div className="py-20 text-center text-text-secondary">Nenhum profissional encontrado.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-slate-900/80 text-text-secondary text-xs uppercase font-semibold">
                                    <th className="px-6 py-3 text-left">Nome</th>
                                    <th className="px-6 py-3 text-left">Tipo</th>
                                    <th className="px-6 py-3 text-left">Conselho / Registro</th>
                                    <th className="px-6 py-3 text-left">Área de Atuação</th>
                                    <th className="px-6 py-3 text-left">CBO</th>
                                    <th className="px-6 py-3 text-left">Cód IPASGO</th>
                                    <th className="px-6 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredProfissionais.map(p => (
                                    <tr key={`${p.id_profissional}-${p.area}`} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-text-primary whitespace-nowrap">
                                            {p.nome}
                                        </td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                            <Badge variant={p.tipo_profissional === 'medico' ? 'primary' : 'secondary'}>
                                                {p.tipo_profissional === 'medico' ? 'Médico' : 'Profissional'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
                                            {p.conselho ? `${p.conselho} - ${p.registro || ''} / ${p.UF || ''}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap font-medium">
                                            {p.area || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap font-mono">
                                            {p.CBO || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap font-mono">
                                            {p.codigo_ipasgo || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-2">
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
                                    {editingProf ? 'Editar Profissional' : 'Novo Profissional'}
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
                                        <Select
                                            value={formData.tipo_profissional}
                                            onChange={(e) => setFormData({ ...formData, tipo_profissional: e.target.value })}
                                            className="w-full"
                                        >
                                            <option value="profissional">Profissional Técnico / Outro</option>
                                            <option value="medico">Médico Solicitante / Assistente</option>
                                        </Select>
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
        </div>
    );
}
