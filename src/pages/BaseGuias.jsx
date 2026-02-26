import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';
import { Download, Filter, X, Calendar } from 'lucide-react';
import { formatDate, formatDateTime } from '../utils/formatters';
import SearchableSelect from '../components/SearchableSelect';

// Design System
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';

// Loading Overlay Component
const ProcessingModal = ({ isOpen }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-surface p-8 rounded-xl border border-border flex flex-col items-center gap-4 max-w-sm w-full animate-bounce-in">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="text-center">
                    <h3 className="text-xl font-bold text-text-primary mb-2">Exportando Guias...</h3>
                    <p className="text-text-secondary text-sm">Aguarde enquanto geramos seu arquivo Excel.</p>
                </div>
            </div>
        </div>
    );
};

export default function BaseGuias() {
    const [guias, setGuias] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [carteirinhas, setCarteirinhas] = useState([]);
    const [isExporting, setIsExporting] = useState(false);

    const username = localStorage.getItem('username') || 'Usuário';

    const [filters, setFilters] = useState({
        created_at_start: '',
        created_at_end: '',
        carteirinha_id: '',
        id_convenio: ''
    });

    const [convenios, setConvenios] = useState([]);

    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

    useEffect(() => {
        api.get('/carteirinhas/?limit=1000').then(res => {
            setCarteirinhas(res.data.data || res.data);
        }).catch(console.error);

        api.get('/convenios/').then(res => {
            setConvenios(res.data);
            if (res.data.length > 0) {
                setFilters(f => ({ ...f, id_convenio: res.data[0].id_convenio.toString() }));
            }
        }).catch(console.error);
    }, []);

    useEffect(() => {
        fetchGuias();
    }, [page, pageSize, filters]);

    const fetchGuias = async () => {
        setLoading(true);
        try {
            const params = {
                limit: pageSize,
                skip: (page - 1) * pageSize,
            };

            if (filters.status) params.status = filters.status;
            if (filters.created_at_start) params.created_at_start = filters.created_at_start;
            if (filters.created_at_end) params.created_at_end = filters.created_at_end;
            if (filters.carteirinha_id && filters.carteirinha_id !== "") {
                params.carteirinha_id = parseInt(filters.carteirinha_id);
            }
            if (filters.id_convenio) {
                params.id_convenio = parseInt(filters.id_convenio);
            }

            const res = await api.get('/guias/', { params });

            if (res.data.data) {
                setGuias(res.data.data);
                setTotalItems(res.data.total);
            } else {
                setGuias(res.data);
                setTotalItems(res.data.length);
            }
        } catch (error) {
            console.error("Error fetching guias", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedGuias = React.useMemo(() => {
        if (!guias) return [];
        let sortableItems = [...guias];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [guias, sortConfig]);

    const handleClearFilters = () => {
        setFilters({
            created_at_start: '',
            created_at_end: '',
            carteirinha_id: '',
            id_convenio: ''
        });
        setPage(1);
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const params = {};
            if (filters.created_at_start) params.created_at_start = filters.created_at_start;
            if (filters.created_at_end) params.created_at_end = filters.created_at_end;
            if (filters.carteirinha_id) params.carteirinha_id = filters.carteirinha_id;
            if (filters.id_convenio) params.id_convenio = filters.id_convenio;

            const response = await api.get('/guias/export', {
                params,
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'guias_exportadas.xlsx');
            document.body.appendChild(link);
            link.click();
        } catch (error) {
            console.error("Download failed", error);
            alert("Erro ao exportar");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <ProcessingModal isOpen={isExporting} />
            <h1 className="text-2xl font-bold text-text-primary">Base Guias Unimed</h1>

            <Card noPadding>
                <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 items-end bg-surface/30 flex-wrap">
                    <div className="flex-1 w-full md:w-auto min-w-[200px]">
                        <label className="block text-xs font-semibold text-text-secondary mb-1">Convênio</label>
                        <Select
                            value={filters.id_convenio}
                            onChange={(e) => {
                                setFilters({ ...filters, id_convenio: e.target.value });
                                setPage(1);
                            }}
                        >
                            <option value="">Todos os Convênios</option>
                            {convenios.map(c => (
                                <option key={c.id_convenio} value={c.id_convenio}>{c.nome}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="flex-1 w-full md:w-auto min-w-[250px]">
                        <label className="block text-xs font-semibold text-text-secondary mb-1">Paciente / Carteirinha</label>
                        <SearchableSelect
                            options={[{ value: '', label: 'Todos os Pacientes' }, ...carteirinhas.map(c => ({
                                value: c.id,
                                label: c.paciente ? c.paciente : c.carteirinha
                            }))]}
                            value={filters.carteirinha_id}
                            onChange={(val) => {
                                setFilters({ ...filters, carteirinha_id: val });
                                setPage(1);
                            }}
                            placeholder="Selecione ou Cole..."
                        />
                    </div>

                    <div className="w-full md:w-40">
                        <label className="block text-xs font-semibold text-text-secondary mb-1">Data Import. Início</label>
                        <Input
                            type="date"
                            value={filters.created_at_start}
                            onChange={e => {
                                setFilters({ ...filters, created_at_start: e.target.value });
                                setPage(1);
                            }}
                        />
                    </div>

                    <div className="w-full md:w-40">
                        <label className="block text-xs font-semibold text-text-secondary mb-1">Data Import. Fim</label>
                        <Input
                            type="date"
                            value={filters.created_at_end}
                            onChange={e => {
                                setFilters({ ...filters, created_at_end: e.target.value });
                                setPage(1);
                            }}
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={handleClearFilters} className="text-text-secondary hover:text-text-primary">
                            <X size={16} className="mr-2" /> Limpar
                        </Button>
                        <Button onClick={handleExport} variant="success">
                            <Download size={16} className="mr-2" /> Exportar
                        </Button>
                    </div>
                </div>

                {loading ? <div className="p-8 text-center text-text-secondary">Carregando...</div> : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-900/50 text-text-secondary text-xs uppercase tracking-wider">
                                <tr>
                                    <th onClick={() => handleSort('created_at')} className="px-6 py-3 text-left cursor-pointer hover:text-primary">
                                        Data Import {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th className="px-6 py-3 text-left">Carteira / Paciente</th>
                                    <th onClick={() => handleSort('guia')} className="px-6 py-3 text-left cursor-pointer hover:text-primary">
                                        Guia {sortConfig.key === 'guia' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th onClick={() => handleSort('data_autorizacao')} className="px-6 py-3 text-left cursor-pointer hover:text-primary">
                                        Data Autoriz. {sortConfig.key === 'data_autorizacao' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th className="px-6 py-3 text-left">Senha</th>
                                    <th onClick={() => handleSort('validade')} className="px-6 py-3 text-left cursor-pointer hover:text-primary">
                                        Validade {sortConfig.key === 'validade' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th className="px-6 py-3 text-left">Terapia</th>
                                    <th className="px-6 py-3 text-left">Solicitado</th>
                                    <th className="px-6 py-3 text-left">Autorizado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {sortedGuias.map(g => {
                                    const paciente = carteirinhas.find(c => c.id === g.carteirinha_id);
                                    return (
                                        <tr key={g.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{formatDateTime(g.created_at)}</td>
                                            <td className="px-6 py-4 text-sm text-text-primary whitespace-nowrap">{paciente ? paciente.paciente || paciente.carteirinha : g.carteirinha_id}</td>
                                            <td className="px-6 py-4 text-sm text-text-secondary font-mono bg-slate-900/30 rounded px-2 py-1 inline-block mt-2 whitespace-nowrap">{g.guia}</td>
                                            <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{formatDate(g.data_autorizacao)}</td>
                                            <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{g.senha}</td>
                                            <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{formatDate(g.validade)}</td>
                                            <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{g.codigo_terapia}</td>
                                            <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{g.qtde_solicitada}</td>
                                            <td className="px-6 py-4 text-sm text-text-primary font-bold whitespace-nowrap">{g.sessoes_autorizadas}</td>
                                        </tr>
                                    );
                                })}
                                {sortedGuias.length === 0 && (
                                    <tr><td colSpan="9" className="px-6 py-10 text-center text-text-secondary">Nenhuma guia encontrada.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

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
