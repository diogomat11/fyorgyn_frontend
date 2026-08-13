import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Users, Plus, X, Edit2, Loader2, ShieldAlert, Check, Power, ShieldCheck, Lock } from 'lucide-react';

const MODULE_DEFINITIONS = [
    {
        key: 'workflow_faturamento',
        label: 'Workflow Faturamento',
        actions: [
            { key: 'visualizar', label: 'Visualizar Módulo' },
            { key: 'filtrar', label: 'Aplicar Filtros' },
            { key: 'sincronizar', label: 'Sincronizar Agendamentos' },
            { key: 'executar_faturamento', label: 'Executar Faturamento' },
            { key: 'alterar_status', label: 'Alterar Status / Conciliar' }
        ]
    },
    {
        key: 'agendamentos',
        label: 'Agendamentos',
        actions: [
            { key: 'visualizar', label: 'Visualizar Agendamentos' },
            { key: 'filtrar', label: 'Filtrar por Período / Unidade' },
            { key: 'sincronizar', label: 'Sincronizar Integrador' },
            { key: 'editar', label: 'Editar Dados' }
        ]
    },
    {
        key: 'guias',
        label: 'Autorizações & Guias',
        actions: [
            { key: 'visualizar', label: 'Visualizar Guias' },
            { key: 'solicitar', label: 'Nova Solicitação' },
            { key: 'imprimir', label: 'Imprimir Comprovante IPASGO' }
        ]
    },
    {
        key: 'faturamento_lotes',
        label: 'Lotes - Convênios & Agendamentos',
        actions: [
            { key: 'visualizar', label: 'Visualizar Lotes' },
            { key: 'criar', label: 'Gerar Novo Lote' },
            { key: 'enviar', label: 'Transmitir / Enviar Lote' }
        ]
    }
];

const DEFAULT_PERMISSIONS = {
    agendamento: {
        workflow_faturamento: { visualizar: true, filtrar: true, sincronizar: true, executar_faturamento: false, alterar_status: false },
        agendamentos: { visualizar: true, filtrar: true, sincronizar: true, editar: true },
        guias: { visualizar: true, solicitar: false, imprimir: true },
        faturamento_lotes: { visualizar: false, criar: false, enviar: false }
    },
    faturamento: {
        workflow_faturamento: { visualizar: true, filtrar: true, sincronizar: true, executar_faturamento: true, alterar_status: true },
        agendamentos: { visualizar: true, filtrar: true, sincronizar: true, editar: true },
        guias: { visualizar: true, solicitar: true, imprimir: true },
        faturamento_lotes: { visualizar: true, criar: true, enviar: true }
    },
    supervisor: {
        workflow_faturamento: { visualizar: true, filtrar: true, sincronizar: true, executar_faturamento: true, alterar_status: true },
        agendamentos: { visualizar: true, filtrar: true, sincronizar: true, editar: true },
        guias: { visualizar: true, solicitar: true, imprimir: true },
        faturamento_lotes: { visualizar: true, criar: true, enviar: true }
    }
};

export default function GestaoUsuarios() {
    const [subUsers, setSubUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedUser, setSelectedUser] = useState(null);

    const [form, setForm] = useState({
        username: '',
        login: '',
        senha: '',
        perfil: 'agendamento',
        prefixo_identificacao: 'R1',
        worker_key: '',
        permissoes: DEFAULT_PERMISSIONS.agendamento
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/auth/client-users');
            setSubUsers(res.data);
        } catch (err) {
            setError('Erro ao carregar usuários: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handlePerfilChange = (newPerfil) => {
        setForm(prev => ({
            ...prev,
            perfil: newPerfil,
            permissoes: DEFAULT_PERMISSIONS[newPerfil] || DEFAULT_PERMISSIONS.agendamento
        }));
    };

    const handleTogglePermission = (modKey, actKey) => {
        setForm(prev => {
            const modPerms = prev.permissoes[modKey] || {};
            const currentVal = modPerms[actKey] ?? false;
            return {
                ...prev,
                permissoes: {
                    ...prev.permissoes,
                    [modKey]: {
                        ...modPerms,
                        [actKey]: !currentVal
                    }
                }
            };
        });
    };

    const handleOpenCreate = () => {
        setModalMode('create');
        setSelectedUser(null);
        setForm({
            username: '',
            login: '',
            senha: '',
            perfil: 'agendamento',
            prefixo_identificacao: 'R1',
            worker_key: '',
            permissoes: DEFAULT_PERMISSIONS.agendamento
        });
        setShowModal(true);
    };

    const handleOpenEdit = (user) => {
        setModalMode('edit');
        setSelectedUser(user);
        setForm({
            username: user.username || '',
            login: user.login || '',
            senha: '',
            perfil: user.perfil || 'agendamento',
            prefixo_identificacao: user.prefixo_identificacao || '',
            worker_key: user.worker_keys && user.worker_keys.length > 0 ? user.worker_keys[0] : '',
            permissoes: user.permissoes || DEFAULT_PERMISSIONS[user.perfil || 'agendamento'] || DEFAULT_PERMISSIONS.agendamento
        });
        setShowModal(true);
    };

    const handleToggleStatus = async (user) => {
        setError('');
        try {
            await api.patch(`/auth/client-users/${user.id}/status`);
            loadData();
        } catch (err) {
            setError('Erro ao alterar status: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        setSaving(true);
        try {
            if (modalMode === 'create') {
                await api.post('/auth/client-users', {
                    username: form.username,
                    login: form.login,
                    senha: form.senha,
                    perfil: form.perfil,
                    prefixo_identificacao: form.prefixo_identificacao.trim() || undefined,
                    worker_key: form.worker_key.trim() || undefined,
                    permissoes: form.permissoes
                });
            } else if (modalMode === 'edit' && selectedUser) {
                await api.put(`/auth/client-users/${selectedUser.id}`, {
                    username: form.username,
                    login: form.login,
                    senha: form.senha.trim() || undefined,
                    perfil: form.perfil,
                    prefixo_identificacao: form.prefixo_identificacao.trim() || undefined,
                    worker_key: form.worker_key.trim() || undefined,
                    permissoes: form.permissoes
                });
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            setError('Erro ao salvar usuário: ' + (err.response?.data?.detail || err.message));
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
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100">Gestão de Usuários da Clínica</h1>
                        <p className="text-sm text-slate-400">Cadastre e gerencie operadores da clínica definindo perfis, prefixos e matriz granular de permissões.</p>
                    </div>
                </div>
                <button
                    onClick={handleOpenCreate}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    <Plus size={16} /> Novo Usuário
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
                        <span className="text-sm text-slate-400">Carregando usuários...</span>
                    </div>
                ) : subUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <Users size={48} className="mb-2 opacity-50 text-cyan-500" />
                        <p className="text-sm">Nenhum sub-usuário cadastrado.</p>
                        <p className="text-xs text-slate-600 mt-1">Clique em "Novo Usuário" para cadastrar recepcionistas ou faturistas.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase bg-slate-950/30">
                                <th className="px-4 py-3">Nome / Operador</th>
                                <th className="px-4 py-3">Login</th>
                                <th className="px-4 py-3">Perfil</th>
                                <th className="px-4 py-3">Prefixo</th>
                                <th className="px-4 py-3">Worker Key</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {subUsers.map(u => (
                                <tr key={u.id} className="hover:bg-slate-800/30 transition-colors text-slate-300">
                                    <td className="px-4 py-3 font-medium text-slate-100">{u.username}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-cyan-400">{u.login}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                            u.perfil === 'supervisor' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                            u.perfil === 'faturamento' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                            'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                        }`}>
                                            {u.perfil ? u.perfil.toUpperCase() : 'AGENDAMENTO'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-200">
                                        {u.prefixo_identificacao ? (
                                            <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-300 font-bold">
                                                {u.prefixo_identificacao}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                                        {u.worker_keys && u.worker_keys.length > 0 ? u.worker_keys.join(', ') : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                            u.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                        }`}>
                                            {u.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenEdit(u)}
                                                title="Editar Permissões do Usuário"
                                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 rounded-lg transition-colors border border-slate-700"
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(u)}
                                                title={u.status === 'Ativo' ? 'Inativar Usuário' : 'Ativar Usuário'}
                                                className={`p-1.5 rounded-lg transition-colors border ${
                                                    u.status === 'Ativo' 
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
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/40 shrink-0">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="text-cyan-400" size={20} />
                                <h2 className="text-lg font-bold text-slate-100">
                                    {modalMode === 'create' ? 'Novo Usuário da Clínica' : 'Editar Usuário da Clínica'}
                                </h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto scrollbar-none flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nome Completo</label>
                                    <input
                                        type="text"
                                        value={form.username}
                                        onChange={e => setForm({ ...form, username: e.target.value })}
                                        placeholder="Ex: Recepção 1"
                                        className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Login de Acesso</label>
                                    <input
                                        type="text"
                                        value={form.login}
                                        onChange={e => setForm({ ...form, login: e.target.value })}
                                        placeholder="Ex: recepcao1"
                                        className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Senha</label>
                                    <input
                                        type="password"
                                        value={form.senha}
                                        onChange={e => setForm({ ...form, senha: e.target.value })}
                                        placeholder={modalMode === 'create' ? 'Senha inicial' : 'Nova senha (ou em branco)'}
                                        className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500"
                                        required={modalMode === 'create'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Perfil Operacional</label>
                                    <select
                                        value={form.perfil}
                                        onChange={e => handlePerfilChange(e.target.value)}
                                        className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500"
                                    >
                                        <option value="agendamento">Agendamento (Receber & Agendar)</option>
                                        <option value="faturamento">Faturamento (Operar Lotes & Faturar)</option>
                                        <option value="supervisor">Supervisor (Acesso Completo)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                                        Prefixo Identificação
                                    </label>
                                    <input
                                        type="text"
                                        value={form.prefixo_identificacao}
                                        onChange={e => setForm({ ...form, prefixo_identificacao: e.target.value.toUpperCase() })}
                                        placeholder="Ex: R1, R2, A1, O1"
                                        className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:border-cyan-500 uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                                        Worker Key (Opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={form.worker_key}
                                        onChange={e => setForm({ ...form, worker_key: e.target.value })}
                                        placeholder="Ex: WRK-10B16E (opcional)"
                                        className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:border-cyan-500"
                                    />
                                </div>
                            </div>

                            {/* Matriz Granular de Permissões por Módulos e Ações */}
                            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4 mt-2">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                            <Lock size={14} className="text-cyan-400" /> Matriz de Permissões por Módulo e Botões de Ação
                                        </h3>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Defina precisamente quais botões de ação e operações este operador pode executar.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {MODULE_DEFINITIONS.map(mod => {
                                        const modPerms = form.permissoes[mod.key] || {};
                                        return (
                                            <div key={mod.key} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                                                <span className="text-xs font-bold text-cyan-400 mb-2 block">{mod.label}</span>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {mod.actions.map(act => {
                                                        const isChecked = modPerms[act.key] ?? false;
                                                        return (
                                                            <div
                                                                key={act.key}
                                                                onClick={() => handleTogglePermission(mod.key, act.key)}
                                                                className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                                                                    isChecked 
                                                                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200' 
                                                                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                                                                }`}
                                                            >
                                                                <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${isChecked ? 'border-cyan-400 bg-cyan-500 text-black' : 'border-slate-600'}`}>
                                                                    {isChecked && <Check size={12} />}
                                                                </div>
                                                                <span>{act.label}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800 shrink-0">
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
                                    Salvar Usuário & Permissões
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
