import React, { useState, useEffect } from 'react';
import { listPei, overridePei, getPeiStats, exportPei } from '../services/pei';
import { Edit2, Save, Filter, X, Download, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import Pagination from '../components/Pagination';

// Design System
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import Badge from '../components/ui/Badge';

// Loading Overlay Component
const ProcessingModal = ({ isOpen }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-surface p-8 rounded-xl border border-border flex flex-col items-center gap-4 max-w-sm w-full animate-bounce-in">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="text-center">
                    <h3 className="text-xl font-bold text-text-primary mb-2">Exportando Dados...</h3>
                    <p className="text-text-secondary text-sm">Isso pode levar alguns segundos dependendo do volume de dados.</p>
                </div>
            </div>
        </div>
    );
};

function StatCard({ title, count, color, icon: Icon, onClick }) {
    return (
        <Card
            className="cursor-pointer hover:bg-slate-800/50 transition-colors flex items-center gap-4 border-l-4"
            style={{ borderLeftColor: color }}
            onClick={onClick}
        >
            <div className="p-2 rounded-full" style={{ backgroundColor: `${color}20` }}>
                <Icon size={24} color={color} />
            </div>
            <div>
                <div className="text-sm text-text-secondary">{title}</div>
                <div className="text-2xl font-bold text-text-primary">{count}</div>
            </div>
        </Card>
    );
}

export default function GestaoPei() {
    const [data, setData] = useState([]);
    const [stats, setStats] = useState({ total: 0, vencidos: 0, vence_d7: 0, vence_d30: 0 });
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        vencimento_filter: '',
        validade_start: '',
        validade_end: '',
        id_convenio: ''
    });

    const [convenios, setConvenios] = useState([]);

    useEffect(() => {
        const fetchConvenios = async () => {
            try {
                // Must import api inside if not available, wait, we don't have api here? Let's import it or use a service.
                // Actually pei.js doesn't export api. Let's just import api from '../services/api';
                const { default: api } = await import('../services/api');
                const res = await api.get('/convenios/');
                setConvenios(res.data);
                if (res.data.length > 0) {
                    setFilters(f => ({ ...f, id_convenio: res.data[0].id_convenio.toString() }));
                }
            } catch (e) { console.error("Error fetching convenios", e); }
        };
        fetchConvenios();
    }, []);

    const [editingItem, setEditingItem] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => { loadStats(); }, [filters]);
    useEffect(() => { loadData(); }, [page, pageSize, filters]);

    const loadStats = async () => {
        try {
            const res = await getPeiStats({ id_convenio: filters.id_convenio || undefined });
            setStats(res);
        } catch (error) { console.error(error); }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await listPei({ page, pageSize, ...filters });
            setData(res.data);
            setTotalItems(res.total);
            setPage(res.page);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        if (!editingItem) return;
        try {
            await overridePei(editingItem.base_guia_id, editValue);
            setData(prev => prev.map(item => {
                if (item.id === editingItem.id) {
                    return { ...item, pei_semanal: parseFloat(editValue), status: 'Validado' };
                }
                return item;
            }));
            setEditingItem(null);
        } catch (error) { alert("Erro ao salvar: " + error.message); }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const handleExport = async () => {
        setIsExporting(true);
        try { await exportPei(filters); }
        catch (e) { alert("Erro ao exportar"); }
        finally { setIsExporting(false); }
    };

    return (
        <div className="space-y-6">
            <ProcessingModal isOpen={isExporting} />
            <h1 className="text-2xl font-bold text-text-primary">Gestão PEI</h1>

            {/* Warning Alert */}
            {stats.pendentes > 0 && (
                <div className="bg-amber-500/10 border-l-4 border-amber-500 text-amber-500 p-4 rounded flex items-center gap-3">
                    <AlertCircle size={24} />
                    <div>
                        <strong>Atenção!</strong> Existem {stats.pendentes} guias com PEI pendente de cálculo ou validação.
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total de Pacientes" count={stats.total} color="#0ea5e9" icon={CheckCircle} onClick={() => setFilters({ status: '', search: '', vencimento_filter: '', validade_start: '', validade_end: '' })} />
                <StatCard title="Vencidos" count={stats.vencidos} color="#ef4444" icon={AlertCircle} onClick={() => handleFilterChange('vencimento_filter', 'vencidos')} />
                <StatCard title="Vence em 7 dias" count={stats.vence_d7} color="#f59e0b" icon={Clock} onClick={() => handleFilterChange('vencimento_filter', 'vence_d7')} />
                <StatCard title="Vence em 30 dias" count={stats.vence_d30} color="#10b981" icon={Clock} onClick={() => handleFilterChange('vencimento_filter', 'vence_d30')} />
            </div>

            <Card noPadding>
                {/* Filters */}
                <div className="p-4 border-b border-border flex flex-wrap gap-4 items-end bg-surface/30">
                    <div className="w-full md:w-64">
                        <label className="block text-xs font-semibold text-text-secondary mb-1">Convênio</label>
                        <Select
                            value={filters.id_convenio}
                            onChange={(e) => handleFilterChange('id_convenio', e.target.value)}
                        >
                            <option value="">Todos os Convênios</option>
                            {convenios.map(c => (
                                <option key={c.id_convenio} value={c.id_convenio}>{c.nome}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-text-secondary mb-1">Buscar</label>
                        <Input
                            placeholder="Paciente, Carteirinha..."
                            value={filters.search}
                            onChange={e => handleFilterChange('search', e.target.value)}
                            icon={Filter}
                        />
                    </div>
                    <div className="w-40">
                        <label className="block text-xs font-semibold text-text-secondary mb-1">Status</label>
                        <Select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
                            <option value="">Todos</option>
                            <option value="Validado">Validado</option>
                            <option value="Pendente">Pendente</option>
                        </Select>
                    </div>
                    <div className="w-40">
                        <label className="block text-xs font-semibold text-text-secondary mb-1">Vencimento</label>
                        <Select value={filters.vencimento_filter} onChange={e => handleFilterChange('vencimento_filter', e.target.value)}>
                            <option value="">Qualquer data</option>
                            <option value="vencidos">Vencidos</option>
                            <option value="vence_d7">Próx. 7 dias</option>
                            <option value="vence_d30">Próx. 30 dias</option>
                        </Select>
                    </div>
                    <div className="w-36">
                        <label className="block text-xs font-semibold text-text-secondary mb-1">Validade De</label>
                        <Input type="date" value={filters.validade_start} onChange={e => handleFilterChange('validade_start', e.target.value)} />
                    </div>
                    <div className="w-36">
                        <label className="block text-xs font-semibold text-text-secondary mb-1">Até</label>
                        <Input type="date" value={filters.validade_end} onChange={e => handleFilterChange('validade_end', e.target.value)} />
                    </div>

                    <Button
                        variant="ghost"
                        onClick={() => setFilters({ status: '', search: '', vencimento_filter: '', validade_start: '', validade_end: '' })}
                        className="text-amber-500 hover:text-amber-400"
                    >
                        Limpar
                    </Button>

                    <Button onClick={handleExport} isLoading={isExporting} variant="success">
                        <Download size={16} className="mr-2" /> Exportar
                    </Button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-900/50 text-text-secondary text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3 text-left">Paciente</th>
                                <th className="px-6 py-3 text-left">Carteirinha</th>
                                <th className="px-6 py-3 text-left">Terapia</th>
                                <th className="px-6 py-3 text-left">Guia Vinc.</th>
                                <th className="px-6 py-3 text-left">Qtd Aut.</th>
                                <th className="px-6 py-3 text-left">PEI Semanal</th>
                                <th className="px-6 py-3 text-left">Validade PEI</th>
                                <th className="px-6 py-3 text-left">Status</th>
                                <th className="px-6 py-3 text-left">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {data.map(item => (
                                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 text-sm text-text-primary whitespace-nowrap">{item.paciente}</td>
                                    <td className="px-6 py-4 text-sm text-text-secondary font-mono whitespace-nowrap">{item.carteirinha}</td>
                                    <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{item.codigo_terapia}</td>
                                    <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{item.guia_vinculada}</td>
                                    <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{item.sessoes_autorizadas}</td>
                                    <td className="px-6 py-4 text-sm text-text-primary whitespace-nowrap">
                                        {editingItem?.id === item.id ? (
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                className="w-20 py-1 h-8"
                                                autoFocus
                                            />
                                        ) : item.pei_semanal}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
                                        {item.validade ? new Date(item.validade).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <Badge variant={item.status === 'Validado' ? 'success' : 'warning'}>
                                            {item.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        {editingItem?.id === item.id ? (
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="success" onClick={handleSave} className="h-8 w-8 p-0"><Save size={14} /></Button>
                                                <Button size="sm" variant="danger" onClick={() => setEditingItem(null)} className="h-8 w-8 p-0"><X size={14} /></Button>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm" variant="ghost"
                                                onClick={() => { setEditingItem(item); setEditValue(item.pei_semanal); }}
                                                disabled={item.status !== 'Pendente'}
                                                className={item.status !== 'Pendente' ? 'opacity-30 cursor-not-allowed' : ''}
                                            >
                                                <Edit2 size={16} className="text-primary" />
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && !loading && (
                                <tr><td colSpan="9" className="px-6 py-10 text-center text-text-secondary">Nenhum registro encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-border">
                    <Pagination
                        currentPage={page}
                        totalItems={totalItems}
                        pageSize={pageSize}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                    />
                </div>
            </Card>
        </div>
    );
}
