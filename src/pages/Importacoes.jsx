import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';
import { Play, Filter, RefreshCcw, Trash2, Clock, CheckCircle, AlertCircle, XCircle, Users, Activity } from 'lucide-react';
import { formatDateTime, maskCarteirinha, validateCarteirinha } from '../utils/formatters';
import SearchableSelect from '../components/SearchableSelect';

// Design System
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import CheckBox from '../components/ui/CheckBox';


import WorkerList from '../components/WorkerList';

export default function Importacoes() {
  const [loading, setLoading] = useState(false);
  const username = localStorage.getItem('username') || 'Usuário';
  // Convenio State
  const [convenios, setConvenios] = useState([]);
  const [selectedConvenio, setSelectedConvenio] = useState('');

  // Job Creation State
  const [importType, setImportType] = useState('single');
  const [carteirinhas, setCarteirinhas] = useState([]);
  const [selectedCarteirinhas, setSelectedCarteirinhas] = useState([]);

  // Custom job parameters
  const [importRotina, setImportRotina] = useState('');
  const [targetGuiasStr, setTargetGuiasStr] = useState('');

  // IPASGO specific parameters
  const [ipasgoStartDate, setIpasgoStartDate] = useState('');
  const [ipasgoEndDate, setIpasgoEndDate] = useState('');
  const [ipasgoCarteira, setIpasgoCarteira] = useState('');
  const [ipasgoGuia, setIpasgoGuia] = useState('');

  // OP6 parameters
  const [op6LoteId, setOp6LoteId] = useState('');
  const [op6CodigoPrestador, setOp6CodigoPrestador] = useState('');

  // OP7 parameters
  const [op7DetalheId, setOp7DetalheId] = useState('');
  const [op7Status, setOp7Status] = useState('');
  const [op7DataRealizacao, setOp7DataRealizacao] = useState('');
  const [op7ValorProcedimento, setOp7ValorProcedimento] = useState('');

  // Sorting State
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Jobs List State
  const [jobs, setJobs] = useState([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState({
    status: '',
    created_at_start: '',
    created_at_end: ''
  });

  useEffect(() => {
    fetchCarteirinhas();
  }, [selectedConvenio]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(() => {
      fetchJobs();
      fetchStats();
    }, 5000); // Poll for updates
    return () => clearInterval(interval);
  }, [page, pageSize, filters, selectedConvenio]);

  const [stats, setStats] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (e) { console.error("Error fetching stats", e); }
  };

  const fetchCarteirinhas = async () => {
    try {
      const params = { limit: 1000 };
      if (selectedConvenio) params.id_convenio = parseInt(selectedConvenio);
      const res = await api.get('/carteirinhas/', { params });
      setCarteirinhas(res.data.data || res.data);
    } catch (e) { console.error(e); }
  };

  const fetchConvenios = async () => {
    try {
      const res = await api.get('/convenios/');
      setConvenios(res.data);
      if (res.data.length > 0) setSelectedConvenio(res.data[0].id_convenio.toString());
    } catch (e) { console.error("Error fetching convenios", e); }
  };

  // Derive dynamic operacoes based on selectedConvenio
  const currentConvenioObj = convenios.find(c => c.id_convenio.toString() === selectedConvenio);
  const currentOperacoes = (currentConvenioObj?.operacoes || []).sort((a, b) => {
    const numA = parseInt(a.descricao.match(/^\d+/)?.[0] || '999', 10);
    const numB = parseInt(b.descricao.match(/^\d+/)?.[0] || '999', 10);
    return numA - numB;
  });

  useEffect(() => {
    // Reset or auto-select routine when convenio changes
    // Default to '1' (Consulta) if available, fallback to first
    if (currentOperacoes.length > 1) {
      setImportRotina(currentOperacoes[1].valor);
    } else if (currentOperacoes.length > 0) {
      setImportRotina(currentOperacoes[0].valor);
    } else {
      setImportRotina('');
    }
  }, [selectedConvenio, convenios]);

  useEffect(() => {
    fetchConvenios();
  }, []);

  const fetchJobs = async () => {
    try {
      const params = {
        limit: pageSize,
        skip: (page - 1) * pageSize,
      };

      if (filters.status) params.status = filters.status;
      if (filters.created_at_start) params.created_at_start = filters.created_at_start;
      if (filters.created_at_end) params.created_at_end = filters.created_at_end;
      if (selectedConvenio) params.id_convenio = parseInt(selectedConvenio);

      const res = await api.get('/jobs/', { params });

      if (res.data.data) {
        setJobs(res.data.data);
        setTotalJobs(res.data.total);
      } else {
        setJobs(res.data);
      }
    } catch (e) { console.error("Error fetching jobs", e); }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedJobs = React.useMemo(() => {
    if (!jobs) return [];
    let sortableItems = [...jobs];
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
  }, [jobs, sortConfig]);

  const formatParamsSafely = (paramsStr) => {
    if (!paramsStr) return '-';
    try {
      const parsed = typeof paramsStr === 'string' ? JSON.parse(paramsStr) : paramsStr;
      if (parsed?.guias) return Array.isArray(parsed.guias) ? parsed.guias.join(', ') : parsed.guias;
      if (parsed?.guia) return parsed.guia;
      return typeof parsed === 'object' ? JSON.stringify(parsed) : paramsStr;
    } catch (e) {
      return String(paramsStr);
    }
  };

  const handleCreateJob = async () => {
    const typeMap = { 'single': 'single', 'multiple': 'multiple', 'all': 'all' };

    const isIpasgoSpecial = selectedConvenio === '6' && ['3', 'op3_import_guias', '6', 'op6_check_baixados', '7', 'op7_fat_facplan'].includes(importRotina);

    if (!isIpasgoSpecial && (importType === 'single' || importType === 'multiple') && selectedCarteirinhas.length === 0) {
      alert("Selecione pelo menos uma carteirinha/paciente.");
      return;
    }

    if (importType === 'all' && !confirm("Deseja processar TODAS as carteirinhas?")) return;

    if (!selectedConvenio) {
      alert("Por favor, selecione para qual Convênio este job será enviado.");
      return;
    }

    try {
      let payload = {};

      // Build Params String for OP2 Captura
      let finalParams = null;
      let finalRotina = importRotina || '1'; // Default to Consulta if empty

      if (finalRotina === '2' || finalRotina === 'captura') {
        if (targetGuiasStr.trim()) {
          const guiasArray = targetGuiasStr.split(',').map(g => g.trim()).filter(g => g);
          finalParams = JSON.stringify({ guias: guiasArray });
        }
      } else if (selectedConvenio === '6' && ['3', 'op3_import_guias'].includes(finalRotina)) {
        const ipasgoParams = {};
        if (ipasgoStartDate) ipasgoParams.start_date = ipasgoStartDate;
        if (ipasgoEndDate) ipasgoParams.end_date = ipasgoEndDate;
        if (ipasgoCarteira) ipasgoParams.carteira = ipasgoCarteira;
        if (ipasgoGuia) ipasgoParams.numero_guia = ipasgoGuia;

        if (Object.keys(ipasgoParams).length > 0) {
          finalParams = JSON.stringify(ipasgoParams);
        }
      } else if (selectedConvenio === '6' && ['6', 'op6_check_baixados'].includes(finalRotina)) {
        finalParams = JSON.stringify({
          loteId: op6LoteId,
          codigoPrestador: op6CodigoPrestador
        });
      } else if (selectedConvenio === '6' && ['7', 'op7_fat_facplan'].includes(finalRotina)) {
        let dtRealizacaoFormatted = op7DataRealizacao;
        if (op7DataRealizacao) {
            const parts = op7DataRealizacao.split('-');
            if (parts.length === 3) {
                dtRealizacaoFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        }
        finalParams = JSON.stringify({
          detalheId: op7DetalheId,
          status: op7Status,
          dataRealizacao: dtRealizacaoFormatted,
          valorProcedimento: op7ValorProcedimento
        });
      }

      if (importType === 'temp') {
        const cartInput = document.getElementById('temp-carteirinha').value;
        const pacInput = document.getElementById('temp-paciente').value;

        if (!cartInput || !pacInput) {
          alert("Preencha carteirinha e nome do paciente.");
          return;
        }

        if (!validateCarteirinha(cartInput)) {
          alert("Carteirinha inválida! Formato deve ser 0000.0000.000000.00-0");
          return;
        }

        payload = {
          type: 'temp',
          rotina: finalRotina,
          params: finalParams,
          id_convenio: selectedConvenio ? parseInt(selectedConvenio) : undefined,
          temp_patient: {
            carteirinha: cartInput,
            paciente: pacInput
          }
        };
      } else {
        payload = {
          type: typeMap[importType],
          rotina: finalRotina,
          params: finalParams,
          id_convenio: selectedConvenio ? parseInt(selectedConvenio) : undefined,
          carteirinha_ids: (importType === 'all' || isIpasgoSpecial) ? [] : selectedCarteirinhas
        };
      }

      await api.post('/jobs/', payload);
      alert("Solicitações criadas com sucesso!");
      setSelectedCarteirinhas([]);
      setTargetGuiasStr('');
      fetchJobs();

      if (importType === 'temp') {
        document.getElementById('temp-carteirinha').value = '';
        document.getElementById('temp-paciente').value = '';
      }
    } catch (e) {
      alert("Erro ao criar jobs: " + (e.response?.data?.detail || e.message));
    }
  };

  const handleDeleteJob = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este Job?")) return;
    try {
      await api.delete(`/jobs/${id}`);
      fetchJobs();
    } catch (e) {
      alert("Erro ao excluir: " + (e.response?.data?.detail || e.message));
    }
  };

  const handleRetryJob = async (id) => {
    if (!confirm("Deseja reenviar este Job?")) return;
    try {
      await api.post(`/jobs/${id}/retry`);
      fetchJobs();
    } catch (e) {
      alert("Erro ao reenviar: " + (e.response?.data?.detail || e.message));
    }
  };

  const getStatusBadge = (job) => {
    switch (job.status) {
      case 'success': return <Badge variant="success">Sucesso</Badge>;
      case 'error': return <span title={job.error_message || 'Erro Desconhecido'} className="cursor-help"><Badge variant="error">Erro</Badge></span>;
      case 'pending': return <Badge variant="warning">Pendente</Badge>;
      case 'processing': return <Badge variant="info">Processando</Badge>;
      default: return <Badge>{job.status}</Badge>;
    }
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return '-';
    const diff = new Date(end) - new Date(start);
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const handleTempCarteirinhaChange = (e) => {
    e.target.value = maskCarteirinha(e.target.value);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Importações / Jobs</h1>
          <span className="text-text-secondary text-sm">Usuário: {username}</span>
        </div>
        <div className="items-end">
          <div className="text-xs text-text-secondary mb-1 text-right">Workers Linkados:</div>
          <WorkerList compact={true} />
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="flex items-center gap-3 p-4">
            <div className="bg-blue-500/10 p-2 rounded-full text-blue-500"><Users size={20} /></div>
            <div>
              <div className="text-xs text-text-secondary">Carteirinhas</div>
              <div className="text-xl font-bold text-text-primary">{stats.overview.total_carteirinhas}</div>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="bg-emerald-500/10 p-2 rounded-full text-emerald-500"><CheckCircle size={20} /></div>
            <div>
              <div className="text-xs text-text-secondary">Guias</div>
              <div className="text-xl font-bold text-text-primary">{stats.overview.total_guias}</div>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="bg-amber-500/10 p-2 rounded-full text-amber-500"><Activity size={20} /></div>
            <div>
              <div className="text-xs text-text-secondary">Jobs Total</div>
              <div className="text-xl font-bold text-text-primary">{stats.overview.total_jobs}</div>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="bg-green-500/10 p-2 rounded-full text-green-500"><CheckCircle size={20} /></div>
            <div>
              <div className="text-xs text-text-secondary">Sucesso</div>
              <div className="text-xl font-bold text-text-primary">{stats.jobs_status.success}</div>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="bg-red-500/10 p-2 rounded-full text-red-500"><XCircle size={20} /></div>
            <div>
              <div className="text-xs text-text-secondary">Erros</div>
              <div className="text-xl font-bold text-text-primary">{stats.jobs_status.error}</div>
            </div>
          </Card>
        </div>
      )}

      {/* Creation Panel */}
      <Card className="relative z-10">
        <h3 className="text-lg font-semibold text-text-primary mb-4 border-b border-border pb-2">Nova Solicitação</h3>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-text-secondary mb-1">Tipo de Importação</label>
            <Select
              value={importType}
              onChange={e => { setImportType(e.target.value); setSelectedCarteirinhas([]); }}
            >
              <option value="single">Única</option>
              <option value="multiple">Múltipla</option>
              <option value="all">Todos</option>
              <option value="temp">Paciente Temporário</option>
            </Select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-text-secondary mb-1">Convênio</label>
            <Select
              value={selectedConvenio}
              onChange={e => setSelectedConvenio(e.target.value)}
            >
              {convenios.length === 0 && <option value="">Sem Convênios</option>}
              {convenios.map(c => (
                <option key={c.id_convenio} value={c.id_convenio}>
                  {c.nome} (ID: {c.id_convenio})
                </option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-text-secondary mb-1">Rotina / Operação</label>
            <Select
              value={importRotina}
              onChange={e => setImportRotina(e.target.value)}
              disabled={currentOperacoes.length === 0}
            >
              {currentOperacoes.length === 0 && <option value="">Sem Rotinas</option>}
              {currentOperacoes.map(op => (
                <option key={op.id} value={op.valor}>{op.descricao}</option>
              ))}
            </Select>
          </div>
          {(importRotina === '2' || importRotina === 'captura') && (
            <div className="md:col-span-6">
              <label className="block text-sm font-medium text-text-secondary mb-1">Guias Alvo (Separado por vírgula)</label>
              <Input
                type="text"
                placeholder="Ex: 15089518, 15089519"
                value={targetGuiasStr}
                onChange={e => setTargetGuiasStr(e.target.value)}
              />
            </div>
          )}

          {selectedConvenio === '6' && ['3', 'op3_import_guias'].includes(importRotina) && (
            <>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Data Início</label>
                <Input
                  type="date"
                  value={ipasgoStartDate}
                  onChange={e => setIpasgoStartDate(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Data Fim</label>
                <Input
                  type="date"
                  value={ipasgoEndDate}
                  onChange={e => setIpasgoEndDate(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Carteira Opcional</label>
                <Input
                  type="text"
                  placeholder="Ex: 123456789"
                  value={ipasgoCarteira}
                  onChange={e => setIpasgoCarteira(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Guia Opcional</label>
                <Input
                  type="text"
                  placeholder="Ex: 987654"
                  value={ipasgoGuia}
                  onChange={e => setIpasgoGuia(e.target.value)}
                />
              </div>
            </>
          )}

          {selectedConvenio === '6' && ['6', 'op6_check_baixados'].includes(importRotina) && (
            <>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Lote ID *</label>
                <Input
                  type="text"
                  placeholder="Ex: 12345"
                  value={op6LoteId}
                  onChange={e => setOp6LoteId(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Cód. Prestador Opcional</label>
                <Input
                  type="text"
                  placeholder="Deixar vazio p/ padrão"
                  value={op6CodigoPrestador}
                  onChange={e => setOp6CodigoPrestador(e.target.value)}
                />
              </div>
            </>
          )}

          {selectedConvenio === '6' && ['7', 'op7_fat_facplan'].includes(importRotina) && (
            <>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Detalhe ID *</label>
                <Input
                  type="text"
                  placeholder="Ex: 5678"
                  value={op7DetalheId}
                  onChange={e => setOp7DetalheId(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Status Conf. *</label>
                <Input
                  type="text"
                  placeholder="Ex: 67"
                  value={op7Status}
                  onChange={e => setOp7Status(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Data Realização *</label>
                <Input
                  type="date"
                  value={op7DataRealizacao}
                  onChange={e => setOp7DataRealizacao(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Valor Proc. (Opcional)</label>
                <Input
                  type="text"
                  placeholder="Ex: 150.00"
                  value={op7ValorProcedimento}
                  onChange={e => setOp7ValorProcedimento(e.target.value)}
                />
              </div>
            </>
          )}

          {importType === 'temp' ? (
            <>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Carteirinha (Temp)</label>
                <Input
                  type="text"
                  placeholder="Ex: 0000.0000.000000.00-0"
                  id="temp-carteirinha"
                  maxLength={21}
                  onChange={handleTempCarteirinhaChange}
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-text-secondary mb-1">Nome do Paciente</label>
                <Input
                  type="text"
                  placeholder="Nome Completo"
                  id="temp-paciente"
                />
              </div>
            </>
          ) : (
            importType !== 'all' && (
              <div className="md:col-span-7">
                <label className="block text-sm font-medium text-text-secondary mb-1">Selecione os Pacientes</label>

                {importType === 'multiple' ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        id="patient-search-input"
                        list="patients-list"
                        placeholder="Pesquisar paciente... (Enter p/ incluir)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = e.target.value;
                            const item = carteirinhas.find(c => (c.paciente ? `${c.paciente} (${c.carteirinha})` : c.carteirinha) === val);
                            if (item) {
                              if (!selectedCarteirinhas.includes(item.id)) {
                                setSelectedCarteirinhas([...selectedCarteirinhas, item.id]);
                              }
                              e.target.value = '';
                            }
                          }
                        }}
                      />
                      <datalist id="patients-list">
                        {carteirinhas.map(c => (
                          <option key={c.id} value={c.paciente ? `${c.paciente} (${c.carteirinha})` : c.carteirinha} />
                        ))}
                      </datalist>
                      <Button
                        onClick={() => {
                          const input = document.getElementById('patient-search-input');
                          const val = input.value;
                          const item = carteirinhas.find(c => (c.paciente ? `${c.paciente} (${c.carteirinha})` : c.carteirinha) === val);
                          if (item) {
                            if (!selectedCarteirinhas.includes(item.id)) {
                              setSelectedCarteirinhas([...selectedCarteirinhas, item.id]);
                            }
                            input.value = '';
                          } else {
                            alert("Selecione um paciente válido da lista.");
                          }
                        }}
                      >
                        +
                      </Button>
                    </div>

                    {/* Selected List — Checkboxes Animados */}
                    <div className="bg-slate-900/50 p-2 rounded-lg min-h-[56px] max-h-[160px] overflow-y-auto flex flex-col gap-1">
                      {selectedCarteirinhas.length === 0 && (
                        <span className="text-text-secondary text-xs italic p-1">Nenhum paciente selecionado</span>
                      )}
                      {selectedCarteirinhas.map(id => {
                        const c = carteirinhas.find(x => x.id === id);
                        return (
                          <div
                            key={id}
                            className="flex items-center justify-between gap-2 bg-surface/60 hover:bg-slate-700/50 border border-border/40 px-2 py-1 rounded-md transition-colors group"
                          >
                            <CheckBox
                              checked={true}
                              onClick={() => setSelectedCarteirinhas(selectedCarteirinhas.filter(x => x !== id))}
                              size={16}
                              color="#6366f1"
                              duration={0.35}
                              label={c ? (c.paciente || c.carteirinha) : `ID: ${id}`}
                            />
                            <span className="text-xs text-slate-500 group-hover:text-slate-400 font-mono transition-colors shrink-0">
                              {c?.carteirinha || ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <SearchableSelect
                    options={carteirinhas.map(c => ({
                      value: c.id,
                      label: c.paciente ? `${c.paciente} (${c.carteirinha})` : c.carteirinha
                    }))}
                    value={selectedCarteirinhas[0] || ''}
                    onChange={(val) => setSelectedCarteirinhas(val ? [parseInt(val)] : [])}
                    placeholder="Selecione ou Cole o Paciente..."
                  />
                )}
              </div>
            )
          )}

          <div className="md:col-span-2">
            <Button onClick={handleCreateJob} className="w-full h-[42px]">
              <Play size={16} /> Criar
            </Button>
          </div>

        </div>
      </Card>

      {/* Jobs List */}
      <Card noPadding>
        {/* Filters Toolbar */}
        <div className="p-4 border-b border-border flex flex-wrap gap-4 items-end bg-surface/30">
          <div className="w-40">
            <label className="block text-xs font-semibold text-text-secondary mb-1">Status</label>
            <Select
              value={filters.status}
              onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
              className="py-1.5 text-sm"
            >
              <option value="">Todos</option>
              <option value="success">Sucesso</option>
              <option value="error">Erro</option>
              <option value="pending">Pendente</option>
              <option value="processing">Processando</option>
            </Select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-semibold text-text-secondary mb-1">Início</label>
            <Input type="date" value={filters.created_at_start} onChange={e => { setFilters({ ...filters, created_at_start: e.target.value }); setPage(1); }} className="py-1.5 text-sm" />
          </div>
          <div className="w-40">
            <label className="block text-xs font-semibold text-text-secondary mb-1">Fim</label>
            <Input type="date" value={filters.created_at_end} onChange={e => { setFilters({ ...filters, created_at_end: e.target.value }); setPage(1); }} className="py-1.5 text-sm" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50 text-text-secondary text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left cursor-pointer hover:text-primary" onClick={() => handleSort('id')}>ID</th>
                <th className="px-6 py-3 text-left cursor-pointer hover:text-primary" onClick={() => handleSort('created_at')}>Data Criação</th>
                <th className="px-6 py-3 text-left cursor-pointer hover:text-primary" onClick={() => handleSort('rotina')}>Rotina</th>
                <th className="px-6 py-3 text-left">Params (Guias)</th>
                <th className="px-6 py-3 text-left cursor-pointer hover:text-primary" onClick={() => handleSort('status')}>Status</th>
                <th className="px-6 py-3 text-left cursor-pointer hover:text-primary" onClick={() => handleSort('attempts')}>Tentativas</th>
                <th className="px-6 py-3 text-left">Tempo Proc.</th>
                <th className="px-6 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedJobs.map(job => (
                <tr key={job.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-text-primary whitespace-nowrap">#{job.id}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{formatDateTime(job.created_at)}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">{job.rotina || 'Padrão'}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap truncate max-w-[150px]" title={job.params}>
                    {formatParamsSafely(job.params)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {getStatusBadge(job)}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{job.attempts}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary font-mono">{calculateDuration(job.created_at, job.updated_at)}</td>
                  <td className="px-6 py-4 text-sm">
                    {(job.status === 'error' && job.attempts > 3) && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleRetryJob(job.id)} title="Reenviar" className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10">
                          <RefreshCcw size={16} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteJob(job.id)} title="Excluir" className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {sortedJobs.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-text-secondary">
                    Nenhum job encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-border">
          <Pagination
            currentPage={page}
            totalItems={totalJobs}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </Card>
    </div>
  );
}
