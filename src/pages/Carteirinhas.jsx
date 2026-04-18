import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Trash2, Upload, Plus, Edit, ChevronLeft, ChevronRight, Search, X, Check, X as XIcon } from 'lucide-react';
import EditCarteirinhaModal from '../components/EditCarteirinhaModal';
import { maskCarteirinha, validateCarteirinha, maskCodigoBeneficiario, maskSulamerica, maskNumerics } from '../utils/formatters';
import { motion, AnimatePresence } from 'motion/react';

// Design System
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import CheckBox from '../components/ui/CheckBox';

// ── StatusToggle ──────────────────────────────────────────────────────────────
// Ativo  → CheckBox SVG animado (idêntico ao de Prioridades), size=20, verde
// Inativo → XIcon vermelho lucide, size=20
// Clique abre confirm → PUT /carteirinhas/:id { status }
// Tooltip com texto aparece ao hover após 350ms
function StatusToggle({ carteirinha, onToggled }) {
    const [localStatus, setLocalStatus] = useState(carteirinha.status);
    const [saving, setSaving] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipTimer = useRef(null);

    useEffect(() => { setLocalStatus(carteirinha.status); }, [carteirinha.status]);

    const isAtivo = localStatus === 'ativo';
    const tooltipText = isAtivo ? 'Ativo — clique para inativar' : 'Inativo — clique para ativar';

    const handleClick = async () => {
        if (saving) return;
        const novoStatus = isAtivo ? 'inativo' : 'ativo';
        const nome = carteirinha.paciente || carteirinha.carteirinha;
        const confirmed = window.confirm(
            isAtivo
                ? `Deseja INATIVAR a carteirinha de "${nome}"?`
                : `Deseja ATIVAR a carteirinha de "${nome}"?`
        );
        if (!confirmed) return;

        setSaving(true);
        try {
            await api.put(`/carteirinhas/${carteirinha.id}`, { status: novoStatus });
            setLocalStatus(novoStatus);
            if (onToggled) onToggled();
        } catch (e) {
            alert('Erro ao alterar status: ' + (e.response?.data?.detail || e.message));
        } finally {
            setSaving(false);
        }
    };

    const onEnter = () => { tooltipTimer.current = setTimeout(() => setShowTooltip(true), 350); };
    const onLeave = () => { clearTimeout(tooltipTimer.current); setShowTooltip(false); };

    return (
        <div className="relative inline-flex items-center justify-center">
            {/* Área clicável — sem caixa, apenas o ícone */}
            <div
                onClick={handleClick}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
                aria-label={tooltipText}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') handleClick(); }}
                className={`
                    inline-flex items-center justify-center select-none
                    transition-transform duration-150
                    ${saving ? 'opacity-40 cursor-wait' : 'cursor-pointer hover:scale-125 active:scale-95'}
                `}
            >
                <AnimatePresence mode="wait" initial={false}>
                    {isAtivo ? (
                        /* CheckBox SVG animado — idêntico ao de Prioridades */
                        <motion.div
                            key="ativo"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.2 }}
                        >
                            <CheckBox
                                checked={true}
                                onClick={() => {}}
                                size={20}
                                color="#22c55e"
                                duration={0.4}
                            />
                        </motion.div>
                    ) : (
                        /* X vermelho */
                        <motion.div
                            key="inativo"
                            initial={{ opacity: 0, scale: 0.5, rotate: 45 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.5, rotate: -45 }}
                            transition={{ duration: 0.22, ease: 'backOut' }}
                            className="flex items-center"
                        >
                            <XIcon
                                size={20}
                                className="text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.7)]"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Tooltip */}
            <AnimatePresence>
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.9 }}
                        transition={{ duration: 0.13 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
                    >
                        <div className={`
                            px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shadow-lg border
                            ${isAtivo
                                ? 'bg-slate-900 border-emerald-500/40 text-emerald-300'
                                : 'bg-slate-900 border-red-500/40 text-red-300'
                            }
                        `}>
                            {tooltipText}
                        </div>
                        <div className={`
                            absolute top-full left-1/2 -translate-x-1/2 w-0 h-0
                            border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent
                            ${isAtivo ? 'border-t-emerald-500/40' : 'border-t-red-500/40'}
                        `} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


export default function Carteirinhas() {
    const [carteirinhas, setCarteirinhas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState(null);
    const [overwrite, setOverwrite] = useState(false);
    const [showUpload, setShowUpload] = useState(false);

    // Pagination & Search state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Filters
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        codigo_beneficiario: '',
        paciente: '',
        id_convenio: ''
    });

    const [convenios, setConvenios] = useState([]);

    useEffect(() => {
        const fetchConvenios = async () => {
            try {
                const res = await api.get('/convenios/');
                setConvenios(res.data);
                if (res.data.length > 0) {
                    setFilters(f => ({ ...f, id_convenio: res.data[0].id_convenio.toString() }));
                }
            } catch (e) { console.error("Error fetching convenios", e); }
        };
        fetchConvenios();
    }, []);

    const limit = 10;
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
    const [editingItem, setEditingItem] = useState(null);

    // Create state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newCarteirinha, setNewCarteirinha] = useState({
        carteirinha: '',
        paciente: '',
        id_paciente: '',
        codigo_beneficiario: '',
        status: 'ativo',
        id_convenio: ''
    });

    const isIpasgoSelected = (id) => {
        if (!id || !convenios) return false;
        const selected = convenios.find(c => c.id_convenio.toString() === id.toString());
        return selected?.nome?.toLowerCase().includes('ipasgo');
    };

    const handleCarteirinhaFormat = (value, id_convenio) => {
        if (!id_convenio || !convenios) return value;
        const selected = convenios.find(c => c.id_convenio.toString() === id_convenio.toString());
        if (!selected) return value;

        const nome = selected.nome.toLowerCase();
        if (nome.includes('unimed')) {
            return maskCarteirinha(value);
        } else if (nome.includes('sulamerica')) {
            return maskSulamerica(value);
        } else if (nome.includes('amil') || nome.includes('ipasgo')) {
            return maskNumerics(value, selected.digitos_carteirinha || 9);
        }
        return maskNumerics(value, selected.digitos_carteirinha);
    };

    const fetchCarteirinhas = async () => {
        setLoading(true);
        try {
            const skip = (page - 1) * limit;
            const params = {
                skip,
                limit,
                search: filters.search,
                status: filters.status,
                codigo_beneficiario: filters.codigo_beneficiario,
                paciente: filters.paciente,
                id_convenio: filters.id_convenio || undefined
            };

            const res = await api.get('/carteirinhas/', { params });
            setCarteirinhas(res.data.data || res.data);
            if (res.data.total !== undefined) {
                setTotalItems(res.data.total);
                setTotalPages(Math.ceil(res.data.total / limit));
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCarteirinhas(); }, [page, filters]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const sortedCarteirinhas = React.useMemo(() => {
        if (!carteirinhas) return [];
        let sortableItems = [...carteirinhas];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [carteirinhas, sortConfig]);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('overwrite', overwrite);

        try {
            setLoading(true);
            if (filters.id_convenio) {
                formData.append('id_convenio', filters.id_convenio);
            }
            const res = await api.post('/carteirinhas/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.warnings && res.data.warnings.length > 0) {
                alert("Upload parcialmente concluído!\nErros ignorados:\n" + res.data.warnings.slice(0, 10).join("\n") + (res.data.warnings.length > 10 ? "\n..." : ""));
            } else {
                alert("Upload realizado com sucesso!");
            }

            setFile(null);
            setPage(1);
            fetchCarteirinhas();
        } catch (e) { alert("Erro no upload: " + (e.response?.data?.detail || e.message)); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Excluir carteirinha?")) return;
        try {
            await api.delete(`/carteirinhas/${id}`);
            fetchCarteirinhas();
        } catch (e) { alert("Erro ao excluir"); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!validateCarteirinha(newCarteirinha.carteirinha)) {
            alert("Carteirinha inválida! Deve conter 21 caracteres, ex: 0000.0000.000000.00-0");
            return;
        }

        try {
            setLoading(true);
            await api.post('/carteirinhas/', {
                carteirinha: newCarteirinha.carteirinha,
                paciente: newCarteirinha.paciente,
                id_paciente: newCarteirinha.id_paciente ? parseInt(newCarteirinha.id_paciente) : null,
                codigo_beneficiario: newCarteirinha.codigo_beneficiario ? newCarteirinha.codigo_beneficiario : null,
                status: newCarteirinha.status,
                id_convenio: newCarteirinha.id_convenio || (filters.id_convenio ? parseInt(filters.id_convenio) : undefined)
            });
            alert("Carteirinha criada com sucesso!");
            setShowCreateForm(false);
            setNewCarteirinha({ carteirinha: '', paciente: '', id_paciente: '', codigo_beneficiario: '', status: 'ativo', id_convenio: '' });
            setPage(1);
            fetchCarteirinhas();
        } catch (e) {
            alert("Erro ao criar: " + (e.response?.data?.detail || e.message));
        } finally { setLoading(false); }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-text-primary">Gerenciamento de Carteirinhas</h1>

            {/* Upload Section */}
            <Card title="Upload em Lote">
                {!showUpload ? (
                    <Button onClick={() => setShowUpload(true)} variant="secondary">
                        <Upload size={16} className="mr-2" /> Upload Carteirinhas (Excel/CSV)
                    </Button>
                ) : (
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-medium text-text-secondary">Importar Arquivo</h4>
                            <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}><X size={16} /></Button>
                        </div>
                        <form onSubmit={handleUpload} className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="flex-1 w-full relative">
                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={e => setFile(e.target.files[0])}
                                    className="w-full text-sm text-text-secondary
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-primary file:text-white
                                hover:file:bg-secondary cursor-pointer"
                                />
                            </div>
                            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer whitespace-nowrap">
                                <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} className="rounded border-gray-600 bg-slate-800 text-primary focus:ring-primary" />
                                Sobrescrever tudo?
                            </label>
                            <Button type="submit" disabled={loading || !file} isLoading={loading} variant="primary">
                                <Upload size={16} className="mr-2" /> Importar
                            </Button>
                        </form>
                    </div>
                )}
            </Card>

            <Card>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-text-primary">Carteirinhas Cadastradas ({totalItems})</h3>
                    <Button onClick={() => setShowCreateForm(!showCreateForm)} variant="primary">
                        {showCreateForm ? <><X size={16} className="mr-2" /> Cancelar</> : <><Plus size={16} className="mr-2" /> Nova Carteirinha</>}
                    </Button>
                </div>

                {/* Create Form */}
                {showCreateForm && (
                    <div className="bg-slate-900/50 p-6 rounded-lg border border-border mb-6">
                        <h4 className="text-sm font-bold text-text-primary mb-4 uppercase tracking-wider">Nova Carteirinha</h4>
                        <form onSubmit={handleCreate}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-1">Carteirinha *</label>
                                    <Input
                                        value={newCarteirinha.carteirinha}
                                        onChange={(e) => setNewCarteirinha({ ...newCarteirinha, carteirinha: handleCarteirinhaFormat(e.target.value, newCarteirinha.id_convenio || filters.id_convenio) })}
                                        placeholder="No da Carteira"
                                        required
                                        maxLength={25}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-1">Convênio *</label>
                                    <Select
                                        value={newCarteirinha.id_convenio || filters.id_convenio}
                                        onChange={(e) => setNewCarteirinha({ ...newCarteirinha, id_convenio: e.target.value })}
                                        required
                                    >
                                        <option value="">Selecione...</option>
                                        {convenios.map(c => (
                                            <option key={c.id_convenio} value={c.id_convenio}>{c.nome}</option>
                                        ))}
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-1">Paciente</label>
                                    <Input
                                        value={newCarteirinha.paciente}
                                        onChange={(e) => setNewCarteirinha({ ...newCarteirinha, paciente: e.target.value })}
                                        placeholder="Nome do paciente"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-1">ID Paciente</label>
                                    <Input type="number" value={newCarteirinha.id_paciente} onChange={(e) => setNewCarteirinha({ ...newCarteirinha, id_paciente: e.target.value })} placeholder="123" />
                                </div>
                                {isIpasgoSelected(newCarteirinha.id_convenio || filters.id_convenio) && (
                                    <div>
                                        <label className="block text-xs font-semibold text-text-secondary mb-1">Código do Paciente no Convênio *</label>
                                        <Input type="text" value={newCarteirinha.codigo_beneficiario} onChange={(e) => setNewCarteirinha({ ...newCarteirinha, codigo_beneficiario: maskCodigoBeneficiario(e.target.value) })} placeholder="1180507-2" required />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-1">Status</label>
                                    <Select value={newCarteirinha.status} onChange={(e) => setNewCarteirinha({ ...newCarteirinha, status: e.target.value })}>
                                        <option value="ativo">Ativo</option>
                                        <option value="inativo">Inativo</option>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>Cancelar</Button>
                                <Button type="submit" isLoading={loading}>Salvar</Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="w-full md:w-64">
                        <Select
                            value={filters.id_convenio}
                            onChange={(e) => { setFilters({ ...filters, id_convenio: e.target.value }); setPage(1); }}
                        >
                            <option value="">Todos os Convênios</option>
                            {convenios.map(c => (
                                <option key={c.id_convenio} value={c.id_convenio}>{c.nome}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="flex-1 relative">
                        <Input
                            placeholder="Busca Geral..."
                            value={filters.search}
                            onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
                            icon={Search}
                        />
                    </div>
                    <Input
                        placeholder="Filtrar Paciente"
                        value={filters.paciente}
                        onChange={(e) => { setFilters({ ...filters, paciente: e.target.value }); setPage(1); }}
                        className="w-full md:w-48"
                    />
                    <Input
                        placeholder="Cód. Convênio"
                        value={filters.codigo_beneficiario}
                        onChange={(e) => { setFilters({ ...filters, codigo_beneficiario: e.target.value }); setPage(1); }}
                        className="w-full md:w-32"
                    />
                    <div className="w-full md:w-40">
                        <Select value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
                            <option value="">Status: Todos</option>
                            <option value="ativo">Ativo</option>
                            <option value="inativo">Inativo</option>
                        </Select>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => setFilters({ search: '', status: '', codigo_beneficiario: '', paciente: '', id_convenio: '' })}
                        className="text-text-secondary hover:text-text-primary whitespace-nowrap"
                    >
                        Limpar
                    </Button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-900/50 text-text-secondary text-xs uppercase tracking-wider">
                            <tr>
                                <th onClick={() => handleSort('id')} className="px-6 py-3 text-left cursor-pointer hover:text-primary">
                                    ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => handleSort('carteirinha')} className="px-6 py-3 text-left cursor-pointer hover:text-primary">
                                    Carteirinha {sortConfig.key === 'carteirinha' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => handleSort('paciente')} className="px-6 py-3 text-left cursor-pointer hover:text-primary">
                                    Paciente {sortConfig.key === 'paciente' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => handleSort('id_paciente')} className="px-6 py-3 text-left cursor-pointer hover:text-primary whitespace-nowrap">
                                    ID Paciente {sortConfig.key === 'id_paciente' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => handleSort('codigo_beneficiario')} className="px-6 py-3 text-left cursor-pointer hover:text-primary whitespace-nowrap">
                                    Cód. Paciente no Convênio {sortConfig.key === 'codigo_beneficiario' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => handleSort('status')} className="px-6 py-3 text-left cursor-pointer hover:text-primary">
                                    Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                                <th className="px-6 py-3 text-left">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {sortedCarteirinhas.map(c => (
                                <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 text-sm text-text-secondary font-mono">{c.id}</td>
                                    <td className="px-6 py-4 text-sm text-text-secondary font-mono whitespace-nowrap">{c.carteirinha}</td>
                                    <td className="px-6 py-4 text-sm text-text-primary font-medium whitespace-nowrap">{c.paciente || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{c.id_paciente || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{c.codigo_beneficiario || '-'}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <StatusToggle
                                            carteirinha={c}
                                            onToggled={fetchCarteirinhas}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-sm flex gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => setEditingItem(c)} className="h-8 w-8 p-0">
                                            <Edit size={16} className="text-primary" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} className="h-8 w-8 p-0">
                                            <Trash2 size={16} className="text-red-500" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {sortedCarteirinhas.length === 0 && (
                                <tr><td colSpan="7" className="px-6 py-10 text-center text-text-secondary">Nenhum registro encontrado</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
                    <span className="text-sm text-text-secondary">
                        Página {page} de {totalPages || 1}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            disabled={page <= 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="h-8 w-8 p-0 flex items-center justify-center"
                        >
                            <ChevronLeft size={16} />
                        </Button>
                        <Button
                            variant="secondary"
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="h-8 w-8 p-0 flex items-center justify-center"
                        >
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Edit Modal */}
            {editingItem && (
                <EditCarteirinhaModal
                    carteirinha={editingItem}
                    convenios={convenios}
                    onClose={() => setEditingItem(null)}
                    onSave={fetchCarteirinhas}
                />
            )}
        </div>
    );
}
