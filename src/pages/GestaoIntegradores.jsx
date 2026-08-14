import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    Layers, Cpu, Server, Key, Plus, Trash2, Loader2, Check, AlertCircle, Edit3, RefreshCw, Sliders
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function GestaoIntegradores() {
    const [integradores, setIntegradores] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [workerKeys, setWorkerKeys] = useState([]);
    const [config, setConfig] = useState({ max_servers: 7, dispatch_stagger_seconds: 15 });
    const [users, setUsers] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [activeTab, setActiveTab] = useState('integradores');
    const [selectedIntegradorId, setSelectedIntegradorId] = useState('');

    // Modal state
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [keyForm, setKeyForm] = useState({
        api_key: '',
        user_id: '',
        tipo_processamento: 'local',
        descricao: ''
    });

    const [showOpModal, setShowOpModal] = useState(false);
    const [opForm, setOpForm] = useState({
        id_integrador: '',
        rotina: '',
        descricao: '',
        tipo_processamento: 'local',
        ativo: true,
        ordem: 0
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const [ingRes, wkRes, cfgRes, usrRes] = await Promise.all([
                api.get('/integradores/'),
                api.get('/integradores/worker-keys').catch(() => ({ data: [] })),
                api.get('/integradores/config').catch(() => ({ data: { max_servers: 7, dispatch_stagger_seconds: 15 } })),
                api.get('/auth/admin/users').catch(() => api.get('/auth/users')).catch(() => ({ data: [] }))
            ]);

            setIntegradores(ingRes.data || []);
            setWorkerKeys(wkRes.data || []);
            setConfig(cfgRes.data || { max_servers: 7, dispatch_stagger_seconds: 15 });
            setUsers(usrRes.data || []);
            
            if (ingRes.data && ingRes.data.length > 0 && !selectedIntegradorId) {
                setSelectedIntegradorId(ingRes.data[0].id_integrador);
            }
        } catch (err) {
            console.error(err);
            setError('Erro ao carregar dados dos integradores');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleIntegrador = async (ing) => {
        try {
            await api.put(`/integradores/${ing.id_integrador}`, { ativo: !ing.ativo });
            setSuccessMsg(`Integrador ${ing.nome} ${!ing.ativo ? 'ativado' : 'desativado'} com sucesso!`);
            loadData();
        } catch (err) {
            setError('Falha ao atualizar integrador');
        }
    };

    const handleToggleOperacao = async (op) => {
        try {
            await api.put(`/integradores/operacoes/${op.id}`, { ativo: !op.ativo });
            loadData();
        } catch (err) {
            setError('Falha ao atualizar operação');
        }
    };

    const handleChangeTipoProc = async (op, newTipo) => {
        try {
            await api.put(`/integradores/operacoes/${op.id}`, { tipo_processamento: newTipo });
            setSuccessMsg(`Tipo de processamento da rotina ${op.rotina} alterado para ${newTipo}`);
            loadData();
        } catch (err) {
            setError('Falha ao alterar tipo de processamento');
        }
    };

    const handleCreateOp = async (e) => {
        e.preventDefault();
        if (!opForm.id_integrador || !opForm.rotina) return;
        setSaving(true);
        try {
            await api.post(`/integradores/${opForm.id_integrador}/operacoes`, opForm);
            setSuccessMsg('Operação adicionada com sucesso!');
            setShowOpModal(false);
            setOpForm({ id_integrador: '', rotina: '', descricao: '', tipo_processamento: 'local', ativo: true, ordem: 0 });
            loadData();
        } catch (err) {
            setError('Erro ao criar operação');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateKey = async (e) => {
        e.preventDefault();
        if (!keyForm.api_key || !keyForm.user_id) return;
        setSaving(true);
        try {
            const res = await api.post('/integradores/worker-keys', keyForm);
            const wKey = res.data?.worker_key ? ` (Código Worker para Login: ${res.data.worker_key})` : '';
            setSuccessMsg(`Chave API de Worker criada com sucesso!${wKey}`);
            setShowKeyModal(false);
            setKeyForm({ api_key: '', user_id: '', tipo_processamento: 'local', descricao: '' });
            loadData();
        } catch (err) {
            setError('Erro ao criar chave de worker');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveConfig = async () => {
        setSaving(true);
        try {
            await api.put('/integradores/config', config);
            setSuccessMsg('Configuração global de workers salva com sucesso!');
        } catch (err) {
            setError('Erro ao salvar configuração');
        } finally {
            setSaving(false);
        }
    };

    const generateRandomKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let res = 'wk_';
        for (let i = 0; i < 24; i++) {
            res += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setKeyForm(prev => ({ ...prev, api_key: res }));
    };

    const handleToggleTimeout = async (ing) => {
        try {
            await api.put(`/integradores/${ing.id_integrador}`, { timeout_captura: !ing.timeout_captura });
            setSuccessMsg(`Timeout de captura do integrador ${ing.nome} ${!ing.timeout_captura ? 'ativado (59min)' : 'desativado'}!`);
            loadData();
        } catch (err) {
            setError('Falha ao atualizar timeout de captura');
        }
    };

    const selectedIng = integradores.find(i => String(i.id_integrador) === String(selectedIntegradorId));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                        <Cpu className="text-primary" size={28} />
                        Gestão de Integradores & Workers
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Gerenciamento unificado de integradores, timeout de captura, rotinas e servidores worker.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button onClick={loadData} variant="secondary" className="flex items-center gap-2">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Atualizar
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-3 text-sm">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-3 text-sm">
                    <Check size={18} />
                    {successMsg}
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 gap-4">
                <button
                    onClick={() => setActiveTab('integradores')}
                    className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
                        activeTab === 'integradores'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Layers size={18} /> Integradores Cadastrados ({integradores.length})
                </button>

                <button
                    onClick={() => setActiveTab('operacoes')}
                    className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
                        activeTab === 'operacoes'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Cpu size={18} /> Operações & Processamento
                </button>

                <button
                    onClick={() => setActiveTab('workers')}
                    className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
                        activeTab === 'workers'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Server size={18} /> Scaling & Worker Keys
                </button>
            </div>

            {/* TAB 1: INTEGRADORES */}
            {activeTab === 'integradores' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {integradores.map(ing => (
                        <Card key={ing.id_integrador} className="p-5 flex flex-col justify-between border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                        ID #{ing.id_integrador}
                                    </span>

                                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                                        ing.tipo_operacao === 'agendamento' 
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                             : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    }`}>
                                        {ing.tipo_operacao === 'agendamento' ? '🟢 Agendamento' : '🔵 Convênio'}
                                    </span>
                                </div>

                                <h3 className="font-bold text-lg text-slate-100">{ing.nome}</h3>
                                <p className="text-xs text-slate-400 font-mono mt-1">Sigla: {ing.sigla || 'N/A'}</p>

                                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                                    <span>Rotinas cadastradas:</span>
                                    <span className="font-bold text-slate-200">{ing.operacoes?.length || 0}</span>
                                </div>

                                {/* Toggle Timeout de Captura (59min) */}
                                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-200 font-medium">Timeout de Captura (59min)</span>
                                        <span className="text-[10px] text-slate-400">Exibir contador TimeoutPie</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleTimeout(ing)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            ing.timeout_captura ? 'bg-primary' : 'bg-slate-700'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                ing.timeout_captura ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                                <span className={`text-xs font-semibold ${ing.ativo ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {ing.ativo ? '● Ativo' : '○ Inativo'}
                                </span>

                                <Button 
                                    size="sm" 
                                    variant={ing.ativo ? 'secondary' : 'primary'}
                                    onClick={() => handleToggleIntegrador(ing)}
                                >
                                    {ing.ativo ? 'Desativar' : 'Ativar'}
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* TAB 2: OPERACOES */}
            {activeTab === 'operacoes' && (
                <div className="space-y-6">
                    <Card className="p-4 bg-slate-900/40 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <label className="text-sm text-slate-400 font-semibold whitespace-nowrap">Selecione o Integrador:</label>
                            <select
                                value={selectedIntegradorId}
                                onChange={e => setSelectedIntegradorId(e.target.value)}
                                className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 w-full md:w-64 focus:ring-primary focus:border-primary"
                            >
                                {integradores.map(i => (
                                    <option key={i.id_integrador} value={i.id_integrador}>
                                        {i.nome} ({i.tipo_operacao})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedIng && (
                            <Button 
                                size="sm" 
                                className="flex items-center gap-2 w-full md:w-auto justify-center"
                                onClick={() => {
                                    setOpForm(prev => ({ ...prev, id_integrador: selectedIng.id_integrador }));
                                    setShowOpModal(true);
                                }}
                            >
                                <Plus size={16} /> Nova Operação
                            </Button>
                        )}
                    </Card>

                    {selectedIng && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                            <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between">
                                <h3 className="font-bold text-slate-200">
                                    Operações de {selectedIng.nome}
                                </h3>
                                <span className="text-xs text-slate-400 font-mono">
                                    Tipo Operação: {selectedIng.tipo_operacao}
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-slate-300">
                                    <thead className="text-xs text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
                                        <tr>
                                            <th className="px-6 py-3">Rotina</th>
                                            <th className="px-6 py-3">Descrição</th>
                                            <th className="px-6 py-3">Tipo Processamento</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {selectedIng.operacoes && selectedIng.operacoes.length > 0 ? (
                                            selectedIng.operacoes.map(op => (
                                                <tr key={op.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4 font-mono font-bold text-primary">{op.rotina}</td>
                                                    <td className="px-6 py-4">{op.descricao || 'Sem descrição'}</td>
                                                    <td className="px-6 py-4">
                                                        <select
                                                            value={op.tipo_processamento || 'local'}
                                                            onChange={e => handleChangeTipoProc(op, e.target.value)}
                                                            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-200"
                                                        >
                                                            <option value="local">Local (Dono/User)</option>
                                                            <option value="server">Server (Compartilhado)</option>
                                                            <option value="remoto">Remoto (Admin VPS)</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-xs font-semibold ${op.ativo ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {op.ativo ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button
                                                            size="xs"
                                                            variant="secondary"
                                                            onClick={() => handleToggleOperacao(op)}
                                                        >
                                                            {op.ativo ? 'Desativar' : 'Ativar'}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                                    Nenhuma operação cadastrada para este integrador.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: WORKERS & CONFIG */}
            {activeTab === 'workers' && (
                <div className="space-y-6">
                    {/* Global Server Scaling Config */}
                    <Card className="p-6 bg-slate-900 border border-slate-800 space-y-4">
                        <div className="flex items-center gap-3 text-slate-100 font-bold text-lg">
                            <Sliders className="text-primary" size={22} />
                            Configuração Global de Scaling (Workers)
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div>
                                <label className="text-sm font-semibold text-slate-300 block mb-2">
                                    Limite Máximo de Workers Simultâneos: <span className="text-primary font-bold">{config.max_servers}</span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={config.max_servers}
                                    onChange={e => setConfig(prev => ({ ...prev, max_servers: parseInt(e.target.value) }))}
                                    className="w-full accent-primary bg-slate-800 h-2 rounded-lg cursor-pointer"
                                />
                                <span className="text-xs text-slate-500 mt-1 block">Padrão do sistema: 7 servidores (5 Genéricos + 2 Agendamento)</span>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-300 block mb-2">
                                    Dispatch Stagger (segundos entre ciclos):
                                </label>
                                <input
                                    type="number"
                                    value={config.dispatch_stagger_seconds}
                                    onChange={e => setConfig(prev => ({ ...prev, dispatch_stagger_seconds: parseInt(e.target.value) }))}
                                    className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 w-full"
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <Button onClick={handleSaveConfig} disabled={saving} className="flex items-center gap-2">
                                {saving ? <Loader2 size= {16} className="animate-spin" /> : <Check size={16} />}
                                Salvar Configuração Global
                            </Button>
                        </div>
                    </Card>

                    {/* Worker API Keys Section */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Key className="text-amber-400" size={20} />
                                <h3 className="font-bold text-slate-200">Chaves API de Workers (Isolamento Multi-tenant)</h3>
                            </div>

                            <Button size="sm" onClick={() => setShowKeyModal(true)} className="flex items-center gap-2">
                                <Plus size={16} /> Nova Chave Worker
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-300">
                                <thead className="text-xs text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
                                    <tr>
                                        <th className="px-6 py-3">API Key (Worker)</th>
                                        <th className="px-6 py-3">Código Worker (Login)</th>
                                        <th className="px-6 py-3">User ID Vinculado</th>
                                        <th className="px-6 py-3">Tipo Processamento</th>
                                        <th className="px-6 py-3">Descrição</th>
                                        <th className="px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {workerKeys && workerKeys.length > 0 ? (
                                        workerKeys.map(k => (
                                            <tr key={k.id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4 font-mono text-amber-400">{k.api_key}</td>
                                                <td className="px-6 py-4 font-mono text-cyan-400 font-bold">{k.worker_key || '—'}</td>
                                                <td className="px-6 py-4">User #{k.user_id}</td>
                                                <td className="px-6 py-4 font-semibold text-xs">
                                                    <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700">
                                                        {k.tipo_processamento}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400">{k.descricao || 'Sem descrição'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs font-semibold ${k.ativo ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {k.ativo ? 'Ativa' : 'Inativa'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                                Nenhuma chave API de worker cadastrada.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Criar Operação */}
            {showOpModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 space-y-4">
                        <h3 className="font-bold text-lg text-slate-100">Nova Operação do Integrador</h3>

                        <form onSubmit={handleCreateOp} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Rotina (ex: op1_consulta):</label>
                                <input
                                    type="text"
                                    required
                                    value={opForm.rotina}
                                    onChange={e => setOpForm(prev => ({ ...prev, rotina: e.target.value }))}
                                    className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 w-full font-mono"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Descrição:</label>
                                <input
                                    type="text"
                                    value={opForm.descricao}
                                    onChange={e => setOpForm(prev => ({ ...prev, descricao: e.target.value }))}
                                    className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 w-full"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Tipo Processamento:</label>
                                <select
                                    value={opForm.tipo_processamento}
                                    onChange={e => setOpForm(prev => ({ ...prev, tipo_processamento: e.target.value }))}
                                    className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 w-full"
                                >
                                    <option value="local">Local</option>
                                    <option value="server">Server</option>
                                    <option value="remoto">Remoto</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-3">
                                <Button type="button" variant="secondary" onClick={() => setShowOpModal(false)}>Cancelar</Button>
                                <Button type="submit" disabled={saving}>Adicionar</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal Criar Worker Key */}
            {showKeyModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 space-y-4">
                        <h3 className="font-bold text-lg text-slate-100">Nova Chave API de Worker</h3>

                        <form onSubmit={handleCreateKey} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">API Key:</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        required
                                        value={keyForm.api_key}
                                        onChange={e => setKeyForm(prev => ({ ...prev, api_key: e.target.value }))}
                                        className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 w-full font-mono"
                                    />
                                    <Button type="button" variant="secondary" size="sm" onClick={generateRandomKey}>Gerar</Button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">User ID Vinculado:</label>
                                <select
                                    required
                                    value={keyForm.user_id}
                                    onChange={e => setKeyForm(prev => ({ ...prev, user_id: e.target.value }))}
                                    className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 w-full"
                                >
                                    <option value="">Selecione um usuário...</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>
                                            User #{u.id} - {u.username} {u.is_admin ? '(Admin)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Tipo Processamento:</label>
                                <select
                                    value={keyForm.tipo_processamento}
                                    onChange={e => setKeyForm(prev => ({ ...prev, tipo_processamento: e.target.value }))}
                                    className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 w-full"
                                >
                                    <option value="local">Local (Apenas User ID)</option>
                                    <option value="server">Server (User + Convênios vinculados)</option>
                                    <option value="remoto">Remoto (Admin / Todos os Users)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Descrição:</label>
                                <input
                                    type="text"
                                    value={keyForm.descricao}
                                    onChange={e => setKeyForm(prev => ({ ...prev, descricao: e.target.value }))}
                                    className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 w-full"
                                    placeholder="Ex: Worker Maquina Consultorio 01"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3">
                                <Button type="button" variant="secondary" onClick={() => setShowKeyModal(false)}>Cancelar</Button>
                                <Button type="submit" disabled={saving}>Salvar Chave</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
