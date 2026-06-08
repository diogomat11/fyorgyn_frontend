import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Key, Plus, X, Edit2, Trash2, Loader2, ShieldAlert, Eye, EyeOff, ExternalLink } from 'lucide-react';

export default function Credenciais() {
    const [credentials, setCredentials] = useState([]);
    const [users, setUsers] = useState([]);
    const [convenios, setConvenios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
    const [selectedId, setSelectedId] = useState(null);

    const [form, setForm] = useState({
        user_id: '',
        id_convenio: '',
        login: '',
        senha: '',
        cod_prestador: '',
        login_fat: '',
        senha_fat: '',
        url_portal_fat: ''
    });

    const [showSenhaAuth, setShowSenhaAuth] = useState(false);
    const [showSenhaFat, setShowSenhaFat] = useState(false);

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        setLoading(true);
        setError('');
        try {
            const [credRes, userRes, convRes] = await Promise.all([
                api.get('/convenios/credentials'),
                api.get('/api/auth/users'),
                api.get('/convenios/')
            ]);
            setCredentials(credRes.data);
            setUsers(userRes.data);
            setConvenios(convRes.data);
        } catch (err) {
            setError('Erro ao carregar dados: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setModalMode('create');
        setSelectedId(null);
        setForm({
            user_id: users[0]?.id || '',
            id_convenio: convenios[0]?.id_convenio || '',
            login: '',
            senha: '',
            cod_prestador: '',
            login_fat: '',
            senha_fat: '',
            url_portal_fat: ''
        });
        setShowSenhaAuth(false);
        setShowSenhaFat(false);
        setShowModal(true);
    };

    const handleOpenEdit = (cred) => {
        setModalMode('edit');
        setSelectedId(cred.id);
        setForm({
            user_id: cred.user_id,
            id_convenio: cred.id_convenio,
            login: cred.login || '',
            senha: '', // Don't pre-fill password (security)
            cod_prestador: cred.cod_prestador || '',
            login_fat: cred.login_fat || '',
            senha_fat: '',
            url_portal_fat: cred.url_portal_fat || ''
        });
        setShowSenhaAuth(false);
        setShowSenhaFat(false);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            if (modalMode === 'create') {
                await api.post('/convenios/credentials', {
                    ...form,
                    user_id: parseInt(form.user_id),
                    id_convenio: parseInt(form.id_convenio)
                });
            } else {
                await api.put(`/convenios/credentials/${selectedId}`, {
                    login: form.login,
                    senha: form.senha || undefined, // Send only if filled
                    cod_prestador: form.cod_prestador,
                    login_fat: form.login_fat,
                    senha_fat: form.senha_fat || undefined,
                    url_portal_fat: form.url_portal_fat
                });
            }
            setShowModal(false);
            loadAll();
        } catch (err) {
            setError('Erro ao salvar credenciais: ' + (err.response?.data?.detail || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Deseja realmente excluir estas credenciais?')) return;
        setLoading(true);
        try {
            await api.delete(`/convenios/credentials/${id}`);
            loadAll();
        } catch (err) {
            alert('Erro ao excluir: ' + (err.response?.data?.detail || err.message));
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                        <Key size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100">Gestão de Credenciais</h1>
                        <p className="text-sm text-slate-400">Gerencie contas, senhas criptografadas e códigos de prestador para integração.</p>
                    </div>
                </div>
                <button
                    onClick={handleOpenCreate}
                    disabled={loading || users.length === 0 || convenios.length === 0}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    <Plus size={16} /> Nova Credencial
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="m-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                        <ShieldAlert size={16} />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError('')} className="text-red-400 hover:text-white">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                    <div className="text-center text-slate-500 py-12">Carregando credenciais...</div>
                ) : credentials.length === 0 ? (
                    <div className="text-center text-slate-500 py-12">
                        <Key size={48} className="mx-auto mb-4 opacity-50 text-indigo-400" />
                        <p>Nenhuma credencial de convênio cadastrada.</p>
                        <p className="text-xs mt-1 text-slate-600">Clique em "Nova Credencial" para configurar um acesso.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="text-xs uppercase bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
                            <tr>
                                <th className="px-4 py-3">Usuário</th>
                                <th className="px-4 py-3">Convênio</th>
                                <th className="px-4 py-3">Cód. Prestador</th>
                                <th className="px-4 py-3">Login (Autorização)</th>
                                <th className="px-4 py-3">Senha (Aut)</th>
                                <th className="px-4 py-3">Login (Faturamento)</th>
                                <th className="px-4 py-3">Senha (Fat)</th>
                                <th className="px-4 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {credentials.map((cred) => (
                                <tr key={cred.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-slate-200">{cred.username}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 rounded text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                            {cred.nome_convenio}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{cred.cod_prestador || '-'}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{cred.login || '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                            cred.has_senha 
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                : 'bg-slate-800 text-slate-500 border-slate-700'
                                        }`}>
                                            {cred.has_senha ? 'DEFINIDA' : 'NÃO DEFINIDA'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{cred.login_fat || '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                            cred.has_senha_fat 
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                : 'bg-slate-800 text-slate-500 border-slate-700'
                                        }`}>
                                            {cred.has_senha_fat ? 'DEFINIDA' : 'NÃO DEFINIDA'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleOpenEdit(cred)}
                                                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-xs"
                                                title="Editar Credenciais"
                                            >
                                                <Edit2 size={14} /> Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cred.id)}
                                                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-xs font-medium"
                                                title="Excluir"
                                            >
                                                <Trash2 size={14} /> Excluir
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal Criar/Editar */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-3">
                            <h3 className="text-lg font-semibold text-slate-100">
                                {modalMode === 'create' ? 'Configurar Novas Credenciais' : 'Editar Credenciais'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Grid 2 colunas para Usuario e Convenio */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Usuário</label>
                                    <select
                                        value={form.user_id}
                                        onChange={e => setForm({ ...form, user_id: e.target.value })}
                                        disabled={modalMode === 'edit'}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                                        required
                                    >
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.username}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Convênio</label>
                                    <select
                                        value={form.id_convenio}
                                        onChange={e => setForm({ ...form, id_convenio: e.target.value })}
                                        disabled={modalMode === 'edit'}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                                        required
                                    >
                                        {convenios.map(c => (
                                            <option key={c.id_convenio} value={c.id_convenio}>{c.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Seção Portal Autorização */}
                            <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-800 space-y-4">
                                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Portal de Autorização</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Login</label>
                                        <input
                                            type="text"
                                            value={form.login}
                                            onChange={e => setForm({ ...form, login: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Senha</label>
                                        <div className="relative">
                                            <input
                                                type={showSenhaAuth ? "text" : "password"}
                                                value={form.senha}
                                                onChange={e => setForm({ ...form, senha: e.target.value })}
                                                placeholder={modalMode === 'edit' ? "Deixe em branco para não alterar" : "Senha de acesso"}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-sm text-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                                                required={modalMode === 'create'}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowSenhaAuth(!showSenhaAuth)}
                                                className="absolute right-3 top-2 text-slate-400 hover:text-white"
                                            >
                                                {showSenhaAuth ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Código de Prestador (IPASGO/Unimed)</label>
                                    <input
                                        type="text"
                                        value={form.cod_prestador}
                                        onChange={e => setForm({ ...form, cod_prestador: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Seção Portal Faturamento */}
                            <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-800 space-y-4">
                                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Portal de Faturamento (Opcional)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Login Faturamento</label>
                                        <input
                                            type="text"
                                            value={form.login_fat}
                                            onChange={e => setForm({ ...form, login_fat: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Senha Faturamento</label>
                                        <div className="relative">
                                            <input
                                                type={showSenhaFat ? "text" : "password"}
                                                value={form.senha_fat}
                                                onChange={e => setForm({ ...form, senha_fat: e.target.value })}
                                                placeholder={modalMode === 'edit' ? "Deixe em branco para não alterar" : "Senha de faturamento"}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-sm text-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowSenhaFat(!showSenhaFat)}
                                                className="absolute right-3 top-2 text-slate-400 hover:text-white"
                                            >
                                                {showSenhaFat ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">URL do Portal de Faturamento</label>
                                    <input
                                        type="url"
                                        value={form.url_portal_fat}
                                        onChange={e => setForm({ ...form, url_portal_fat: e.target.value })}
                                        placeholder="https://..."
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-855">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    disabled={saving}
                                    className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                                >
                                    {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
