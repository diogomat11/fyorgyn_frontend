import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { Layers, Plus, X, Search, RefreshCw, XCircle, CheckCircle, HelpCircle, Download, ToggleLeft, ToggleRight, Calendar, Send, Paperclip, FileUp, Clock, AlertCircle, AlertTriangle, Activity } from 'lucide-react';

export default function GestaoLotes() {
    const [lotes, setLotes] = useState([]);
    const [convenios, setConvenios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedConvenio, setSelectedConvenio] = useState('');
    
    // Modal Novo Lote
    const [showNovoModal, setShowNovoModal] = useState(false);
    const [novoLoteForm, setNovoLoteForm] = useState({ data_ini: '', data_fim: '', cod_prestador: '' });
    const [autoEnvio, setAutoEnvio] = useState(false);
    // Strategy de lote do convênio: {tipo_formulario: 'periodo'|'numero',
    // lote_periodo_tipo, auto_periodo:{data_ini,data_fim}|null}
    const [formConfig, setFormConfig] = useState(null);
    
    const [showItensModal, setShowItensModal] = useState(false);
    const [selectedLote, setSelectedLote] = useState(null);
    const [itensLote, setItensLote] = useState([]);
    const [loadingItens, setLoadingItens] = useState(false);
    
    // Filtros do modal de itens
    const [filtroGuia, setFiltroGuia] = useState('');
    const [filtroDetalhe, setFiltroDetalhe] = useState('');
    const [filtroBeneficiario, setFiltroBeneficiario] = useState('');
    const [filtroStatusConf, setFiltroStatusConf] = useState('');
    const [filtroAnexo, setFiltroAnexo] = useState('');
    const [filtroConciliacao, setFiltroConciliacao] = useState('');
    const [conferindoTodos, setConferindoTodos] = useState(false);

    // Ordenação de itens do lote
    const [sortField, setSortField] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Edição inline da data
    const [editingDateItemId, setEditingDateItemId] = useState(null);
    const [editingDateValue, setEditingDateValue] = useState('');

    // Protocolo (capa) do lote no novo portal ConferenciaFaturamento (IPASGO)
    const [protocoloEdit, setProtocoloEdit] = useState({});
    const [savingProtocolo, setSavingProtocolo] = useState(null);

    // Anexos por guia (OP19 — ConferenciaFaturamento IPASGO)
    const [showAnexosModal, setShowAnexosModal] = useState(false);
    const [anexosLote, setAnexosLote] = useState(null);
    const [anexosTexto, setAnexosTexto] = useState('');
    const [anexosPreview, setAnexosPreview] = useState(null);
    const [anexosResultado, setAnexosResultado] = useState(null);
    const [analisandoAnexos, setAnalisandoAnexos] = useState(false);
    const [criandoAnexos, setCriandoAnexos] = useState(false);
    const [anexosStatus, setAnexosStatus] = useState(null);
    const [loadingAnexosStatus, setLoadingAnexosStatus] = useState(false);
    const [reprocessandoAnexos, setReprocessandoAnexos] = useState(false);
    const [abortandoAnexos, setAbortandoAnexos] = useState(false);
    const [anexosTab, setAnexosTab] = useState('monitor'); // 'monitor' | 'novo'

    const pollRef = useRef(null);

    useEffect(() => {
        loadConvenios();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    useEffect(() => {
        if (selectedConvenio) {
            loadLotes();
            loadFormConfig();
        } else {
            setLotes([]);
            setFormConfig(null);
        }
    }, [selectedConvenio]);

    // Strategy de criação de lote do convênio (número IPASGO × período Unimed)
    const loadFormConfig = async () => {
        try {
            const res = await api.get('/lotes/form-config', { params: { id_convenio: selectedConvenio } });
            const cfg = res.data;
            setFormConfig(cfg);
            // Auto-preenche o período da janela corrente (ex.: mensal fixo 18→17)
            if (cfg?.tipo_formulario === 'periodo' && cfg?.auto_periodo) {
                const brToIso = (s) => s.split('/').reverse().join('-');
                setNovoLoteForm((f) => ({
                    ...f,
                    data_ini: f.data_ini || brToIso(cfg.auto_periodo.data_ini),
                    data_fim: f.data_fim || brToIso(cfg.auto_periodo.data_fim),
                }));
            }
        } catch (e) {
            setFormConfig(null);
        }
    };

    // Auto-polling: every 60s when there are lotes in transitional states
    useEffect(() => {
        const hasTransitional = lotes.some(l => 
            ['Criando', 'Processando', 'Cancelando'].includes(l.status)
        );
        if (hasTransitional && selectedConvenio) {
            if (!pollRef.current) {
                pollRef.current = setInterval(async () => {
                    try {
                        const res = await api.get(`/lotes/?id_convenio=${selectedConvenio}`);
                        setLotes(res.data.data);
                    } catch (e) { /* silently retry */ }
                }, 60000); // 1 minuto
            }
        } else {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        }
    }, [lotes, selectedConvenio]);

    const loadConvenios = async () => {
        try {
            const res = await api.get('/convenios/');
            setConvenios(res.data);
            if (res.data.length > 0) {
                // Tenta selecionar o IPASGO como default ou o primeiro
                const ipasgo = res.data.find(c => c.nome.toLowerCase().includes('ipasgo'));
                if (ipasgo) setSelectedConvenio(ipasgo.id_convenio.toString());
                else setSelectedConvenio(res.data[0].id_convenio.toString());
            }
        } catch (error) {
            alert("Erro ao carregar convênios");
        }
    };

    const loadLotes = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/lotes/?id_convenio=${selectedConvenio}`);
            setLotes(res.data.data);
        } catch (error) {
            alert("Erro ao carregar lotes");
        } finally {
            setLoading(false);
        }
    };

    const handleCriarLote = async (e) => {
        e.preventDefault();
        const isPeriodo = formConfig?.tipo_formulario === 'periodo';
        try {
            const payload = {
                id_convenio: parseInt(selectedConvenio),
                cod_prestador: novoLoteForm.cod_prestador,
                data_fim: novoLoteForm.data_fim
            };
            if (isPeriodo) payload.data_inicio = novoLoteForm.data_ini || null;
            await api.post('/lotes/', payload);
            setShowNovoModal(false);
            setNovoLoteForm({ data_ini: '', data_fim: '', cod_prestador: '' });
            loadLotes(); // Triggers auto-polling via the useEffect above
        } catch (error) {
            alert(error.response?.data?.detail || "Erro ao criar lote");
        }
    };

    const handleCancelarLote = async (lote) => {
        // Cancelamento local (lote de período/Unimed) × via portal (lote de número/IPASGO)
        const isLocal = formConfig?.tipo_formulario === 'periodo';
        const detalhe = isLocal
            ? 'cancelamento LOCAL: itens serão bloqueados e conciliações revertidas (nenhum job no portal)'
            : 'será enviado o cancelamento ao portal do convênio (job OP14)';
        if (!window.confirm(`Tem certeza que deseja cancelar o Lote ${lote.numero_lote || lote.id_lote}?\n\nEsta ação ${detalhe}.`)) return;

        try {
            const res = await api.post(`/lotes/${lote.id_lote}/cancelar`, {
                cod_prestador: lote.cod_prestador
            });
            // A mensagem vem do backend: local ("Lote cancelado localmente...") × portal
            alert(res.data?.message || "Cancelamento processado.");
            loadLotes();
        } catch (error) {
            alert(error.response?.data?.detail || "Erro ao cancelar lote");
        }
    };

    const handleVerItens = async (lote) => {
        setSelectedLote(lote);
        setShowItensModal(true);
        setLoadingItens(true);
        setFiltroGuia('');
        setFiltroDetalhe('');
        setFiltroBeneficiario('');
        setFiltroStatusConf('');
        setFiltroAnexo('');
        setFiltroConciliacao('');
        try {
            const res = await api.get(`/lotes/${lote.id_lote}/faturamentos?limit=10000`);
            setItensLote(res.data.data);
        } catch (error) {
            alert("Erro ao carregar itens do lote");
        } finally {
            setLoadingItens(false);
        }
    };
    
    // Calculos do dashboard de itens
    const letraParaInt = { A: '67', P: '78', R: '82' };
    const filteredItens = itensLote.filter(item => {
        const matchGuia = item.Guia?.toLowerCase().includes(filtroGuia.toLowerCase()) || !filtroGuia;
        const matchDetalhe = item.detalheId?.toString().includes(filtroDetalhe) || !filtroDetalhe;
        const matchBenef = item.CodigoBeneficiario?.toLowerCase().includes(filtroBeneficiario.toLowerCase()) || !filtroBeneficiario;
        // Filtro de status: aceita a letra do novo portal (A/P/R/I) ou o inteiro legado
        const statusComoInt = item.status_conferencia && letraParaInt[item.status_conferencia]
            ? letraParaInt[item.status_conferencia]
            : item.StatusConferencia?.toString();
        const matchStatusConf = filtroStatusConf === ''
            || (filtroStatusConf === 'I' ? item.status_conferencia === 'I' : statusComoInt === filtroStatusConf);
        const matchAnexo = filtroAnexo === ''
            || (filtroAnexo === 'com' ? Boolean(item.tem_anexo) : !item.tem_anexo);
        // Filtro de conciliação: mesmo critério do badge e do card "Conciliados"
        const matchConciliacao = filtroConciliacao === ''
            || (filtroConciliacao === 'sim'
                ? item.StatusConciliacao?.toLowerCase() === 'conciliado'
                : item.StatusConciliacao?.toLowerCase() !== 'conciliado');
        return matchGuia && matchDetalhe && matchBenef && matchStatusConf && matchAnexo && matchConciliacao;
    });

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedItens = [...filteredItens].sort((a, b) => {
        if (!sortField) return 0;
        let valA, valB;
        if (sortField === 'nome') {
            valA = a.nome_beneficiario || '';
            valB = b.nome_beneficiario || '';
        } else if (sortField === 'data') {
            valA = a.dataRealizacao || '';
            valB = b.dataRealizacao || '';
        } else if (sortField === 'status_conf') {
            valA = a.StatusConferencia || 0;
            valB = b.StatusConferencia || 0;
        } else if (sortField === 'conciliacao') {
            valA = a.StatusConciliacao || '';
            valB = b.StatusConciliacao || '';
        } else if (sortField === 'anexo') {
            valA = a.tem_anexo ? 1 : 0;
            valB = b.tem_anexo ? 1 : 0;
        }

        if (typeof valA === 'string') {
            return sortDirection === 'asc' 
                ? valA.localeCompare(valB) 
                : valB.localeCompare(valA);
        } else {
            return sortDirection === 'asc'
                ? (valA > valB ? 1 : valA < valB ? -1 : 0)
                : (valB > valA ? 1 : valB < valA ? -1 : 0);
        }
    });

    const totalItens = filteredItens.length;
    const totalStatus67 = filteredItens.filter(i => i.StatusConferencia == 67).length;
    const totalValorConferidos = filteredItens.filter(i => i.StatusConferencia == 67).reduce((acc, i) => acc + (i.ValorProcedimento || 0), 0);
    const totalStatus78 = filteredItens.filter(i => i.StatusConferencia == 78).length;
    const totalStatus82 = filteredItens.filter(i => i.StatusConferencia == 82).length;
    const totalConciliados = filteredItens.filter(i => i.StatusConciliacao?.toLowerCase() === 'conciliado').length;

    const handleExportExcel = () => {
        const statusLabel = (item) => {
            if (item.status_conferencia === 'I') return 'Inapto (sem data)';
            if (item.status_conferencia === 'A') return 'Aceito';
            if (item.status_conferencia === 'P') return 'Pendente';
            if (item.status_conferencia === 'R') return 'Recusado';
            return item.StatusConferencia == 67 ? 'Conferido' : item.StatusConferencia == 78 ? 'Não Conferido' : item.StatusConferencia == 82 ? 'Removido' : item.StatusConferencia;
        };
        const headers = ['Detalhe ID', 'Guia', 'Beneficiário', 'Data Realização', 'Valor', 'Status Conf.', 'Conciliação', 'Anexo'];
        const csvContent = [headers.join(';')].concat(filteredItens.map(item => [
            item.detalheId,
            item.Guia,
            item.CodigoBeneficiario,
            item.dataRealizacao,
            item.ValorProcedimento || 0,
            statusLabel(item),
            item.StatusConciliacao || '',
            item.tem_anexo ? 'Sim' : 'Não'
        ].join(';'))).join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `lote_${selectedLote.numero_lote || selectedLote.id_lote}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleStatusClick = async (item) => {
        if (item.status_conferencia === 'I') {
            alert('Item Inapto (sem data de realização) — o status não pode ser alterado manualmente.');
            return;
        }
        let nextStatus;
        if (item.StatusConferencia == 78) nextStatus = 67;
        else if (item.StatusConferencia == 67) nextStatus = 82;
        else if (item.StatusConferencia == 82) nextStatus = 78;
        else nextStatus = 78;

        try {
            await api.put(`/lotes/itens/${item.id}`, {
                status_conferencia: nextStatus,
                auto_envio: autoEnvio
            });
            setItensLote(prev => prev.map(i => i.id === item.id
                ? { ...i, StatusConferencia: nextStatus, status_conferencia: ({ 67: 'A', 78: 'P', 82: 'R' })[nextStatus] || i.status_conferencia }
                : i));
        } catch (e) {
            alert(e.response?.data?.detail || "Erro ao atualizar status");
        }
    };

    const formatDateDisplay = (dateStr) => {
        if (!dateStr) return '-';
        const cleanDate = dateStr.split('T')[0];
        const parts = cleanDate.split('-');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
    };

    const handleSaveInlineDate = async (item, newDateVal) => {
        setEditingDateItemId(null);
        if (newDateVal === item.dataRealizacao) return;

        if (newDateVal && !/^\d{4}-\d{2}-\d{2}$/.test(newDateVal)) {
            alert("Formato inválido. Use AAAA-MM-DD.");
            return;
        }

        try {
            await api.put(`/lotes/itens/${item.id}`, { 
                data_realizacao: newDateVal || null,
                auto_envio: autoEnvio
            });
            setItensLote(prev => prev.map(i => i.id === item.id ? { ...i, dataRealizacao: newDateVal } : i));
        } catch (e) {
            alert(e.response?.data?.detail || "Erro ao atualizar data");
        }
    };

    const handleSendOP7 = async (item) => {
        if (item.status_conferencia === 'I') {
            alert('Item Inapto (sem data de realização) — não pode ser enviado ao portal.');
            return;
        }
        try {
            await api.put(`/lotes/itens/${item.id}`, {
                auto_envio: true
            });
            alert(`Job de conferência (OP18) enviado com sucesso para o item ${item.detalheId}!`);
        } catch (e) {
            alert(e.response?.data?.detail || "Erro ao enviar Job de conferência (OP18)");
        }
    };

    const handleSaveProtocolo = async (lote) => {
        const protocolo = (protocoloEdit[lote.id_lote] ?? lote.protocolo ?? '').toString().trim();
        if (!protocolo) {
            alert('Informe o protocolo (capa) do lote no portal.');
            return;
        }
        setSavingProtocolo(lote.id_lote);
        try {
            await api.put(`/lotes/${lote.id_lote}/protocolo`, { protocolo });
            setProtocoloEdit(prev => ({ ...prev, [lote.id_lote]: '' }));
            await loadLotes();
        } catch (e) {
            alert(e.response?.data?.detail || 'Erro ao salvar protocolo.');
        } finally {
            setSavingProtocolo(null);
        }
    };

    // ── Anexos por guia (OP19): o PDF é nomeado ...<senha11>.pdf; a guia são os
    // 8 primeiros dígitos da senha. O backend valida e cria 1 job por arquivo.
    const carregarStatusAnexos = async (loteId, silent = false) => {
        if (!silent) setLoadingAnexosStatus(true);
        try {
            const res = await api.get(`/lotes/${loteId}/anexos/status`);
            setAnexosStatus(res.data);
            return res.data;
        } catch (e) {
            if (!silent) console.error("Erro ao carregar status dos anexos:", e);
            return null;
        } finally {
            if (!silent) setLoadingAnexosStatus(false);
        }
    };

    const handleAbrirAnexos = async (lote) => {
        setAnexosLote(lote);
        setAnexosTexto('');
        setAnexosPreview(null);
        setAnexosResultado(null);
        setAnexosStatus(null);
        setShowAnexosModal(true);
        const data = await carregarStatusAnexos(lote.id_lote);
        if (data && data.total > 0) {
            setAnexosTab('monitor');
        } else {
            setAnexosTab('novo');
        }
    };

    // Polling em tempo real enquanto o modal de anexos estiver aberto e houver jobs na fila
    useEffect(() => {
        if (!showAnexosModal || !anexosLote) return;
        const interval = setInterval(async () => {
            await carregarStatusAnexos(anexosLote.id_lote, true);
        }, 4000);
        return () => clearInterval(interval);
    }, [showAnexosModal, anexosLote]);

    const handleAnalisarAnexos = async () => {
        const caminhos = anexosTexto.split('\n').map(c => c.trim()).filter(Boolean);
        if (caminhos.length === 0) {
            alert('Informe ao menos um caminho de arquivo (um por linha).');
            return;
        }
        setAnalisandoAnexos(true);
        setAnexosResultado(null);
        try {
            const res = await api.post(`/lotes/${anexosLote.id_lote}/anexos/analisar`, { caminhos });
            setAnexosPreview(res.data);
        } catch (e) {
            alert(e.response?.data?.detail || 'Erro ao analisar caminhos.');
        } finally {
            setAnalisandoAnexos(false);
        }
    };

    const handleCriarAnexos = async () => {
        const caminhos = (anexosPreview?.data || []).filter(d => d.valido).map(d => d.caminho);
        if (caminhos.length === 0) {
            alert('Nenhum caminho válido para criar jobs. Use "Analisar" primeiro.');
            return;
        }
        if (!window.confirm(`Criar ${caminhos.length} job(s) de upload de anexo (OP19)?`)) return;
        setCriandoAnexos(true);
        try {
            const res = await api.post(`/lotes/${anexosLote.id_lote}/anexos`, { caminhos });
            setAnexosResultado(res.data);
            setAnexosPreview(null);
            setAnexosTexto('');
            setAnexosTab('monitor');
            await carregarStatusAnexos(anexosLote.id_lote);
        } catch (e) {
            alert(e.response?.data?.detail || 'Erro ao criar jobs de anexo.');
        } finally {
            setCriandoAnexos(false);
        }
    };

    const handleReprocessarAnexos = async (jobIds = null) => {
        if (!anexosLote) return;
        const msg = jobIds
            ? `Reenviar ${jobIds.length} job(s) de anexo para reprocessamento?`
            : `Reenviar todos os anexos pendentes/abortados deste lote para reprocessamento?`;
        if (!window.confirm(msg)) return;

        setReprocessandoAnexos(true);
        try {
            const payload = jobIds ? { job_ids: jobIds } : {};
            const res = await api.post(`/lotes/${anexosLote.id_lote}/anexos/reprocessar`, payload);
            alert(res.data?.message || "Jobs reenviados para a fila de reprocessamento!");
            await carregarStatusAnexos(anexosLote.id_lote);
        } catch (e) {
            alert(e.response?.data?.detail || "Erro ao reprocessar anexos.");
        } finally {
            setReprocessandoAnexos(false);
        }
    };

    const handleAbortarAnexos = async () => {
        if (!anexosLote) return;
        if (!window.confirm("Deseja abortar imediatamente a fila de envio de anexos deste lote?\n\nOs arquivos ficarão sinalizados como pendentes para reprocessamento posterior.")) return;

        setAbortandoAnexos(true);
        try {
            const res = await api.post(`/lotes/${anexosLote.id_lote}/anexos/abortar`);
            alert(res.data?.message || "Fila de envio de anexos abortada.");
            await carregarStatusAnexos(anexosLote.id_lote);
        } catch (e) {
            alert(e.response?.data?.detail || "Erro ao abortar fila de anexos.");
        } finally {
            setAbortandoAnexos(false);
        }
    };

    // Sincronização de UM lote (ícone Sincronizar): cria o job correspondente
    // ao convênio (rotina_sync da strategy — ex. Unimed=4, IPASGO=6), com os
    // parâmetros DAQUELE lote. Convênios sem rotina de sincronização ficam com
    // o botão desabilitado.
    const handleSyncLote = async (lote) => {
        if (!lote) return;
        const rotina = formConfig?.rotina_sync;
        if (!rotina) {
            alert('Não há rotina de sincronização configurada para este convênio.');
            return;
        }

        let params;
        if (formConfig?.tipo_formulario === 'periodo') {
            // Lote por PERÍODO (ex. Unimed): job com o intervalo do lote; o
            // backend valida que o intervalo permeia apenas este lote e o vincula.
            const isoToBr = (s) => (s || '').split('T')[0].split('-').reverse().join('/');
            const dataIni = isoToBr(lote.data_inicio);
            const dataFim = isoToBr(lote.data_fim);
            if (!dataIni || !dataFim) {
                alert('Lote sem período definido.');
                return;
            }
            params = { data_ini: dataIni, data_fim: dataFim, guia: '' };
        } else {
            // Lote por NÚMERO (ex. IPASGO): job com o número do lote no portal.
            if (!lote.numero_lote) {
                alert("Lote ainda não possui número oficial. Aguarde a criação.");
                return;
            }
            params = { numero_lote: lote.numero_lote, codigoPrestador: lote.cod_prestador };
            if (formConfig?.requer_protocolo) {
                // Novo portal ConferenciaFaturamento: endereçado por protocolo (capa)
                if (!lote.protocolo) {
                    alert('Informe e salve o Protocolo do lote antes de sincronizar (novo portal de Conferência do IPASGO).');
                    return;
                }
                params.protocolo = lote.protocolo;
                params.id_lote_interno = lote.id_lote;
            }
        }

        try {
            await api.post('/jobs/', {
                type: 'single',
                id_convenio: parseInt(selectedConvenio),
                rotina,
                params: JSON.stringify(params)
            });
            alert('Sincronização solicitada para o lote. Os itens serão atualizados conforme o processamento.');
            loadLotes();
        } catch (error) {
            alert(error.response?.data?.detail || 'Erro ao solicitar sincronização.');
        }
    };

    const handleSyncItens = async () => {
        await handleSyncLote(selectedLote);
        setShowItensModal(false);
    };

    const handleConferirTodos = async () => {
        // Inaptos (sem data de realização) ficam de fora da conferência
        const itensPendentes = filteredItens.filter(i => i.StatusConferencia !== 67 && i.status_conferencia !== 'I');
        const inaptosIgnorados = filteredItens.filter(i => i.status_conferencia === 'I').length;
        if (itensPendentes.length === 0) {
            alert('Todos os itens elegíveis já estão conferidos.');
            return;
        }
        const confirmado = window.confirm(
            `Confirmar "Conferido" para ${itensPendentes.length} item(ns)?\n` +
            (inaptosIgnorados > 0 ? `${inaptosIgnorados} item(ns) Inapto(s) serão ignorados (sem job).\n` : '') +
            (autoEnvio ? 'Jobs de conferência (OP18) serão criados automaticamente para cada item.' : 'Apenas atualiza o status local (ative Envio Automático para criar Jobs OP18).')
        );
        if (!confirmado) return;

        setConferindoTodos(true);
        let sucessos = 0;
        let falhas = 0;
        for (const item of itensPendentes) {
            try {
                await api.put(`/lotes/itens/${item.id}`, {
                    status_conferencia: 67,
                    auto_envio: autoEnvio
                });
                setItensLote(prev => prev.map(i => i.id === item.id
                    ? { ...i, StatusConferencia: 67, status_conferencia: 'A' } : i));
                sucessos++;
            } catch (e) {
                falhas++;
            }
        }
        setConferindoTodos(false);
        alert(`Concluído! ${sucessos} item(ns) conferido(s)${falhas > 0 ? `, ${falhas} falha(s)` : ''}.` +
            (inaptosIgnorados > 0 ? `\n${inaptosIgnorados} Inapto(s) ignorado(s) — sem job criado.` : '') +
            (autoEnvio ? '\nJobs de conferência (OP18) criados para cada item processado.' : ''));
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Layers size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100">Gestão de Lotes de Faturamento</h1>
                        <p className="text-sm text-slate-400">Crie, cancele e analise lotes de faturamento por convênio.</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <select
                        value={selectedConvenio}
                        onChange={(e) => setSelectedConvenio(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-primary focus:border-primary px-3 py-2"
                    >
                        <option value="">Selecione um Convênio</option>
                        {convenios.map(c => (
                            <option key={c.id_convenio} value={c.id_convenio}>{c.nome}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => {
                            // Pré-preenche a janela corrente (mensal fixo, ex. 18→17)
                            if (formConfig?.tipo_formulario === 'periodo' && formConfig?.auto_periodo) {
                                const brToIso = (s) => s.split('/').reverse().join('-');
                                setNovoLoteForm((f) => ({
                                    ...f,
                                    data_ini: formConfig.auto_periodo.data_ini ? brToIso(formConfig.auto_periodo.data_ini) : f.data_ini,
                                    data_fim: formConfig.auto_periodo.data_fim ? brToIso(formConfig.auto_periodo.data_fim) : f.data_fim,
                                }));
                            }
                            setShowNovoModal(true);
                        }}
                        disabled={!selectedConvenio}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                        <Plus size={16} /> Novo Lote
                    </button>
                    <button
                        onClick={loadLotes}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Atualizar Lotes"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-6">
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="text-xs uppercase bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
                            <tr>
                                <th className="px-6 py-4">ID Interno</th>
                                <th className="px-6 py-4">Número Lote</th>
                                {formConfig?.requer_protocolo && <th className="px-6 py-4">Protocolo</th>}
                                <th className="px-6 py-4">Prestador</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Período</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {lotes.length === 0 ? (
                                <tr>
                                    <td colSpan={formConfig?.requer_protocolo ? "7" : "6"} className="px-6 py-8 text-center text-slate-500">
                                        Nenhum lote encontrado para este convênio.
                                    </td>
                                </tr>
                            ) : lotes.map((lote) => (
                                <tr key={lote.id_lote} className="hover:bg-slate-700/20 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs">{lote.id_lote}</td>
                                    <td className="px-6 py-4 font-medium text-slate-200">
                                        {lote.numero_lote ? lote.numero_lote : <span className="text-slate-500 italic">Pendente...</span>}
                                    </td>
                                    {formConfig?.requer_protocolo && (
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder="ex.: 899116"
                                                    value={protocoloEdit[lote.id_lote] ?? lote.protocolo ?? ''}
                                                    onChange={(e) => setProtocoloEdit(prev => ({ ...prev, [lote.id_lote]: e.target.value.replace(/\D/g, '') }))}
                                                    className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 text-sm focus:outline-none focus:border-primary"
                                                    title="Protocolo/capa do lote no novo portal de Conferência (usado na importação)"
                                                />
                                                {(protocoloEdit[lote.id_lote] ?? '') !== (lote.protocolo ?? '') && (
                                                    <button
                                                        onClick={() => handleSaveProtocolo(lote)}
                                                        disabled={savingProtocolo === lote.id_lote}
                                                        className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded text-xs transition-colors disabled:opacity-50"
                                                    >
                                                        Salvar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4">{lote.cod_prestador}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${
                                            lote.status === 'Aberto' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            lote.status === 'Cancelado' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                            ['Criando', 'Processando', 'Cancelando'].includes(lote.status) ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                            'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                        }`}>
                                            {['Criando', 'Processando', 'Cancelando'].includes(lote.status) && (
                                                <RefreshCw size={12} className="animate-spin" />
                                            )}
                                            {lote.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {lote.data_inicio
                                            ? `${lote.data_inicio.split('T')[0].split('-').reverse().join('/')} a ${lote.data_fim ? lote.data_fim.split('T')[0].split('-').reverse().join('/') : '-'}`
                                            : (lote.data_fim ? lote.data_fim.split('T')[0].split('-').reverse().join('/') : '-')}
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => handleSyncLote(lote)}
                                            disabled={!formConfig?.rotina_sync
                                                || (formConfig?.tipo_formulario === 'periodo' ? !lote.data_inicio : !lote.numero_lote)
                                                || (formConfig?.requer_protocolo && !lote.protocolo)
                                                || ['Cancelado', 'Cancelando'].includes(lote.status)}
                                            className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
                                            title={(() => {
                                                if (!formConfig?.rotina_sync) return 'Sincronizar — sem rotina de sincronização para este convênio';
                                                if (formConfig?.tipo_formulario === 'periodo') {
                                                    const br = (s) => (s || '').split('T')[0].split('-').reverse().join('/');
                                                    return `Sincronizar — job de importação do período ${br(lote.data_inicio)} a ${br(lote.data_fim)}`;
                                                }
                                                return 'Sincronizar — job de atualização dos itens do lote';
                                            })()}
                                        >
                                            <RefreshCw size={15} />
                                        </button>
                                        {formConfig?.requer_protocolo && (
                                            <button
                                                onClick={() => handleAbrirAnexos(lote)}
                                                disabled={!lote.protocolo || ['Cancelado', 'Cancelando'].includes(lote.status)}
                                                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                                                title={lote.protocolo
                                                    ? `Anexar PDFs por guia (OP19) — arquivo nomeado com a senha da guia (…senha11.pdf)`
                                                    : 'Anexos — grave o protocolo do lote primeiro'}
                                            >
                                                <Paperclip size={14} /> Anexos
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleVerItens(lote)}
                                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs transition-colors flex items-center gap-1"
                                        >
                                            <Search size={14} /> Itens
                                        </button>
                                        <button
                                            onClick={() => handleCancelarLote(lote)}
                                            disabled={lote.status === 'Cancelado' || lote.status === 'Cancelando'}
                                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                        >
                                            <XCircle size={14} /> Cancelar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Novo Lote */}
            {showNovoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                <Plus size={18} className="text-primary" /> Criar Novo Lote
                            </h3>
                            <button onClick={() => setShowNovoModal(false)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCriarLote} className="p-6 space-y-4">
                            {formConfig?.tipo_formulario === 'periodo' && formConfig?.lote_periodo_tipo === 'mensal_fixo' && (
                                <div className="text-xs text-slate-400 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2">
                                    Período mensal fixo: dia {formConfig.lote_dia_inicio} a {formConfig.lote_dia_fim}.
                                    A janela corrente é pré-preenchida (ajustável).
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Código Prestador</label>
                                <input
                                    type="text"
                                    required
                                    value={novoLoteForm.cod_prestador}
                                    onChange={(e) => setNovoLoteForm({...novoLoteForm, cod_prestador: e.target.value})}
                                    className="w-full bg-slate-800 border-slate-700 text-slate-200 rounded-lg focus:ring-primary focus:border-primary px-3 py-2 text-sm"
                                    placeholder="Ex: 00632-2"
                                />
                            </div>
                            {formConfig?.tipo_formulario === 'periodo' ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Início do Lote</label>
                                        <input
                                            type="date"
                                            required
                                            value={novoLoteForm.data_ini}
                                            onChange={(e) => setNovoLoteForm({...novoLoteForm, data_ini: e.target.value})}
                                            className="w-full bg-slate-800 border-slate-700 text-slate-200 rounded-lg focus:ring-primary focus:border-primary px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Fim do Lote</label>
                                        <input
                                            type="date"
                                            required
                                            value={novoLoteForm.data_fim}
                                            onChange={(e) => setNovoLoteForm({...novoLoteForm, data_fim: e.target.value})}
                                            className="w-full bg-slate-800 border-slate-700 text-slate-200 rounded-lg focus:ring-primary focus:border-primary px-3 py-2 text-sm"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Data Fim da Competência</label>
                                    <input
                                        type="date"
                                        required
                                        value={novoLoteForm.data_fim}
                                        onChange={(e) => setNovoLoteForm({...novoLoteForm, data_fim: e.target.value})}
                                        className="w-full bg-slate-800 border-slate-700 text-slate-200 rounded-lg focus:ring-primary focus:border-primary px-3 py-2 text-sm"
                                    />
                                </div>
                            )}
                            {formConfig?.tipo_formulario === 'periodo' && (
                                <p className="text-xs text-slate-500">
                                    O lote é criado vazio — o job de importação (OP4) nasce ao clicar em
                                    <strong> Sincronizar</strong> no lote (usa o intervalo do lote) ou pelo módulo
                                    Importações. Todos os itens do filtro serão vinculados ao lote, mesmo sessões
                                    com data anterior ao início.
                                </p>
                            )}
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800 mt-6">
                                <button type="button" onClick={() => setShowNovoModal(false)} className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">Criar Lote</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Ver Itens */}
            {showItensModal && selectedLote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-11/12 max-w-7xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                    <Layers size={18} className="text-indigo-400" />
                                    Itens do Lote
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">Status do Lote: {selectedLote.status}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setAutoEnvio(!autoEnvio)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${autoEnvio ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}
                                    title="Envio automático de atualizações via API"
                                >
                                    {autoEnvio ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                    Envio Automático
                                </button>
                                <button 
                                    onClick={handleExportExcel}
                                    disabled={filteredItens.length === 0}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded border border-emerald-500/30 text-xs transition-colors disabled:opacity-50"
                                    title="Exportar para CSV/Excel"
                                >
                                    <Download size={14} /> Exportar
                                </button>
                                <button
                                    onClick={handleConferirTodos}
                                    disabled={conferindoTodos || filteredItens.filter(i => i.StatusConferencia !== 67 && i.status_conferencia !== 'I').length === 0}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded border border-emerald-600/30 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={`Marcar todos os itens visíveis como Conferido (Inaptos ficam de fora)${autoEnvio ? ' e criar Jobs OP18' : ''}`}
                                >
                                    {conferindoTodos ? (
                                        <RefreshCw size={14} className="animate-spin" />
                                    ) : (
                                        <CheckCircle size={14} />
                                    )}
                                    {conferindoTodos ? 'Conferindo...' : `Conferir todos (${filteredItens.filter(i => i.StatusConferencia !== 67 && i.status_conferencia !== 'I').length})`}
                                </button>
                                <button
                                    onClick={handleSyncItens}
                                    disabled={!formConfig?.rotina_sync
                                        || (formConfig?.tipo_formulario === 'periodo' ? !selectedLote.data_inicio : !selectedLote.numero_lote)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded border border-indigo-500/30 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Sincronizar — cria o job correspondente a este lote no worker"
                                >
                                    <RefreshCw size={14} /> Sincronizar
                                </button>
                                <button onClick={() => setShowItensModal(false)} className="text-slate-400 hover:text-white p-1">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-0 overflow-auto flex-1 flex flex-col">
                            {loadingItens ? (
                                <div className="flex justify-center items-center h-full text-slate-500">Carregando itens...</div>
                            ) : (
                                <>
                                    {/* Mini Dashboard */}
                                    <div className="bg-slate-800/80 p-4 border-b border-slate-700 grid grid-cols-6 gap-3 shrink-0">
                                        <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600/50 flex flex-col items-center justify-center">
                                            <span className="text-xs text-slate-400 uppercase font-semibold text-center leading-tight">Total Itens</span>
                                            <span className="text-2xl font-bold text-slate-100 mt-1">{totalItens}</span>
                                        </div>
                                        <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 flex flex-col items-center justify-center">
                                            <span className="text-xs text-emerald-500/80 uppercase font-semibold text-center leading-tight">Conferido</span>
                                            <span className="text-2xl font-bold text-emerald-400 mt-1">{totalStatus67}</span>
                                        </div>
                                        <div className="bg-teal-500/10 p-3 rounded-lg border border-teal-500/20 flex flex-col items-center justify-center">
                                            <span className="text-xs text-teal-500/80 uppercase font-semibold text-center leading-tight">Valor Conf.</span>
                                            <span className="text-lg font-bold text-teal-400 mt-1" title={`R$ ${totalValorConferidos.toFixed(2)}`}>
                                                {totalValorConferidos > 1000 ? `R$ ${(totalValorConferidos/1000).toFixed(1)}k` : `R$ ${totalValorConferidos.toFixed(2)}`}
                                            </span>
                                        </div>
                                        <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 flex flex-col items-center justify-center">
                                            <span className="text-xs text-amber-500/80 uppercase font-semibold text-center leading-tight">Não Conferido</span>
                                            <span className="text-2xl font-bold text-amber-400 mt-1">{totalStatus78}</span>
                                        </div>
                                        <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20 flex flex-col items-center justify-center">
                                            <span className="text-xs text-red-400 uppercase font-semibold text-center leading-tight">Removido</span>
                                            <span className="text-2xl font-bold text-red-400 mt-1">{totalStatus82}</span>
                                        </div>
                                        <div className="bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20 flex flex-col items-center justify-center">
                                            <span className="text-xs text-indigo-400 uppercase font-semibold text-center leading-tight">Conciliados</span>
                                            <span className="text-2xl font-bold text-indigo-400 mt-1">{totalConciliados}</span>
                                        </div>
                                    </div>

                                    {/* Filtros */}
                                    <div className="bg-slate-800 p-3 border-b border-slate-700 flex gap-3 shrink-0">
                                        <input 
                                            type="text" 
                                            placeholder="Filtrar por Detalhe ID" 
                                            className="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 flex-1"
                                            value={filtroDetalhe}
                                            onChange={e => setFiltroDetalhe(e.target.value)}
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Filtrar por Guia" 
                                            className="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 flex-1"
                                            value={filtroGuia}
                                            onChange={e => setFiltroGuia(e.target.value)}
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Filtrar por Beneficiário" 
                                            className="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 flex-1"
                                            value={filtroBeneficiario}
                                            onChange={e => setFiltroBeneficiario(e.target.value)}
                                        />
                                        <select
                                            className="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 flex-1"
                                            value={filtroStatusConf}
                                            onChange={e => setFiltroStatusConf(e.target.value)}
                                        >
                                            <option value="">Todos Status Conf.</option>
                                            <option value="67">Aceito / Conferido</option>
                                            <option value="78">Pendente / Não Conferido</option>
                                            <option value="82">Recusado / Removido</option>
                                            <option value="I">Inapto (sem data)</option>
                                        </select>
                                        <select
                                            className="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 flex-1"
                                            value={filtroAnexo}
                                            onChange={e => setFiltroAnexo(e.target.value)}
                                        >
                                            <option value="">Todos (Anexo)</option>
                                            <option value="com">Com Anexo</option>
                                            <option value="sem">Sem Anexo</option>
                                        </select>
                                        <select
                                            className="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 flex-1"
                                            value={filtroConciliacao}
                                            onChange={e => setFiltroConciliacao(e.target.value)}
                                        >
                                            <option value="">Conciliação: Todos</option>
                                            <option value="sim">Conciliados</option>
                                            <option value="nao">Não Conciliados</option>
                                        </select>
                                    </div>
                                    
                                    {/* Tabela */}
                                    <div className="overflow-auto flex-1 relative">
                                        <table className="w-full text-left text-sm text-slate-300">
                                            <thead className="text-xs uppercase bg-slate-800/80 text-slate-400 font-semibold sticky top-0 border-b border-slate-700 z-10 shadow-sm">
                                                <tr>
                                                    <th className="px-4 py-3">Detalhe ID</th>
                                                    <th className="px-4 py-3">Guia</th>
                                                    <th className="px-4 py-3">Beneficiário</th>
                                                    <th 
                                                        className="px-4 py-3 cursor-pointer hover:bg-slate-700/50 select-none transition-colors"
                                                        onClick={() => handleSort('nome')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <span>Nome</span>
                                                            <span className="text-[10px] text-slate-500">
                                                                {sortField === 'nome' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                                                            </span>
                                                        </div>
                                                    </th>
                                                    <th 
                                                        className="px-4 py-3 cursor-pointer hover:bg-slate-700/50 select-none transition-colors"
                                                        onClick={() => handleSort('data')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <span>Data Realização</span>
                                                            <span className="text-[10px] text-slate-500">
                                                                {sortField === 'data' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                                                            </span>
                                                        </div>
                                                    </th>
                                                    <th className="px-4 py-3">Valor</th>
                                                    <th 
                                                        className="px-4 py-3 cursor-pointer hover:bg-slate-700/50 select-none transition-colors"
                                                        onClick={() => handleSort('status_conf')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <span>Status Conf.</span>
                                                            <span className="text-[10px] text-slate-500">
                                                                {sortField === 'status_conf' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                                                            </span>
                                                        </div>
                                                    </th>
                                                    <th 
                                                        className="px-4 py-3 cursor-pointer hover:bg-slate-700/50 select-none transition-colors"
                                                        onClick={() => handleSort('conciliacao')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <span>Conciliação</span>
                                                            <span className="text-[10px] text-slate-500">
                                                                {sortField === 'conciliacao' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                                                            </span>
                                                        </div>
                                                    </th>
                                                    <th 
                                                        className="px-4 py-3 cursor-pointer hover:bg-slate-700/50 select-none transition-colors"
                                                        onClick={() => handleSort('anexo')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <span>Anexo</span>
                                                            <span className="text-[10px] text-slate-500">
                                                                {sortField === 'anexo' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                                                            </span>
                                                        </div>
                                                    </th>
                                                    <th className="px-4 py-3 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700/50">
                                                {sortedItens.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="10" className="px-4 py-8 text-center text-slate-500">
                                                            Nenhum item encontrado.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    sortedItens.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                                            <td className="px-4 py-2 font-mono text-xs">{item.detalheId}</td>
                                                            <td className="px-4 py-2">{item.Guia}</td>
                                                            <td className="px-4 py-2">{item.CodigoBeneficiario}</td>
                                                            <td className="px-4 py-2 text-xs">{item.nome_beneficiario || '-'}</td>
                                                            <td className="px-4 py-2">
                                                                {editingDateItemId === item.id ? (
                                                                    <input 
                                                                        type="date"
                                                                        value={editingDateValue}
                                                                        onChange={e => setEditingDateValue(e.target.value)}
                                                                        onBlur={() => handleSaveInlineDate(item, editingDateValue)}
                                                                        onKeyDown={e => {
                                                                            if (e.key === 'Enter') handleSaveInlineDate(item, editingDateValue);
                                                                            if (e.key === 'Escape') setEditingDateItemId(null);
                                                                        }}
                                                                        className="bg-slate-850 border border-slate-650 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-[130px]"
                                                                        autoFocus
                                                                    />
                                                                ) : (
                                                                    <div 
                                                                        onClick={() => {
                                                                            setEditingDateItemId(item.id);
                                                                            setEditingDateValue(item.dataRealizacao || '');
                                                                        }}
                                                                        className="cursor-pointer hover:bg-slate-800/80 p-1 rounded flex items-center justify-between gap-2 group min-h-[28px]"
                                                                        title="Clique para editar data"
                                                                    >
                                                                        <span>{formatDateDisplay(item.dataRealizacao)}</span>
                                                                        <Calendar size={12} className="opacity-0 group-hover:opacity-100 text-slate-400" />
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2 font-mono text-xs text-slate-100">R$ {item.ValorProcedimento?.toFixed(2)}</td>
                                                            <td className="px-4 py-2">
                                                                {item.status_conferencia === 'I' ? (
                                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500" title="Item sem data de realização no portal — não habilitado a faturar">
                                                                        <XCircle size={14} className="text-slate-500" /> Inapto
                                                                    </span>
                                                                ) : (
                                                                    <button onClick={() => handleStatusClick(item)} className="focus:outline-none transition-transform hover:scale-105 active:scale-95">
                                                                        {item.status_conferencia === 'A' || item.StatusConferencia == 67 ? (
                                                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                                                                                <CheckCircle size={14} className="text-emerald-500" /> Aceito
                                                                            </span>
                                                                        ) : item.status_conferencia === 'R' || item.StatusConferencia == 82 ? (
                                                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400">
                                                                                <XCircle size={14} className="text-red-500" /> Recusado
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                                                                                <HelpCircle size={16} className="text-blue-500" /> Pendente
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.StatusConciliacao?.toLowerCase() === 'conciliado' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-700 text-slate-300'}`}>
                                                                    {item.StatusConciliacao}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                {item.tem_anexo ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" title="Guia possui anexo ativo no portal">
                                                                        <Paperclip size={12} /> Com Anexo
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700" title="Guia sem anexo no portal">
                                                                        Sem Anexo
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2 text-right">
                                                                <button
                                                                    onClick={() => handleSendOP7(item)}
                                                                    disabled={item.status_conferencia === 'I'}
                                                                    className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    title={item.status_conferencia === 'I' ? 'Item Inapto — não enviável ao portal' : 'Enviar Job de Conferência OP18 (Portal)'}
                                                                >
                                                                    <Send size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Anexos (OP19 — upload de PDF por guia com monitor e reprocessamento) */}
            {showAnexosModal && anexosLote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-700 flex items-center justify-between bg-slate-850">
                            <div>
                                <h3 className="font-bold text-slate-100 flex items-center gap-2 text-base">
                                    <Paperclip size={18} className="text-amber-400" />
                                    Anexar Arquivos às Guias — Lote #{anexosLote.numero_lote || anexosLote.id_lote}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Protocolo: <span className="font-mono text-slate-200 font-semibold">{anexosLote.protocolo}</span> • Prestador: {anexosLote.cod_prestador}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Tab selector */}
                                <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-xs">
                                    <button
                                        onClick={() => setAnexosTab('monitor')}
                                        className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                                            anexosTab === 'monitor'
                                                ? 'bg-primary text-white shadow-sm'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <Activity size={13} />
                                        Monitor de Envios
                                        {anexosStatus?.total > 0 && (
                                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                                anexosTab === 'monitor' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                                            }`}>
                                                {anexosStatus.total}
                                            </span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setAnexosTab('novo')}
                                        className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                                            anexosTab === 'novo'
                                                ? 'bg-primary text-white shadow-sm'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <Plus size={13} /> Nova Carga
                                    </button>
                                </div>
                                <button
                                    onClick={() => setShowAnexosModal(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="p-5 overflow-auto flex-1 space-y-4">
                            {anexosTab === 'monitor' ? (
                                <>
                                    {/* Dashboard Cards */}
                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-3">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Anexos</span>
                                            <span className="text-xl font-bold text-slate-100 mt-1 block">
                                                {anexosStatus?.total || 0}
                                            </span>
                                        </div>
                                        <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3">
                                            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
                                                <CheckCircle size={12} /> Concluídos
                                            </span>
                                            <span className="text-xl font-bold text-emerald-300 mt-1 block">
                                                {anexosStatus?.concluidos || 0}
                                            </span>
                                        </div>
                                        <div className="bg-blue-950/30 border border-blue-500/20 rounded-xl p-3">
                                            <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider block flex items-center gap-1">
                                                {(anexosStatus?.processando || 0) > 0 ? <RefreshCw size={12} className="animate-spin text-blue-400" /> : <Clock size={12} />}
                                                Em Fila / Envio
                                            </span>
                                            <span className="text-xl font-bold text-blue-300 mt-1 block">
                                                {(anexosStatus?.pendentes || 0) + (anexosStatus?.processando || 0)}
                                            </span>
                                        </div>
                                        <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-3">
                                            <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider block flex items-center gap-1">
                                                <AlertCircle size={12} /> Pend. Reprocessamento
                                            </span>
                                            {/* o Reprocessar reenvia todos os status=error; abortados é subconjunto de erros */}
                                            <span className="text-xl font-bold text-red-300 mt-1 block">
                                                {anexosStatus?.erros || 0}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Alert Banner se houver bloqueio ou anexos abortados */}
                                    {((anexosStatus?.abortados || 0) > 0 || (anexosStatus?.erros || 0) > 0 || anexosStatus?.bloqueio_detectado || anexosStatus?.sessao_rejeitada_detectada) && (
                                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-amber-300">
                                            <div className="flex items-start gap-2.5">
                                                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <div className="font-semibold text-amber-200">
                                                        {anexosStatus?.bloqueio_detectado
                                                            ? 'Bloqueio momentâneo do IPASGO detectado (403/429)!'
                                                            : anexosStatus?.sessao_rejeitada_detectada
                                                            ? 'Portal IPASGO rejeitando a sessão (401/500) — envio pausado.'
                                                            : 'Envio abortado após limite de 3 tentativas.'}
                                                    </div>
                                                    <div className="text-[11px] text-amber-300/80 mt-0.5">
                                                        {(anexosStatus?.abortados || anexosStatus?.erros)} anexo(s) pausados. O sistema <strong>reenvia automaticamente</strong> após uma breve espera; "Reprocessar" força o reenvio imediato.
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleReprocessarAnexos()}
                                                disabled={reprocessandoAnexos}
                                                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-sm disabled:opacity-50"
                                            >
                                                <RefreshCw size={13} className={reprocessandoAnexos ? "animate-spin" : ""} />
                                                Reprocessar Pendentes
                                            </button>
                                        </div>
                                    )}

                                    {/* Actions Row */}
                                    <div className="flex items-center justify-between pt-1">
                                        <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                                            <span>Arquivos do Lote ({anexosStatus?.itens?.length || 0})</span>
                                            {loadingAnexosStatus && (
                                                <span className="text-[10px] text-slate-500 flex items-center gap-1 font-normal">
                                                    <RefreshCw size={10} className="animate-spin" /> Atualizando...
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {((anexosStatus?.pendentes || 0) > 0 || (anexosStatus?.processando || 0) > 0) && (
                                                <button
                                                    onClick={handleAbortarAnexos}
                                                    disabled={abortandoAnexos}
                                                    className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                                    title="Interrompe o envio dos jobs em fila para não insistir contra o portal bloqueado"
                                                >
                                                    <XCircle size={14} className="text-red-400" />
                                                    {abortandoAnexos ? 'Abortando…' : 'Abortar Fila'}
                                                </button>
                                            )}
                                            {((anexosStatus?.abortados || 0) > 0 || (anexosStatus?.erros || 0) > 0) && (
                                                <button
                                                    onClick={() => handleReprocessarAnexos()}
                                                    disabled={reprocessandoAnexos}
                                                    className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                                                    title="Reenviar todos os anexos que falharam ou foram abortados"
                                                >
                                                    <RefreshCw size={13} className={reprocessandoAnexos ? "animate-spin" : ""} />
                                                    {reprocessandoAnexos ? 'Reenviando…' : 'Reprocessar Todos'}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => carregarStatusAnexos(anexosLote.id_lote)}
                                                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 rounded-lg transition-colors"
                                                title="Atualizar lista agora"
                                            >
                                                <RefreshCw size={14} className={loadingAnexosStatus ? "animate-spin" : ""} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Table of Jobs */}
                                    <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-900/40">
                                        {(!anexosStatus?.itens || anexosStatus.itens.length === 0) ? (
                                            <div className="p-8 text-center text-slate-500 text-xs">
                                                Nenhum anexo foi enviado ainda para este lote.
                                                <div className="mt-2">
                                                    <button
                                                        onClick={() => setAnexosTab('novo')}
                                                        className="text-primary hover:underline font-semibold"
                                                    >
                                                        Carregar pasta com PDFs agora →
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <table className="w-full text-xs">
                                                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700/70">
                                                    <tr>
                                                        <th className="px-3.5 py-2.5 text-left">Arquivo</th>
                                                        <th className="px-3.5 py-2.5 text-left">Guia</th>
                                                        <th className="px-3.5 py-2.5 text-left">Senha</th>
                                                        <th className="px-3.5 py-2.5 text-center">Tentativas</th>
                                                        <th className="px-3.5 py-2.5 text-left">Status</th>
                                                        <th className="px-3.5 py-2.5 text-left">Detalhe / Erro</th>
                                                        <th className="px-3.5 py-2.5 text-right">Ação</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800">
                                                    {anexosStatus.itens.map((item) => (
                                                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                                                            <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-200 break-all max-w-[200px]" title={item.caminho}>
                                                                {item.arquivo}
                                                            </td>
                                                            <td className="px-3.5 py-2.5 font-mono text-slate-300">{item.guia || '—'}</td>
                                                            <td className="px-3.5 py-2.5 font-mono text-slate-400">{item.senha || '—'}</td>
                                                            <td className="px-3.5 py-2.5 text-center font-mono">
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                    item.attempts >= item.max_attempts
                                                                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                                                        : item.attempts > 0
                                                                        ? 'bg-amber-500/20 text-amber-300'
                                                                        : 'text-slate-500'
                                                                }`}>
                                                                    {item.attempts}/{item.max_attempts}
                                                                </span>
                                                            </td>
                                                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                                                                {item.status === 'success' ? (
                                                                    <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                                                                        <CheckCircle size={12} /> Concluído
                                                                    </span>
                                                                ) : item.status === 'processing' || item.status === 'running' ? (
                                                                    <span className="inline-flex items-center gap-1 text-blue-400 font-semibold text-[11px]">
                                                                        <RefreshCw size={12} className="animate-spin text-blue-400" /> Enviando…
                                                                    </span>
                                                                ) : item.status === 'pending' ? (
                                                                    <span className="inline-flex items-center gap-1 text-amber-400 font-medium text-[11px]">
                                                                        <Clock size={12} /> Na Fila
                                                                    </span>
                                                                ) : item.is_abortado ? (
                                                                    <span className="inline-flex items-center gap-1 text-red-400 font-semibold text-[11px]" title={item.error_message}>
                                                                        <AlertCircle size={12} /> Abortado (Pendente)
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-red-400 font-medium text-[11px]" title={item.error_message}>
                                                                        <XCircle size={12} /> Falhou
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-3.5 py-2.5 text-[11px] text-slate-400 max-w-[240px] truncate" title={item.error_message || ''}>
                                                                {item.status === 'success' ? (
                                                                    <span className="text-emerald-500/80">Enviado ao portal</span>
                                                                ) : item.error_message && item.error_message.startsWith('[auto-retry') ? (
                                                                    <span className="text-blue-400/80">Reenvio automático agendado</span>
                                                                ) : item.error_message ? (
                                                                    <span className="text-red-400/90">{item.error_message}</span>
                                                                ) : (
                                                                    <span className="text-slate-500 italic">Aguardando worker</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                                                                {item.status !== 'success' && (
                                                                    <button
                                                                        onClick={() => handleReprocessarAnexos([item.id])}
                                                                        disabled={reprocessandoAnexos}
                                                                        className="p-1 px-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[11px] transition-colors inline-flex items-center gap-1"
                                                                        title="Reprocessar este anexo"
                                                                    >
                                                                        <RefreshCw size={11} className={reprocessandoAnexos ? "animate-spin" : ""} />
                                                                        Reprocessar
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </>
                            ) : (
                                /* Nova Carga de Anexos */
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                                            Pasta com os PDFs
                                        </label>
                                        <textarea
                                            rows={3}
                                            placeholder={'G:\\Meu Drive\\IPASGO-FATURAMENTO\\IPASGO-OUTUBRO\\IPASGO-10-OUTPUT\\teste'}
                                            value={anexosTexto}
                                            onChange={e => { setAnexosTexto(e.target.value); setAnexosPreview(null); setAnexosResultado(null); }}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-primary resize-y"
                                        />
                                        <p className="text-[11px] text-slate-500 mt-1">
                                            Informe a pasta: todos os PDFs dela (sem subpastas) são analisados. A senha (11 dígitos) é lida do fim do nome do arquivo e a guia são os 8 primeiros dígitos. 1 job por PDF válido.
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAnalisarAnexos}
                                            disabled={analisandoAnexos || criandoAnexos}
                                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            {analisandoAnexos ? 'Analisando…' : 'Analisar'}
                                        </button>
                                        {anexosPreview && (
                                            <button
                                                onClick={handleCriarAnexos}
                                                disabled={criandoAnexos || anexosPreview.validos === 0}
                                                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                            >
                                                <FileUp size={14} />
                                                {criandoAnexos ? 'Criando…' : `Criar ${anexosPreview.validos} job(s) (OP19)`}
                                            </button>
                                        )}
                                    </div>

                                    {anexosPreview && (
                                        <div className="border border-slate-700 rounded-lg overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead className="bg-slate-900/80 text-slate-400 uppercase">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left">Arquivo</th>
                                                        <th className="px-3 py-2 text-left">Senha</th>
                                                        <th className="px-3 py-2 text-left">Guia</th>
                                                        <th className="px-3 py-2 text-left">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-700/50">
                                                    {(anexosPreview.data || []).map((d, i) => (
                                                        <tr key={i} className="text-slate-300">
                                                            <td className="px-3 py-2 font-mono text-[11px] break-all" title={d.caminho}>{d.arquivo}</td>
                                                            <td className="px-3 py-2 font-mono">{d.senha || '—'}</td>
                                                            <td className="px-3 py-2 font-mono">{d.guia || '—'}</td>
                                                            <td className="px-3 py-2">
                                                                {d.valido
                                                                    ? <span className="text-emerald-400 font-semibold">Válido</span>
                                                                    : <span className="text-red-400" title={d.motivo}>{d.motivo}</span>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <div className="px-3 py-2 bg-slate-900/60 text-[11px] text-slate-400">
                                                {anexosPreview.validos} válido(s) de {(anexosPreview.data || []).length} PDF(s)
                                                {anexosPreview.ignorados_nao_pdf > 0 ? ` • ${anexosPreview.ignorados_nao_pdf} item(ns) não-PDF/subpasta ignorado(s)` : ''}
                                            </div>
                                        </div>
                                    )}

                                    {anexosResultado && (
                                        <div className={`text-sm rounded-lg px-4 py-3 border ${anexosResultado.rejeitados?.length ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>
                                            <div className="font-semibold">
                                                {anexosResultado.criados} job(s) de anexo criados (OP19).
                                            </div>
                                            {anexosResultado.rejeitados?.length > 0 && (
                                                <ul className="mt-1 list-disc list-inside text-xs">
                                                    {anexosResultado.rejeitados.map((r, i) => (
                                                        <li key={i}>{r.arquivo}: {r.motivo}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
