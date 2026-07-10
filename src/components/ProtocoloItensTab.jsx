import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Database, CheckCircle, XCircle, Download, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import api from '../services/api';
import protocoloApi from '../services/protocolo';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Card from './ui/Card';

export default function ProtocoloItensTab({ convenioGlobal }) {
    // Convenio ID mapping
    const getConvenioId = (convStr) => {
        return convStr === 'ipasgo' ? 6 : 3;
    };

    const idConvenio = getConvenioId(convenioGlobal);

    // State for filtering
    const [nome, setNome] = useState('');
    const [guia, setGuia] = useState('');
    const [statusConciliacao, setStatusConciliacao] = useState('');
    const [statusAssinatura, setStatusAssinatura] = useState('');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [selectedLoteFat, setSelectedLoteFat] = useState('');

    // State for data
    const [itens, setItens] = useState([]);
    const [total, setTotal] = useState(0);
    const [lotesFat, setLotesFat] = useState([]);
    const [loading, setLoading] = useState(false);
    const [conciliando, setConciliando] = useState(false);

    // Pagination
    const [limit] = useState(25);
    const [skip, setSkip] = useState(0);

    // Fetch faturamento lotes for the active convenio
    const fetchLotesFat = useCallback(async () => {
        try {
            const res = await api.get(`/lotes/?id_convenio=${idConvenio}&limit=100`);
            const activeLotes = (res.data?.data || []).filter(l => l.status !== 'Cancelado');
            setLotesFat(activeLotes);
        } catch (e) {
            console.error('Erro ao buscar lotes faturamento:', e);
        }
    }, [idConvenio]);

    // Fetch items
    const fetchItens = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                id_convenio: idConvenio,
                limit,
                skip,
            };
            if (nome.trim()) params.nome = nome.trim();
            if (guia.trim()) params.guia = guia.trim();
            if (statusConciliacao) params.status_conciliacao = statusConciliacao;
            if (statusAssinatura) params.assinatura = statusAssinatura;
            if (dataInicio) params.data_inicio = dataInicio;
            if (dataFim) params.data_fim = dataFim;

            const res = await protocoloApi.listItens(params);
            setItens(res.data?.data || []);
            setTotal(res.data?.total || 0);
        } catch (e) {
            console.error('Erro ao buscar itens de protocolo:', e);
        } finally {
            setLoading(false);
        }
    }, [idConvenio, nome, guia, statusConciliacao, statusAssinatura, dataInicio, dataFim, limit, skip]);

    // Initial load and on tab change
    useEffect(() => {
        fetchLotesFat();
        setSkip(0); // Reset page on convenio change
    }, [fetchLotesFat]);

    useEffect(() => {
        fetchItens();
    }, [fetchItens, skip]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSkip(0);
        fetchItens();
    };

    const handleClearFilters = () => {
        setNome('');
        setGuia('');
        setStatusConciliacao('');
        setStatusAssinatura('');
        setDataInicio('');
        setDataFim('');
        setSelectedLoteFat('');
        setSkip(0);
    };

    // Auto-conciliation trigger
    const handleConciliar = async () => {
        setConciliando(true);
        try {
            const loteFatId = selectedLoteFat ? parseInt(selectedLoteFat) : null;
            const res = await protocoloApi.conciliarItens(idConvenio, loteFatId);
            const count = res.data?.conciliated || 0;
            alert(`Conciliação concluída com sucesso! ${count} item(ns) conciliado(s).`);
            fetchItens();
        } catch (e) {
            const msg = e.response?.data?.detail || e.message;
            alert(`Erro na conciliação: ${msg}`);
        } finally {
            setConciliando(false);
        }
    };

    // Client-side export to Excel (CSV PT-BR format) of all filtered items
    const handleExportExcel = async () => {
        setLoading(true);
        try {
            const params = {
                id_convenio: idConvenio,
            };
            if (nome.trim()) params.nome = nome.trim();
            if (guia.trim()) params.guia = guia.trim();
            if (statusConciliacao) params.status_conciliacao = statusConciliacao;
            if (statusAssinatura) params.assinatura = statusAssinatura;
            if (dataInicio) params.data_inicio = dataInicio;
            if (dataFim) params.data_fim = dataFim;

            const res = await protocoloApi.exportItens(params);
            const allItens = res.data?.data || [];

            if (allItens.length === 0) {
                alert('Nenhum item encontrado com os filtros aplicados para exportar.');
                return;
            }

            const headers = [
                'ID Item',
                'Paciente/Beneficiário',
                'Carteira',
                'Guia',
                'Senha/Guia Principal',
                'Guia Prestador',
                'Data Sessão',
                'Assinatura',
                'Status Conciliação',
                'Procedimento Faturado',
                'Lote Faturamento ID',
                'Agendamento Associado'
            ];

            const csvContent = [headers.join(';')].concat(
                allItens.map(item => [
                    item.id,
                    item.nome || '',
                    item.carteira || '',
                    item.guia || '',
                    item.senha || '',
                    item.guia_prestador || '',
                    item.data ? new Date(item.data).toLocaleDateString('pt-BR') : '',
                    item.assinatura || 'Não',
                    item.status_conciliacao || 'Não Conciliado',
                    item.faturamento?.cod_procedimento_fat || '',
                    item.faturamento?.id || '',
                    item.agendamento ? `${item.agendamento.nome_procedimento} (${item.agendamento.id_agendamento})` : ''
                ].map(val => String(val).replace(/;/g, ',')).join(';'))
            ).join('\n');

            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `protocolo_itens_${convenioGlobal}_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Erro ao exportar itens:', e);
            alert('Ocorreu um erro ao exportar os dados. Verifique a conexão.');
        } finally {
            setLoading(false);
        }
    };

    // Pagination helper
    const pageCount = Math.ceil(total / limit);
    const currentPage = Math.floor(skip / limit) + 1;

    const handlePrevPage = () => {
        if (skip > 0) setSkip(skip - limit);
    };

    const handleNextPage = () => {
        if (skip + limit < total) setSkip(skip + limit);
    };

    return (
        <div className="space-y-6">
            {/* Filters panel */}
            <Card>
                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="flex items-center gap-2 text-text-primary font-semibold mb-2">
                        <Filter size={18} />
                        Filtros de Pesquisa
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        {/* Paciente */}
                        <div className="space-y-1">
                            <label className="text-xs text-text-secondary font-medium">Paciente / Beneficiário</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Nome do paciente"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    className="bg-slate-800 border border-border text-text-primary text-sm px-3 py-1.5 rounded-lg w-full pl-8 focus:outline-none focus:border-blue-500"
                                />
                                <Search size={14} className="absolute left-2.5 top-2.5 text-text-secondary" />
                            </div>
                        </div>

                        {/* Guia */}
                        <div className="space-y-1">
                            <label className="text-xs text-text-secondary font-medium">Guia / Senha</label>
                            <input
                                type="text"
                                placeholder="Número da guia"
                                value={guia}
                                onChange={(e) => setGuia(e.target.value)}
                                className="bg-slate-800 border border-border text-text-primary text-sm px-3 py-1.5 rounded-lg w-full focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Status Conciliação */}
                        <div className="space-y-1">
                            <label className="text-xs text-text-secondary font-medium">Status Conciliação</label>
                            <select
                                value={statusConciliacao}
                                onChange={(e) => setStatusConciliacao(e.target.value)}
                                className="bg-slate-800 border border-border text-text-primary text-sm px-3 py-1.5 rounded-lg w-full focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Todos</option>
                                <option value="Conciliado">Conciliado</option>
                                <option value="Não Conciliado">Não Conciliado</option>
                            </select>
                        </div>

                        {/* Status Assinatura */}
                        <div className="space-y-1">
                            <label className="text-xs text-text-secondary font-medium">Status Assinatura</label>
                            <select
                                value={statusAssinatura}
                                onChange={(e) => setStatusAssinatura(e.target.value)}
                                className="bg-slate-800 border border-border text-text-primary text-sm px-3 py-1.5 rounded-lg w-full focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Todos</option>
                                <option value="Sim">Assinados</option>
                                <option value="Não">Pendentes</option>
                            </select>
                        </div>

                        {/* Datas De */}
                        <div className="space-y-1">
                            <label className="text-xs text-text-secondary font-medium">Data Realização De</label>
                            <input
                                type="date"
                                value={dataInicio}
                                onChange={(e) => setDataInicio(e.target.value)}
                                className="bg-slate-800 border border-border text-text-primary text-sm px-3 py-1.5 rounded-lg w-full focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Datas Até */}
                        <div className="space-y-1">
                            <label className="text-xs text-text-secondary font-medium">Até</label>
                            <input
                                type="date"
                                value={dataFim}
                                onChange={(e) => setDataFim(e.target.value)}
                                className="bg-slate-800 border border-border text-text-primary text-sm px-3 py-1.5 rounded-lg w-full focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/50 pt-4">
                        {/* Lote Faturamento Select */}
                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            <label className="text-xs text-text-secondary font-medium whitespace-nowrap">Lote Faturamento:</label>
                            <select
                                value={selectedLoteFat}
                                onChange={(e) => setSelectedLoteFat(e.target.value)}
                                className="bg-slate-800 border border-border text-text-primary text-sm px-3 py-1.5 rounded-lg w-full lg:w-64 focus:outline-none focus:border-blue-500"
                                title="Filtrar por lote de faturamento"
                            >
                                <option value="">(Todos os lotes faturamento)</option>
                                {lotesFat.map(l => (
                                    <option key={l.id_lote} value={l.id_lote}>
                                        Lote #{l.numero_lote || l.id_lote} ({l.cod_prestador})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-3 ml-auto">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleClearFilters}
                                className="text-slate-400 hover:text-slate-200"
                                title="Limpar todos os filtros da busca"
                            >
                                Limpar
                            </Button>
                            <Button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-500"
                                title="Aplicar os filtros para buscar atendimentos"
                            >
                                Aplicar Filtros
                            </Button>
                        </div>
                    </div>
                </form>
            </Card>

            {/* Action buttons bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-sm text-text-secondary">
                    Total: <span className="font-semibold text-text-primary">{total}</span> atendimento(s) encontrado(s)
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleExportExcel}
                        variant="ghost"
                        className="text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/10"
                        title="Exportar dados de sessões para arquivo Excel (CSV)"
                    >
                        <Download size={14} className="mr-1.5" />
                        Exportar Excel
                    </Button>
                    <Button
                        onClick={handleConciliar}
                        disabled={conciliando || itens.length === 0}
                        className="bg-emerald-600 hover:bg-emerald-500"
                        title="Iniciar conciliação das datas de sessões contra os lotes de faturamento no sistema"
                    >
                        {conciliando ? (
                            <>
                                <Loader size={14} className="mr-1.5 animate-spin" />
                                Conciliando...
                            </>
                        ) : (
                            <>
                                <Database size={14} className="mr-1.5" />
                                Conciliar com Lote Faturamento
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Listagem */}
            <Card noPadding>
                {loading ? (
                    <div className="text-center py-20">
                        <Loader size={36} className="mx-auto animate-spin text-blue-500 mb-2" />
                        <p className="text-text-secondary text-sm">Carregando itens de protocolo...</p>
                    </div>
                ) : itens.length === 0 ? (
                    <div className="text-center py-20 text-text-secondary">
                        <Database size={48} className="mx-auto mb-3 text-slate-700" />
                        <p className="text-lg font-medium">Nenhum atendimento gravado</p>
                        <p className="text-sm mt-1">Grave guias processadas para exibi-las aqui.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-900/50 text-text-secondary text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 text-left">Paciente</th>
                                    <th className="px-4 py-3 text-left">Carteira</th>
                                    <th className="px-4 py-3 text-left">Guia / Senha</th>
                                    <th className="px-4 py-3 text-left">Data Sessão</th>
                                    <th className="px-4 py-3 text-left">Assinatura</th>
                                    <th className="px-4 py-3 text-left">Conciliação</th>
                                    <th className="px-4 py-3 text-left">Vínculo Faturamento</th>
                                    <th className="px-4 py-3 text-left">Vínculo Agendamento</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {itens.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                                        {/* Beneficiary */}
                                        <td className="px-4 py-3 text-sm text-text-primary font-medium">
                                            {item.nome}
                                        </td>
                                        
                                        {/* Carteirinha */}
                                        <td className="px-4 py-3 text-sm text-text-secondary">
                                            {item.carteira || '—'}
                                        </td>

                                        {/* Guia / Senha */}
                                        <td className="px-4 py-3 text-sm">
                                            <div className="font-mono text-text-primary text-xs">
                                                G: {item.guia || '—'}
                                            </div>
                                            {item.senha && (
                                                <div className="font-mono text-text-secondary text-[11px] mt-0.5">
                                                    S: {item.senha}
                                                </div>
                                            )}
                                        </td>

                                        {/* Session Date */}
                                        <td className="px-4 py-3 text-sm text-text-primary font-mono whitespace-nowrap">
                                            {item.data ? new Date(item.data).toLocaleDateString('pt-BR') : '—'}
                                        </td>

                                        {/* Assinatura */}
                                        <td className="px-4 py-3 text-sm">
                                            <Badge variant={item.assinatura === 'Sim' ? 'success' : 'error'}>
                                                {item.assinatura === 'Sim' ? 'Assinada' : 'Pendente Assinatura'}
                                            </Badge>
                                        </td>

                                        {/* Status Conciliacao */}
                                        <td className="px-4 py-3 text-sm">
                                            <Badge variant={item.status_conciliacao === 'Conciliado' ? 'success' : 'warning'}>
                                                {item.status_conciliacao === 'Conciliado' ? (
                                                    <span className="flex items-center gap-1">
                                                        <CheckCircle size={10} /> Conciliado
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1">
                                                        <XCircle size={10} /> Não Conciliado
                                                    </span>
                                                )}
                                            </Badge>
                                        </td>

                                        {/* Fat Link */}
                                        <td className="px-4 py-3 text-sm">
                                            {item.faturamento ? (
                                                <div className="text-xs space-y-0.5 text-emerald-400">
                                                    <div>ID: {item.faturamento.id} (Lote: {item.faturamento.detalheId})</div>
                                                    <div>Guia: {item.faturamento.Guia}</div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-text-secondary italic">Sem vínculo</span>
                                            )}
                                        </td>

                                        {/* Scheduling Link */}
                                        <td className="px-4 py-3 text-sm">
                                            {item.agendamento ? (
                                                <div className="text-xs space-y-0.5 text-blue-400">
                                                    <div className="font-medium truncate max-w-[180px]" title={item.agendamento.nome_procedimento}>
                                                        {item.agendamento.nome_procedimento}
                                                    </div>
                                                    <div className="text-[10px] text-text-secondary">
                                                        Ag. #{item.agendamento.id_agendamento} - {new Date(item.agendamento.data).toLocaleDateString('pt-BR')}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-text-secondary italic">Sem vínculo</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {pageCount > 1 && !loading && (
                    <div className="flex items-center justify-between p-4 border-t border-border bg-slate-900/10">
                        <div className="text-xs text-text-secondary">
                            Página <span className="font-semibold text-text-primary">{currentPage}</span> de <span className="font-semibold">{pageCount}</span> ({total} itens)
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handlePrevPage}
                                disabled={skip === 0}
                                className="p-1.5"
                            >
                                <ChevronLeft size={16} />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleNextPage}
                                disabled={skip + limit >= total}
                                className="p-1.5"
                            >
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
