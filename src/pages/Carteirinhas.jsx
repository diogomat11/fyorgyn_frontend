import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Trash2, Upload, Plus, Edit, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import EditCarteirinhaModal from '../components/EditCarteirinhaModal';
import { maskCarteirinha, validateCarteirinha } from '../utils/formatters';

// Design System
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import Badge from '../components/ui/Badge';

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
        id_pagamento: '',
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
        id_pagamento: '',
        status: 'ativo',
        id_convenio: ''
    });

    const fetchCarteirinhas = async () => {
        setLoading(true);
        try {
            const skip = (page - 1) * limit;
            const params = {
                skip,
                limit,
                search: filters.search,
                status: filters.status,
                id_pagamento: filters.id_pagamento,
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
            await api.post('/carteirinhas/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("Upload realizado com sucesso!");
            setFile(null);
            setPage(1);
            fetchCarteirinhas();
        } catch (e) { alert("Erro no upload: " + e.message); }
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
                id_pagamento: newCarteirinha.id_pagamento ? parseInt(newCarteirinha.id_pagamento) : null,
                status: newCarteirinha.status,
                id_convenio: newCarteirinha.id_convenio || (filters.id_convenio ? parseInt(filters.id_convenio) : undefined)
            });
            alert("Carteirinha criada com sucesso!");
            setShowCreateForm(false);
            setNewCarteirinha({ carteirinha: '', paciente: '', id_paciente: '', id_pagamento: '', status: 'ativo' });
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
                                        onChange={(e) => setNewCarteirinha({ ...newCarteirinha, carteirinha: maskCarteirinha(e.target.value) })}
                                        placeholder="0000.0000.000000.00-0"
                                        required
                                        maxLength={21}
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
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-1">ID Pagamento</label>
                                    <Input type="number" value={newCarteirinha.id_pagamento} onChange={(e) => setNewCarteirinha({ ...newCarteirinha, id_pagamento: e.target.value })} placeholder="456" />
                                </div>
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
                        placeholder="ID Pagamento"
                        value={filters.id_pagamento}
                        onChange={(e) => { setFilters({ ...filters, id_pagamento: e.target.value }); setPage(1); }}
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
                        onClick={() => setFilters({ search: '', status: '', id_pagamento: '', paciente: '' })}
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
                                <th onClick={() => handleSort('id_paciente')} className="px-6 py-3 text-left cursor-pointer hover:text-primary">
                                    ID Paciente {sortConfig.key === 'id_paciente' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => handleSort('id_pagamento')} className="px-6 py-3 text-left cursor-pointer hover:text-primary">
                                    ID Pagamento {sortConfig.key === 'id_pagamento' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
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
                                    <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{c.id_pagamento || '-'}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <Badge variant={c.status === 'ativo' ? 'success' : 'default'}>{c.status || 'ativo'}</Badge>
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
                    onClose={() => setEditingItem(null)}
                    onSave={fetchCarteirinhas}
                />
            )}
        </div>
    );
}
