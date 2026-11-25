import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import Pagination from '../components/Pagination';
import { Play, Filter, RefreshCcw, Trash2, Clock, CheckCircle, AlertCircle, XCircle, Users, Activity, Upload, Download, FileSpreadsheet, ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react';
import { formatDateTime, maskCarteirinha, validateCarteirinha, validateCarteirinhaByConvenio, maskSulamerica, maskNumerics } from '../utils/formatters';
import SearchableSelect from '../components/SearchableSelect';

// Design System
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import CheckBox from '../components/ui/CheckBox';


import WorkerList from '../components/WorkerList';

// AMIL (id_convenio 9): valores de rotina vindos do dropdown (convenio_operacoes)
// — 'op0_login'/'op1_consulta' canônicos do banco (D5) + aliases numéricos/canônicos aceitos pelo worker
const AMIL_OP0_ROTINAS = ['0', 'op0_login'];
const AMIL_OP1_ROTINAS = ['1', 'op1_consulta', 'op1_consulta_guias'];

export default function Importacoes() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const username = localStorage.getItem('username') || 'Usuário';

  // Reset de paginação ao trocar de rota/página
  useEffect(() => {
    setPage(1);
  }, [location.pathname]);

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

  // OP11 parameters
  const [op11StartDate, setOp11StartDate] = useState('');
  const [op11EndDate, setOp11EndDate] = useState('');
  const [op11Beneficiario, setOp11Beneficiario] = useState('');
  const [op11Guia, setOp11Guia] = useState('');

  // OP12 parameters
  const [op12Guia, setOp12Guia] = useState('');
  const [op12GuiaPrestador, setOp12GuiaPrestador] = useState('');

  // OP13 / OP14 parameters
  const [op13DataFim, setOp13DataFim] = useState('');
  const [op13CodPrestador, setOp13CodPrestador] = useState('');
  const [op14NumeroLote, setOp14NumeroLote] = useState('');
  const [op14CodPrestador, setOp14CodPrestador] = useState('');

  // OPs novas do IPASGO — Recurso de Glosa (10/16) e Conferência de Faturamento (17/18):
  // o novo portal endereça tudo por protocolo (capa) do lote
  const [opProtocolo, setOpProtocolo] = useState('');
  const [op17NumeroLote, setOp17NumeroLote] = useState('');
  const [op18IdServico, setOp18IdServico] = useState('');
  const [op18Status, setOp18Status] = useState('Aceito');
  const [op18DataRealizacao, setOp18DataRealizacao] = useState('');
  const [op16ServicosJson, setOp16ServicosJson] = useState('');

  // OP19 (anexar arquivo à guia)
  const [op19Guia, setOp19Guia] = useState('');
  const [op19Senha, setOp19Senha] = useState('');
  const [op19Caminho, setOp19Caminho] = useState('');
  const [op21Caminho, setOp21Caminho] = useState('');

  // OP20 (validar e extrair CodigoBeneficiario das carteirinhas do user_id)
  const [op20Modo, setOp20Modo] = useState('validar_e_atualizar');
  const [op20ApenasSemCodigo, setOp20ApenasSemCodigo] = useState(false);
  const [op20ConfirmarPesquisar, setOp20ConfirmarPesquisar] = useState(false);
  const [op20ModalOpen, setOp20ModalOpen] = useState(false);
  const [op20Tab, setOp20Tab] = useState('auditoria');
  const [op20Auditoria, setOp20Auditoria] = useState([]);
  const [op20TotalBase, setOp20TotalBase] = useState(0);
  const [op20Duplicados, setOp20Duplicados] = useState([]);
  const [op20LoadingAudit, setOp20LoadingAudit] = useState(false);
  const [op20StatusFilter, setOp20StatusFilter] = useState('');
  const [op20ApenasDivergentes, setOp20ApenasDivergentes] = useState(false);
  const [op20SelectedAuditIds, setOp20SelectedAuditIds] = useState([]);

  // OP6 Evoluir parameters (Baixar Faturados)
  const [op6EvPlanoSaudeId, setOp6EvPlanoSaudeId] = useState('18afb174-a2c2-49ee-93d2-d6e4868817bc');
  const [op6EvDataInicial, setOp6EvDataInicial] = useState('');
  const [op6EvDataFinal, setOp6EvDataFinal] = useState('');

  // OP4 Evoluir parameters (Atualizar Data do PTS)
  const [op4EvIdRelatorio, setOp4EvIdRelatorio] = useState('');
  const [op4EvNovaData, setOp4EvNovaData] = useState('');
  // OP8 Evoluir (Importar Relatórios Médicos): paciente opcional — vazio = todos
  const [op8PacienteId, setOp8PacienteId] = useState('');

  // OP4 Unimed Goiânia parameters (Exames Finalizados)
  const [op4GoiDataIni, setOp4GoiDataIni] = useState('');
  const [op4GoiDataFim, setOp4GoiDataFim] = useState('');
  const [op4GoiGuia, setOp4GoiGuia] = useState('');

  // AMIL (convênio 9) OP1 Consulta de Guias parameters
  const [amilDataIni, setAmilDataIni] = useState('');
  const [amilDataFim, setAmilDataFim] = useState('');
  const [amilSenha, setAmilSenha] = useState('');
  const [amilCarteirinha, setAmilCarteirinha] = useState('');

  // Excel Batch Upload State (Bradesco Fature)
  const [excelFile, setExcelFile] = useState(null);
  const [excelDataInicio, setExcelDataInicio] = useState('');
  const [excelDataFim, setExcelDataFim] = useState('');
  const [excelRegAns, setExcelRegAns] = useState('');
  const [excelLogin, setExcelLogin] = useState('diogomat11');
  const [excelPassword, setExcelPassword] = useState('Artju2020@');
  const [excelCodPrestador, setExcelCodPrestador] = useState('225529');
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const excelFileRef = useRef(null);

  // CAESAN (convênio 16 → integrador 102): upload da planilha de autorizações
  const [caesanFile, setCaesanFile] = useState(null);
  const [uploadingCaesan, setUploadingCaesan] = useState(false);
  const caesanFileRef = useRef(null);

  // Sorting State
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Jobs List State
  const [jobs, setJobs] = useState([]);
  const [pollInterval, setPollInterval] = useState(30000); // Dynamic poll interval (30s default)
  const [totalJobs, setTotalJobs] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState({
    status: '',
    created_at_start: '',
    created_at_end: ''
  });
  const [selectedJobForModal, setSelectedJobForModal] = useState(null);

  const carteirinhasOptions = React.useMemo(() => {
    return carteirinhas.map(c => ({
      value: c.id,
      label: c.paciente ? `${c.paciente} (${c.carteirinha})` : c.carteirinha
    }));
  }, [carteirinhas]);

  const datalistOptions = React.useMemo(() => {
    return carteirinhas.map(c => (
      <option key={c.id} value={c.paciente ? `${c.paciente} (${c.carteirinha})` : c.carteirinha} />
    ));
  }, [carteirinhas]);

  useEffect(() => {
    fetchCarteirinhas();
  }, [selectedConvenio]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const hasActiveJobs = jobs.some(j => j.status === 'pending' || j.status === 'processing');
    if (hasActiveJobs) {
      if (pollInterval !== 5000) {
        setPollInterval(5000); // Fast poll when there is activity
      }
    } else {
      if (pollInterval !== 30000) {
        setPollInterval(30000); // Slow poll when idle
      }
    }
  }, [jobs, pollInterval]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(() => {
      fetchJobs();
      fetchStats();
    }, pollInterval); // Dynamic poll interval
    return () => clearInterval(interval);
  }, [page, pageSize, filters, selectedConvenio, pollInterval]);

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

  // AMIL OP1: filtros exibidos apenas no convênio 9 na rotina de consulta de guias
  const isAmilOp1Consulta = selectedConvenio === '9' && AMIL_OP1_ROTINAS.includes(importRotina);

  const isStandalone = React.useMemo(() => {
    // OP6/OP7 removidas (inativas — substituídas pelo ConferenciaFaturamento)
    return (selectedConvenio === '6' && ['3', 'op3_import_guias', '11', 'op11_import_guias_api', '12', 'op12_impressao_api', '13', 'op13_criar_lote', '14', 'op14_cancelar_lote', '10', 'op10_recurso_glosa', '16', 'op16_enviar_recurso_glosa', '17', 'op17_importar_conferencia', '18', 'op18_conferir_faturamento', '19', 'op19_anexar_arquivo_guia', '21', 'op21_anexar_recurso_glosa'].includes(importRotina)) ||
           (selectedConvenio === '100' && ['1', 'op1', 'op1_importPacientes', 'op5_ImportCorpoClinico', 'op6_baixarFaturados', 'op4_atualizarDataPTS', 'OP_consultaDocs', 'op7_consultaDocs', 'op7', '7', 'op8_importRelatoriosMedicos', 'op8', '8'].includes(importRotina)) ||
           (selectedConvenio === '3' && ['4', 'op4_finalizados', 'finalizados', 'exames_finalizados'].includes(importRotina)) ||
           (selectedConvenio === '16' && ['2', 'op2_consultar_guia'].includes(importRotina)) ||
           (selectedConvenio === '1' && ['0', 'op0_login', '0_fature', 'op0_login_fature'].includes(importRotina)) ||
           (selectedConvenio === '9' && [...AMIL_OP0_ROTINAS, ...AMIL_OP1_ROTINAS].includes(importRotina));
  }, [selectedConvenio, importRotina]);

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

  // Limpa os filtros AMIL ao trocar de convênio/rotina (campos exclusivos da OP1 do convênio 9)
  useEffect(() => {
    if (!isAmilOp1Consulta) {
      setAmilDataIni('');
      setAmilDataFim('');
      setAmilSenha('');
      setAmilCarteirinha('');
    }
  }, [isAmilOp1Consulta]);

  useEffect(() => {
    fetchConvenios();
  }, []);

  useEffect(() => {
    if (selectedConvenio === '6' && ['20', 'op20', 'op20_validar_codigo_beneficiario'].includes(importRotina)) {
      if (importType !== 'single' && importType !== 'multiple' && importType !== 'all') {
        setImportType('all');
      }
    }
  }, [selectedConvenio, importRotina]);

  const fetchOp20Dados = async (statusOvr = op20StatusFilter, divOvr = op20ApenasDivergentes) => {
    setOp20LoadingAudit(true);
    try {
      const params = { limit: 5000 };
      if (statusOvr) params.status = statusOvr;
      if (divOvr) params.apenas_divergentes = true;
      const [resAudit, resDup] = await Promise.all([
        api.get('/carteirinhas/codigo-beneficiario/auditoria', { params }),
        api.get('/carteirinhas/codigo-beneficiario/duplicados')
      ]);
      setOp20Auditoria(resAudit.data?.data || []);
      setOp20TotalBase(resAudit.data?.total_carteirinhas_base || 0);
      setOp20Duplicados(resDup.data?.data || []);
      setOp20SelectedAuditIds([]);
    } catch (e) {
      console.error('Erro ao carregar dados OP20:', e);
    } finally {
      setOp20LoadingAudit(false);
    }
  };

  const handleOpenOp20Modal = () => {
    setOp20ModalOpen(true);
    fetchOp20Dados();
  };

  const handleAplicarOp20Selecionados = async (idsParaAplicar) => {
    const ids = idsParaAplicar || op20SelectedAuditIds;
    if (!ids || ids.length === 0) {
      alert('Selecione ao menos um item com Código Portal válido para aplicar.');
      return;
    }
    try {
      const res = await api.post('/carteirinhas/codigo-beneficiario/aplicar', {
        auditoria_ids: ids
      });
      alert(`${res.data?.applied || 0} código(s) de beneficiário aplicado(s) na base de carteirinhas!`);
      fetchOp20Dados();
      fetchCarteirinhas();
    } catch (e) {
      alert('Erro ao aplicar códigos: ' + (e.response?.data?.detail || e.message));
    }
  };

  const handleExportOp20Csv = () => {
    if (!op20Auditoria || op20Auditoria.length === 0) {
      alert('Nenhum registro de auditoria para exportar.');
      return;
    }
    const headers = ['ID Auditoria', 'Carteirinha', 'Paciente', 'Codigo Anterior', 'Codigo Portal', 'Status', 'Aplicado', 'Titulo Portal', 'Fonte', 'Job ID', 'Data'];
    const rows = op20Auditoria.map(r => [
      r.id ?? '',
      r.carteirinha ?? '',
      `"${String(r.paciente || '').replace(/"/g, '""')}"`,
      r.codigo_anterior ?? '',
      r.codigo_portal ?? '',
      r.status ?? '',
      r.aplicado ? 'Sim' : 'Nao',
      `"${String(r.titulo || '').replace(/"/g, '""')}"`,
      r.fonte ?? '',
      r.job_id ?? '',
      r.created_at ?? ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,﻿' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_codigo_beneficiario_ipasgo.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  // Multiprestador: detecta itens de resultado de captura (op2) com status
  // "Capturada por outro prestador" (guia não exibida no portal por estar com
  // outro cod_prestador; o hub já criou job de consulta para re-sincronizar).
  const hasCapturadaPorOutroPrestador = (job) => {
    const rd = job?.result_data;
    if (!rd) return false;
    const items = Array.isArray(rd) ? rd : (Array.isArray(rd.data) ? rd.data : []);
    return items.some(
      (i) => i && typeof i === 'object' &&
        String(i.status || '').trim().toLowerCase() === 'capturada por outro prestador'
    );
  };

  // Resolve o lote interno do IPASGO pela chave do portal (protocolo first,
  // fallback numero_lote) — usado pelas OPs 10/17 (exigem id_lote_interno)
  const resolverLoteIpasgo = async ({ protocolo, numero_lote }) => {
    try {
      const res = await api.get(`/lotes/?id_convenio=6&limit=200`);
      const lotes = res.data.data || [];
      return lotes.find(l => protocolo && String(l.protocolo || '') === String(protocolo))
          || lotes.find(l => numero_lote && String(l.numero_lote || '') === String(numero_lote))
          || null;
    } catch (e) {
      return null;
    }
  };

  const handleCreateJob = async () => {
    const typeMap = { 'single': 'single', 'multiple': 'multiple', 'all': 'all' };

    if (!isStandalone && (importType === 'single' || importType === 'multiple') && selectedCarteirinhas.length === 0) {
      alert("Selecione pelo menos uma carteirinha/paciente.");
      return;
    }

    if (selectedConvenio === '6' && ['11', 'op11_import_guias_api'].includes(importRotina)) {
      if (!op11StartDate && !op11EndDate && !op11Beneficiario && !op11Guia && selectedCarteirinhas.length === 0) {
        alert("Para criar o job da OP11, informe ao menos um parâmetro: intervalo de datas, guia ou carteirinha.");
        return;
      }
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

      if (finalRotina === '2' || finalRotina === 'captura' || finalRotina === 'op2_captura') {
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
        let assignedIdLoteInterno = null;
        try {
          // 1. Verificar se o numero_lote já existe na tabela lotes_convenio
          const resAllLotes = await api.get(`/lotes/?id_convenio=${selectedConvenio}&limit=200`);
          const allLotes = resAllLotes.data.data;
          const existingLote = allLotes.find(l => String(l.numero_lote) === String(op6LoteId));
          
          if (existingLote) {
            // Lote já existe, usar ele diretamente
            assignedIdLoteInterno = existingLote.id_lote;
            alert(`Lote ${op6LoteId} já existe (ID Interno: ${existingLote.id_lote}). Os itens serão atualizados neste lote.`);
          } else {
            // 2. Se não existe, verificar se há lotes vazios (Processando, sem numero_lote)
            const pendingLotes = allLotes.filter(l => !l.numero_lote && l.status === 'Processando');
            if (pendingLotes.length > 0) {
              const pending = pendingLotes[0];
              const confirmMsg = `Lote ${op6LoteId} não encontrado no sistema.\nExiste um lote em processamento sem número (ID Interno: ${pending.id_lote}, Fim: ${pending.data_fim || '?'}).\nDeseja atribuir o número ${op6LoteId} a este lote?`;
              if (window.confirm(confirmMsg)) {
                assignedIdLoteInterno = pending.id_lote;
              }
            }
            // 3. Se não atribuiu a nenhum, o Worker criará automaticamente
          }
        } catch (e) {
          console.error("Erro ao checar lotes:", e);
        }

        const paramsObj = {
          loteId: op6LoteId,
          codigoPrestador: op6CodigoPrestador || (currentConvenioObj?.codigo_referenciado || '').trim()
        };
        if (assignedIdLoteInterno) paramsObj.id_lote_interno = assignedIdLoteInterno;
        finalParams = JSON.stringify(paramsObj);

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
      } else if (selectedConvenio === '6' && ['11', 'op11_import_guias_api'].includes(finalRotina)) {
        const codigoPrestador = (currentConvenioObj?.codigo_referenciado || '').trim();
        const op11Params = { codigoPrestador };
        if (op11StartDate) {
          const p = op11StartDate.split('-');
          op11Params.data_ini = p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : op11StartDate;
        }
        if (op11EndDate) {
          const p = op11EndDate.split('-');
          op11Params.data_fim = p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : op11EndDate;
        }
        if (op11Beneficiario) op11Params.codigoBeneficiario = op11Beneficiario;
        if (op11Guia) op11Params.guia = op11Guia;
        finalParams = JSON.stringify(op11Params);
      } else if (selectedConvenio === '6' && ['12', 'op12_impressao_api'].includes(finalRotina)) {
        finalParams = JSON.stringify({
          guia: op12Guia,
          GuiaPrestador: op12GuiaPrestador,
          numero_copias: 1
        });
      } else if (selectedConvenio === '6' && ['13', 'op13_criar_lote'].includes(finalRotina)) {
        let dtFimFormatted = op13DataFim;
        if (op13DataFim) {
            const parts = op13DataFim.split('-');
            if (parts.length === 3) {
                dtFimFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        }
        finalParams = JSON.stringify({
          data_fim: dtFimFormatted,
          cod_prestador: op13CodPrestador || (currentConvenioObj?.codigo_referenciado || '').trim()
        });
      } else if (selectedConvenio === '6' && ['17', 'op17_importar_conferencia'].includes(finalRotina)) {
        // OP17: importa faturáveis do novo portal ConferenciaFaturamento (por protocolo)
        const protocolo = opProtocolo.trim();
        if (!protocolo) { alert("Informe o Protocolo (capa) do lote no portal — ex.: 899116."); return; }
        const lote = await resolverLoteIpasgo({ protocolo, numero_lote: op17NumeroLote.trim() });
        const paramsObj = { protocolo };
        if (op17NumeroLote.trim()) paramsObj.numero_lote = op17NumeroLote.trim();
        if (lote) {
          paramsObj.id_lote_interno = lote.id_lote;
        } else {
          // Lote do portal ainda não cadastrado no hub: o consumer da OP17 cria
          // automaticamente (mesmo comportamento da OP6 antiga)
          const criar = window.confirm(
            `Nenhum lote local com o protocolo ${protocolo}${op17NumeroLote.trim() ? ` / lote ${op17NumeroLote.trim()}` : ''}.\n\n` +
            "Criar o lote automaticamente durante a importação?"
          );
          if (!criar) return;
        }
        finalParams = JSON.stringify(paramsObj);
      } else if (selectedConvenio === '6' && ['18', 'op18_conferir_faturamento'].includes(finalRotina)) {
        // OP18: confirma item (ConferirItem) + data (EditarDataRealizacao)
        const protocolo = opProtocolo.trim();
        if (!protocolo) { alert("Informe o Protocolo (capa) do lote no portal."); return; }
        if (!op18IdServico.trim()) { alert("Informe o IdServico do item (coluna Detalhe ID)."); return; }
        let dtFormatted = null;
        if (op18DataRealizacao) {
          const p = op18DataRealizacao.split('-');
          if (p.length === 3) dtFormatted = `${p[2]}/${p[1]}/${p[0]}`;
        }
        finalParams = JSON.stringify({
          protocolo,
          idServico: op18IdServico.trim(),
          idDetalhe: null,
          status: op18Status || 'Aceito',
          dataRealizacao: dtFormatted
        });
      } else if (selectedConvenio === '6' && ['10', 'op10_recurso_glosa'].includes(finalRotina)) {
        // OP10: importa itens de recurso de glosa do protocolo
        const protocolo = opProtocolo.trim();
        if (!protocolo) { alert("Informe o Protocolo do lote (ex.: 895854)."); return; }
        const lote = await resolverLoteIpasgo({ protocolo });
        if (!lote) {
          alert("Nenhum lote localizado com este protocolo. Grave o protocolo do lote em Faturamento → Lotes - Convênios e tente novamente.");
          return;
        }
        finalParams = JSON.stringify({ protocolo, id_lote_interno: lote.id_lote });
      } else if (selectedConvenio === '6' && ['16', 'op16_enviar_recurso_glosa'].includes(finalRotina)) {
        // OP16: envio das justificativas — uso avançado manual (o fluxo padrão é
        // disparado pela tela Recurso de Glosa, que monta os serviços do banco)
        const protocolo = opProtocolo.trim();
        if (!protocolo) { alert("Informe o Protocolo do lote."); return; }
        let servicos = [];
        const jsonBruto = op16ServicosJson.trim();
        if (jsonBruto) {
          try {
            servicos = JSON.parse(jsonBruto);
            if (!Array.isArray(servicos)) throw new Error('não é lista');
          } catch (e) {
            alert("JSON de serviços inválido. Use uma lista: [{\"chave\":..., \"justificativa\":\"...\"}]");
            return;
          }
        } else {
          alert("Informe o JSON de serviços (o envio padrão é feito pela tela Recurso de Glosa).");
          return;
        }
        finalParams = JSON.stringify({ protocolo, capa: protocolo, servicos });
      } else if (selectedConvenio === '6' && ['19', 'op19_anexar_arquivo_guia'].includes(finalRotina)) {
        // OP19: anexa 1 PDF à guia (fluxo em lote fica no modal Anexos do GestaoLotes)
        const protocolo = opProtocolo.trim();
        if (!protocolo) { alert("Informe o Protocolo (capa) do lote."); return; }
        if (!op19Guia.trim()) { alert("Informe o número da guia (8 dígitos)."); return; }
        if (!op19Caminho.trim()) { alert("Informe o caminho local do PDF (nome com a senha da guia)."); return; }
        finalParams = JSON.stringify({
          protocolo,
          numeroGuiaOperadora: op19Guia.trim(),
          senha_guia: op19Senha.trim() || null,
          caminho_arquivo: op19Caminho.trim(),
          nome_arquivo: op19Caminho.trim().split(/[\\/]/).pop()
        });
      } else if (selectedConvenio === '6' && ['21', 'op21_anexar_recurso_glosa'].includes(finalRotina)) {
        const protocolo = opProtocolo.trim();
        if (!protocolo) { alert("Informe o Protocolo (capa) do recurso de glosa."); return; }
        if (!op21Caminho.trim()) { alert("Informe o caminho local do PDF."); return; }
        finalParams = JSON.stringify({
          protocolo,
          caminho_arquivo: op21Caminho.trim(),
          nome_arquivo: op21Caminho.trim().split(/[\\/]/).pop()
        });
      } else if (selectedConvenio === '6' && ['20', 'op20', 'op20_validar_codigo_beneficiario'].includes(finalRotina)) {
        finalParams = JSON.stringify({
          modo: op20Modo,
          apenas_sem_codigo: op20ApenasSemCodigo,
          confirmar_pesquisar: op20ConfirmarPesquisar
        });
      } else if (selectedConvenio === '100' && ['op6_baixarFaturados'].includes(finalRotina)) {
        if (!op6EvDataInicial || !op6EvDataFinal) {
          alert("Por favor, preencha as datas Inicial e Final.");
          return;
        }
        finalParams = JSON.stringify({
          plano_saude_id: op6EvPlanoSaudeId,
          data_inicial: op6EvDataInicial,
          data_final: op6EvDataFinal,
          paciente_id: 0,
          form_subiu_a_guia: 'sim'
        });
      } else if (selectedConvenio === '100' && ['op4_atualizarDataPTS'].includes(finalRotina)) {
        if (!op4EvIdRelatorio || !op4EvNovaData) {
          alert("Por favor, preencha o ID do Relatório e a Nova Data.");
          return;
        }
        // Converter data de AAAA-MM-DD para DD/MM/AAAA conforme o robô espera
        let novaDataFormatted = op4EvNovaData;
        const parts = op4EvNovaData.split('-');
        if (parts.length === 3) {
          novaDataFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        finalParams = JSON.stringify({
          id_relatorio: op4EvIdRelatorio,
          data: novaDataFormatted
        });
      } else if (selectedConvenio === '100' && ['op8_importRelatoriosMedicos', 'op8', '8'].includes(finalRotina)) {
        // OP8: paciente_id opcional — sem ele o robô pagina o relatório de todos os pacientes
        if (op8PacienteId.trim()) {
          finalParams = JSON.stringify({ paciente_id: op8PacienteId.trim() });
        }
      } else if (selectedConvenio === '3' && ['4', 'op4_finalizados', 'finalizados', 'exames_finalizados'].includes(finalRotina)) {
        if (!op4GoiDataIni || !op4GoiDataFim) {
          alert("Por favor, preencha as datas de Início e Fim.");
          return;
        }
        let dtIniFormatted = op4GoiDataIni;
        const pIni = op4GoiDataIni.split('-');
        if (pIni.length === 3) dtIniFormatted = `${pIni[2]}/${pIni[1]}/${pIni[0]}`;

        let dtFimFormatted = op4GoiDataFim;
        const pFim = op4GoiDataFim.split('-');
        if (pFim.length === 3) dtFimFormatted = `${pFim[2]}/${pFim[1]}/${pFim[0]}`;

        finalParams = JSON.stringify({
          data_ini: dtIniFormatted,
          data_fim: dtFimFormatted,
          guia: op4GoiGuia || ''
        });
      } else if (selectedConvenio === '9' && AMIL_OP1_ROTINAS.includes(finalRotina)) {
        // AMIL OP1 — precedência de filtros (D6): senha > carteirinha > datas
        // (se a senha for informada, o backend despreza o intervalo de datas).
        // Datas em ISO YYYY-MM-DD: o backend AMIL espera ISO, sem conversão DD/MM/YYYY.
        const amilParams = {};
        if (amilSenha.trim()) amilParams.senha = amilSenha.trim();
        if (amilCarteirinha.trim()) amilParams.carteirinha = amilCarteirinha.trim();
        if (amilDataIni) amilParams.data_ini = amilDataIni;
        if (amilDataFim) amilParams.data_fim = amilDataFim;

        if (Object.keys(amilParams).length > 0) {
          finalParams = JSON.stringify(amilParams);
        }
      }

      if (importType === 'temp') {
        const cartInput = document.getElementById('temp-carteirinha').value;
        const pacInput = document.getElementById('temp-paciente').value;

        if (!cartInput || !pacInput) {
          alert("Preencha carteirinha e nome do paciente.");
          return;
        }

        const selectedConvObj = convenios.find(c => c.id_convenio.toString() === selectedConvenio?.toString());
        if (!validateCarteirinhaByConvenio(cartInput, selectedConvObj)) {
          const digitos = selectedConvObj?.digitos_carteirinha;
          if (digitos === 21) {
            alert("Carteirinha inválida! Formato deve ser 0000.0000.000000.00-0");
          } else {
            alert(`Carteirinha inválida! Deve conter ${digitos} dígitos para o convênio ${selectedConvObj?.nome || ''}.`);
          }
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
          carteirinha_ids: (importType === 'all' || isStandalone) ? [] : selectedCarteirinhas
        };
      }

      await api.post('/jobs/', payload);
      alert("Solicitações criadas com sucesso!");
      setSelectedCarteirinhas([]);
      setTargetGuiasStr('');
      fetchJobs();
      setPollInterval(5000); // Jobs recém-criados: acelera o poll imediatamente em vez de esperar o próximo ciclo de 30s

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

  // Abre o modal de detalhes de validacao prestador do job.
  // O valida_prestador pode estar em job.valida_prestador (persistido em base_guias)
  // ou em job.result_data.valida_prestador (JSON bruto devolvido pelo worker).
  const handleOpenGuiasModal = (job) => {
    const vp =
      job?.valida_prestador ||
      job?.result_data?.valida_prestador ||
      null;
    if (vp && vp.guias) {
      setSelectedJobForModal({ ...job, valida_prestador: vp });
    } else {
      alert("Nenhum detalhe de guias encontrado neste job.");
    }
  };

  // ── Upload Excel Batch (Bradesco Fature) ──
  const handleUploadExcelBatch = async () => {
    if (!excelFile) {
      alert('Selecione um arquivo Excel (.xlsx) para importar.');
      return;
    }
    if (!selectedConvenio) {
      alert('Selecione o convênio antes de importar.');
      return;
    }

    const confirmMsg = `Importar planilha "${excelFile.name}" como lote de Jobs OP1 para o convênio ${currentConvenioObj?.nome || selectedConvenio}?`;
    if (!window.confirm(confirmMsg)) return;

    setUploadingExcel(true);
    try {
      const formData = new FormData();
      formData.append('file', excelFile);
      formData.append('id_convenio', selectedConvenio);
      if (excelDataInicio) formData.append('dataInicio', excelDataInicio);
      if (excelDataFim) formData.append('dataFim', excelDataFim);
      if (excelRegAns) formData.append('regAns', excelRegAns);
      if (excelLogin) formData.append('login', excelLogin);
      if (excelPassword) formData.append('password', excelPassword);
      if (excelCodPrestador) formData.append('cod_prestador', excelCodPrestador);

      const res = await api.post('/jobs/import/fature-batch', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000 // lotes grandes podem levar minutos; default de 30s abortaria
      });

      alert(`${res.data.message} — ${res.data.count} job(s) criado(s).`);
      setExcelFile(null);
      setExcelDataInicio('');
      setExcelDataFim('');
      setExcelRegAns('');
      setExcelCodPrestador('225529');
      if (excelFileRef.current) excelFileRef.current.value = '';
      fetchJobs();
    } catch (e) {
      alert('Erro no upload: ' + (e.response?.data?.detail || e.message));
    } finally {
      setUploadingExcel(false);
    }
  };

  // ── Upload Planilha CAESAN (Autorizações OP1 — integrador 102) ──
  const handleUploadCaesan = async () => {
    if (!caesanFile) {
      alert('Selecione a planilha CAESAN (.xlsx com aba "modelo_csv" ou .csv).');
      return;
    }
    if (selectedConvenio !== '16') {
      alert('Selecione o convênio CAESAN antes de importar.');
      return;
    }
    if (!window.confirm(`Importar planilha "${caesanFile.name}" e criar jobs de autorização CAESAN (OP1) por linha?`)) return;

    setUploadingCaesan(true);
    try {
      const fd = new FormData();
      fd.append('file', caesanFile);
      const res = await api.post('/jobs/import/caesan-autorizacoes', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000 // lotes grandes podem levar minutos; default de 30s abortaria
      });
      const erros = res.data.total_errors
        ? `\n${res.data.total_errors} linha(s) ignorada(s):\n${(res.data.errors || []).join('\n')}`
        : '';
      alert(`${res.data.message} — ${res.data.count} job(s) criado(s).${erros}`);
      setCaesanFile(null);
      if (caesanFileRef.current) caesanFileRef.current.value = '';
      fetchJobs();
    } catch (e) {
      alert('Erro no upload: ' + (e.response?.data?.detail || e.message));
    } finally {
      setUploadingCaesan(false);
    }
  };

  // ── Export Excel (Fature Jobs) ──
  const handleExportFature = async () => {
    if (!selectedConvenio) {
      alert('Selecione um convênio para exportar.');
      return;
    }
    try {
      // Timeout dedicado maior que o padrão (30s) do api.js: a exportação
      // percorre todos os jobs do convênio e, com volume alto, pode passar
      // de 30s — o timeout padrão abortava antes de o Excel ser gerado.
      const res = await api.get(`/jobs/export/fature?id_convenio=${selectedConvenio}`, {
        responseType: 'blob',
        timeout: 120000
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `jobs_fature_${selectedConvenio}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erro ao exportar: ' + (e.response?.data?.detail || e.message));
    }
  };

  const getStatusBadge = (job) => {
    switch (job.status) {
      case 'success': return <Badge variant="success">Sucesso</Badge>;
      case 'error': return <span title={job.error_message || 'Erro Desconhecido'} className="cursor-help"><Badge variant="error">Erro</Badge></span>;
      case 'pending': return <Badge variant="warning">Pendente</Badge>;
      case 'processing': {
        // locked_by é a URL do slot (ex.: http://127.0.0.1:9001); a porta identifica o server
        const port = (job.locked_by || '').split(':').pop();
        return (
          <span title={job.locked_by || 'Aguardando servidor'}>
            <Badge variant="info">Processando{port ? ` · :${port}` : ''}</Badge>
          </span>
        );
      }
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
    if (!selectedConvenio || !convenios) return;
    const selected = convenios.find(c => c.id_convenio.toString() === selectedConvenio.toString());
    if (!selected) return;

    const nome = (selected.nome || '').toLowerCase();
    if (selected.digitos_carteirinha === null || selected.digitos_carteirinha === undefined) {
      return;
    }

    if (selected.digitos_carteirinha === 21) {
      e.target.value = maskCarteirinha(e.target.value);
    } else if (nome.includes('sulamerica')) {
      e.target.value = maskSulamerica(e.target.value);
    } else {
      e.target.value = maskNumerics(e.target.value, selected.digitos_carteirinha);
    }
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
              <div className="text-xs text-text-secondary">Guias Autorizadas</div>
              <div className="text-xl font-bold text-text-primary">
                {stats.overview.guias_status?.autorizadas ?? stats.overview.total_guias}
              </div>
              {stats.overview.guias_status && (
                <div className="text-[10px] text-text-secondary mt-0.5 leading-tight">
                  Total: {stats.overview.guias_status.total} | Pend: {stats.overview.guias_status.pendentes}
                </div>
              )}
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
            {isStandalone ? (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2 text-sm text-indigo-400 font-medium h-[42px] flex items-center justify-center">
                ⚙️ Portal Completo (Sem Filtros)
              </div>
            ) : (importRotina === '1_fature' || importRotina === 'op1_consultar_guias_fature') ? (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2 text-sm text-indigo-400 font-medium h-[42px] flex items-center justify-center">
                📊 Lote Excel (Automático)
              </div>
            ) : (
              <Select
                value={importType}
                onChange={e => { setImportType(e.target.value); setSelectedCarteirinhas([]); }}
              >
                <option value="single">Única</option>
                <option value="multiple">Múltipla</option>
                <option value="all">Todos</option>
                <option value="temp">Paciente Temporário</option>
                <option value="excel_batch">📊 Upload Excel (Lote)</option>
              </Select>
            )}
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
              disabled={currentOperacoes.length === 0 && selectedConvenio !== '1'}
            >
              {currentOperacoes.length === 0 && selectedConvenio !== '1' && <option value="">Sem Rotinas</option>}
              {currentOperacoes.map(op => (
                <option key={op.id} value={op.valor}>{op.descricao}</option>
              ))}
              {selectedConvenio === '1' && (
                <>
                  <option value="0_fature">🔐 Login — Faturi (MFA)</option>
                  <option value="0">Login — Autorize</option>
                </>
              )}
            </Select>
          </div>
          {(importRotina === '2' || importRotina === 'captura' || importRotina === 'op2_captura') && (
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

          {selectedConvenio === '6' && ['17', 'op17_importar_conferencia'].includes(importRotina) && (
            <>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Protocolo (capa) *</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 899116"
                  value={opProtocolo}
                  onChange={e => setOpProtocolo(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Número do Lote (opcional)</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 100557"
                  value={op17NumeroLote}
                  onChange={e => setOp17NumeroLote(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="md:col-span-6">
                <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  O lote interno é localizado automaticamente pelo protocolo (ou número). Itens sem data de
                  realização no portal entram como <span className="font-bold">Inapto</span>.
                </div>
              </div>
            </>
          )}

          {selectedConvenio === '6' && ['18', 'op18_conferir_faturamento'].includes(importRotina) && (
            <>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Protocolo (capa) *</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 899116"
                  value={opProtocolo}
                  onChange={e => setOpProtocolo(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">IdServico (Detalhe ID) *</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 95681957"
                  value={op18IdServico}
                  onChange={e => setOp18IdServico(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Status *</label>
                <select
                  value={op18Status}
                  onChange={e => setOp18Status(e.target.value)}
                  className="w-full h-[42px] bg-slate-800 border border-slate-700 rounded-lg px-3 text-sm text-slate-200 focus:outline-none focus:border-primary"
                >
                  <option value="Aceito">Aceito</option>
                  <option value="Recusado">Recusado</option>
                  <option value="Pendente">Pendente</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Data Realização (enviada junto)</label>
                <Input
                  type="date"
                  value={op18DataRealizacao}
                  onChange={e => setOp18DataRealizacao(e.target.value)}
                />
              </div>
            </>
          )}

          {selectedConvenio === '6' && ['19', 'op19_anexar_arquivo_guia'].includes(importRotina) && (
            <>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Protocolo (capa) *</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 903505"
                  value={opProtocolo}
                  onChange={e => setOpProtocolo(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Guia (8 dígitos) *</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 24768401"
                  value={op19Guia}
                  onChange={e => setOp19Guia(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Senha (opcional)</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="11 dígitos do nome do arquivo"
                  value={op19Senha}
                  onChange={e => setOp19Senha(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Caminho do PDF *</label>
                <Input
                  type="text"
                  placeholder="C:\anexos\rhaviluizgoncalvesdacruz24768401331.pdf"
                  value={op19Caminho}
                  onChange={e => setOp19Caminho(e.target.value)}
                />
              </div>
              <div className="md:col-span-12">
                <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  1 job por arquivo. Para anexar vários PDFs de uma vez, use o modal <span className="font-bold">Anexos</span> do lote em
                  Faturamento → Lotes - Convênios (analisa os nomes e cria os jobs).
                </div>
              </div>
            </>
          )}

          {selectedConvenio === '6' && ['21', 'op21_anexar_recurso_glosa'].includes(importRotina) && (
            <>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-text-secondary mb-1">Protocolo do Recurso *</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 895854"
                  value={opProtocolo}
                  onChange={e => setOpProtocolo(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="md:col-span-8">
                <label className="block text-sm font-medium text-text-secondary mb-1">Caminho do PDF *</label>
                <Input
                  type="text"
                  placeholder="C:\\recursos\\abraaopereiracarvalho-24533543382.pdf"
                  value={op21Caminho}
                  onChange={e => setOp21Caminho(e.target.value)}
                />
              </div>
              <div className="md:col-span-12">
                <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  Anexa 1 arquivo PDF diretamente ao protocolo do recurso de glosa. Para anexar vários arquivos ou uma pasta inteira, use o botão <span className="font-bold">Anexos</span> na tela de Recurso de Glosa.
                </div>
              </div>
            </>
          )}

          {selectedConvenio === '6' && ['20', 'op20', 'op20_validar_codigo_beneficiario'].includes(importRotina) && (
            <>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Modo de Validação</label>
                <Select
                  value={op20Modo}
                  onChange={e => setOp20Modo(e.target.value)}
                >
                  <option value="validar_e_atualizar">Validar e Atualizar na Base</option>
                  <option value="somente_validar">Somente Validar (Auditoria)</option>
                </Select>
              </div>
              <div className="md:col-span-4 flex flex-col justify-center gap-2 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={op20ApenasSemCodigo}
                    onChange={e => setOp20ApenasSemCodigo(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary"
                  />
                  Apenas carteirinhas sem Código Beneficiário preenchido
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={op20ConfirmarPesquisar}
                    onChange={e => setOp20ConfirmarPesquisar(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary"
                  />
                  Forçar confirmação clicando em Pesquisar (L3) em todas
                </label>
              </div>
              <div className="md:col-span-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleOpenOp20Modal}
                  className="w-full h-[42px]"
                >
                  <ShieldCheck size={16} /> Auditoria / Duplicados
                </Button>
              </div>
              <div className="md:col-span-12">
                <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  Consulta cada carteirinha do seu usuário no portal IPASGO (<span className="font-mono">LocalizarProcedimentos</span>),
                  resolve múltiplas opções comparando a carteirinha enviada e confirmação via requisição <span className="font-mono">Pesquisar</span>,
                  e atualiza <span className="font-mono font-bold">codigo_beneficiario</span> preservando o formato exato (ex.: <span className="font-mono">040473-0</span>).
                  Selecione <strong>Tipo de Importação = Todos</strong> para validar toda a sua base em lotes automáticos.
                </div>
              </div>
            </>
          )}

          {selectedConvenio === '6' && ['10', 'op10_recurso_glosa'].includes(importRotina) && (
            <>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Protocolo (capa) *</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 895854"
                  value={opProtocolo}
                  onChange={e => setOpProtocolo(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="md:col-span-9">
                <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  Importa todos os itens glosados do lote. O lote interno é localizado pelo protocolo. O fluxo
                  completo (justificativas e envio) fica na tela <span className="font-bold">Faturamento → Recurso de Glosa</span>.
                </div>
              </div>
            </>
          )}

          {selectedConvenio === '6' && ['16', 'op16_enviar_recurso_glosa'].includes(importRotina) && (
            <>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Protocolo (capa) *</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 895854"
                  value={opProtocolo}
                  onChange={e => setOpProtocolo(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="md:col-span-9">
                <label className="block text-sm font-medium text-text-secondary mb-1">Serviços (JSON) *</label>
                <textarea
                  rows={4}
                  placeholder='[{"chave":95355859,"quantidade_glosada":1,"valor_recurso":130,"justificativa":"texto..."}]'
                  value={op16ServicosJson}
                  onChange={e => setOp16ServicosJson(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-primary"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Uso avançado manual — o envio padrão é feito pela tela Recurso de Glosa (monta os serviços do banco).
                </p>
              </div>
            </>
          )}

          {selectedConvenio === '6' && ['11', 'op11_import_guias_api'].includes(importRotina) && (
            <>
              <div className="md:col-span-12">
                <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  Cód. Prestador: <span className="font-mono font-bold">{currentConvenioObj?.codigo_referenciado || 'N/A'}</span> (automático do convênio)
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Data Início</label>
                <Input
                  type="date"
                  value={op11StartDate}
                  onChange={e => setOp11StartDate(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Data Fim</label>
                <Input
                  type="date"
                  value={op11EndDate}
                  onChange={e => setOp11EndDate(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Beneficiário (Opcional)</label>
                <Input
                  type="text"
                  placeholder="Código do beneficiário"
                  value={op11Beneficiario}
                  onChange={e => setOp11Beneficiario(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Guia (Opcional)</label>
                <Input
                  type="text"
                  placeholder="Ex: 22014292"
                  value={op11Guia}
                  onChange={e => setOp11Guia(e.target.value)}
                />
              </div>
            </>
          )}

          {selectedConvenio === '6' && ['12', 'op12_impressao_api'].includes(importRotina) && (
            <>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Guia Operadora *</label>
                <Input
                  type="text"
                  placeholder="Ex: 22112786"
                  value={op12Guia}
                  onChange={e => setOp12Guia(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Guia Prestador *</label>
                <Input
                  type="text"
                  placeholder="Ex: 00632220042617555801"
                  value={op12GuiaPrestador}
                  onChange={e => setOp12GuiaPrestador(e.target.value)}
                />
              </div>
            </>
          )}

          {selectedConvenio === '6' && ['13', 'op13_criar_lote'].includes(importRotina) && (
            <>
              <div className="md:col-span-12">
                <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  Cód. Prestador Padrão: <span className="font-mono font-bold">{currentConvenioObj?.codigo_referenciado || 'N/A'}</span> (automático do convênio)
                </div>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Data Fim *</label>
                <Input
                  type="date"
                  value={op13DataFim}
                  onChange={e => setOp13DataFim(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Cód. Prestador Opcional</label>
                <Input
                  type="text"
                  placeholder="Deixar vazio p/ padrão"
                  value={op13CodPrestador}
                  onChange={e => setOp13CodPrestador(e.target.value)}
                />
              </div>
            </>
          )}

          {selectedConvenio === '6' && ['14', 'op14_cancelar_lote'].includes(importRotina) && (
            <>
              <div className="md:col-span-12">
                <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  Cód. Prestador Padrão: <span className="font-mono font-bold">{currentConvenioObj?.codigo_referenciado || 'N/A'}</span> (automático do convênio)
                </div>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Número do Lote *</label>
                <Input
                  type="text"
                  placeholder="Ex: 78949"
                  value={op14NumeroLote}
                  onChange={e => setOp14NumeroLote(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Cód. Prestador Opcional</label>
                <Input
                  type="text"
                  placeholder="Deixar vazio p/ padrão"
                  value={op14CodPrestador}
                  onChange={e => setOp14CodPrestador(e.target.value)}
                />
              </div>
            </>
          )}

          {selectedConvenio === '100' && ['op6_baixarFaturados'].includes(importRotina) && (
            <>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-text-secondary mb-1">Plano de Saúde ID (UUID) *</label>
                <Input
                  type="text"
                  placeholder="UUID do Plano de Saúde"
                  value={op6EvPlanoSaudeId}
                  onChange={e => setOp6EvPlanoSaudeId(e.target.value)}
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-text-secondary mb-1">Data Inicial *</label>
                <Input
                  type="date"
                  value={op6EvDataInicial}
                  onChange={e => setOp6EvDataInicial(e.target.value)}
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-text-secondary mb-1">Data Final *</label>
                <Input
                  type="date"
                  value={op6EvDataFinal}
                  onChange={e => setOp6EvDataFinal(e.target.value)}
                />
              </div>
            </>
          )}

          {selectedConvenio === '100' && ['op4_atualizarDataPTS'].includes(importRotina) && (
            <>
              <div className="md:col-span-6">
                <label className="block text-sm font-medium text-text-secondary mb-1">ID do Relatório PTS *</label>
                <Input
                  type="text"
                  placeholder="Ex: 5678"
                  value={op4EvIdRelatorio}
                  onChange={e => setOp4EvIdRelatorio(e.target.value)}
                />
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-medium text-text-secondary mb-1">Nova Data *</label>
                <Input
                  type="date"
                  value={op4EvNovaData}
                  onChange={e => setOp4EvNovaData(e.target.value)}
                />
              </div>
            </>
          )}

          {selectedConvenio === '100' && ['op8_importRelatoriosMedicos', 'op8', '8'].includes(importRotina) && (
            <div className="md:col-span-6">
              <label className="block text-sm font-medium text-text-secondary mb-1">ID do Paciente (opcional)</label>
              <Input
                type="text"
                placeholder="Ex: f2560cff-5915-47aa-9e70-ec21cc9d3ac6"
                value={op8PacienteId}
                onChange={e => setOp8PacienteId(e.target.value)}
              />
            </div>
          )}

          {selectedConvenio === '3' && ['4', 'op4_finalizados', 'finalizados', 'exames_finalizados'].includes(importRotina) && (
            <>
              <div className="md:col-span-12">
                <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  Prestador: <span className="font-mono font-bold">{currentConvenioObj?.codigo_referenciado || '2209525'}</span> (Unimed Goiânia – OP4 Exames Finalizados)
                </div>
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-text-secondary mb-1">Data Início *</label>
                <Input
                  type="date"
                  value={op4GoiDataIni}
                  onChange={e => setOp4GoiDataIni(e.target.value)}
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-text-secondary mb-1">Data Fim *</label>
                <Input
                  type="date"
                  value={op4GoiDataFim}
                  onChange={e => setOp4GoiDataFim(e.target.value)}
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-text-secondary mb-1">Nº Guia (Opcional)</label>
                <Input
                  type="text"
                  placeholder="Ex: 70138883"
                  value={op4GoiGuia}
                  onChange={e => setOp4GoiGuia(e.target.value)}
                />
              </div>
            </>
          )}

          {isAmilOp1Consulta && (
            <>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Data Início</label>
                <Input
                  type="date"
                  value={amilDataIni}
                  onChange={e => setAmilDataIni(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Data Fim</label>
                <Input
                  type="date"
                  value={amilDataFim}
                  onChange={e => setAmilDataFim(e.target.value)}
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-text-secondary mb-1">Senha de Autorização</label>
                <Input
                  type="text"
                  placeholder="Se informada, o intervalo de datas é ignorado"
                  value={amilSenha}
                  onChange={e => setAmilSenha(e.target.value)}
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-text-secondary mb-1">Carteirinha</label>
                <Input
                  type="text"
                  placeholder="Ex: 123456789"
                  value={amilCarteirinha}
                  onChange={e => setAmilCarteirinha(e.target.value)}
                />
              </div>
            </>
          )}

          {selectedConvenio === '16' && importRotina === 'op1_autorizacao' && (
            <>
              <div className="md:col-span-12">
                <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                  <FileSpreadsheet size={14} />
                  CAESAN — upload da planilha de autorizações (.xlsx com aba <strong>modelo_csv</strong> ou .csv). Uma linha = 1 job OP1 (Solicitação SP-SADT) com as credenciais do tenant. Colunas: <strong>ID Paciente, Nome do Paciente, CID, data_atendimento, Técnica, PROFISSIONAL, Espc_Autorização, codigo, Total, caminho, JUSTIFICATIVA</strong>.
                </div>
              </div>
              <div className="md:col-span-8">
                <label className="block text-sm font-medium text-text-secondary mb-1">Planilha CAESAN (.xlsx / .csv) *</label>
                <input
                  ref={caesanFileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={e => setCaesanFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30 file:cursor-pointer cursor-pointer bg-surface border border-border rounded-lg transition-colors"
                />
              </div>
              <div className="md:col-span-4">
                <Button
                  onClick={handleUploadCaesan}
                  disabled={uploadingCaesan || !caesanFile}
                  className="w-full h-[42px]"
                >
                  {uploadingCaesan ? (
                    <><RefreshCcw size={16} className="animate-spin" /> Enviando...</>
                  ) : (
                    <><Upload size={16} /> Importar Autorizações</>
                  )}
                </Button>
              </div>
              {caesanFile && (
                <div className="md:col-span-12">
                  <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                    <FileSpreadsheet size={14} />
                    Arquivo selecionado: <strong>{caesanFile.name}</strong> ({(caesanFile.size / 1024).toFixed(1)} KB)
                  </div>
                </div>
              )}
            </>
          )}

          {(importType === 'excel_batch' || importRotina === '1_fature' || importRotina === 'op1_consultar_guias_fature') ? (
            <>
              <div className="md:col-span-12">
                <div className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                  <FileSpreadsheet size={14} />
                  Upload de planilha Excel (.xlsx) para criar jobs OP1 em lote. A planilha deve conter coluna <strong>"Guia"</strong> (e opcionalmente <strong>"Paciente"</strong>).
                </div>
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-text-secondary mb-1">Arquivo Excel (.xlsx) *</label>
                <input
                  ref={excelFileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={e => setExcelFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 file:cursor-pointer cursor-pointer bg-surface border border-border rounded-lg transition-colors"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Data Início</label>
                <Input type="date" value={excelDataInicio} onChange={e => setExcelDataInicio(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Data Fim</label>
                <Input type="date" value={excelDataFim} onChange={e => setExcelDataFim(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Reg ANS</label>
                <Input type="text" placeholder="Ex: 359017" value={excelRegAns} onChange={e => setExcelRegAns(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Button
                  onClick={handleUploadExcelBatch}
                  disabled={uploadingExcel || !excelFile}
                  className="w-full h-[42px]"
                >
                  {uploadingExcel ? (
                    <><RefreshCcw size={16} className="animate-spin" /> Enviando...</>
                  ) : (
                    <><Upload size={16} /> Importar Lote</>
                  )}
                </Button>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Usuário Fature (Login) *</label>
                <Input type="text" value={excelLogin} onChange={e => setExcelLogin(e.target.value)} />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Senha Fature *</label>
                <Input type="password" value={excelPassword} onChange={e => setExcelPassword(e.target.value)} />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Cód. Prestador *</label>
                <Input type="text" value={excelCodPrestador} onChange={e => setExcelCodPrestador(e.target.value)} />
              </div>
              <div className="md:col-span-3"></div>

              {excelFile && (
                <div className="md:col-span-12">
                  <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                    <FileSpreadsheet size={14} />
                    Arquivo selecionado: <strong>{excelFile.name}</strong> ({(excelFile.size / 1024).toFixed(1)} KB)
                  </div>
                </div>
              )}
            </>
          ) : importType === 'temp' ? (
            <>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">Carteirinha (Temp)</label>
                <Input
                  type="text"
                  placeholder="Ex: 0000.0000.000000.00-0"
                  id="temp-carteirinha"
                  maxLength={25}
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
            (importType !== 'all' && !isStandalone) && (
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
                        {datalistOptions}
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
                    options={carteirinhasOptions}
                    value={selectedCarteirinhas[0] || ''}
                    onChange={(val) => setSelectedCarteirinhas(val ? [parseInt(val)] : [])}
                    placeholder="Selecione ou Cole o Paciente..."
                  />
                )}
              </div>
            )
          )}

          {(importType !== 'excel_batch' && importRotina !== '1_fature' && importRotina !== 'op1_consultar_guias_fature') && (
            <div className="md:col-span-2">
              <Button onClick={handleCreateJob} className="w-full h-[42px]">
                <Play size={16} /> Criar
              </Button>
            </div>
          )}

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
          <div className="ml-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportFature}
              title="Exportar todos os Jobs deste convênio para Excel"
              className="flex items-center gap-1.5"
            >
              <Download size={14} /> Exportar Excel
            </Button>
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
                <th className="px-6 py-3 text-left">Status Guias</th>
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
                  <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
                    {job.rotina || 'Padrão'}
                    {hasCapturadaPorOutroPrestador(job) && (
                      <span
                        className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        title="Guia não exibida no portal (multiprestador): capturada por outro cod_prestador. Um job de consulta foi criado para re-sincronizar."
                      >
                        ⚠ Capturada por outro prestador
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap truncate max-w-[150px]" title={job.params}>
                    {formatParamsSafely(job.params)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {getStatusBadge(job)}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    {(() => {
                      const json = job?.valida_prestador || job?.result_data?.valida_prestador;
                      // Caso 1: sem dados ou tipo Null -> ShieldOff NAO clicavel (Gotcha #3)
                      if (!json || json.tipo_json === 'Null' || !json.tipo_json) {
                        return (
                          <span
                            className="inline-flex items-center gap-1.5 text-red-400 cursor-default"
                            title="Sem guias processadas"
                          >
                            <ShieldOff size={18} className="text-red-400" />
                            <span className="text-xs">Sem Guias</span>
                          </span>
                        );
                      }
                      // Caso 2: todas as guias validas -> clicavel, abre modal
                      if (json.tipo_json === 'All Sucess') {
                        return (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                            title="Guias Válidas Importadas — Clique para ver detalhes"
                            onClick={() => handleOpenGuiasModal(job)}
                          >
                            <ShieldCheck size={18} />
                            <span className="text-xs font-medium">Válidas</span>
                          </button>
                        );
                      }
                      // Caso 3: ao menos uma guia bloqueada -> clicavel, abre modal
                      if (json.tipo_json === 'Thered') {
                        return (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                            title="Possui Guias Bloqueadas — Clique para ver detalhes"
                            onClick={() => handleOpenGuiasModal(job)}
                          >
                            <ShieldAlert size={18} />
                            <span className="text-xs font-medium">Bloqueadas</span>
                          </button>
                        );
                      }
                      return <span className="text-text-secondary">-</span>;
                    })()}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{job.attempts}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary font-mono">{calculateDuration(job.created_at, job.updated_at)}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      {(job.excel_url || job.result_data?.excel_url) && (
                        <a
                          href={job.excel_url || job.result_data?.excel_url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors shrink-0"
                          title="Baixar Relatório Excel (.xlsx)"
                        >
                          <FileSpreadsheet size={14} /> Baixar Excel
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRetryJob(job.id)}
                        title="Reprocessar Job"
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                      >
                        <RefreshCcw size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteJob(job.id)}
                        title="Excluir Job"
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedJobs.length === 0 && (
                <tr>
                  <td colSpan="9" className="px-6 py-10 text-center text-text-secondary">
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

      {/* Modal de detalhes da validacao prestador (replica clmf_hub_basic/Importacoes.jsx:585-627) */}
      {selectedJobForModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="max-w-3xl w-full max-h-[90vh] flex flex-col pt-4 px-6 pb-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-text-primary">
                  Job #{selectedJobForModal.id}
                </h3>
                <span className="text-sm text-text-secondary">
                  Tipo: {selectedJobForModal.valida_prestador?.tipo_json || '-'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJobForModal(null)}
                className="text-text-secondary hover:text-text-primary"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900/80 sticky top-0 text-xs uppercase text-text-secondary">
                  <tr>
                    <th className="px-4 py-3 border-b border-border">Número Guia</th>
                    <th className="px-4 py-3 border-b border-border">Código Procedimento</th>
                    <th className="px-4 py-3 border-b border-border">Vínculo Prestador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Object.entries(selectedJobForModal.valida_prestador?.guias || {}).map(([guia_key, attr]) => (
                    <tr key={guia_key} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-sm text-text-primary font-mono">{guia_key}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {attr?.codigo_procedimento || attr?.codigo_terapia || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={
                            attr?.Vinculo_prestador === 'Guia Válida'
                              ? 'text-emerald-500 font-medium'
                              : 'text-amber-500 font-medium'
                          }
                        >
                          {attr?.Vinculo_prestador || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Modal OP20 — Auditoria de Código Beneficiário e Duplicados (Multi-Tenant por user_id) */}
      {op20ModalOpen && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <Card className="max-w-6xl w-full max-h-[90vh] flex flex-col pt-4 px-6 pb-6">
            <div className="flex justify-between items-center mb-4 border-b border-border pb-3">
              <div>
                <h3 className="text-xl font-bold text-text-primary">
                  OP20 — Validação de Código Beneficiário (IPASGO)
                </h3>
                <span className="text-xs text-text-secondary">
                  Dados isolados para a base de carteirinhas do seu usuário ({username})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => fetchOp20Dados()}>
                  <RefreshCcw size={14} className={op20LoadingAudit ? 'animate-spin' : ''} /> Atualizar
                </Button>
                <Button variant="secondary" size="sm" onClick={handleExportOp20Csv}>
                  <Download size={14} /> Exportar CSV
                </Button>
                <button
                  type="button"
                  onClick={() => setOp20ModalOpen(false)}
                  className="text-text-secondary hover:text-text-primary ml-2"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => setOp20Tab('auditoria')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  op20Tab === 'auditoria'
                    ? 'bg-primary text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Validados ({op20Auditoria.length}{op20TotalBase ? ` de ${op20TotalBase} na base` : ''})
              </button>
              <button
                type="button"
                onClick={() => setOp20Tab('duplicados')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  op20Tab === 'duplicados'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                }`}
              >
                Códigos Duplicados na Base ({op20Duplicados.length})
              </button>

              {op20Tab === 'auditoria' && (
                <div className="ml-auto flex items-center gap-3">
                  <select
                    value={op20StatusFilter}
                    onChange={e => {
                      setOp20StatusFilter(e.target.value);
                      fetchOp20Dados(e.target.value, op20ApenasDivergentes);
                    }}
                    className="h-8 bg-slate-800 border border-slate-700 rounded-lg px-2 text-xs text-slate-200"
                  >
                    <option value="">Todos os Status</option>
                    <option value="OK">OK</option>
                    <option value="MULTIPLOS">MULTIPLOS</option>
                    <option value="NAO_ENCONTRADA">NAO_ENCONTRADA</option>
                    <option value="SEM_CORRESPONDENCIA">SEM_CORRESPONDENCIA</option>
                    <option value="CONFLITO">CONFLITO</option>
                    <option value="ERRO">ERRO</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={op20ApenasDivergentes}
                      onChange={e => {
                        setOp20ApenasDivergentes(e.target.checked);
                        fetchOp20Dados(op20StatusFilter, e.target.checked);
                      }}
                    />
                    Apenas divergentes
                  </label>
                  {op20SelectedAuditIds.length > 0 && (
                    <Button size="sm" onClick={() => handleAplicarOp20Selecionados()}>
                      Aplicar Selecionados ({op20SelectedAuditIds.length})
                    </Button>
                  )}
                </div>
              )}
            </div>

            {op20Tab === 'auditoria' ? (
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900/90 sticky top-0 uppercase text-text-secondary">
                    <tr>
                      <th className="px-3 py-2 border-b border-border">
                        <input
                          type="checkbox"
                          onChange={e => {
                            if (e.target.checked) {
                              setOp20SelectedAuditIds(
                                op20Auditoria.filter(r => r.codigo_portal && !r.aplicado).map(r => r.id)
                              );
                            } else {
                              setOp20SelectedAuditIds([]);
                            }
                          }}
                        />
                      </th>
                      <th className="px-3 py-2 border-b border-border">Carteirinha</th>
                      <th className="px-3 py-2 border-b border-border">Paciente</th>
                      <th className="px-3 py-2 border-b border-border">Cód. Anterior</th>
                      <th className="px-3 py-2 border-b border-border">Cód. Portal</th>
                      <th className="px-3 py-2 border-b border-border">Título / Opções no Portal</th>
                      <th className="px-3 py-2 border-b border-border">Status</th>
                      <th className="px-3 py-2 border-b border-border">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {op20Auditoria.map(r => {
                      const divergente = (r.codigo_anterior || '') !== (r.codigo_portal || '');
                      return (
                        <tr key={r.id} className="hover:bg-slate-800/40">
                          <td className="px-3 py-2">
                            {r.codigo_portal && !r.aplicado && (
                              <input
                                type="checkbox"
                                checked={op20SelectedAuditIds.includes(r.id)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setOp20SelectedAuditIds([...op20SelectedAuditIds, r.id]);
                                  } else {
                                    setOp20SelectedAuditIds(op20SelectedAuditIds.filter(id => id !== r.id));
                                  }
                                }}
                              />
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-text-primary">{r.carteirinha || '-'}</td>
                          <td className="px-3 py-2 text-text-secondary">{r.paciente || '-'}</td>
                          <td className="px-3 py-2 font-mono text-slate-400">{r.codigo_anterior || <span className="italic text-slate-600">vazio</span>}</td>
                          <td className={`px-3 py-2 font-mono font-bold ${divergente ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {r.codigo_portal || '-'}
                          </td>
                          <td className="px-3 py-2 text-slate-300 max-w-md">
                            <div>{r.titulo || '-'}</div>
                            {Array.isArray(r.opcoes) && r.opcoes.length > 1 && (
                              <div className="text-[11px] text-amber-300 mt-1 space-y-0.5">
                                {r.opcoes.map((op, i) => (
                                  <div key={i} className="font-mono">
                                    [{op.valor}] {op.titulo}
                                  </div>
                                ))}
                              </div>
                            )}
                            {r.erro && <div className="text-[11px] text-red-400 mt-0.5">{r.erro}</div>}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant={
                                r.status === 'OK'
                                  ? 'success'
                                  : r.status === 'MULTIPLOS'
                                  ? 'warning'
                                  : 'error'
                              }
                            >
                              {r.status}
                            </Badge>
                            {r.aplicado && (
                              <span className="ml-1.5 text-[10px] text-emerald-400 font-semibold">✓ Aplicado</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {r.codigo_portal && !r.aplicado && (
                              <button
                                type="button"
                                onClick={() => handleAplicarOp20Selecionados([r.id])}
                                className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-semibold"
                              >
                                Aplicar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {op20Auditoria.length === 0 && (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center text-text-secondary">
                          Nenhum registro de validação encontrado. Crie um job da OP20 para validar suas carteirinhas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3">
                {op20Duplicados.map(grupo => (
                  <div
                    key={grupo.codigo_beneficiario}
                    className="bg-slate-900/60 border border-amber-500/30 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-amber-400 font-mono">
                        Código Beneficiário: {grupo.codigo_beneficiario}
                      </span>
                      <Badge variant="warning">{grupo.quantidade} carteirinhas com o mesmo código</Badge>
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-1 px-2">ID</th>
                          <th className="py-1 px-2">Carteirinha</th>
                          <th className="py-1 px-2">Paciente</th>
                          <th className="py-1 px-2">Status Validação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {grupo.carteirinhas.map(c => (
                          <tr key={c.id}>
                            <td className="py-1.5 px-2 font-mono text-slate-400">#{c.id}</td>
                            <td className="py-1.5 px-2 font-mono text-slate-200">{c.carteirinha}</td>
                            <td className="py-1.5 px-2 text-slate-200">{c.paciente}</td>
                            <td className="py-1.5 px-2 text-slate-400">{c.codigo_benef_status || 'Não validado'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
                {op20Duplicados.length === 0 && (
                  <div className="py-8 text-center text-emerald-400 text-sm">
                    Nenhum codigo_beneficiario duplicado encontrado entre as carteirinhas do seu usuário.
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
