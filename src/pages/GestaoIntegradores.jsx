import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    Layers, Cpu, Server, Key, Plus, Trash2, Loader2, Check, AlertCircle, Edit3, RefreshCw, Sliders, ChevronDown, ChevronUp, Zap, Hand, Settings, X, CalendarClock, Play
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const parseJsonArray = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            return [];
        }
    }
    return [];
};

export default function GestaoIntegradores() {
    const [integradores, setIntegradores] = useState([]);
    const [workerKeys, setWorkerKeys] = useState([]);
    const [crons, setCrons] = useState([]);
    const [config, setConfig] = useState({ max_servers: 7, dispatch_stagger_seconds: 15 });
    const [users, setUsers] = useState([]);
    const [convenios, setConvenios] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [activeTab, setActiveTab] = useState('integradores');
    const [expandedIntegradorId, setExpandedIntegradorId] = useState(null);

    // Modal state for Worker Key
    // Modal state for Worker Key
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [createModalError, setCreateModalError] = useState('');
    const [createModalSuccess, setCreateModalSuccess] = useState('');
    const [keyForm, setKeyForm] = useState({
        api_key: '',
        user_id: '',
        tipo_processamento: 'local',
        servers: [{ server_num: 1, tipo_operacao: 'convenio' }],
        dispatch_stagger_seconds: 15,
        descricao: ''
    });

    // Modal state for Edit Worker
    const [showEditWorkerModal, setShowEditWorkerModal] = useState(false);
    const [editModalError, setEditModalError] = useState('');
    const [editModalSuccess, setEditModalSuccess] = useState('');
    const [editWorkerForm, setEditWorkerForm] = useState({
        id: null,
        worker_key: '',
        api_key: '',
        username: '',
        tipo_processamento: 'local',
        servers: [{ server_num: 1, tipo_operacao: 'convenio' }],
        dispatch_stagger_seconds: 15,
        priority_rules: [],
        descricao: '',
        ativo: true
    });

    // Handlers para Servidores e Regras de Prioridade
    const handleAddServerToKeyForm = () => {
        setKeyForm(prev => ({
            ...prev,
            servers: [...prev.servers, { server_num: prev.servers.length + 1, tipo_operacao: 'convenio' }]
        }));
    };

    const handleRemoveServerFromKeyForm = (index) => {
        setKeyForm(prev => {
            const updated = prev.servers.filter((_, i) => i !== index).map((s, i) => ({ ...s, server_num: i + 1 }));
            return { ...prev, servers: updated.length > 0 ? updated : [{ server_num: 1, tipo_operacao: 'convenio' }] };
        });
    };

    const handleServerTypeChangeKeyForm = (index, newType) => {
        setKeyForm(prev => {
            const updated = [...prev.servers];
            updated[index] = { ...updated[index], tipo_operacao: newType };
            return { ...prev, servers: updated };
        });
    };

    const handleAddServerToEditForm = () => {
        setEditWorkerForm(prev => ({
            ...prev,
            servers: [...prev.servers, { server_num: prev.servers.length + 1, tipo_operacao: 'convenio' }]
        }));
    };

    const handleRemoveServerFromEditForm = (index) => {
        setEditWorkerForm(prev => {
            const updated = prev.servers.filter((_, i) => i !== index).map((s, i) => ({ ...s, server_num: i + 1 }));
            return { ...prev, servers: updated.length > 0 ? updated : [{ server_num: 1, tipo_operacao: 'convenio' }] };
        });
    };

    const handleServerTypeChangeEditForm = (index, newType) => {
        setEditWorkerForm(prev => {
            const updated = [...prev.servers];
            updated[index] = { ...updated[index], tipo_operacao: newType };
            return { ...prev, servers: updated };
        });
    };

    const handleAddRuleToEditForm = () => {
        setEditWorkerForm(prev => ({
            ...prev,
            priority_rules: [
                ...prev.priority_rules,
                { id_convenio_preferencial: '', rotina_preferencial: '', preference_bonus: 1, base_priority: 2, escalation_minutes: 10 }
            ]
        }));
    };

    const handleRemoveRuleFromEditForm = (index) => {
        setEditWorkerForm(prev => ({
            ...prev,
            priority_rules: prev.priority_rules.filter((_, i) => i !== index)
        }));
    };

    const handleRuleChangeEditForm = (index, field, value) => {
        setEditWorkerForm(prev => {
            const updated = [...prev.priority_rules];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, priority_rules: updated };
        });
    };

    // Modal state for New Operation
    const [showOpModal, setShowOpModal] = useState(false);
    const [opForm, setOpForm] = useState({
        id_integrador: '',
        rotina: '',
        descricao: '',
        tipo_processamento: 'local',
        ativo: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const [ingRes, wkRes, cfgRes, usrRes, convRes, cronRes] = await Promise.all([
                api.get('/integradores/'),
                api.get('/integradores/worker-keys').catch(() => ({ data: [] })),
                api.get('/integradores/config').catch(() => ({ data: { max_servers: 7, dispatch_stagger_seconds: 15 } })),
                api.get('/auth/admin/users').catch(() => api.get('/auth/users')).catch(() => ({ data: [] })),
                api.get('/convenios/').catch(() => ({ data: [] })),
                api.get('/crons').catch(() => ({ data: [] }))
            ]);

            setIntegradores(ingRes.data || []);
            const normalizedKeys = (wkRes.data || []).map(k => ({
                ...k,
                servers: parseJsonArray(k.servers),
                priority_rules: parseJsonArray(k.priority_rules)
            }));
            setWorkerKeys(normalizedKeys);
            setCrons(cronRes.data || []);
            setConfig(cfgRes.data || { max_servers: 7, dispatch_stagger_seconds: 15 });
            setUsers(usrRes.data || []);
            setConvenios(convRes.data || []);
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
            setOpForm({ id_integrador: '', rotina: '', descricao: '', tipo_processamento: 'local', ativo: true });
            loadData();
        } catch (err) {
            setError('Erro ao criar operação');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateKey = async (e) => {
        e.preventDefault();
        setCreateModalError('');
        setCreateModalSuccess('');
        if (!keyForm.api_key || !keyForm.user_id) {
            setCreateModalError('Preencha a API Key e selecione um Usuário.');
            return;
        }
        setSaving(true);
        try {
            const res = await api.post('/integradores/worker-keys', {
                api_key: keyForm.api_key,
                user_id: parseInt(keyForm.user_id),
                tipo_processamento: keyForm.tipo_processamento,
                servers: keyForm.servers,
                max_servers: keyForm.servers.length,
                dispatch_stagger_seconds: parseInt(keyForm.dispatch_stagger_seconds) || 15,
                descricao: keyForm.descricao
            });
            const wKey = res.data?.worker_key || '';
            setCreateModalSuccess(`Worker cadastrado com sucesso! (Código Worker de Login: ${wKey})`);
            setSuccessMsg(`Chave API de Worker criada com sucesso! (Código Worker: ${wKey})`);
            await loadData();
            setActiveTab('workers');
            setTimeout(() => {
                setShowKeyModal(false);
                setCreateModalSuccess('');
                setKeyForm({
                    api_key: '',
                    user_id: '',
                    tipo_processamento: 'local',
                    servers: [{ server_num: 1, tipo_operacao: 'convenio' }],
                    dispatch_stagger_seconds: 15,
                    descricao: ''
                });
            }, 1800);
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || 'Erro ao criar chave de worker';
            setCreateModalError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleEditWorkerOpen = (worker) => {
        setEditModalError('');
        setEditModalSuccess('');
        let srvs = parseJsonArray(worker.servers);
        if (srvs.length === 0) {
            srvs = Array.from({ length: worker.max_servers || 1 }, (_, i) => ({
                server_num: i + 1,
                tipo_operacao: worker.tipo_operacao || 'convenio'
            }));
        }

        let rules = parseJsonArray(worker.priority_rules);
        if (rules.length === 0 && (worker.id_convenio_preferencial || worker.rotina_preferencial)) {
            rules = [{
                id_convenio_preferencial: worker.id_convenio_preferencial || '',
                rotina_preferencial: worker.rotina_preferencial || '',
                preference_bonus: worker.preference_bonus !== undefined ? worker.preference_bonus : 1,
                base_priority: worker.base_priority !== undefined ? worker.base_priority : 2,
                escalation_minutes: worker.escalation_minutes || 10
            }];
        }

        setEditWorkerForm({
            id: worker.id,
            worker_key: worker.worker_key || '',
            api_key: worker.api_key || '',
            username: worker.username || '',
            tipo_processamento: worker.tipo_processamento || 'local',
            servers: srvs,
            dispatch_stagger_seconds: worker.dispatch_stagger_seconds || 15,
            priority_rules: rules,
            descricao: worker.descricao || '',
            ativo: worker.ativo !== false
        });
        setShowEditWorkerModal(true);
    };

    const handleSaveEditWorker = async (e) => {
        e.preventDefault();
        if (!editWorkerForm.id) return;
        setEditModalError('');
        setEditModalSuccess('');
        setSaving(true);
        try {
            await api.put(`/integradores/worker-keys/${editWorkerForm.id}`, {
                tipo_processamento: editWorkerForm.tipo_processamento,
                servers: editWorkerForm.servers,
                max_servers: editWorkerForm.servers.length,
                dispatch_stagger_seconds: parseInt(editWorkerForm.dispatch_stagger_seconds) || 15,
                priority_rules: editWorkerForm.priority_rules,
                descricao: editWorkerForm.descricao,
                ativo: editWorkerForm.ativo
            });
            setSuccessMsg('Worker atualizado com sucesso!');
            await loadData();
            setActiveTab('workers');
            setShowEditWorkerModal(false);
            setEditModalSuccess('');
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || 'Erro ao atualizar worker';
            setEditModalError(msg);
        } finally {
            setSaving(false);
        }
    };

    // ── Handlers do Painel de Agendamentos (Cron) ──
    const handleCronFieldChange = (cronId, field, value) => {
        setCrons(prev => prev.map(c => c.id === cronId ? { ...c, [field]: value } : c));
    };

    const handleSaveCron = async (cron) => {
        setSaving(true);
        setError('');
        setSuccessMsg('');
        try {
            await api.put(`/crons/${cron.id}`, {
                enabled: !!cron.enabled,
                horario: cron.horario || '23:01',
                rotina: cron.rotina
            });
            setSuccessMsg(`Agendamento do integrador "${cron.nome_integrador}" salvo com sucesso!`);
            setTimeout(() => setSuccessMsg(''), 4000);
            await loadData();
        } catch (err) {
            setError('Erro ao salvar agendamento: ' + (err.response?.data?.detail || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleRunCronNow = async (cron) => {
        if (!window.confirm(`Executar AGORA o job ${cron.rotina} para todas as carteirinhas ativas do integrador "${cron.nome_integrador}"?`)) return;
        setSaving(true);
        setError('');
        setSuccessMsg('');
        try {
            const res = await api.post(`/crons/${cron.id}/run-now`);
            setSuccessMsg(`Cron executado: ${res.data?.jobs_criados ?? 0} jobs criados (${res.data?.carteirinhas ?? 0} carteirinhas, ${res.data?.grupos_pulados_sem_credencial ?? 0} grupos pulados).`);
            setTimeout(() => setSuccessMsg(''), 6000);
            await loadData();
        } catch (err) {
            setError('Erro ao executar cron: ' + (err.response?.data?.detail || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteWorker = async (id) => {
        if (!window.confirm('Tem certeza que deseja remover este worker?')) return;
        try {
            await api.delete(`/integradores/worker-keys/${id}`);            setSuccessMsg('Worker removido com sucesso!');
            loadData();
        } catch (err) {
            setError('Erro ao remover worker');
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

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                        <Cpu className="text-indigo-400" size={28} />
                        Gestão de Integradores & Workers
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Configure integradores, timeout de captura, operações de portal e servidores worker de automação.
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
                    className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
                        activeTab === 'integradores'
                            ? 'border-indigo-500 text-indigo-300 font-bold'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Layers size={18} /> Integradores & Operações ({integradores.length})
                </button>

                <button
                    onClick={() => setActiveTab('workers')}
                    className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
                        activeTab === 'workers'
                            ? 'border-indigo-500 text-indigo-300 font-bold'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Server size={18} /> Scaling, Workers & Prioridades ({workerKeys.length})
                </button>

                <button
                    onClick={() => setActiveTab('crons')}
                    className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-colors border-b-2 ${
                        activeTab === 'crons'
                            ? 'border-indigo-500 text-indigo-300 font-bold'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <CalendarClock size={18} /> Agendamentos / Cron ({crons.length})
                </button>
            </div>

            {/* TAB 1: INTEGRADORES COM OPERAÇÕES INLINE */}
            {activeTab === 'integradores' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        {integradores.map(ing => {
                            const isExpanded = expandedIntegradorId === ing.id_integrador;
                            return (
                                <Card key={ing.id_integrador} className="p-5 border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all space-y-4">
                                    {/* Main Integrator Info Row */}
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-indigo-400 font-bold">
                                                ID #{ing.id_integrador}
                                            </span>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-lg text-slate-100">{ing.nome}</h3>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                                        ing.tipo_operacao === 'agendamento' 
                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                    }`}>
                                                        {ing.tipo_operacao === 'agendamento' ? '🟢 Agendamento' : '🔵 Convênio'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 font-mono mt-0.5">Sigla: {ing.sigla || 'N/A'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 flex-wrap">
                                            {/* Toggle Timeout de Captura (59min) */}
                                            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                                                <span className="text-xs text-slate-300 font-medium">Timeout de Captura (59min):</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleTimeout(ing)}
                                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                        ing.timeout_captura ? 'bg-indigo-600' : 'bg-slate-700'
                                                    }`}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                            ing.timeout_captura ? 'translate-x-4' : 'translate-x-0'
                                                        }`}
                                                    />
                                                </button>
                                            </div>

                                            {/* Status Ativo */}
                                            <Button 
                                                size="sm" 
                                                variant={ing.ativo ? 'secondary' : 'primary'}
                                                onClick={() => handleToggleIntegrador(ing)}
                                                className="text-xs"
                                            >
                                                {ing.ativo ? '● Ativo' : '○ Inativo'}
                                            </Button>

                                            {/* Botão Expansor de Operações */}
                                            <button
                                                onClick={() => setExpandedIntegradorId(isExpanded ? null : ing.id_integrador)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                                    isExpanded 
                                                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40' 
                                                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                                                }`}
                                            >
                                                <Cpu size={14} />
                                                Operações ({ing.operacoes?.length || 0})
                                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* INLINE OPERATIONS PANEL */}
                                    {isExpanded && (
                                        <div className="pt-4 border-t border-slate-800 space-y-3 animate-fade-in bg-slate-950/40 p-4 rounded-xl">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                                    <Cpu className="text-indigo-400" size={16} />
                                                    Rotinas e Processamento do Integrador {ing.nome}
                                                </span>

                                                <Button 
                                                    size="sm"
                                                    className="bg-indigo-600 hover:bg-indigo-500 text-xs flex items-center gap-1.5"
                                                    onClick={() => {
                                                        setOpForm({ id_integrador: ing.id_integrador, rotina: '', descricao: '', tipo_processamento: 'local', ativo: true });
                                                        setShowOpModal(true);
                                                    }}
                                                >
                                                    <Plus size={14} /> Adicionar Operação
                                                </Button>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs text-left text-slate-300">
                                                    <thead className="text-[10px] text-slate-400 uppercase bg-slate-950/80 border-b border-slate-800">
                                                        <tr>
                                                            <th className="px-4 py-2.5">Rotina Worker</th>
                                                            <th className="px-4 py-2.5">Descrição</th>
                                                            <th className="px-4 py-2.5">Tipo Processamento</th>
                                                            <th className="px-4 py-2.5">Status</th>
                                                            <th className="px-4 py-2.5 text-right">Ação</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800/60">
                                                        {(ing.operacoes || []).length > 0 ? (
                                                            ing.operacoes.map(op => (
                                                                <tr key={op.id} className="hover:bg-slate-800/30 transition-colors">
                                                                    <td className="px-4 py-2.5 font-mono font-bold text-indigo-400">{op.rotina}</td>
                                                                    <td className="px-4 py-2.5 text-slate-300">{op.descricao || 'Sem descrição'}</td>
                                                                    <td className="px-4 py-2.5">
                                                                        <select
                                                                            value={op.tipo_processamento || 'local'}
                                                                            onChange={e => handleChangeTipoProc(op, e.target.value)}
                                                                            className="bg-slate-900 border border-slate-700 text-xs rounded px-2 py-1 text-slate-200"
                                                                        >
                                                                            <option value="local">Local (Dono/User)</option>
                                                                            <option value="server">Server (Compartilhado)</option>
                                                                            <option value="remoto">Remoto (Admin VPS)</option>
                                                                        </select>
                                                                    </td>
                                                                    <td className="px-4 py-2.5">
                                                                        <span className={`font-semibold ${op.ativo ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                            {op.ativo ? '● Ativo' : '○ Inativo'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-right">
                                                                        <Button
                                                                            size="xs"
                                                                            variant={op.ativo ? "secondary" : "primary"}
                                                                            onClick={() => handleToggleOperacao(op)}
                                                                        >
                                                                            {op.ativo ? 'Desativar' : 'Ativar'}
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={5} className="px-4 py-6 text-center text-slate-500 italic">
                                                                    Nenhuma rotina cadastrada para este integrador.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB 2: SCALING, WORKERS & PRIORIDADES */}
            {activeTab === 'workers' && (
                <div className="space-y-6">
                    {/* Worker API Keys Section */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div className="p-5 bg-slate-950/60 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2.5">
                                    <Server className="text-indigo-400" size={22} />
                                    Servidores & Workers Cadastrados
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Cada worker gerencia seu tipo de operação (Agendamento / Convênio / Misto), scaling individual e regras de prioridade.
                                </p>
                            </div>

                            <Button size="sm" onClick={() => setShowKeyModal(true)} className="bg-indigo-600 hover:bg-indigo-500 flex items-center gap-2">
                                <Plus size={16} /> Novo Worker / Servidor
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left text-slate-300">
                                <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/80 border-b border-slate-800 tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3.5">Código Worker (Login)</th>
                                        <th className="px-5 py-3.5">Usuário Vinculado</th>
                                        <th className="px-5 py-3.5">Tipo do Server</th>
                                        <th className="px-5 py-3.5">Processamento</th>
                                        <th className="px-5 py-3.5">Scaling Individual</th>
                                        <th className="px-5 py-3.5">Regras de Prioridade (Worker)</th>
                                        <th className="px-5 py-3.5">Status</th>
                                        <th className="px-5 py-3.5 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {workerKeys && workerKeys.length > 0 ? (
                                        workerKeys.map(k => (
                                            <tr key={k.id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="font-mono text-cyan-400 font-bold text-sm">{k.worker_key || '—'}</div>
                                                    <div className="font-mono text-amber-400/80 text-[11px] mt-0.5">{k.api_key}</div>
                                                    {k.descricao && <div className="text-[10px] text-slate-500 italic mt-0.5">{k.descricao}</div>}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="font-medium text-slate-200">{k.username || `User #${k.user_id}`}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {Array.isArray(k.servers) && k.servers.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                                                            {k.servers.map((srv, idx) => (
                                                                <span key={idx} className={`text-[11px] px-2 py-0.5 rounded-md font-medium border inline-flex items-center gap-1 ${
                                                                    srv.tipo_operacao === 'agendamento' 
                                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                                }`}>
                                                                    Srv#{srv.server_num || idx + 1}: {srv.tipo_operacao === 'agendamento' ? '🟢 Agendamento' : '🔵 Convênio'}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1.5 ${
                                                            k.tipo_operacao === 'agendamento' 
                                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                        }`}>
                                                            {k.tipo_operacao === 'agendamento' ? '🟢 Agendamento' : '🔵 Convênio'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 font-semibold">
                                                    <span className="px-2 py-1 bg-slate-950 rounded border border-slate-800 text-slate-300 font-mono text-[11px]">
                                                        {k.tipo_processamento}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="space-y-1">
                                                        <span className="text-slate-200 font-medium font-mono text-xs">
                                                            {k.max_servers} {k.max_servers === 1 ? 'instância' : 'instâncias'}
                                                        </span>
                                                        <div className="text-[11px] text-slate-400">
                                                            Stagger: <span className="text-indigo-300 font-mono font-bold">{k.dispatch_stagger_seconds}s</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {Array.isArray(k.priority_rules) && k.priority_rules.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {k.priority_rules.map((rule, idx) => {
                                                                const conv = convenios.find(c => c.id_convenio == rule.id_convenio_preferencial);
                                                                return (
                                                                    <div key={idx} className="text-xs bg-slate-950/60 p-1.5 rounded border border-slate-800 space-y-0.5">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded text-[10px] font-bold">
                                                                                +{rule.preference_bonus || 1} Bônus
                                                                            </span>
                                                                            <span className="font-semibold text-slate-200 text-[11px]">
                                                                                {conv ? conv.nome : (rule.id_convenio_preferencial ? `Convênio #${rule.id_convenio_preferencial}` : 'Qualquer Convênio')}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-400 font-mono">
                                                                            Rotina: <span className="text-indigo-300">{rule.rotina_preferencial || 'Todas'}</span> • Base P{rule.base_priority !== undefined ? rule.base_priority : 2} ({rule.escalation_minutes || 10}m)
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (k.id_convenio_preferencial || k.rotina_preferencial ? (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                                    +{k.preference_bonus} Bônus
                                                                </span>
                                                                <span className="font-semibold text-slate-200 text-xs">
                                                                    {k.nome_convenio_preferencial || `Convênio #${k.id_convenio_preferencial}`}
                                                                </span>
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-mono">
                                                                Rotina: <span className="text-indigo-300">{k.rotina_preferencial || 'Todas'}</span> • Base P{k.base_priority} ({k.escalation_minutes}m)
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-500 text-xs italic">
                                                            Padrão (Sem preferência)
                                                        </span>
                                                    ))}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`text-xs font-semibold inline-flex items-center gap-1.5 ${k.ativo ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {k.ativo ? <Check size={14} /> : <AlertCircle size={14} />}
                                                        {k.ativo ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            size="xs"
                                                            variant="secondary"
                                                            onClick={() => handleEditWorkerOpen(k)}
                                                            className="text-xs flex items-center gap-1 px-2.5 py-1.5"
                                                        >
                                                            <Edit3 size={13} /> Editar
                                                        </Button>
                                                        <Button
                                                            size="xs"
                                                            variant="danger"
                                                            onClick={() => handleDeleteWorker(k.id)}
                                                            className="text-xs p-1.5"
                                                        >
                                                            <Trash2 size={13} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                                                Nenhum worker cadastrado. Clique em <strong>Novo Worker / Servidor</strong> para adicionar.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: AGENDAMENTOS / CRON */}
            {activeTab === 'crons' && (
                <div className="space-y-4">
                    <Card className="p-4 bg-slate-900/60 border-slate-800 space-y-2">
                        <p className="text-xs text-slate-400">
                            <strong className="text-slate-200">Consulta de guias — lote diário</strong>: cria jobs da rotina configurada para <strong className="text-slate-200">todas as carteirinhas ativas</strong> dos convênios do integrador.
                            Executa no horário definido (fuso de Brasília por padrão) com guarda de execução no banco — não duplica após restart, e executa em atraso se o servidor estava fora do ar.
                            Pendentes há mais de 24h sem processar são <strong className="text-slate-200">apagados automaticamente</strong> (retenção).
                        </p>
                        <p className="text-[11px] text-amber-300/80 border-t border-slate-800 pt-2">
                            ⚠️ Não confundir com a <strong>execução de sessões</strong> (job por agendamento, ex.: op3_execucao): esse controle fica em <strong>Gestão de Convênios → Modo de Execução (Automático/Manual)</strong> e nas flags <code>auto_executar</code> das credenciais — é um fluxo distinto deste lote de consulta.
                        </p>
                    </Card>

                    {loading ? (
                        <div className="p-12 flex justify-center items-center text-slate-400 gap-3">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                            <span>Carregando agendamentos...</span>
                        </div>
                    ) : crons.length === 0 ? (
                        <Card className="p-8 text-center text-slate-500">
                            Nenhum agendamento configurado (insira um registro em <code className="text-slate-300">cron_configs</code> ou via API <code className="text-slate-300">PUT /api/crons</code>).
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {crons.map(cron => (
                                <Card key={cron.id} className="p-5 border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all space-y-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-800 text-indigo-400 font-bold">
                                                Integrador #{cron.id_integrador}
                                            </span>
                                            <h3 className="font-bold text-lg text-white">{cron.nome_integrador}</h3>
                                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold"
                                                  title={`Rotina do lote: ${cron.rotina}`}>
                                                {cron.descricao || 'Lote diário'}
                                            </span>
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${cron.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                                {cron.enabled ? 'Habilitado' : 'Desabilitado'}
                                            </span>
                                            {(cron.jobs_pendentes > 0 || cron.jobs_pendentes_antigos > 0) && (
                                                <span
                                                    className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${cron.jobs_pendentes_antigos > 0 ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}
                                                    title="Jobs do cron ainda não processados pela frota. Pendentes há mais de 24h são apagados automaticamente pela retenção."
                                                >
                                                    {cron.jobs_pendentes_antigos > 0
                                                        ? `${cron.jobs_pendentes_antigos} pendente(s) > 24h (serão apagados)`
                                                        : `${cron.jobs_pendentes} pendente(s)`}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 flex-wrap">
                                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={!!cron.enabled}
                                                    onChange={(e) => handleCronFieldChange(cron.id, 'enabled', e.target.checked)}
                                                    className="rounded border-slate-700 text-indigo-600 focus:ring-0 bg-slate-900 w-4 h-4 cursor-pointer"
                                                />
                                                Ativo
                                            </label>

                                            <label className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                                                Horário:
                                                <input
                                                    type="time"
                                                    value={cron.horario || '23:01'}
                                                    onChange={(e) => handleCronFieldChange(cron.id, 'horario', e.target.value)}
                                                    className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                                                />
                                            </label>

                                            <span className="text-[11px] text-slate-500">Rotina: <code className="text-slate-300">{cron.rotina}</code></span>

                                            <Button
                                                size="sm"
                                                variant="primary"
                                                onClick={() => handleSaveCron(cron)}
                                                disabled={saving}
                                                className="text-xs py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 flex items-center gap-1"
                                            >
                                                <Check size={14} /> Salvar
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleRunCronNow(cron)}
                                                disabled={saving}
                                                className="text-xs py-1.5 px-3 flex items-center gap-1 border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                                title="Dispara o cron imediatamente, independente do horário"
                                            >
                                                <Play size={14} /> Executar Agora
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <span>Fuso: <strong className="text-slate-200">{cron.fuso}</strong></span>
                                        <span>Última execução: <strong className="text-slate-200">{cron.ultimo_run ? new Date(cron.ultimo_run + 'T12:00:00').toLocaleDateString('pt-BR') : 'nunca'}</strong></span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <Card className="w-full max-w-lg p-6 bg-slate-900 border border-slate-800 space-y-5 my-8">
                        <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                            <Server className="text-indigo-400" size={20} />
                            Cadastrar Novo Worker
                        </h3>

                        {createModalError && (
                            <div className="bg-red-950/80 border border-red-800 text-red-300 p-3 rounded-lg text-xs flex items-center justify-between">
                                <span>{createModalError}</span>
                                <button type="button" onClick={() => setCreateModalError('')}><X size={14} /></button>
                            </div>
                        )}

                        {createModalSuccess && (
                            <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 p-3 rounded-lg text-xs flex items-center justify-between">
                                <span>{createModalSuccess}</span>
                                <button type="button" onClick={() => setCreateModalSuccess('')}><X size={14} /></button>
                            </div>
                        )}

                        <form onSubmit={handleCreateKey} className="space-y-4">
                            {/* Identificação */}
                            <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                    1. Identificação & Credenciais
                                </span>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">API Key do Worker *:</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            required
                                            value={keyForm.api_key}
                                            onChange={e => setKeyForm(prev => ({ ...prev, api_key: e.target.value }))}
                                            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 w-full font-mono"
                                            placeholder="wk_..."
                                        />
                                        <Button type="button" variant="secondary" size="sm" onClick={generateRandomKey}>Gerar</Button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Usuário Vinculado *:</label>
                                    <select
                                        required
                                        value={keyForm.user_id}
                                        onChange={e => setKeyForm(prev => ({ ...prev, user_id: e.target.value }))}
                                        className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 w-full"
                                    >
                                        <option value="">Selecione um usuário...</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>
                                                User #{u.id} - {u.username} {u.is_admin ? '(Admin)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Tipo de Processamento & Stagger */}
                            <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                    2. Configurações Globais do Worker
                                </span>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Tipo Processamento *:</label>
                                        <select
                                            value={keyForm.tipo_processamento}
                                            onChange={e => setKeyForm(prev => ({ ...prev, tipo_processamento: e.target.value }))}
                                            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 w-full"
                                        >
                                            <option value="local">Local</option>
                                            <option value="server">Server</option>
                                            <option value="remoto">Remoto</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Dispatch Stagger (s):</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="300"
                                            value={keyForm.dispatch_stagger_seconds}
                                            onChange={e => setKeyForm(prev => ({ ...prev, dispatch_stagger_seconds: parseInt(e.target.value) || 15 }))}
                                            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 w-full"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Descrição do Worker:</label>
                                    <input
                                        type="text"
                                        value={keyForm.descricao}
                                        onChange={e => setKeyForm(prev => ({ ...prev, descricao: e.target.value }))}
                                        className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 w-full"
                                        placeholder="Ex: Worker Consultório 01"
                                    />
                                </div>
                            </div>

                            {/* Servidores do Worker */}
                            <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                        3. Servidores do Worker ({keyForm.servers.length})
                                    </span>
                                    <Button type="button" variant="secondary" size="sm" onClick={handleAddServerToKeyForm} className="flex items-center gap-1 text-xs">
                                        <Plus size={14} /> Add Server
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {keyForm.servers.map((srv, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                                            <span className="text-xs font-bold text-slate-400 shrink-0 w-20">Server #{idx + 1}:</span>
                                            <select
                                                value={srv.tipo_operacao}
                                                onChange={e => handleServerTypeChangeKeyForm(idx, e.target.value)}
                                                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md p-2 flex-1"
                                            >
                                                <option value="convenio">🔵 Convênio</option>
                                                <option value="agendamento">🟢 Agendamento</option>
                                            </select>
                                            {keyForm.servers.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveServerFromKeyForm(idx)}
                                                    className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                                                    title="Remover Servidor"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3">
                                <Button type="button" variant="secondary" onClick={() => setShowKeyModal(false)}>Cancelar</Button>
                                <Button type="submit" disabled={saving}>Salvar Worker</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal Editar Worker */}
            {showEditWorkerModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <Card className="w-full max-w-xl p-6 bg-slate-900 border border-slate-800 space-y-5 my-8">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                                <Edit3 className="text-indigo-400" size={18} />
                                Editar Worker: <span className="font-mono text-cyan-400">{editWorkerForm.worker_key}</span>
                            </h3>
                            <span className="text-xs text-slate-400">{editWorkerForm.username}</span>
                        </div>

                        {editModalError && (
                            <div className="bg-red-950/80 border border-red-800 text-red-300 p-3 rounded-lg text-xs flex items-center justify-between">
                                <span>{editModalError}</span>
                                <button type="button" onClick={() => setEditModalError('')}><X size={14} /></button>
                            </div>
                        )}

                        {editModalSuccess && (
                            <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 p-3 rounded-lg text-xs flex items-center justify-between">
                                <span>{editModalSuccess}</span>
                                <button type="button" onClick={() => setEditModalSuccess('')}><X size={14} /></button>
                            </div>
                        )}

                        <form onSubmit={handleSaveEditWorker} className="space-y-4">
                            {/* Tipo e Processamento */}
                            <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                    1. Processamento & Stagger
                                </span>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Tipo Processamento *:</label>
                                        <select
                                            value={editWorkerForm.tipo_processamento}
                                            onChange={e => setEditWorkerForm(prev => ({ ...prev, tipo_processamento: e.target.value }))}
                                            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 w-full"
                                        >
                                            <option value="local">Local</option>
                                            <option value="server">Server</option>
                                            <option value="remoto">Remoto</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Dispatch Stagger (s):</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="300"
                                            value={editWorkerForm.dispatch_stagger_seconds}
                                            onChange={e => setEditWorkerForm(prev => ({ ...prev, dispatch_stagger_seconds: parseInt(e.target.value) || 15 }))}
                                            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 w-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Servidores do Worker */}
                            <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                        2. Servidores do Worker ({editWorkerForm.servers.length})
                                    </span>
                                    <Button type="button" variant="secondary" size="sm" onClick={handleAddServerToEditForm} className="flex items-center gap-1 text-xs">
                                        <Plus size={14} /> Add Server
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {editWorkerForm.servers.map((srv, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                                            <span className="text-xs font-bold text-slate-400 shrink-0 w-20">Server #{idx + 1}:</span>
                                            <select
                                                value={srv.tipo_operacao}
                                                onChange={e => handleServerTypeChangeEditForm(idx, e.target.value)}
                                                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md p-2 flex-1"
                                            >
                                                <option value="convenio">🔵 Convênio</option>
                                                <option value="agendamento">🟢 Agendamento</option>
                                            </select>
                                            {editWorkerForm.servers.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveServerFromEditForm(idx)}
                                                    className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                                                    title="Remover Servidor"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Regras de Prioridade (Facultativo - Múltiplas Regras) */}
                            <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                        3. Regras de Prioridade & Preferência (Facultativo)
                                    </span>
                                    <Button type="button" variant="secondary" size="sm" onClick={handleAddRuleToEditForm} className="flex items-center gap-1 text-xs">
                                        <Plus size={14} /> Add Regra
                                    </Button>
                                </div>

                                {editWorkerForm.priority_rules.length === 0 ? (
                                    <p className="text-xs text-slate-500 italic py-1">Nenhuma regra de prioridade configurada para este worker.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {editWorkerForm.priority_rules.map((rule, idx) => (
                                            <div key={idx} className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                                                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                                    <span className="text-xs font-semibold text-slate-400">Regra #{idx + 1}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveRuleFromEditForm(idx)}
                                                        className="text-slate-500 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
                                                    >
                                                        <Trash2 size={13} /> Remover Regra
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[11px] text-slate-400 block mb-1">Convênio Preferencial:</label>
                                                        <select
                                                            value={rule.id_convenio_preferencial || ''}
                                                            onChange={e => handleRuleChangeEditForm(idx, 'id_convenio_preferencial', e.target.value)}
                                                            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md p-2 w-full"
                                                        >
                                                            <option value="">Qualquer Convênio</option>
                                                            {convenios.map(c => (
                                                                <option key={c.id_convenio} value={c.id_convenio}>
                                                                    #{c.id_convenio} - {c.nome}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="text-[11px] text-slate-400 block mb-1">Rotina Preferencial:</label>
                                                        <select
                                                            value={rule.rotina_preferencial || ''}
                                                            onChange={e => handleRuleChangeEditForm(idx, 'rotina_preferencial', e.target.value)}
                                                            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md p-2 w-full"
                                                        >
                                                            <option value="">Qualquer Rotina</option>
                                                            <option value="op1_consulta">op1_consulta (Consulta Base)</option>
                                                            <option value="op2_captura">op2_captura (Captura Guias)</option>
                                                            <option value="op3_execucao">op3_execucao (SADT)</option>
                                                            <option value="op4_finalizados">op4_finalizados (Faturamento)</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 pt-1">
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 block mb-0.5">Bônus Prio:</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="5"
                                                            value={rule.preference_bonus !== undefined ? rule.preference_bonus : 1}
                                                            onChange={e => handleRuleChangeEditForm(idx, 'preference_bonus', parseInt(e.target.value) || 1)}
                                                            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md p-1.5 w-full"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] text-slate-400 block mb-0.5">Prio Base:</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="5"
                                                            value={rule.base_priority !== undefined ? rule.base_priority : 2}
                                                            onChange={e => handleRuleChangeEditForm(idx, 'base_priority', parseInt(e.target.value) || 2)}
                                                            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md p-1.5 w-full"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] text-slate-400 block mb-0.5">Escalada (min):</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="120"
                                                            value={rule.escalation_minutes || 10}
                                                            onChange={e => handleRuleChangeEditForm(idx, 'escalation_minutes', parseInt(e.target.value) || 10)}
                                                            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md p-1.5 w-full"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Descrição do Worker:</label>
                                <input
                                    type="text"
                                    value={editWorkerForm.descricao}
                                    onChange={e => setEditWorkerForm(prev => ({ ...prev, descricao: e.target.value }))}
                                    className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 w-full"
                                />
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <label className="text-xs text-slate-300 font-semibold">Status do Worker:</label>
                                <button
                                    type="button"
                                    onClick={() => setEditWorkerForm(prev => ({ ...prev, ativo: !prev.ativo }))}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                        editWorkerForm.ativo ? 'bg-indigo-600' : 'bg-slate-700'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            editWorkerForm.ativo ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>

                            <div className="flex justify-end gap-3 pt-3">
                                <Button type="button" variant="secondary" onClick={() => setShowEditWorkerModal(false)}>Cancelar</Button>
                                <Button type="submit" disabled={saving}>Salvar Alterações</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
