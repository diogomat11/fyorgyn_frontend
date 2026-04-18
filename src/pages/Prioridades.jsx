import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, X, RefreshCw, Zap, Server, Settings } from 'lucide-react';
import api from '../services/api';
import CheckBox from '../components/ui/CheckBox';

// ── Helpers ──────────────────────────────────────────────────────────────────
const ROTINAS = [
    { value: 'op0_login', label: 'OP0 - Login' },
    { value: 'op1_consulta', label: 'OP1 - Consulta Base' },
    { value: 'op2_captura', label: 'OP2 - Captura Guias' },
    { value: 'op3_relatorio', label: 'OP3 - Relatório' },
];

const SERVER_PORTS = [9000, 9001, 9002, 9003, 9004];

// ── Priority example helper ───────────────────────────────────────────────────
function EscalationExample({ base, esc }) {
    const b = parseInt(base) || 2;
    const e = parseInt(esc) || 10;
    const steps = Array.from({ length: b + 1 }, (_, i) => ({
        min: i * e,
        eff: Math.max(0, b - i),
    }));
    return (
        <span style={{ color: '#64748b', fontSize: 11 }}>
            {steps.map((s, i) => (
                <span key={i} style={{ marginRight: 6 }}>
                    t={s.min}min→<strong style={{ color: s.eff === 0 ? '#22c55e' : '#94a3b8' }}>{s.eff}</strong>
                </span>
            ))}
            <span style={{ color: '#22c55e' }}>✓ Processado</span>
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Prioridades() {
    const [tab, setTab] = useState('rules');
    const [convenios, setConvenios] = useState([]);

    // Priority Rules state
    const [rules, setRules] = useState([]);
    const [rulesEdits, setRulesEdits] = useState({});
    const [showAddRule, setShowAddRule] = useState(false);
    const [newRule, setNewRule] = useState({ id_convenio: '', rotina: 'op1_consulta', base_priority: 2, escalation_minutes: 10, is_active: 1 });

    // Server Configs state
    const [configs, setConfigs] = useState([]);
    const [showAddCfg, setShowAddCfg] = useState(false);
    const [newCfg, setNewCfg] = useState({ server_url: 'http://127.0.0.1:9000', id_convenio: '', rotina: '', preference_bonus: 1, is_active: true });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);
    const [error, setError] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [rulesRes, cfgRes, convRes] = await Promise.all([
                api.get('/priority-rules/'),
                api.get('/server-configs/'),
                api.get('/convenios/'),
            ]);
            setRules(rulesRes.data);
            setConfigs(cfgRes.data);
            setConvenios(convRes.data);
        } catch (e) {
            setError('Erro ao carregar dados: ' + (e.response?.data?.detail || e.message));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const convLabel = (id) => {
        const c = convenios.find(c => c.id_convenio === id);
        return c ? c.nome : `ID: ${id}`;
    };

    // ── Priority Rules CRUD ───────────────────────────────────────────────────
    const handleRuleEdit = (id, field, value) =>
        setRulesEdits(p => ({ ...p, [id]: { ...(p[id] || {}), [field]: value } }));

    const saveRule = async (rule) => {
        const changes = rulesEdits[rule.id];
        if (!changes || !Object.keys(changes).length) return;
        setSaving(`rule-${rule.id}`);
        try {
            const res = await api.patch(`/priority-rules/${rule.id}`, changes);
            setRules(p => p.map(r => r.id === rule.id ? res.data : r));
            setRulesEdits(p => { const n = { ...p }; delete n[rule.id]; return n; });
        } catch (e) {
            setError('Erro: ' + (e.response?.data?.detail || e.message));
        } finally {
            setSaving(null);
        }
    };

    const deleteRule = async (id) => {
        if (!window.confirm('Remover regra?')) return;
        await api.delete(`/priority-rules/${id}`);
        setRules(p => p.filter(r => r.id !== id));
    };

    const addRule = async () => {
        if (!newRule.id_convenio) { setError('Selecione um convênio.'); return; }
        try {
            const res = await api.post('/priority-rules/', {
                ...newRule,
                id_convenio: parseInt(newRule.id_convenio),
                base_priority: parseInt(newRule.base_priority),
                escalation_minutes: parseInt(newRule.escalation_minutes),
                is_active: 1,
            });
            setRules(p => [...p, res.data]);
            setShowAddRule(false);
            setNewRule({ id_convenio: '', rotina: 'op1_consulta', base_priority: 2, escalation_minutes: 10, is_active: 1 });
        } catch (e) {
            setError('Erro: ' + (e.response?.data?.detail || e.message));
        }
    };

    // ── Server Configs CRUD ───────────────────────────────────────────────────
    const deleteCfg = async (id) => {
        if (!window.confirm('Remover configuração?')) return;
        await api.delete(`/server-configs/${id}`);
        setConfigs(p => p.filter(c => c.id !== id));
    };

    const addCfg = async () => {
        try {
            const res = await api.post('/server-configs/', {
                ...newCfg,
                id_convenio: newCfg.id_convenio ? parseInt(newCfg.id_convenio) : null,
                rotina: newCfg.rotina || null,
                preference_bonus: parseInt(newCfg.preference_bonus),
            });
            setConfigs(p => [...p, res.data]);
            setShowAddCfg(false);
            setNewCfg({ server_url: 'http://127.0.0.1:9000', id_convenio: '', rotina: '', preference_bonus: 1, is_active: true });
        } catch (e) {
            setError('Erro: ' + (e.response?.data?.detail || e.message));
        }
    };

    const isDirtyRule = (id) => !!(rulesEdits[id] && Object.keys(rulesEdits[id]).length);
    const currentRule = (r) => ({ ...r, ...(rulesEdits[r.id] || {}) });

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: '24px', maxWidth: '1150px', margin: '0 auto', fontFamily: 'Segoe UI, sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Zap size={28} color="#3b82f6" />
                    <div>
                        <h1 style={{ margin: 0, color: '#e2e8f0', fontSize: 22, fontWeight: 700 }}>Gestão de Prioridades</h1>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>Orquestrador de jobs — regras de prioridade e preferências de servidor</p>
                    </div>
                </div>
                <button onClick={fetchAll} style={btnS('#334155')}><RefreshCw size={14} /> Atualizar</button>
            </div>

            {error && (
                <div style={{ background: '#450a0a', color: '#fca5a5', border: '1px solid #991b1b', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                    {error} <X size={14} style={{ cursor: 'pointer' }} onClick={() => setError('')} />
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #334155', paddingBottom: 0 }}>
                {[
                    { key: 'rules', label: 'Convênio / Rotinas', icon: <Settings size={15} /> },
                    { key: 'servers', label: 'Servidores', icon: <Server size={15} /> },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        ...btnS(tab === t.key ? '#1d4ed8' : 'transparent'),
                        borderRadius: '6px 6px 0 0', borderBottom: tab === t.key ? '2px solid #3b82f6' : '2px solid transparent',
                        color: tab === t.key ? '#e2e8f0' : '#64748b', fontWeight: tab === t.key ? 600 : 400,
                    }}>{t.icon} {t.label}</button>
                ))}
            </div>

            {/* ── Tab: Priority Rules ── */}
            {tab === 'rules' && (
                <>
                    <div style={{ background: '#1e3a5f', border: '1px solid #2563eb55', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#93c5fd' }}>
                        <strong>Lógica de escalada:</strong> Cada regra define prioridade inicial e intervalo de escalada.
                        Prioridade <strong>0</strong> = topo da fila. O dispatcher calcula: <code>eff = max(0, base − ⌊idade_min ÷ escalada_min⌋)</code>.
                        Jobs sem regra têm prioridade efetiva 0 (sempre no topo).
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                        <button onClick={() => setShowAddRule(true)} style={btnS('#2563eb')}><Plus size={14} /> Nova Regra</button>
                    </div>
                    <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#0f172a' }}>
                                    {['Convênio', 'Rotina', 'Prio. Base (0=topo)', 'Escalada (min)', 'Simulação', 'Ativo', 'Ações'].map(h => (
                                        <th key={h} style={thS}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading
                                    ? <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Carregando…</td></tr>
                                    : rules.length === 0
                                        ? <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Nenhuma regra. Clique em <strong>Nova Regra</strong>.</td></tr>
                                        : rules.map((rule, i) => {
                                            const cur = currentRule(rule);
                                            const dirty = isDirtyRule(rule.id);
                                            return (
                                                <tr key={rule.id} style={{ borderTop: '1px solid #1e293b', background: i % 2 === 0 ? '#1e293b' : '#162032' }}>
                                                    <td style={tdS}><span style={{ color: '#93c5fd', fontWeight: 600 }}>{convLabel(rule.id_convenio)}</span></td>
                                                    <td style={tdS}>
                                                        <select value={cur.rotina || ''} onChange={e => handleRuleEdit(rule.id, 'rotina', e.target.value)} style={inpS}>
                                                            {ROTINAS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                                        </select>
                                                    </td>
                                                    <td style={tdS}>
                                                        <input type="number" min={0} max={10} value={cur.base_priority}
                                                            onChange={e => handleRuleEdit(rule.id, 'base_priority', parseInt(e.target.value))}
                                                            style={{ ...inpS, width: 60 }} />
                                                    </td>
                                                    <td style={tdS}>
                                                        <input type="number" min={1} value={cur.escalation_minutes || 10}
                                                            onChange={e => handleRuleEdit(rule.id, 'escalation_minutes', parseInt(e.target.value))}
                                                            style={{ ...inpS, width: 70 }} />
                                                    </td>
                                                    <td style={tdS}><EscalationExample base={cur.base_priority} esc={cur.escalation_minutes || 10} /></td>
                                                    <td style={tdS}>
                                                        <CheckBox
                                                            checked={!!cur.is_active}
                                                            onClick={() => handleRuleEdit(rule.id, 'is_active', cur.is_active ? 0 : 1)}
                                                            size={20}
                                                            color="#22c55e"
                                                            duration={0.4}
                                                        />
                                                    </td>
                                                    <td style={tdS}>
                                                        <div style={{ display: 'flex', gap: 5 }}>
                                                            {dirty && <button onClick={() => saveRule(rule)} disabled={saving === `rule-${rule.id}`} style={btnS('#16a34a', 28)}><Save size={12} /></button>}
                                                            {dirty && <button onClick={() => setRulesEdits(p => { const n = { ...p }; delete n[rule.id]; return n; })} style={btnS('#475569', 28)}><X size={12} /></button>}
                                                            <button onClick={() => deleteRule(rule.id)} style={btnS('#dc2626', 28)}><Trash2 size={12} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                            </tbody>
                        </table>
                    </div>

                    {/* Add Rule Modal */}
                    {showAddRule && (
                        <Modal title="Nova Regra de Prioridade" onClose={() => setShowAddRule(false)} onConfirm={addRule}>
                            <Field label="Convênio">
                                <select value={newRule.id_convenio} onChange={e => setNewRule(p => ({ ...p, id_convenio: e.target.value }))} style={{ ...inpS, width: '100%' }}>
                                    <option value="">Selecione…</option>
                                    {convenios.map(c => <option key={c.id_convenio} value={c.id_convenio}>{c.nome} (ID: {c.id_convenio})</option>)}
                                </select>
                            </Field>
                            <Field label="Rotina">
                                <select value={newRule.rotina} onChange={e => setNewRule(p => ({ ...p, rotina: e.target.value }))} style={{ ...inpS, width: '100%' }}>
                                    {ROTINAS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                            </Field>
                            <Field label="Prioridade Base (0 = topo da fila)">
                                <input type="number" min={0} max={10} value={newRule.base_priority}
                                    onChange={e => setNewRule(p => ({ ...p, base_priority: e.target.value }))}
                                    style={{ ...inpS, width: '100%' }} />
                            </Field>
                            <Field label="Escalada (minutos por passo)">
                                <input type="number" min={1} value={newRule.escalation_minutes}
                                    onChange={e => setNewRule(p => ({ ...p, escalation_minutes: e.target.value }))}
                                    style={{ ...inpS, width: '100%' }} />
                            </Field>
                            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                                Simulação: <EscalationExample base={newRule.base_priority} esc={newRule.escalation_minutes} />
                            </div>
                        </Modal>
                    )}
                </>
            )}

            {/* ── Tab: Server Configs ── */}
            {tab === 'servers' && (
                <>
                    <div style={{ background: '#1e3a5f', border: '1px solid #2563eb55', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#93c5fd' }}>
                        <strong>Como funciona:</strong> Cada servidor pode ter um convênio/rotina preferencial. O dispatcher prioriza servidores com configuração correspondente ao job, evitando re-login e maximizando reuso de sessão Chrome.
                        <br />Ordem de seleção: <em>1. Config match + session match → 2. Config match → 3. Session match → 4. Qualquer idle</em>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                        <button onClick={() => setShowAddCfg(true)} style={btnS('#2563eb')}><Plus size={14} /> Add Servidor</button>
                    </div>
                    <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#0f172a' }}>
                                    {['Servidor', 'Convênio Preferencial', 'Rotina Preferencial', 'Bônus', 'Ativo', 'Ações'].map(h => (
                                        <th key={h} style={thS}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading
                                    ? <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Carregando…</td></tr>
                                    : configs.length === 0
                                        ? <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Nenhuma config. Clique em <strong>Add Servidor</strong>.</td></tr>
                                        : configs.map((cfg, i) => {
                                            const port = cfg.server_url.split(':').pop();
                                            return (
                                                <tr key={cfg.id} style={{ borderTop: '1px solid #1e293b', background: i % 2 === 0 ? '#1e293b' : '#162032' }}>
                                                    <td style={tdS}><span style={{ color: '#a78bfa', fontWeight: 600 }}>Servidor :{port}</span><br /><span style={{ color: '#475569', fontSize: 11 }}>{cfg.server_url}</span></td>
                                                    <td style={tdS}>{cfg.id_convenio ? <span style={{ color: '#93c5fd' }}>{convLabel(cfg.id_convenio)}</span> : <span style={{ color: '#475569' }}>Qualquer</span>}</td>
                                                    <td style={tdS}>{cfg.rotina ? <span style={{ color: '#86efac' }}>{cfg.rotina}</span> : <span style={{ color: '#475569' }}>Qualquer</span>}</td>
                                                    <td style={tdS}><span style={{ background: '#1e3a2e', color: '#22c55e', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>+{cfg.preference_bonus}</span></td>
                                                    <td style={tdS}>
                                                        <CheckBox
                                                            checked={!!cfg.is_active}
                                                            onClick={() => {}}
                                                            size={20}
                                                            color="#22c55e"
                                                            duration={0.4}
                                                            disabled={true}
                                                        />
                                                    </td>
                                                    <td style={tdS}>
                                                        <button onClick={() => deleteCfg(cfg.id)} style={btnS('#dc2626', 28)}><Trash2 size={12} /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                            </tbody>
                        </table>
                    </div>

                    {/* Add Config Modal */}
                    {showAddCfg && (
                        <Modal title="Configurar Preferência de Servidor" onClose={() => setShowAddCfg(false)} onConfirm={addCfg}>
                            <Field label="Servidor">
                                <select value={newCfg.server_url} onChange={e => setNewCfg(p => ({ ...p, server_url: e.target.value }))} style={{ ...inpS, width: '100%' }}>
                                    {SERVER_PORTS.map(p => (
                                        <option key={p} value={`http://127.0.0.1:${p}`}>Servidor :{p} (http://127.0.0.1:{p})</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Convênio Preferencial (vazio = qualquer)">
                                <select value={newCfg.id_convenio} onChange={e => setNewCfg(p => ({ ...p, id_convenio: e.target.value }))} style={{ ...inpS, width: '100%' }}>
                                    <option value="">Qualquer convênio</option>
                                    {convenios.map(c => <option key={c.id_convenio} value={c.id_convenio}>{c.nome} (ID: {c.id_convenio})</option>)}
                                </select>
                            </Field>
                            <Field label="Rotina Preferencial (vazio = qualquer)">
                                <select value={newCfg.rotina} onChange={e => setNewCfg(p => ({ ...p, rotina: e.target.value }))} style={{ ...inpS, width: '100%' }}>
                                    <option value="">Qualquer rotina</option>
                                    {ROTINAS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                            </Field>
                            <Field label="Bônus de prioridade (quanto lower eff_priority fica para matches)">
                                <input type="number" min={0} max={5} value={newCfg.preference_bonus}
                                    onChange={e => setNewCfg(p => ({ ...p, preference_bonus: e.target.value }))}
                                    style={{ ...inpS, width: '100%' }} />
                            </Field>
                        </Modal>
                    )}
                </>
            )}
        </div>
    );
}

// ── Mini Components ───────────────────────────────────────────────────────────
function Modal({ title, children, onClose, onConfirm }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', padding: 28, width: 460, boxShadow: '0 20px 60px #00000080' }}>
                <h2 style={{ margin: '0 0 20px', color: '#e2e8f0', fontSize: 16 }}>{title}</h2>
                {children}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                    <button onClick={onClose} style={btnS('#475569')}>Cancelar</button>
                    <button onClick={onConfirm} style={btnS('#2563eb')}>Confirmar</button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 5, fontWeight: 600 }}>{label}</label>
            {children}
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const thS = { padding: '11px 14px', textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 };
const tdS = { padding: '9px 14px', color: '#cbd5e1', fontSize: 13 };
const inpS = { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', padding: '5px 8px', fontSize: 13 };
const btnS = (bg, h = undefined) => ({
    background: bg, border: 'none', borderRadius: 6, color: '#fff',
    padding: h ? `0 10px` : '7px 14px', height: h, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 500
});
