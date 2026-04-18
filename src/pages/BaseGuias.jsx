import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';
import { Download, Filter, X, Calendar, Clock, Plus, Printer } from 'lucide-react';
import { formatDate, formatDateTime } from '../utils/formatters';
import SearchableSelect from '../components/SearchableSelect';
import { useLocation, useNavigate } from 'react-router-dom';

// Design System
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import NovaSolicitacaoModal from '../components/NovaSolicitacaoModal';

// ── TimeoutPie: indicador visual de timeout de captura (Goiânia) ──
const TIMEOUT_MINUTES = 59;
function TimeoutPie({ timestampCaptura }) {
    if (!timestampCaptura) {
        return (
            <span title="Guia não capturada" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
                <svg width={20} height={20} viewBox="0 0 20 20">
                    <circle cx={10} cy={10} r={8} fill="none" stroke="#ef4444" strokeWidth="2" />
                </svg>
            </span>
        );
    }
    const capturedAt = new Date(timestampCaptura);
    const now = new Date();
    const elapsedMin = (now - capturedAt) / 60000;
    const remainingMin = Math.max(0, TIMEOUT_MINUTES - elapsedMin);
    const expired = elapsedMin >= TIMEOUT_MINUTES;
    const fraction = Math.min(elapsedMin / TIMEOUT_MINUTES, 1);
    let color = '#22c55e';
    if (elapsedMin >= 50) color = '#ef4444';
    else if (elapsedMin >= 40) color = '#eab308';
    const tooltip = expired ? 'Guia não capturada (timeout esgotado)' : `${Math.round(remainingMin)}min restantes`;
    const size = 20, r = 8, cx = 10, cy = 10;
    const angle = fraction * 360;
    const rad = (angle - 90) * (Math.PI / 180);
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    const largeArc = angle > 180 ? 1 : 0;
    if (expired) {
        return (
            <span title={tooltip} style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth="2" />
                </svg>
            </span>
        );
    }
    const pathD = angle >= 360
        ? `M ${cx},${cy - r} A ${r},${r} 0 1, 1 ${cx - 0.01},${cy - r} Z`
        : `M ${cx},${cy} L ${cx},${cy - r} A ${r},${r} 0 ${largeArc}, 1 ${x},${y} Z`;
    return (
        <span title={tooltip} style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334155" strokeWidth="1.5" />
                <path d={pathD} fill={color} />
            </svg>
        </span>
    );
}

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
    const [isModalOpen, setIsModalOpen] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();

    // Derived state from URL instead of strictly internal hook
    const searchParams = new URLSearchParams(location.search);
    const abaParam = searchParams.get('aba') || 'autorizadas';
    const activeTab = abaParam;

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
    }, [page, pageSize, filters, activeTab]);

    const fetchGuias = async () => {
        setLoading(true);
        try {
            const params = {
                limit: pageSize,
                skip: (page - 1) * pageSize,
                aba: activeTab // manda a aba pro backend
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

    const handlePrint = async (guia) => {
        if (!window.confirm(`Deseja solicitar a impressão da guia ${guia.guia}?`)) return;

        try {
            await api.post('/jobs/', {
                type: 'single',
                carteirinha_ids: [guia.carteirinha_id],
                id_convenio: guia.id_convenio,
                rotina: '5',
                params: JSON.stringify({
                    numero_guia: guia.guia,
                    numero_copias: 1
                })
            });
            alert(`Job de impressão para a guia ${guia.guia} criado com sucesso!`);
        } catch (error) {
            console.error("Erro ao criar job de impressão", error);
            alert("Falha ao solicitar impressão.");
        }
    };

    return (
        <div className="space-y-6">
            <ProcessingModal isOpen={isExporting} />
            <NovaSolicitacaoModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => fetchGuias()}
            />

            <div className="flex flex-col gap-2 border-b border-border pb-4">
                <div className="flex justify-between items-center w-full">
                    <h1 className="text-2xl font-bold text-text-primary">Autorizações</h1>
                    {activeTab === 'solicitacoes' && (
                        <Button onClick={() => setIsModalOpen(true)} variant="primary" className="shadow-lg shadow-primary/20">
                            <Plus size={16} className="mr-2" /> Nova Solicitação
                        </Button>
                    )}
                </div>

                <div className="flex gap-4 mt-2">
                    <button
                        onClick={() => { handleClearFilters(); navigate('/guias?aba=solicitacoes'); }}
                        className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'solicitacoes' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'}`}
                    >
                        Solicitações
                    </button>
                    <button
                        onClick={() => { handleClearFilters(); navigate('/guias?aba=autorizadas'); }}
                        className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'autorizadas' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'}`}
                    >
                        Guias
                    </button>
                </div>
            </div>

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
                                    <th className="px-6 py-3 text-left w-10"></th>
                                    <th onClick={() => handleSort('created_at')} className="px-6 py-3 text-left cursor-pointer hover:text-primary">
                                        Data Import {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th className="px-6 py-3 text-left">Carteira / Paciente</th>
                                    <th onClick={() => handleSort('guia')} className="px-6 py-3 text-left cursor-pointer hover:text-primary">
                                        Guia {sortConfig.key === 'guia' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    {activeTab === 'solicitacoes' ? (
                                        <th onClick={() => handleSort('data_solicitacao')} className="px-6 py-3 text-left cursor-pointer hover:text-primary">
                                            Data Solicit. {sortConfig.key === 'data_solicitacao' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                    ) : (
                                        <th onClick={() => handleSort('data_autorizacao')} className="px-6 py-3 text-left cursor-pointer hover:text-primary">
                                            Data Autoriz. {sortConfig.key === 'data_autorizacao' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                    )}
                                    <th className="px-6 py-3 text-left">Senha</th>
                                    {activeTab === 'autorizadas' && (
                                        <th onClick={() => handleSort('validade')} className="px-6 py-3 text-left cursor-pointer hover:text-primary">
                                            Validade {sortConfig.key === 'validade' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                    )}
                                    <th className="px-6 py-3 text-left">Status {sortConfig.key === 'status_guia' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                                    <th className="px-6 py-3 text-left">Terapia</th>
                                    {activeTab === 'autorizadas' && <th className="px-6 py-3 text-left">Realizadas</th>}
                                    <th className="px-6 py-3 text-left">Solicitado / Autorizado</th>
                                    {activeTab === 'autorizadas' && (
                                        <>
                                            <th onClick={() => handleSort('saldo')} className="px-6 py-3 text-left cursor-pointer hover:text-primary">
                                                Saldo {sortConfig.key === 'saldo' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                            </th>
                                            <th className="px-6 py-3 text-left">Status Captura</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {sortedGuias.map(g => {
                                    const paciente = carteirinhas.find(c => c.id === g.carteirinha_id);
                                    return (
                                        <tr key={g.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
                                                {activeTab === 'autorizadas' && g.status_guia?.toUpperCase().includes('AUTORIZAD') && (
                                                    <button
                                                        onClick={() => handlePrint(g)}
                                                        className="p-1 hover:text-primary transition-colors"
                                                        title="Imprimir Guia"
                                                    >
                                                        <Printer size={16} />
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{formatDateTime(g.created_at)}</td>
                                            <td className="px-6 py-4 text-sm text-text-primary whitespace-nowrap">{paciente ? paciente.paciente || paciente.carteirinha : g.carteirinha_id}</td>
                                            <td className="px-6 py-4 text-sm text-text-secondary font-mono bg-slate-900/30 rounded px-2 py-1 inline-block mt-2 whitespace-nowrap">{g.guia}</td>
                                            {activeTab === 'solicitacoes' ? (
                                                <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{formatDate(g.data_solicitacao)}</td>
                                            ) : (
                                                <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
                                                    {['NEGADO', 'CANCELADO'].includes(g.status_guia?.toUpperCase()) || g.status_guia?.toUpperCase().includes('ESTUDO') ? '-' : formatDate(g.data_autorizacao)}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{g.senha}</td>
                                            {activeTab === 'autorizadas' && (
                                                <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{formatDate(g.validade)}</td>
                                            )}
                                            <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${g.status_guia?.toUpperCase().includes('AUTORIZAD') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
                                                    {g.status_guia}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                <div className="text-text-primary font-medium">{g.codigo_terapia}</div>
                                                <div className="text-xs text-text-secondary max-w-xs truncate" title={g.nome_terapia}>{g.nome_terapia}</div>
                                            </td>
                                            {activeTab === 'autorizadas' && (
                                                <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap font-mono">{g.sessoes_realizadas ?? 0}</td>
                                            )}
                                            <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap flex gap-2 items-center">
                                                <span className="text-slate-400">{g.qtde_solicitada}</span>
                                                <span className="text-slate-600">/</span>
                                                <span className="text-emerald-400 font-bold">{g.sessoes_autorizadas}</span>
                                            </td>
                                            {activeTab === 'autorizadas' && (
                                                <>
                                                    <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{g.saldo ?? '-'}</td>
                                                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                        {g.id_convenio === 3 ? (
                                                            <TimeoutPie timestampCaptura={g.timestamp_captura} />
                                                        ) : g.timestamp_captura ? (
                                                            <span className="text-xs text-emerald-400">✓ Capturada</span>
                                                        ) : (
                                                            <span className="text-xs text-slate-500">—</span>
                                                        )}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                                {sortedGuias.length === 0 && (
                                    <tr><td colSpan="11" className="px-6 py-10 text-center text-text-secondary">Nenhuma guia encontrada.</td></tr>
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
