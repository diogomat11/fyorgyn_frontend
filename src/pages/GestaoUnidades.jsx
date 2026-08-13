import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Building2, Plus, X, Edit2, Loader2, ShieldAlert, Power, Check } from 'lucide-react';

export default function GestaoUnidades() {
    const [unidades, setUnidades] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedUnidade, setSelectedUnidade] = useState(null);

    const [form, setForm] = useState({
        id_unidade: '',
        nome: '',
        status: 'Ativo'
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/unidades/');
            setUnidades(res.data || []);
        } catch (err) {
            setError('Erro ao carregar unidades: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setModalMode('create');
        setSelectedUnidade(null);
        setForm({
            id_unidade: '',
            nome: '',
            status: 'Ativo'
        });
        setShowModal(true);
    };

    const handleOpenEdit = (u) => {
        setModalMode('edit');
        setSelectedUnidade(u);
        setForm({
            id_unidade: u.id_unidade,
            nome: u.nome || '',
            status: u.status || 'Ativo'
        });
        setShowModal(true);
    };

    const handleToggleStatus = async (u) => {
        setError('');
        try {
            await api.patch(`/unidades/${u.id_unidade}/status`);
            loadData();
        } catch (err) {
            setError('Erro ao alterar status da unidade: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            if (modalMode === 'create') {
                await api.post('/unidades/', {
                    id_unidade: form.id_unidade ? parseInt(form.id_unidade) : undefined,
                    nome: form.nome,
                    status: form.status
                });
            } else if (modalMode === 'edit' && selectedUnidade) {
                await api.put(`/unidades/${selectedUnidade.id_unidade}`, {
                    nome: form.nome,
                    status: form.status
                });
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            setError('Erro ao salvar unidade: ' + (err.response?.data?.detail || err.message));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100">Gestão de Unidades da Clínica</h1>
                        <p className="text-sm text-slate-400">Cadastre e gerencie as unidades de atendimento da sua clínica.</p>
                    </div>
                </div>
                <button
                    onClick={handleOpenCreate}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    <Plus size={16} /> Nova Unidade
                </button>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="m-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between text-red-400 text-sm">
                    <div className="flex items-center gap-3">
                        <ShieldAlert size={18} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError('')} className="hover:text-white"><X size={16} /></button>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto p-6 scrollbar-none">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                        <Loader2 className="animate-spin text-cyan-500" size={32} />
                        <span className="text-sm text-slate-400">Carregando unidades...</span>
                    </div>
                ) : unidades.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <Building2 size={48} className="mb-2 opacity-50 text-cyan-500" />
                        <p className="text-sm">Nenhuma unidade cadastrada.</p>
                        <p className="text-xs text-slate-600 mt-1">Clique em "Nova Unidade" para cadastrar sua unidade de atendimento.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase bg-slate-950/30">
                                <th className="px-4 py-3">Cód. Unidade</th>
                                <th className="px-4 py-3">Nome da Unidade</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {unidades.map(u => (
                                <tr key={u.id_unidade} className="hover:bg-slate-800/30 transition-colors text-slate-300">
                                    <td className="px-4 py-3 font-mono text-xs text-cyan-400 font-bold">
                                        #{u.id_unidade}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-100">{u.nome}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                            (u.status || 'Ativo') === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                        }`}>
                                            {u.status || 'Ativo'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenEdit(u)}
                                                title="Editar Unidade"
                                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 rounded-lg transition-colors border border-slate-700"
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(u)}
                                                title={(u.status || 'Ativo') === 'Ativo' ? 'Inativar Unidade' : 'Ativar Unidade'}
                                                className={`p-1.5 rounded-lg transition-colors border ${
                                                    (u.status || 'Ativo') === 'Ativo'
                                                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20' 
                                                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                                                }`}
                                            >
                                                <Power size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal Criar / Editar */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
                            <h2 className="text-lg font-bold text-slate-100">
                                {modalMode === 'create' ? 'Nova Unidade' : 'Editar Unidade'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {modalMode === 'create' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                                        Código da Unidade (Opcional)
                                    </label>
                                    <input
                                        type="number"
                                        value={form.id_unidade}
                                        onChange={e => setForm({ ...form, id_unidade: e.target.value })}
                                        placeholder="Ex: 1, 3, 5 (ou em branco para automático)"
                                        className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:border-cyan-500"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Nome da Unidade
                                </label>
                                <input
                                    type="text"
                                    value={form.nome}
                                    onChange={e => setForm({ ...form, nome: e.target.value })}
                                    placeholder="Ex: Unidade Oeste, Unidade República do Líbano"
                                    className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Status
                                </label>
                                <select
                                    value={form.status}
                                    onChange={e => setForm({ ...form, status: e.target.value })}
                                    className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 cursor-pointer"
                                >
                                    <option value="Ativo">Ativo</option>
                                    <option value="Inativo">Inativo</option>
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saving && <Loader2 size={16} className="animate-spin" />}
                                    Salvar Unidade
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
