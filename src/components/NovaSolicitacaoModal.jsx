import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Paperclip } from 'lucide-react';
import api from '../services/api';
import SearchableSelect from './SearchableSelect';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';

const TIPOS_ANEXO = [
    { value: 'Pedido Médico',          label: 'Pedido Médico (RM)'           },
    { value: 'Avaliação Inicial',      label: 'Avaliação Inicial (AI)'       },
    { value: 'PTS/Relatório Clínico',  label: 'PTS/Relatório Clínico (RC)'  },
];

export default function NovaSolicitacaoModal({ isOpen, onClose, onSuccess, initialData }) {
    const [loading, setLoading] = useState(false);
    const [convenios, setConvenios] = useState([]);
    const [carteirinhas, setCarteirinhas] = useState([]);
    const [procedimentosDisponiveis, setProcedimentosDisponiveis] = useState([]);
    const [profissionais, setProfissionais] = useState([]);
    const [medicos, setMedicos] = useState([]);

    const todayISO = new Date().toISOString().slice(0, 10);

    const [formData, setFormData] = useState({
        id_convenio: initialData?.id_convenio || '',
        carteirinha_id: initialData?.carteirinha_id || '',
        observacao: '',
        id_profissional: '',
        medico_mesmo_profissional: true,
        id_medico: '',
        dataSolicitacao: todayISO,
        paciente_CID: '',
        tipoAtendimento: 'TERAPIAS',
        cod_prestador: '',
    });

    // Múltiplos procedimentos
    const [procedimentos, setProcedimentos] = useState(
        initialData?.procedimentos || [{ codigo: '', qtde: 1 }]
    );

    // Anexos
    const [anexos, setAnexos] = useState([]);
    const [medicalReports, setMedicalReports] = useState([]);
    const [aiReports, setAiReports] = useState([]);
    const [ptsReports, setPtsReports] = useState([]);

    const [showCrmModal, setShowCrmModal] = useState(false);
    const [crmLoading, setCrmLoading] = useState(false);
    const [crmFormData, setCrmFormData] = useState({ uf: 'GO', registro: '', nome: '' });

    const fetchMedicos = () => {
        api.get('/agendamentos/profissionais?tipo=medico')
            .then(res => setMedicos(res.data))
            .catch(console.error);
    };

    useEffect(() => {
        if (isOpen) {
            api.get('/convenios/').then(res => setConvenios(res.data)).catch(console.error);
            api.get('/agendamentos/profissionais?tipo=profissional').then(res => setProfissionais(res.data)).catch(console.error);
            fetchMedicos();
            
            // Set form taking initialData into account
            setFormData({ 
                id_convenio: initialData?.id_convenio || '', 
                carteirinha_id: initialData?.carteirinha_id || '', 
                observacao: '',
                id_profissional: '',
                medico_mesmo_profissional: true,
                id_medico: '',
                dataSolicitacao: new Date().toISOString().slice(0, 10),
                paciente_CID: '',
                tipoAtendimento: 'TERAPIAS',
                cod_prestador: '',
            });
            setProcedimentos(initialData?.procedimentos || [{ codigo: '', qtde: 1 }]);
            setAnexos([]);
            setMedicalReports([]);
            setAiReports([]);
            setPtsReports([]);
        }
    }, [isOpen, initialData]);


    useEffect(() => {
        if (formData.id_convenio) {
            api.get(`/carteirinhas/?id_convenio=${formData.id_convenio}&limit=1000`)
                .then(res => setCarteirinhas(res.data.data || res.data))
                .catch(console.error);
            // Buscar procedimentos do convênio
            api.get(`/convenios/${formData.id_convenio}/procedimentos`)
                .then(res => setProcedimentosDisponiveis(res.data || []))
                .catch(console.error);
        } else {
            setCarteirinhas([]);
            setProcedimentosDisponiveis([]);
            setFormData(prev => ({ ...prev, carteirinha_id: '' }));
        }
    }, [formData.id_convenio]);

    useEffect(() => {
        const selectedCart = carteirinhas.find(c => String(c.id) === String(formData.carteirinha_id));
        if (selectedCart) {
            const patientId = selectedCart.id_paciente || selectedCart.id;
            const patientName = selectedCart.paciente ? encodeURIComponent(selectedCart.paciente) : '';
            
            // 1. Fetch Medical Reports (RM)
            api.get(`/relatorios/?id_paciente=${patientId}`)
                .then(res => setMedicalReports(res.data.data || res.data || []))
                .catch(err => {
                    console.error("Erro ao buscar relatorios medicos:", err);
                    setMedicalReports([]);
                });
            // 2. Fetch Avaliacao Inicial (ANEXO-II)
            api.get(`/guias/relatorios?id_paciente=${patientId}&tipo_relatorio=ANEXO-II&nome_paciente=${patientName}`)
                .then(res => setAiReports(res.data || []))
                .catch(err => {
                    console.error("Erro ao buscar relatorios AI:", err);
                    setAiReports([]);
                });
            // 3. Fetch PTS (PTS)
            api.get(`/guias/relatorios?id_paciente=${patientId}&tipo_relatorio=PTS&nome_paciente=${patientName}`)
                .then(res => setPtsReports(res.data || []))
                .catch(err => {
                    console.error("Erro ao buscar relatorios PTS:", err);
                    setPtsReports([]);
                });
        } else {
            setMedicalReports([]);
            setAiReports([]);
            setPtsReports([]);
        }
    }, [formData.carteirinha_id, carteirinhas]);

    const getOptionsForAnexo = (anexo) => {
        if (anexo.tipo === 'Pedido Médico') {
            return medicalReports.map(r => {
                const dateStr = r.data_relatorio ? r.data_relatorio.split('-').reverse().join('/') : 'N/D';
                return {
                    id: r.id,
                    url: r.url_arquivo,
                    label: `${r.nome_paciente || 'Paciente'} - ${dateStr} - RM`
                };
            });
        } else if (anexo.tipo === 'Avaliação Inicial') {
            return aiReports.map(r => {
                return {
                    id: r.id,
                    url: r.url_arquivo,
                    label: `${r.nome_profissional || 'Profissional N/D'} - ANEXO-II`
                };
            });
        } else if (anexo.tipo === 'PTS/Relatório Clínico') {
            return ptsReports.map(r => {
                return {
                    id: r.id,
                    url: r.url_arquivo,
                    label: `${r.nome_profissional || 'Profissional N/D'} - Relatório Clínico - PTS`
                };
            });
        }
        return [];
    };

    const addProcedimento = () => {
        setProcedimentos([...procedimentos, { codigo: '', qtde: 1 }]);
    };

    const removeProcedimento = (index) => {
        if (procedimentos.length <= 1) return;
        setProcedimentos(procedimentos.filter((_, i) => i !== index));
    };

    const updateProcedimento = (index, field, value) => {
        const updated = [...procedimentos];
        updated[index] = { ...updated[index], [field]: value };
        setProcedimentos(updated);
    };

    const addAnexo = () => {
        setAnexos([...anexos, { tipo: 'Pedido Médico', file: null }]);
    };

    const removeAnexo = (index) => {
        setAnexos(anexos.filter((_, i) => i !== index));
    };

    const updateAnexo = (index, field, value) => {
        const updated = [...anexos];
        updated[index] = { ...updated[index], [field]: value };
        setAnexos(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validProcedimentos = procedimentos.filter(p => p.codigo);
        if (!formData.id_convenio || !formData.carteirinha_id || !formData.id_profissional || validProcedimentos.length === 0) {
            alert('Preencha os campos obrigatórios (Convênio, Paciente, Profissional e pelo menos 1 Procedimento).');
            return;
        }

        if (!formData.medico_mesmo_profissional && !formData.id_medico) {
            alert('Por favor, selecione o Médico Solicitante.');
            return;
        }

        setLoading(true);
        try {
            const rotinaMap = {
                1: 'op1_solicitar_autorizacao', // Bradesco
                2: 'op1_consulta',             // Unimed Anapolis
                3: 'op1_consulta',             // Unimed Goiania
                6: 'op1_autorizar_facplan',    // IPASGO
                8: 'op1_consulta',             // Sulamerica
                9: 'op1_consulta'              // Amil
            };

            const selectedRotina = rotinaMap[formData.id_convenio] || 'op1_solicitar_autorizacao';

            const isIpasgo = parseInt(formData.id_convenio) === 6;
            const selectedCart = carteirinhas.find(c => String(c.id) === String(formData.carteirinha_id));
            const selectedProf = profissionais.find(p => String(p.id_profissional) === String(formData.id_profissional));
            const currentConvenio = convenios.find(c => String(c.id_convenio) === String(formData.id_convenio));
            const effectiveMedico = formData.medico_mesmo_profissional
                ? selectedProf
                : medicos.find(m => String(m.id_profissional) === String(formData.id_medico));

            const formattedDate = formData.dataSolicitacao
                ? formData.dataSolicitacao.split('-').reverse().join('/')
                : new Date().toLocaleDateString('pt-BR');

            // Obter URL base absoluta do backend para que o worker consiga acessar e baixar os arquivos
            let backendBaseUrl = import.meta.env.VITE_API_URL || '';
            if (backendBaseUrl.endsWith('/api')) {
                backendBaseUrl = backendBaseUrl.substring(0, backendBaseUrl.length - 4);
            } else if (backendBaseUrl.endsWith('/api/')) {
                backendBaseUrl = backendBaseUrl.substring(0, backendBaseUrl.length - 5);
            }
            if (!backendBaseUrl) {
                // Em desenvolvimento local, se VITE_API_URL não está definido, aponta direto para a porta do backend
                backendBaseUrl = 'http://127.0.0.1:8000';
            }

            // Realizar o upload de cada arquivo binário local para o backend
            for (let i = 0; i < anexos.length; i++) {
                const anx = anexos[i];
                if (anx.file) {
                    const formDataUpload = new FormData();
                    formDataUpload.append('file', anx.file);
                    
                    const response = await api.post('/jobs/upload-anexo', formDataUpload, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                    
                    anx.url = response.data.url; // caminho retornado do backend, ex: "/uploads/anexos/uuid_nome.pdf"
                }
            }

            // Map attachments to strict keys (RM, AI, RC) using absolute URLs
            const resolvedAttachments = {};
            anexos.forEach(anx => {
                if (anx.url) {
                    const tipoLower = (anx.tipo || '').toLowerCase();
                    const absoluteUrl = anx.url.startsWith('/uploads') ? `${backendBaseUrl}${anx.url}` : anx.url;
                    if (tipoLower.includes('pedido') || tipoLower.includes('médico') || tipoLower.includes('medico') || tipoLower === 'rm') {
                        resolvedAttachments['anexo_RM'] = absoluteUrl;
                    } else if (tipoLower.includes('avaliação') || tipoLower.includes('avaliacao') || tipoLower.includes('inicial') || tipoLower === 'ai') {
                        resolvedAttachments['anexo_AI'] = absoluteUrl;
                    } else if (tipoLower.includes('relatório') || tipoLower.includes('relatorio') || tipoLower.includes('clínico') || tipoLower.includes('clinico') || tipoLower === 'rc') {
                        resolvedAttachments['anexo_RC'] = absoluteUrl;
                    }
                }
            });

            const payload = {
                type: 'single',
                rotina: selectedRotina,
                id_convenio: parseInt(formData.id_convenio),
                carteirinha_ids: [parseInt(formData.carteirinha_id)],
                params: JSON.stringify({
                    // Strict API parameters (no fallbacks)
                    carteira: selectedCart ? (selectedCart.carteirinha || '') : '',
                    paciente_CID: formData.paciente_CID || '',
                    dataSolicitacao: formattedDate,
                    codigoProcedimento_aut: validProcedimentos[0]?.codigo || '',
                    qtde: String(validProcedimentos[0]?.qtde || 1),
                    profissional_codigo_ipasgo: selectedProf ? (selectedProf.codigo_ipasgo || '') : '',
                    profissional_CBO: selectedProf ? (selectedProf.CBO || '') : '',
                    texto_Justificativa: formData.observacao || '',
                    ...resolvedAttachments,

                    // Original/Frontend parameters
                    id_profissional: parseInt(formData.id_profissional),
                    id_medico: formData.medico_mesmo_profissional ? null : parseInt(formData.id_medico),
                    medico_mesmo_profissional: formData.medico_mesmo_profissional,
                    
                    // Bradesco Solicitante Details
                    nomeMedico: effectiveMedico?.nome || '',
                    ConselhoMedico: effectiveMedico?.conselho || '',
                    NumeroRegistroMedico: effectiveMedico?.registro || '',
                    UfConselhoMedico: effectiveMedico?.UF || '',
                    Cbomedico: effectiveMedico?.CBO || '',
                    RegistroAns: currentConvenio?.registro_ans || '',
                    TipoAtendimento: formData.tipoAtendimento || '',
                    cod_prestador: formData.cod_prestador || '',
                    caminho_arquivo_RM: resolvedAttachments['anexo_RM'] || '',

                    procedimentos: validProcedimentos.map(p => ({
                        codigo_procedimento: p.codigo,
                        qtde_solicitada: parseInt(p.qtde) || 1
                    })),
                    codigo_procedimento: validProcedimentos[0]?.codigo,
                    qtde_solicitada: parseInt(validProcedimentos[0]?.qtde) || 1,
                    observacao: formData.observacao,
                    anexos: anexos
                        .filter(a => a.url)
                        .map(a => ({ 
                            tipo: a.tipo, 
                            nome: a.useUrl ? (a.url.split('/').pop() || 'Relatorio.pdf') : (a.file?.name || ''), 
                            caminho: a.url.startsWith('/uploads') ? `${backendBaseUrl}${a.url}` : a.url 
                        }))
                })
            };

            await api.post('/jobs/', payload);
            setLoading(false);
            if (onSuccess) onSuccess();
            onClose();
            setTimeout(() => {
                alert('Solicitação de autorização enfileirada com sucesso!');
            }, 100);
        } catch (error) {
            console.error("Error creating authorization job", error);
            alert("Erro ao criar solicitação: " + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const procOptions = procedimentosDisponiveis.map(p => ({
        value: p.codigo,
        label: `${p.codigo} — ${p.nome}`
    }));

    const selectedProfInfo = profissionais.find(p => String(p.id_profissional) === String(formData.id_profissional));
    const currentConvenio = convenios.find(c => String(c.id_convenio) === String(formData.id_convenio));
    const effectiveMedico = formData.medico_mesmo_profissional
        ? selectedProfInfo
        : medicos.find(m => String(m.id_profissional) === String(formData.id_medico));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-slate-900/50">
                    <h2 className="text-lg font-bold text-text-primary">Solicitar Autorização</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-red-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    {/* Grid de 2 colunas para Convênio e Data Solicitação */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Convênio */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Convênio *</label>
                            <Select
                                value={formData.id_convenio}
                                onChange={(e) => setFormData({ ...formData, id_convenio: e.target.value })}
                                required
                            >
                                <option value="">Selecione o Convênio</option>
                                {convenios.map(c => (
                                    <option key={c.id_convenio} value={c.id_convenio}>{c.nome}</option>
                                ))}
                            </Select>
                        </div>

                        {/* Data Solicitação */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">
                                Data Solicitação *
                            </label>
                            <Input
                                type="date"
                                value={formData.dataSolicitacao}
                                onChange={(e) => setFormData({ ...formData, dataSolicitacao: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* Tipo Atendimento TISS + Cod Prestador */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Tipo de Atendimento</label>
                            <Select
                                value={formData.tipoAtendimento}
                                onChange={(e) => setFormData({ ...formData, tipoAtendimento: e.target.value })}
                            >
                                <option value="TERAPIAS">Terapias</option>
                                <option value="pequenos atendimentos">Pequenos Atendimentos</option>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Cód. Prestador</label>
                            <Input
                                type="text"
                                placeholder="Deixar vazio p/ usar credencial padrão"
                                value={formData.cod_prestador}
                                onChange={(e) => setFormData({ ...formData, cod_prestador: e.target.value })}
                            />
                        </div>
                    </div>

                    {currentConvenio?.registro_ans && (
                        <div className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2">
                            Registro ANS: <strong className="font-mono">{currentConvenio.registro_ans}</strong> (aplicado automaticamente no job)
                        </div>
                    )}

                    {/* Grid de 2 colunas para Paciente e CID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Paciente */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Paciente *</label>
                            <SearchableSelect
                                options={carteirinhas.map(c => ({
                                    value: c.id,
                                    label: c.paciente ? `${c.paciente} (${c.carteirinha})` : c.carteirinha
                                }))}
                                value={formData.carteirinha_id}
                                onChange={(val) => {
                                    const selected = carteirinhas.find(c => String(c.id) === String(val));
                                    setFormData(prev => ({
                                        ...prev,
                                        carteirinha_id: val,
                                        paciente_CID: selected ? (selected.cid || '') : ''
                                    }));
                                }}
                                placeholder={formData.id_convenio ? "Selecione o Paciente..." : "Selecione o convênio primeiro"}
                                disabled={!formData.id_convenio}
                            />
                        </div>

                        {/* CID */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">
                                CID / Indicação Clínica
                            </label>
                            <Input
                                type="text"
                                value={formData.paciente_CID}
                                onChange={(e) => setFormData({ ...formData, paciente_CID: e.target.value })}
                                placeholder="Ex: F84.0"
                            />
                        </div>
                    </div>

                    {/* Profissional com Exibição de Dados Detalhados */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-secondary mb-1">Profissional (Terapeuta) *</label>
                        <Select
                            value={formData.id_profissional}
                            onChange={(e) => setFormData({ ...formData, id_profissional: e.target.value })}
                            required
                        >
                            <option value="">Selecione o Profissional</option>
                            {profissionais.map(p => (
                                <option key={p.id_profissional} value={p.id_profissional}>{p.nome}</option>
                            ))}
                        </Select>

                        {selectedProfInfo && (
                            <div className="bg-slate-900/40 border border-slate-700/60 rounded-lg p-3 text-xs text-text-secondary space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-text-primary">Dados do Profissional Executante:</span>
                                    <span className="text-primary font-medium">{selectedProfInfo.tipo_profissional}</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                                    <div>
                                        <span className="opacity-75 block">Conselho:</span> 
                                        <strong className="text-text-primary">{selectedProfInfo.conselho || 'N/D'}</strong>
                                    </div>
                                    <div>
                                        <span className="opacity-75 block">Registro:</span> 
                                        <strong className="text-text-primary">{selectedProfInfo.registro || 'N/D'} / {selectedProfInfo.UF || 'N/D'}</strong>
                                    </div>
                                    <div>
                                        <span className="opacity-75 block">CBO:</span> 
                                        <strong className="text-text-primary">{selectedProfInfo.CBO || 'N/D'}</strong>
                                    </div>
                                    <div>
                                        <span className="opacity-75 block">Cód. IPASGO:</span> 
                                        <strong className="text-text-primary">{selectedProfInfo.codigo_ipasgo || 'N/D'}</strong>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Médico Solicitante */}
                    <div className="bg-slate-900/30 rounded-lg p-4 border border-border/40 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-text-secondary">Médico Solicitante</label>
                            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.medico_mesmo_profissional}
                                    onChange={(e) => setFormData({ 
                                        ...formData, 
                                        medico_mesmo_profissional: e.target.checked,
                                        id_medico: e.target.checked ? '' : formData.id_medico
                                    })}
                                    className="rounded border-slate-700 text-primary focus:ring-primary bg-slate-900"
                                />
                                Médico é o próprio profissional
                            </label>
                        </div>
                        
                        {!formData.medico_mesmo_profissional && (
                            <div>
                                <SearchableSelect
                                    options={medicos.map(m => ({
                                        value: m.id_profissional,
                                        label: `${m.nome} (CRM ${m.registro || ''}/${m.UF || ''})`
                                    }))}
                                    value={formData.id_medico}
                                    onChange={(val) => setFormData(prev => ({ ...prev, id_medico: val }))}
                                    placeholder="Selecione ou busque o médico..."
                                    onAddNew={(searchTerm) => {
                                        const isNumber = /^\d+$/.test(searchTerm.trim());
                                        setCrmFormData({
                                            uf: 'GO',
                                            registro: isNumber ? searchTerm.trim() : '',
                                            nome: !isNumber ? searchTerm.trim() : ''
                                        });
                                        setShowCrmModal(true);
                                    }}
                                    addNewText="Importar do CRM (+)"
                                />
                            </div>
                        )}

                        {effectiveMedico && parseInt(formData.id_convenio) === 1 && (
                            <div className="bg-slate-900/40 border border-slate-700/60 rounded-lg p-3 text-xs text-text-secondary space-y-1 mt-2">
                                <span className="font-semibold text-text-primary">Dados do Médico Solicitante (Bradesco):</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                                    <div>
                                        <span className="opacity-75 block">Conselho:</span> 
                                        <strong className="text-text-primary">{effectiveMedico.conselho || 'N/D'}</strong>
                                    </div>
                                    <div>
                                        <span className="opacity-75 block">Registro:</span> 
                                        <strong className="text-text-primary">{effectiveMedico.registro || 'N/D'} / {effectiveMedico.UF || 'N/D'}</strong>
                                    </div>
                                    <div>
                                        <span className="opacity-75 block">CBO:</span> 
                                        <strong className="text-text-primary">{effectiveMedico.CBO || 'N/D'}</strong>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Procedimentos */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-text-secondary">Procedimentos *</label>
                            <button
                                type="button"
                                onClick={addProcedimento}
                                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                            >
                                <Plus size={14} /> Adicionar
                            </button>
                        </div>
                        <div className="space-y-2">
                            {procedimentos.map((proc, index) => (
                                <div key={index} className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        {index === 0 && (
                                            <label className="block text-xs text-text-secondary mb-1">Código Procedimento</label>
                                        )}
                                        <SearchableSelect
                                            options={procOptions}
                                            value={proc.codigo}
                                            onChange={(val) => updateProcedimento(index, 'codigo', val)}
                                            placeholder={formData.id_convenio ? "Buscar procedimento..." : "Selecione convênio"}
                                            disabled={!formData.id_convenio}
                                        />
                                    </div>
                                    <div className="w-20">
                                        {index === 0 && (
                                            <label className="block text-xs text-text-secondary mb-1">Qtde</label>
                                        )}
                                        <Input
                                            type="number"
                                            min="1"
                                            value={proc.qtde}
                                            onChange={(e) => updateProcedimento(index, 'qtde', e.target.value)}
                                        />
                                    </div>
                                    {procedimentos.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeProcedimento(index)}
                                            className="text-red-400 hover:text-red-300 transition-colors p-2 pb-2.5"
                                            title="Remover procedimento"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Anexos */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-text-secondary">Anexos</label>
                            <button
                                type="button"
                                onClick={addAnexo}
                                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                            >
                                <Paperclip size={14} /> Anexar
                            </button>
                        </div>
                        {anexos.length === 0 && (
                            <div className="text-xs text-text-secondary italic bg-slate-900/30 rounded-lg px-3 py-2 text-center">
                                Nenhum anexo adicionado
                            </div>
                        )}
                        <div className="space-y-2">
                            {anexos.map((anexo, index) => (
                                <div key={index} className="flex flex-col bg-slate-900/30 rounded-lg p-3 border border-border/40 space-y-2">
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            {index === 0 && (
                                                <label className="block text-xs text-text-secondary mb-1">Tipo</label>
                                            )}
                                            <Select
                                                value={anexo.tipo}
                                                onChange={(e) => updateAnexo(index, 'tipo', e.target.value)}
                                                className="text-sm py-1.5"
                                            >
                                                {TIPOS_ANEXO.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </Select>
                                        </div>
                                        <div className="flex-1">
                                            {index === 0 && (
                                                <label className="block text-xs text-text-secondary mb-1">
                                                    {anexo.useUrl ? 'Prontuário Evoluir' : 'Arquivo'}
                                                </label>
                                            )}
                                            {anexo.useUrl ? (
                                                <Select
                                                    value={anexo.url || ''}
                                                    onChange={(e) => updateAnexo(index, 'url', e.target.value)}
                                                    className="text-sm py-1.5"
                                                    required
                                                >
                                                    <option value="">Selecione o documento</option>
                                                    {getOptionsForAnexo(anexo).map(opt => (
                                                        <option key={opt.id} value={opt.url}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </Select>
                                            ) : (
                                                <input
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                    onChange={(e) => updateAnexo(index, 'file', e.target.files[0] || null)}
                                                    className="w-full text-xs text-text-secondary file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary/20 file:text-primary hover:file:bg-primary/30 file:cursor-pointer file:transition-colors"
                                                />
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeAnexo(index)}
                                            className="text-red-400 hover:text-red-300 transition-colors p-2"
                                            title="Remover anexo"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={anexo.useUrl || false}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    const updated = [...anexos];
                                                    updated[index] = {
                                                        ...updated[index],
                                                        useUrl: checked,
                                                        url: '',
                                                        file: null
                                                    };
                                                    setAnexos(updated);
                                                }}
                                                className="rounded border-slate-700 text-primary focus:ring-primary bg-slate-900"
                                            />
                                            Utilizar URL do Prontuário
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Observação / Justificativa */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            {parseInt(formData.id_convenio) === 6 ? 'Justificativa Clínica' : 'Observação / Justificativa'}
                        </label>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none h-20"
                            value={formData.observacao}
                            onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                            placeholder={parseInt(formData.id_convenio) === 6
                                ? 'Justificativa clínica para autorização...'
                                : 'Informações adicionais para a solicitação...'}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="text-text-secondary hover:text-text-primary">
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" disabled={loading || !formData.id_convenio || !formData.carteirinha_id}>
                            {loading ? 'Processando...' : 'Solicitar'}
                        </Button>
                    </div>
                </form>
            </div>

            {/* Modal de Importação de Médico por CRM (CFM) */}
            {showCrmModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Plus size={18} className="text-blue-400" />
                                Importar Médico do CRM
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowCrmModal(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-1">
                                    <label className="block text-xs font-medium text-slate-400 mb-1">UF *</label>
                                    <input
                                        type="text"
                                        maxLength={2}
                                        value={crmFormData.uf}
                                        onChange={(e) => setCrmFormData({ ...crmFormData, uf: e.target.value.toUpperCase() })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-white focus:border-blue-500 outline-none uppercase text-center font-bold"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-400 mb-1">CRM (Registro)</label>
                                    <input
                                        type="text"
                                        value={crmFormData.registro}
                                        onChange={(e) => setCrmFormData({ ...crmFormData, registro: e.target.value })}
                                        placeholder="Ex: 29278"
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-white focus:border-blue-500 outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Nome do Médico (Opcional)</label>
                                <input
                                    type="text"
                                    value={crmFormData.nome}
                                    onChange={(e) => setCrmFormData({ ...crmFormData, nome: e.target.value })}
                                    placeholder="Ex: João da Silva"
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            <p className="text-xs text-slate-400">
                                A consulta irá ao portal do Conselho Federal de Medicina (CFM), trará a situação e especialidades, e salvará o médico na base.
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-700">
                            <button
                                type="button"
                                onClick={() => setShowCrmModal(false)}
                                disabled={crmLoading}
                                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={crmLoading || !crmFormData.uf || (!crmFormData.registro && !crmFormData.nome)}
                                onClick={async () => {
                                    setCrmLoading(true);
                                    try {
                                        const res = await api.post('/crm/consulta', crmFormData);
                                        const data = res.data;
                                        if (data.status === 'success' && data.total_importados > 0) {
                                            alert(`Sucesso! ${data.total_importados} médico(s) importado(s) com sucesso.`);
                                            setShowCrmModal(false);
                                            // Atualizar lista de médicos no frontend
                                            const resMedicos = await api.get('/agendamentos/profissionais?tipo=medico');
                                            setMedicos(resMedicos.data || []);
                                            // Se trouxe médicos, seleciona o médico pelo CRM
                                            if (crmFormData.registro) {
                                                const novomed = resMedicos.data.find(m => String(m.registro) === String(crmFormData.registro));
                                                if (novomed) {
                                                    setFormData(prev => ({ ...prev, id_medico: novomed.id_profissional }));
                                                }
                                            }
                                        } else {
                                            alert(data.message || 'Nenhum médico encontrado com os parâmetros fornecidos.');
                                        }
                                    } catch (err) {
                                        console.error("Erro ao importar CRM:", err);
                                        const msg = err.response?.data?.detail || 'Erro ao consultar portal CRM.';
                                        alert(msg);
                                    } finally {
                                        setCrmLoading(false);
                                    }
                                }}
                                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded flex items-center gap-1 disabled:opacity-50"
                            >
                                {crmLoading ? 'Consultando CFM...' : 'Consultar e Importar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

