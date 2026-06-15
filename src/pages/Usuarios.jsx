import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Users, Plus, X, Edit2, Key, Loader2, Copy, Check, ShieldAlert } from 'lucide-react';

export default function Usuarios() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
    const [selectedUser, setSelectedUser] = useState(null);
    
    // Key display state
    const [generatedKey, setGeneratedKey] = useState('');
    const [copied, setCopied] = useState(false);

    const [form, setForm] = useState({
        username: '',
        validade: '',
        is_admin: false,
        permitir_protocolo: false,
        status: 'Ativo'
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/auth/admin/users');
            setUsers(res.data);
        } catch (err) {
            setError('Erro ao carregar usuários: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setModalMode('create');
        setSelectedUser(null);
        setGeneratedKey('');
        setCopied(false);
        setForm({
            username: '',
            validade: '',
            is_admin: false,
            permitir_protocolo: false,
            status: 'Ativo'
        });
        setShowModal(true);
    };

    const handleOpenEdit = (user) => {
        setModalMode('edit');
        setSelectedUser(user);
        setGeneratedKey('');
        setCopied(false);
        setForm({
            username: user.username,
            validade: user.validade || '',
            is_admin: user.is_admin,
            permitir_protocolo: user.permitir_protocolo,
            status: user.status
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            if (modalMode === 'create') {
                const res = await api.post('/auth/admin/users', {
                    username: form.username,
                    validade: form.validade || null,
                    is_admin: form.is_admin,
                    permitir_protocolo: form.permitir_protocolo,
                    status: form.status
                });
                setGeneratedKey(res.data.api_key);
                setModalMode('view_key'); // Change mode to only show the generated key
                loadUsers();
            } else {
                await api.put(`/auth/admin/users/${selectedUser.id}`, {
                    username: form.username,
                    validade: form.validade || '',
                    is_admin: form.is_admin,
                    permitir_protocolo: form.permitir_protocolo,
                    status: form.status
                });
                setShowModal(false);
                loadUsers();
            }
        } catch (err) {
            setError('Erro ao salvar usuário: ' + (err.response?.data?.detail || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleRegenerateKey = async (user) => {
        const confirmMsg = `Tem certeza que deseja REGERAR a chave de acesso do usuário "${user.username}"?\nA chave antiga será invalidada imediatamente!`;
        if (!window.confirm(confirmMsg)) return;
        
        setLoading(true);
        setError('');
        try {
            const res = await api.post(`/auth/admin/users/${user.id}/regenerate-key`);
            setGeneratedKey(res.data.api_key);
            setSelectedUser(user);
            setModalMode('view_key');
            setShowModal(true);
            loadUsers();
        } catch (err) {
            setError('Erro ao regerar chave: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleCopyKey = () => {
        navigator.clipboard.writeText(generatedKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100">Gestão de Usuários</h1>
                        <p className="text-sm text-slate-400">Gerencie usuários, permissões de administradores e chaves de acesso à API.</p>
                    </div>
                </div>
                <button
                    onClick={handleOpenCreate}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    <Plus size={16} /> Novo Usuário
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="m-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
                    <ShieldAlert size={20} className="shrink-0" />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {/* Table Area */}
            <div className="flex-1 overflow-auto">
                {loading && users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                        <span className="text-sm text-slate-400">Carregando usuários...</span>
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <Users size={48} className="mb-2 opacity-50" />
                        <p className="text-sm">Nenhum usuário cadastrado.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase bg-slate-950/20">
                                <th className="px-6 py-4">Usuário</th>
                                <th className="px-6 py-4">Chave API (Masked)</th>
                                <th className="px-6 py-4">Perfil</th>
                                <th className="px-6 py-4">Protocolo</th>
                                <th className="px-6 py-4">Vencimento</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-800/20 transition-colors text-slate-300 text-sm">
                                    <td className="px-6 py-4 font-medium text-slate-100">{u.username}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{u.api_key_masked}</td>
                                    <td className="px-6 py-4">
                                        {u.is_admin ? (
                                            <span className="px-2 py-1 text-xs font-semibold bg-purple-500/10 text-purple-400 rounded-full">
                                                Admin
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs font-semibold bg-slate-800 text-slate-400 rounded-full">
                                                Cliente
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {u.permitir_protocolo ? (
                                            <span className="text-emerald-400 text-xs font-medium">Permitido</span>
                                        ) : (
                                            <span className="text-slate-500 text-xs">Bloqueado</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {u.validade ? (
                                            <span className={new Date(u.validade) < new Date() ? 'text-red-400 font-medium' : ''}>
                                                {new Date(u.validade).toLocaleDateString('pt-BR')}
                                            </span>
                                        ) : (
                                            <span className="text-slate-500 italic">Ilimitada</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${u.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {u.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenEdit(u)}
                                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleRegenerateKey(u)}
                                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-lg transition-colors"
                                                title="Regerar Chave de Acesso"
                                            >
                                                <Key size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                        {modalMode === 'view_key' ? (
                            // View Key Mode (Safety Alert showing generated key only once)
                            <div className="p-6">
                                <div className="flex items-center gap-3 text-emerald-400 mb-4">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                                        <Key size={24} />
                                    </div>
                                    <h2 className="text-lg font-bold text-slate-100">Chave Gerada com Sucesso</h2>
                                </div>
                                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                                    Copie a chave abaixo. Por motivos de segurança, ela **NÃO** será exibida novamente no sistema!
                                </p>
                                
                                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-sm text-emerald-400 select-all break-all relative">
                                    <span className="flex-1">{generatedKey}</span>
                                    <button
                                        onClick={handleCopyKey}
                                        className="shrink-0 p-2 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors text-slate-300 hover:text-white"
                                        title="Copiar para área de transferência"
                                    >
                                        {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                                    </button>
                                </div>
                                
                                <div className="mt-8 flex justify-end">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                    >
                                        Concluído
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Create / Edit Form Mode
                            <form onSubmit={handleSubmit}>
                                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/25">
                                    <h2 className="text-lg font-bold text-slate-100">
                                        {modalMode === 'create' ? 'Novo Usuário' : 'Editar Usuário'}
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="text-slate-400 hover:text-slate-200 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="p-6 space-y-4">
                                    {/* Username */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                            Nome do Usuário / Clínica
                                        </label>
                                        <input
                                            type="text"
                                            value={form.username}
                                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                                            className="w-full bg-slate-850 text-white border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                                            placeholder="Ex: Clínica Alpha"
                                            required
                                            disabled={modalMode === 'edit'} // Username cannot be changed
                                        />
                                    </div>

                                    {/* Expiration Date */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                            Data de Expiração (Opcional)
                                        </label>
                                        <input
                                            type="date"
                                            value={form.validade}
                                            onChange={(e) => setForm({ ...form, validade: e.target.value })}
                                            className="w-full bg-slate-850 text-white border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    {/* Admin Profile Checkbox */}
                                    <div className="flex items-center gap-3 bg-slate-950/20 border border-slate-800 rounded-lg p-3">
                                        <input
                                            type="checkbox"
                                            id="is_admin"
                                            checked={form.is_admin}
                                            onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
                                            className="h-4 w-4 bg-slate-800 border-slate-700 text-blue-600 rounded focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                        />
                                        <label htmlFor="is_admin" className="text-sm font-medium text-slate-300 cursor-pointer select-none">
                                            Perfil Administrador (Admin)
                                        </label>
                                    </div>

                                    {/* Protocol Permit Checkbox */}
                                    <div className="flex items-center gap-3 bg-slate-950/20 border border-slate-800 rounded-lg p-3">
                                        <input
                                            type="checkbox"
                                            id="permitir_protocolo"
                                            checked={form.permitir_protocolo}
                                            onChange={(e) => setForm({ ...form, permitir_protocolo: e.target.checked })}
                                            className="h-4 w-4 bg-slate-800 border-slate-700 text-blue-600 rounded focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                        />
                                        <label htmlFor="permitir_protocolo" className="text-sm font-medium text-slate-300 cursor-pointer select-none">
                                            Permitir Módulo Protocolo Fichas
                                        </label>
                                    </div>

                                    {/* Status (Ativo/Inativo) */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                            Status do Usuário
                                        </label>
                                        <select
                                            value={form.status}
                                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                                            className="w-full bg-slate-850 text-white border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
                                        >
                                            <option value="Ativo">Ativo</option>
                                            <option value="Inativo">Inativo</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/25">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {saving && <Loader2 className="animate-spin shrink-0" size={16} />}
                                        Salvar
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
