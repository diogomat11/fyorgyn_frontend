import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Calendar, RefreshCcw, CheckCircle, RotateCcw, FileText, Users, Briefcase, Activity, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import Button from '../components/ui/Button';
import NovaSolicitacaoModal from '../components/NovaSolicitacaoModal';
import SearchableSelect from '../components/SearchableSelect';

export default function AgendaFixa() {
    // Default dates from requirement
    const defaultStart = '2026-12-14';
    const defaultEnd = '2026-12-19';

    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [agendamentos, setAgendamentos] = useState([]);
    const [semanas, setSemanas] = useState(1);

    const [filters, setFilters] = useState({
        data_inicio: defaultStart,
        data_fim: defaultEnd,
        paciente: '',
        convenio: '',
        procedimento: '',
        dia_semana: ''
    });

    const [sortConfig, setSortConfig] = useState({ key: 'paciente', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedRequestData, setSelectedRequestData] = useState(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.data_inicio) params.append('data_inicio', filters.data_inicio);
            if (filters.data_fim) params.append('data_fim', filters.data_fim);
            // Fetch up to 10000 to group locally for the week
            params.append('limit', '10000'); 

            const response = await api.get(`/agendamentos/?${params.toString()}`);
            setAgendamentos(response.data.data || []);
        } catch (error) {
            console.error('Erro ao buscar agendamentos:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [filters.data_inicio, filters.data_fim]);

    const handleSync = async () => {
        setSyncing(true);
        try {
            // Trigger OP1 with fixed=S
            await api.post('/jobs/', {
                type: 'single',
                carteirinha_ids: [],
                rotina: 'op1_importar_agendamentos',
                id_convenio: 101, // ABA CLMF
                params: JSON.stringify({
                    fixed: 'S',
                    data_inicio: filters.data_inicio,
                    data_fim: filters.data_fim
                })
            });
            alert('Sincronização de Agenda Fixa solicitada com sucesso. Acompanhe na tela de Importações.');
        } catch (err) {
            console.error(err);
            alert('Erro ao solicitar sincronização.');
        } finally {
            setSyncing(false);
        }
    };

    // Calculate unique options for datalists based on fetched data
    const uniqueOptions = useMemo(() => {
        const pacientes = new Set();
        const convenios = new Set();
        const procedimentos = new Set();
        agendamentos.forEach(ag => {
            if (ag.Nome_Paciente) pacientes.add(ag.Nome_Paciente);
            if (ag.nome_convenio) convenios.add(ag.nome_convenio);
            const proc = ag.nome_procedimento || ag.cod_procedimento_aut || 'S/ Procedimento';
            procedimentos.add(proc);
        });
        return {
            pacientes: Array.from(pacientes).sort(),
            convenios: Array.from(convenios).sort(),
            procedimentos: Array.from(procedimentos).sort()
        };
    }, [agendamentos]);

    const daysOrder = { 'Domingo':0, 'Segunda-feira':1, 'Terça-feira':2, 'Quarta-feira':3, 'Quinta-feira':4, 'Sexta-feira':5, 'Sábado':6 };

    // Calculate grouped data
    const groupedData = useMemo(() => {
        const groups = {};
        const getDayOfWeek = (dateString) => {
            if (!dateString) return '';
            const d = new Date(dateString + 'T00:00:00');
            const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
            return days[d.getDay()] || '';
        };

        agendamentos.forEach(ag => {
            const diaSemana = getDayOfWeek(ag.data);
            const proc = ag.nome_procedimento || ag.cod_procedimento_aut || 'S/ Procedimento';
            
            // Apply local text filters
            if (filters.paciente && !ag.Nome_Paciente?.toLowerCase().includes(filters.paciente.toLowerCase())) return;
            if (filters.convenio && !ag.nome_convenio?.toLowerCase().includes(filters.convenio.toLowerCase())) return;
            if (filters.procedimento && !proc.toLowerCase().includes(filters.procedimento.toLowerCase())) return;
            if (filters.dia_semana && diaSemana !== filters.dia_semana) return;

            const key = `${ag.id_paciente}_${ag.id_convenio}_${proc}_${diaSemana}`;
            if (!groups[key]) {
                groups[key] = {
                    id_paciente: ag.id_paciente,
                    paciente: ag.Nome_Paciente,
                    id_convenio: ag.id_convenio,
                    convenio: ag.nome_convenio,
                    id_carteirinha: ag.id_carteirinha,
                    carteirinha: ag.carteirinha,
                    procedimento: proc,
                    cod_procedimento: ag.cod_procedimento_aut,
                    dia_semana: diaSemana,
                    totalizador: 0
                };
            }
            groups[key].totalizador += 1;
        });

        const sorted = Object.values(groups).sort((a, b) => {
            if (sortConfig.key === 'dia_semana') {
                const dayA = daysOrder[a.dia_semana] ?? 7;
                const dayB = daysOrder[b.dia_semana] ?? 7;
                return sortConfig.direction === 'asc' ? dayA - dayB : dayB - dayA;
            }
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [agendamentos, filters, sortConfig]);

    const dashboardMetrics = useMemo(() => {
        const pacientes = new Set();
        const convenios = new Set();
        let totalAgendamentos = 0;
        groupedData.forEach(item => {
            pacientes.add(item.paciente);
            convenios.add(item.convenio);
            totalAgendamentos += item.totalizador;
        });
        return {
            pacientes: pacientes.size,
            convenios: convenios.size,
            agendamentos: totalAgendamentos
        };
    }, [groupedData]);

    // Reset pagination when filters or sort change
    useEffect(() => { setCurrentPage(1); }, [filters, sortConfig, pageSize]);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return groupedData.slice(start, start + pageSize);
    }, [groupedData, currentPage, pageSize]);
    const totalPages = Math.max(1, Math.ceil(groupedData.length / pageSize));

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleSolicitarAutorizacao = (item) => {
        setSelectedRequestData({
            id_convenio: item.id_convenio,
            carteirinha_id: item.id_carteirinha,
            procedimentos: [
                { codigo: item.cod_procedimento || item.procedimento, qtde: item.totalizador * semanas }
            ]
        });
        setModalOpen(true);
    };

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return null;
        return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />;
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Agenda Fixa</h1>
                    <p className="text-sm text-slate-400 mt-1">Gerenciamento e Projeção de Quantidades para Autorizações</p>
                </div>
                <Button 
                    onClick={handleSync} 
                    disabled={syncing}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
                >
                    <RefreshCcw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Sincronizando...' : 'Sincronizar Agenda Fixa'}
                </Button>
            </div>

            {/* Dashboard Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 flex items-center gap-4 border-l-4 border-l-blue-500">
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                        <Calendar className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-400 font-medium">Agendamentos Únicos (Sessões)</p>
                        <p className="text-2xl font-bold text-white">{dashboardMetrics.agendamentos}</p>
                    </div>
                </Card>
                <Card className="p-4 flex items-center gap-4 border-l-4 border-l-emerald-500">
                    <div className="p-3 bg-emerald-500/10 rounded-lg">
                        <Users className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-400 font-medium">Pacientes Distintos</p>
                        <p className="text-2xl font-bold text-white">{dashboardMetrics.pacientes}</p>
                    </div>
                </Card>
                <Card className="p-4 flex items-center gap-4 border-l-4 border-l-purple-500">
                    <div className="p-3 bg-purple-500/10 rounded-lg">
                        <Briefcase className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-400 font-medium">Convênios</p>
                        <p className="text-2xl font-bold text-white">{dashboardMetrics.convenios}</p>
                    </div>
                </Card>
            </div>

            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Data Início</label>
                        <Input 
                            type="date"
                            value={filters.data_inicio}
                            onChange={(e) => setFilters(prev => ({ ...prev, data_inicio: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Data Fim</label>
                        <Input 
                            type="date"
                            value={filters.data_fim}
                            onChange={(e) => setFilters(prev => ({ ...prev, data_fim: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Paciente</label>
                        <SearchableSelect 
                            options={[{value: '', label: 'Todos os Pacientes'}, ...uniqueOptions.pacientes.map(p => ({ value: p, label: p }))]}
                            placeholder="Selecione..."
                            value={filters.paciente}
                            onChange={(val) => setFilters(prev => ({ ...prev, paciente: val }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Convênio</label>
                        <SearchableSelect 
                            options={[{value: '', label: 'Todos os Convênios'}, ...uniqueOptions.convenios.map(c => ({ value: c, label: c }))]}
                            placeholder="Selecione..."
                            value={filters.convenio}
                            onChange={(val) => setFilters(prev => ({ ...prev, convenio: val }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Procedimento</label>
                        <SearchableSelect 
                            options={[{value: '', label: 'Todos os Procedimentos'}, ...uniqueOptions.procedimentos.map(p => ({ value: p, label: p }))]}
                            placeholder="Selecione..."
                            value={filters.procedimento}
                            onChange={(val) => setFilters(prev => ({ ...prev, procedimento: val }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Dia da Semana</label>
                        <Select 
                            value={filters.dia_semana}
                            onChange={(e) => setFilters(prev => ({ ...prev, dia_semana: e.target.value }))}
                        >
                            <option value="">Todos</option>
                            <option value="Segunda-feira">Segunda-feira</option>
                            <option value="Terça-feira">Terça-feira</option>
                            <option value="Quarta-feira">Quarta-feira</option>
                            <option value="Quinta-feira">Quinta-feira</option>
                            <option value="Sexta-feira">Sexta-feira</option>
                            <option value="Sábado">Sábado</option>
                        </Select>
                    </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 max-w-md">
                        <label className="block text-sm font-medium text-slate-300 whitespace-nowrap">
                            Multiplicador (Semanas): <span className="text-primary font-bold">{semanas}</span>
                        </label>
                        <input 
                            type="range" 
                            min="1" 
                            max="16" 
                            value={semanas} 
                            onChange={(e) => setSemanas(Number(e.target.value))}
                            className="w-full accent-primary"
                        />
                    </div>
                    <Button variant="secondary" onClick={loadData} disabled={loading} className="gap-2">
                        <Filter className="w-4 h-4" /> Aplicar
                    </Button>
                </div>
            </Card>

            <Card className="overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50 border-b border-slate-700 select-none">
                                <th onClick={() => handleSort('paciente')} className="px-4 py-3 text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200">
                                    Paciente <SortIcon column="paciente" />
                                </th>
                                <th onClick={() => handleSort('dia_semana')} className="px-4 py-3 text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200">
                                    Dia-Semana <SortIcon column="dia_semana" />
                                </th>
                                <th onClick={() => handleSort('convenio')} className="px-4 py-3 text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200">
                                    Convênio <SortIcon column="convenio" />
                                </th>
                                <th onClick={() => handleSort('procedimento')} className="px-4 py-3 text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200">
                                    Procedimento <SortIcon column="procedimento" />
                                </th>
                                <th className="px-4 py-3 text-xs font-medium text-slate-400 text-center">Qtde/Dia</th>
                                <th className="px-4 py-3 text-xs font-medium text-slate-400 text-center">Qtde Necessária</th>
                                <th className="px-4 py-3 text-xs font-medium text-slate-400 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-500 animate-pulse">Carregando dados...</td>
                                </tr>
                            ) : paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-500">Nenhum registro encontrado para os filtros.</td>
                                </tr>
                            ) : (
                                paginatedData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 text-sm text-slate-200 font-medium max-w-[200px] truncate" title={item.paciente}>
                                            {item.paciente}
                                            {item.carteirinha && <div className="text-xs text-slate-500 font-normal">{item.carteirinha}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{item.dia_semana}</td>
                                        <td className="px-4 py-3 text-sm text-slate-400 max-w-[150px] truncate" title={item.convenio}>{item.convenio}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300 max-w-[200px] truncate" title={item.procedimento}>{item.procedimento}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300 text-center font-semibold">{item.totalizador}</td>
                                        <td className="px-4 py-3 text-sm text-emerald-400 text-center font-bold">
                                            {item.totalizador * semanas}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Button 
                                                variant="secondary" 
                                                onClick={() => handleSolicitarAutorizacao(item)}
                                                title="Solicitar Autorização"
                                                className="p-2 inline-flex"
                                            >
                                                <FileText className="w-4 h-4 text-blue-400" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginação */}
                {groupedData.length > 0 && (
                    <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/50">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400">Mostrar</span>
                            <Select 
                                value={pageSize} 
                                onChange={e => setPageSize(Number(e.target.value))}
                                className="w-20 text-sm py-1"
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </Select>
                            <span className="text-sm text-slate-400">por página</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-400">
                                Mostrando {(currentPage - 1) * pageSize + 1} até {Math.min(currentPage * pageSize, groupedData.length)} de {groupedData.length} registros
                            </span>
                            <div className="flex items-center gap-1">
                                <Button 
                                    variant="secondary" 
                                    className="p-1 min-w-0" 
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-sm font-medium text-slate-200 px-2">
                                    {currentPage} / {totalPages}
                                </span>
                                <Button 
                                    variant="secondary" 
                                    className="p-1 min-w-0" 
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            <NovaSolicitacaoModal 
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={() => setModalOpen(false)}
                initialData={selectedRequestData}
            />
        </div>
    );
}
