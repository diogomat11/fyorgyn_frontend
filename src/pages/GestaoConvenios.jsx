import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { 
    Building2, Plus, X, Trash2, Loader2, ShieldAlert, Cpu, GitBranch, 
    Check, AlertCircle, Zap, Hand, Settings, ArrowDown, ArrowUp, Edit3, Play,
    GitCommit, Network, CornerDownRight, Split, Printer, FileText, RotateCcw,
    Layers, ArrowRight, Ban
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const GENERIC_ACTIONS = [
    { code: 'captura', label: 'Captura de Carteirinha / Elegibilidade', icon: Cpu, color: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' },
    { code: 'confirmar', label: 'Confirmar Agendamento no Portal', icon: Check, color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
    { code: 'executar', label: 'Executar / Validar Guia', icon: Play, color: 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10' },
    { code: 'registrar_falta', label: 'Registrar Falta no Portal', icon: AlertCircle, color: 'border-red-500/40 text-red-400 bg-red-500/10' },
    { code: 'remover_falta', label: 'Remover Falta do Portal', icon: RotateCcw, color: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
    { code: 'reverter_confirmacao', label: 'Reverter Confirmação', icon: RotateCcw, color: 'border-orange-500/40 text-orange-400 bg-orange-500/10' },
    { code: 'reverter_faturamento', label: 'Reverter Faturamento', icon: RotateCcw, color: 'border-pink-500/40 text-pink-400 bg-pink-500/10' },
    { code: 'faturar', label: 'Faturar Lote / Guia', icon: FileText, color: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
    { code: 'imprimir', label: 'Imprimir Guia / Comprovante', icon: Printer, color: 'border-purple-500/40 text-purple-400 bg-purple-500/10' },
    { code: 'nenhuma', label: 'Nenhuma (Apenas Transição no Hub)', icon: Ban, color: 'border-slate-600 text-slate-400 bg-slate-800/40' }
];

export default function GestaoConvenios() {
    const [assignments, setAssignments] = useState([]);
    const [workflows, setWorkflows] = useState([]);
    const [users, setUsers] = useState([]);
    const [convenios, setConvenios] = useState([]);
    const [workerConvenios, setWorkerConvenios] = useState([]);
    const [operacoes, setOperacoes] = useState([]);
    const [availableOperacoes, setAvailableOperacoes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [activeTab, setActiveTab] = useState('workflows_custom');

    // Modal state
    const [showWorkflowModal, setShowWorkflowModal] = useState(false);
    const [editingWorkflowId, setEditingWorkflowId] = useState(null);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [wfForm, setWfForm] = useState({
        user_id: '',
        id_convenio: '',
        nome_workflow: '',
        fluxo_passos: []
    });

    const canvasRef = useRef(null);
    const nodeRefs = useRef({});
    const [svgLines, setSvgLines] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    // Strict OP Filter when Convênio changes
    useEffect(() => {
        if (!wfForm.id_convenio) {
            setAvailableOperacoes([]);
            return;
        }
        api.get(`/convenios/worker-operacoes?id_convenio=${wfForm.id_convenio}`)
            .then(res => setAvailableOperacoes(res.data))
            .catch(console.error);
    }, [wfForm.id_convenio]);

    // Recalculate SVG Connector Lines whenever nodes update or window resizes
    useEffect(() => {
        if (!showWorkflowModal) return;
        const timer = setTimeout(recalculateSvgLines, 100);
        window.addEventListener('resize', recalculateSvgLines);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', recalculateSvgLines);
        };
    }, [showWorkflowModal, wfForm.fluxo_passos]);

    const recalculateSvgLines = () => {
        if (!canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const lines = [];

        wfForm.fluxo_passos.forEach(parent => {
            const parentEl = nodeRefs.current[parent.id];
            if (!parentEl) return;
            const parentRect = parentEl.getBoundingClientRect();

            const pX = parentRect.left + parentRect.width / 2 - canvasRect.left;
            const pY = parentRect.bottom - canvasRect.top;

            (parent.next_nodes || []).forEach(childId => {
                const childEl = nodeRefs.current[childId];
                if (!childEl) return;
                const childRect = childEl.getBoundingClientRect();

                const cX = childRect.left + childRect.width / 2 - canvasRect.left;
                const cY = childRect.top - canvasRect.top;

                // Bezier Curve
                const controlY1 = pY + Math.min(80, Math.max(30, (cY - pY) / 2));
                const controlY2 = cY - Math.min(80, Math.max(30, (cY - pY) / 2));

                lines.push({
                    id: `${parent.id}->${childId}`,
                    d: `M ${pX} ${pY} C ${pX} ${controlY1}, ${cX} ${controlY2}, ${cX} ${cY}`
                });
            });
        });

        setSvgLines(lines);
    };

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const [assignRes, wfRes, userRes, convRes, workerRes, opsRes] = await Promise.all([
                api.get('/convenios/user-assignments'),
                api.get('/workflows/'),
                api.get('/auth/admin/users'),
                api.get('/convenios/all'),
                api.get('/convenios/worker-convenios'),
                api.get('/convenios/worker-operacoes')
            ]);
            setAssignments(assignRes.data);
            setWorkflows(wfRes.data);
            setUsers(userRes.data);
            setConvenios(convRes.data);
            setWorkerConvenios(workerRes.data);
            setOperacoes(opsRes.data);
        } catch (err) {
            setError('Erro ao carregar dados: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    const automatedWorkerIds = new Set(workerConvenios.map(w => w.id_convenio));
    const automatableConvenios = convenios.filter(c => automatedWorkerIds.has(c.id_convenio) || [101, 100, 6, 3, 2, 8, 9, 21, 31].includes(c.id_convenio));

    // Open Blank Mind Map Canvas Modal
    const handleOpenBlankWorkflowModal = () => {
        const initialUserId = users[0]?.id || '';
        const initialConvId = automatableConvenios[0]?.id_convenio || convenios[0]?.id_convenio || '';
        const initialConvObj = convenios.find(c => c.id_convenio === initialConvId);

        setEditingWorkflowId(null);
        setSelectedNodeId(null);
        setWfForm({
            user_id: initialUserId,
            id_convenio: initialConvId,
            nome_workflow: initialConvObj ? `Workflow Mapa Mental ${initialConvObj.nome}` : 'Novo Mapa Mental de Workflow',
            fluxo_passos: [] // Starts BLANK
        });
        setShowWorkflowModal(true);
    };

    const handleEditWorkflow = (wf) => {
        setEditingWorkflowId(wf.id);
        setSelectedNodeId(null);
        setWfForm({
            user_id: wf.user_id,
            id_convenio: wf.id_convenio,
            nome_workflow: wf.nome_workflow,
            fluxo_passos: wf.fluxo_passos || []
        });
        setShowWorkflowModal(true);
    };

    // Graph Nodes
    const handleAddRootNode = () => {
        const nodeId = `node_${Date.now()}_${Math.floor(Math.random()*1000)}`;
        const defaultAction = GENERIC_ACTIONS[0].code;
        const matchingOp = availableOperacoes[0]?.rotina || 'none';

        const newNode = {
            id: nodeId,
            nome_passo: 'Nó Raiz: Captura',
            acao: defaultAction,
            codigo_rotina: matchingOp,
            modo_execucao: 'automatico',
            next_nodes: []
        };

        setWfForm(prev => ({
            ...prev,
            fluxo_passos: [...prev.fluxo_passos, newNode]
        }));
        setSelectedNodeId(nodeId);
    };

    const handleAddParallelBranch = (parentId) => {
        const childId = `node_${Date.now()}_${Math.floor(Math.random()*1000)}`;
        const defaultAction = GENERIC_ACTIONS[1].code;
        const matchingOp = availableOperacoes[0]?.rotina || 'none';

        const childNode = {
            id: childId,
            nome_passo: `Nó Filharada: ${GENERIC_ACTIONS[1].label.split(' (')[0]}`,
            acao: defaultAction,
            codigo_rotina: matchingOp,
            modo_execucao: 'automatico',
            next_nodes: []
        };

        setWfForm(prev => {
            const updated = prev.fluxo_passos.map(node => {
                if (node.id === parentId) {
                    return {
                        ...node,
                        next_nodes: [...(node.next_nodes || []), childId]
                    };
                }
                return node;
            });
            return {
                ...prev,
                fluxo_passos: [...updated, childNode]
            };
        });
        setSelectedNodeId(childId);
    };

    const handleUpdateNode = (nodeId, field, value) => {
        setWfForm(prev => {
            const updated = prev.fluxo_passos.map(node => {
                if (node.id === nodeId) {
                    const nodeUpdated = { ...node, [field]: value };
                    if (field === 'acao') {
                        const actObj = GENERIC_ACTIONS.find(a => a.code === value);
                        if (actObj) {
                            nodeUpdated.nome_passo = actObj.label;
                        }
                    }
                    return nodeUpdated;
                }
                return node;
            });
            return { ...prev, fluxo_passos: updated };
        });
    };

    const handleRemoveNode = (nodeId) => {
        setWfForm(prev => {
            const filtered = prev.fluxo_passos.filter(n => n.id !== nodeId).map(n => ({
                ...n,
                next_nodes: (n.next_nodes || []).filter(id => id !== nodeId)
            }));
            return { ...prev, fluxo_passos: filtered };
        });
        if (selectedNodeId === nodeId) setSelectedNodeId(null);
    };

    const handleSaveWorkflow = async (e) => {
        e.preventDefault();
        if (!wfForm.user_id || !wfForm.id_convenio) {
            alert('Por favor selecione Usuário e Convênio.');
            return;
        }

        setSaving(true);
        try {
            // Clean payload format
            const payload = {
                user_id: parseInt(wfForm.user_id),
                id_convenio: parseInt(wfForm.id_convenio),
                nome_workflow: wfForm.nome_workflow || 'Mapa Mental de Workflow',
                fluxo_passos: wfForm.fluxo_passos.map(n => ({
                    id: n.id,
                    nome_passo: n.nome_passo || 'Nó',
                    acao: n.acao || 'nenhuma',
                    codigo_rotina: n.codigo_rotina || 'none',
                    modo_execucao: n.modo_execucao || 'automatico',
                    next_nodes: n.next_nodes || []
                }))
            };
            const res = await api.post('/workflows/', payload);
            alert(res.data.message || "Workflow salvo com sucesso!");
            setShowWorkflowModal(false);
            loadData();
        } catch (err) {
            alert('Erro ao salvar workflow: ' + (err.response?.data?.detail || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteWorkflow = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir este mapa mental de workflow?')) return;
        try {
            await api.delete(`/workflows/${id}`);
            loadData();
        } catch (err) {
            alert('Erro ao excluir workflow: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleToggleOperacao = async (opId, currentAtivo) => {
        try {
            await api.put(`/convenios/worker-operacoes/${opId}`, { ativo: !currentAtivo });
            loadData();
        } catch (err) {
            alert('Erro ao alterar status da operação: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleChangeModoExecucao = async (opId, newModo) => {
        try {
            await api.put(`/convenios/worker-operacoes/${opId}`, { modo_execucao: newModo });
            loadData();
        } catch (err) {
            alert('Erro ao alterar modo de execução: ' + (err.response?.data?.detail || err.message));
        }
    };

    const selectedNodeObj = wfForm.fluxo_passos.find(n => n.id === selectedNodeId);

    return (
        <div className="p-4 md:p-6 space-y-6 pb-24 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <Network className="text-indigo-400 w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white">Mapa Mental & Gestão de Workflows</h1>
                        <p className="text-sm text-slate-400 mt-1">Crie diagramas visuais de nós encadeados com suporte a ramificações paralelas e filtro por convênio.</p>
                    </div>
                </div>
                {activeTab === 'workflows_custom' && (
                    <Button onClick={handleOpenBlankWorkflowModal} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20">
                        <Plus className="w-5 h-5" />
                        Criar Mapa Mental de Workflow (Em Branco)
                    </Button>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-3 border-b border-slate-800 pb-2 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('workflows_custom')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
                        activeTab === 'workflows_custom' 
                            ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' 
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Network className="w-4 h-4" /> Mapas Mentais (Nós Paralelos)
                </button>
                <button
                    onClick={() => setActiveTab('atribuicoes')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
                        activeTab === 'atribuicoes' 
                            ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' 
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Building2 className="w-4 h-4" /> Atribuições Usuário x Convênio
                </button>
                <button
                    onClick={() => setActiveTab('rotinas')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
                        activeTab === 'rotinas' 
                            ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' 
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Settings className="w-4 h-4" /> Operações do Worker
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Tab 1: Mapas Mentais (Nós Paralelos) */}
            {activeTab === 'workflows_custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {loading ? (
                        <div className="col-span-2 p-12 flex justify-center items-center text-slate-400 gap-3">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                            <span>Carregando mapas mentais de workflows...</span>
                        </div>
                    ) : workflows.map(wf => (
                        <Card key={wf.id} className="p-6 border-slate-800 space-y-4 hover:border-indigo-500/40 transition-all">
                            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Network className="w-5 h-5 text-indigo-400" />
                                        {wf.nome_workflow}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                        <span>Usuário: <strong className="text-slate-200">{wf.username}</strong></span>
                                        <span>•</span>
                                        <span>Convênio: <strong className="text-indigo-300">#{wf.id_convenio} - {wf.nome_convenio}</strong></span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleEditWorkflow(wf)}
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 transition-colors"
                                        title="Editar Workflow"
                                    >
                                        <Edit3 size={15} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteWorkflow(wf.id)}
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-red-400 transition-colors"
                                        title="Excluir Workflow"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>

                            {/* Node Graph Summary */}
                            <div className="space-y-2">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Grafo de Nós Configurados:</span>
                                {wf.fluxo_passos && wf.fluxo_passos.length > 0 ? (
                                    <div className="space-y-2">
                                        {wf.fluxo_passos.map((step, idx) => {
                                            const actObj = GENERIC_ACTIONS.find(a => a.code === step.acao) || GENERIC_ACTIONS[9];
                                            const IconComp = actObj.icon;
                                            return (
                                                <div key={idx} className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <div className="font-semibold text-slate-200 flex items-center gap-2">
                                                            <IconComp className="w-4 h-4 text-indigo-400" />
                                                            {step.nome_passo}
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 ${
                                                            step.modo_execucao === 'automatico'
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                                        }`}>
                                                            {step.modo_execucao === 'automatico' ? <Zap size={11} /> : <Hand size={11} />}
                                                            {step.modo_execucao === 'automatico' ? '⚡ Automático' : '🖐️ Manual'}
                                                        </span>
                                                    </div>

                                                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                                                        <span>Ação: <strong>{step.acao || 'nenhuma'}</strong></span>
                                                        <span>•</span>
                                                        <span>Rotina: <strong>{step.codigo_rotina === 'none' ? 'Nenhuma (Apenas Hub)' : (step.codigo_rotina || 'Nenhuma')}</strong></span>
                                                    </div>

                                                    {step.next_nodes && step.next_nodes.length > 0 && (
                                                        <div className="pt-1.5 border-t border-slate-900 flex items-center gap-1.5 text-[10px] text-indigo-300">
                                                            <Split size={12} className="text-indigo-400" />
                                                            <span>Ao concluir, dispara <strong>{step.next_nodes.length} ramo(s) simultâneo(s)</strong></span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-xl border border-slate-800/50">
                                        Nenhum nó configurado.
                                    </p>
                                )}
                            </div>
                        </Card>
                    ))}

                    {workflows.length === 0 && !loading && (
                        <div className="col-span-2 p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4">
                            <Network className="w-10 h-10 text-slate-600 mx-auto" />
                            <div>
                                <h3 className="text-lg font-semibold text-white">Nenhum Mapa Mental Cadastrado</h3>
                                <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                                    Clique em <strong>"Criar Mapa Mental de Workflow"</strong> para abrir o canvas visual com conexões SVG.
                                </p>
                            </div>
                            <Button onClick={handleOpenBlankWorkflowModal} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                                <Plus className="w-4 h-4 mr-2" /> Criar Primeiro Mapa Mental
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Atribuições */}
            {activeTab === 'atribuicoes' && (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-800/50 border-b border-slate-700/50 text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-xs uppercase">Usuário</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase">Convênio (Sistema)</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase">Automação Worker</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {assignments.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-200">{item.username}</td>
                                        <td className="px-4 py-3 text-slate-300 font-semibold">#{item.id_convenio} - {item.nome_convenio}</td>
                                        <td className="px-4 py-3 text-slate-300">
                                            {item.has_automacao ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    <Cpu className="w-3.5 h-3.5" />
                                                    Worker #{item.worker_id_convenio} ({item.nome_worker_convenio || item.nome_convenio})
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 text-xs">Sem automação</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Tab 3: Rotinas Globais */}
            {activeTab === 'rotinas' && (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-800/50 border-b border-slate-700/50 text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-xs uppercase">Convênio Worker</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase">Rotina / Operação</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase">Descrição</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase">Modo de Execução</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase">Status</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {operacoes.map(op => (
                                    <tr key={op.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-200">
                                            <span className="font-mono text-xs text-indigo-400 mr-2">#{op.id_convenio}</span>
                                            {op.nome_convenio}
                                        </td>
                                        <td className="px-4 py-3 text-slate-300 font-mono text-xs">{op.rotina}</td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">{op.descricao || '—'}</td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={op.modo_execucao || 'automatico'}
                                                onChange={(e) => handleChangeModoExecucao(op.id, e.target.value)}
                                                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                                            >
                                                <option value="automatico">⚡ Automático (Robô)</option>
                                                <option value="manual">🖐️ Manual (Sob demanda)</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                                                op.ativo 
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                                {op.ativo ? <Check size={12} /> : <AlertCircle size={12} />}
                                                {op.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Button
                                                size="sm"
                                                variant={op.ativo ? "danger" : "primary"}
                                                onClick={() => handleToggleOperacao(op.id, op.ativo)}
                                                className="text-xs py-1 px-3"
                                            >
                                                {op.ativo ? 'Desativar' : 'Ativar'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* True Visual Mind Map Flowchart Canvas Modal (SVG Connection Lines) */}
            {showWorkflowModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-11/12 max-w-6xl p-6 shadow-2xl space-y-6 my-6 flex flex-col max-h-[92vh]">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Network className="w-6 h-6 text-indigo-400" />
                                    {editingWorkflowId ? 'Editar Mapa Mental de Workflow' : 'Novo Mapa Mental de Workflow (Em Branco)'}
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">
                                    Canvas interativo em formato de Grafo Visual. Conectores SVG exibem o direcionamento dos nós em paralelo.
                                </p>
                            </div>
                            <button onClick={() => setShowWorkflowModal(false)} className="text-slate-400 hover:text-white">
                                <X size={22} />
                            </button>
                        </div>

                        {/* Workflow Picker Configuration */}
                        <form onSubmit={handleSaveWorkflow} className="space-y-4 flex-1 flex flex-col min-h-0">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex-shrink-0">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">1. Usuário Gestor</label>
                                    <select
                                        value={wfForm.user_id}
                                        onChange={(e) => setWfForm({ ...wfForm, user_id: e.target.value })}
                                        required
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                                    >
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.username} (ID: {u.id})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">2. Convênio Alvo</label>
                                    <select
                                        value={wfForm.id_convenio}
                                        onChange={(e) => {
                                            const convId = parseInt(e.target.value);
                                            const convObj = convenios.find(c => c.id_convenio === convId);
                                            setWfForm({
                                                ...wfForm,
                                                id_convenio: convId,
                                                nome_workflow: convObj ? `Workflow Mapa Mental ${convObj.nome}` : wfForm.nome_workflow
                                            });
                                        }}
                                        required
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                                    >
                                        {automatableConvenios.map(c => (
                                            <option key={c.id_convenio} value={c.id_convenio}>
                                                #{c.id_convenio} - {c.nome} (Worker Habilitado)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Workflow</label>
                                    <input
                                        type="text"
                                        value={wfForm.nome_workflow}
                                        onChange={(e) => setWfForm({ ...wfForm, nome_workflow: e.target.value })}
                                        placeholder="Ex: Mapa Mental Unimed Goiânia"
                                        required
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Dynamic Visual Graph Canvas Area */}
                            <div className="flex-1 flex gap-4 min-h-0 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
                                {/* Visual Graph Tree View */}
                                <div className="flex-1 overflow-auto relative p-6 border-r border-slate-800/80" ref={canvasRef}>
                                    {/* SVG Connecting Lines Layer */}
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                                        <defs>
                                            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                                <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
                                            </marker>
                                        </defs>
                                        {svgLines.map(line => (
                                            <path
                                                key={line.id}
                                                d={line.d}
                                                stroke="#6366f1"
                                                strokeWidth="2.5"
                                                fill="none"
                                                strokeDasharray="4 2"
                                                markerEnd="url(#arrowhead)"
                                                className="animate-pulse"
                                            />
                                        ))}
                                    </svg>

                                    {/* Graph Controls Bar */}
                                    <div className="flex justify-between items-center mb-6 relative z-10">
                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                            <Network className="w-4 h-4 text-indigo-400" />
                                            Diagrama Visual de Nós ({wfForm.fluxo_passos.length} nó(s))
                                        </span>
                                        <Button
                                            type="button"
                                            onClick={handleAddRootNode}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5"
                                        >
                                            <Plus className="w-4 h-4" /> Adicionar Nó Raiz
                                        </Button>
                                    </div>

                                    {wfForm.fluxo_passos.length === 0 ? (
                                        <div className="p-16 text-center text-slate-500 text-xs space-y-3 relative z-10">
                                            <Network className="w-12 h-12 text-slate-600 mx-auto" />
                                            <p className="font-semibold text-slate-300 text-sm">Canvas de Mapa Mental em Branco</p>
                                            <p className="max-w-md mx-auto text-slate-400">
                                                Clique em <strong>"+ Adicionar Nó Raiz"</strong> para iniciar o diagrama e conectar ramos paralelos.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-8 relative z-10">
                                            {/* Render Nodes Flow Nodes Visual Graph */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {wfForm.fluxo_passos.map((node, index) => {
                                                    const actObj = GENERIC_ACTIONS.find(a => a.code === node.acao) || GENERIC_ACTIONS[9];
                                                    const IconComp = actObj.icon;
                                                    const isSelected = node.id === selectedNodeId;

                                                    return (
                                                        <div
                                                            key={node.id}
                                                            ref={el => nodeRefs.current[node.id] = el}
                                                            onClick={() => setSelectedNodeId(node.id)}
                                                            className={`bg-slate-900 border rounded-2xl p-4 space-y-3 shadow-xl cursor-pointer transition-all relative ${
                                                                isSelected 
                                                                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-slate-900/90' 
                                                                    : 'border-slate-800 hover:border-slate-700'
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`p-1.5 rounded-lg border ${actObj.color}`}>
                                                                        <IconComp size={14} />
                                                                    </div>
                                                                    <span className="text-xs font-bold text-white truncate max-w-[140px]">{node.nome_passo}</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); handleRemoveNode(node.id); }}
                                                                    className="text-slate-500 hover:text-red-400 p-1"
                                                                    title="Remover Nó"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>

                                                            <div className="space-y-1 text-[11px] text-slate-300">
                                                                <div>Ação: <strong className="text-indigo-300">{actObj.label}</strong></div>
                                                                <div>
                                                                    Rotina Worker: {node.codigo_rotina === 'none' ? (
                                                                        <span className="text-slate-500 italic">Nenhuma (Transição no Hub)</span>
                                                                    ) : (
                                                                        <span className="font-mono text-indigo-400">{node.codigo_rotina}</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 ${
                                                                    node.modo_execucao === 'automatico'
                                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                                                }`}>
                                                                    {node.modo_execucao === 'automatico' ? <Zap size={10} /> : <Hand size={10} />}
                                                                    {node.modo_execucao === 'automatico' ? '⚡ Automático' : '🖐️ Manual'}
                                                                </span>

                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); handleAddParallelBranch(node.id); }}
                                                                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20"
                                                                    title="Criar ramo simultâneo"
                                                                >
                                                                    <Plus size={11} /> Ramo
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Node Inspector & Property Panel */}
                                <div className="w-80 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 flex-shrink-0 overflow-y-auto">
                                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                                        <Settings className="w-4 h-4 text-indigo-400" />
                                        Inspetor de Nó do Grafo
                                    </h3>

                                    {selectedNodeObj ? (
                                        <div className="space-y-4 text-xs">
                                            <div>
                                                <label className="block text-slate-400 mb-1">Título / Nome do Nó</label>
                                                <input
                                                    type="text"
                                                    value={selectedNodeObj.nome_passo}
                                                    onChange={(e) => handleUpdateNode(selectedNodeObj.id, 'nome_passo', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-slate-400 mb-1">Ação Genérica do Workflow</label>
                                                <select
                                                    value={selectedNodeObj.acao}
                                                    onChange={(e) => handleUpdateNode(selectedNodeObj.id, 'acao', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500 font-medium"
                                                >
                                                    {GENERIC_ACTIONS.map(a => (
                                                        <option key={a.code} value={a.code}>{a.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-slate-400 mb-1">
                                                    Rotina do Worker (Filtro Estrito Convênio #{wfForm.id_convenio})
                                                </label>
                                                <select
                                                    value={selectedNodeObj.codigo_rotina || 'none'}
                                                    onChange={(e) => handleUpdateNode(selectedNodeObj.id, 'codigo_rotina', e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
                                                >
                                                    <option value="none">Nenhuma (Apenas Transição de Etapa no Hub)</option>
                                                    {availableOperacoes.map(op => (
                                                        <option key={op.id} value={op.rotina}>
                                                            {op.rotina} — {op.descricao || op.rotina}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-slate-400 mb-1">Modo de Execução do Nó</label>
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateNode(selectedNodeObj.id, 'modo_execucao', selectedNodeObj.modo_execucao === 'automatico' ? 'manual' : 'automatico')}
                                                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5 ${
                                                        selectedNodeObj.modo_execucao === 'automatico'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                                    }`}
                                                >
                                                    {selectedNodeObj.modo_execucao === 'automatico' ? <Zap size={14} /> : <Hand size={14} />}
                                                    {selectedNodeObj.modo_execucao === 'automatico' ? '⚡ Automático (Robô)' : '🖐️ Manual (Sob demanda)'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-slate-500 text-xs italic">
                                            Selecione um nó no canvas para visualizar e editar suas propriedades.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Form Footer */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 flex-shrink-0">
                                <Button type="button" variant="secondary" onClick={() => setShowWorkflowModal(false)} className="bg-slate-800 hover:bg-slate-700 text-white">
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Salvar Mapa Mental de Workflow
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
