import React, { useState, useEffect } from 'react';
import { X, Upload, Link as LinkIcon, AlertCircle } from 'lucide-react';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import api from '../services/api';

export default function DocUploadModal({ isOpen, onClose, onSuccess, tipo, docToEdit, modalMode = 'create' }) {
    const [pacientes, setPacientes] = useState([]);
    const [loadingPacientes, setLoadingPacientes] = useState(false);
    const [searchPaciente, setSearchPaciente] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [uploadMode, setUploadMode] = useState('upload'); // 'upload' | 'url'
    const [file, setFile] = useState(null);

    const [formData, setFormData] = useState({
        id_paciente: '',
        nome_paciente: '',
        url_arquivo: '',
        data: new Date().toISOString().split('T')[0],
        nome_profissional: '',
        nome_medico: '',
        especialidade: '',
        observacoes: '',
        carga: '',
        tipo_carga_horaria: 'semanal',
    });

    useEffect(() => {
        if (!isOpen) return;

        // Fetch initial pacientes list
        const fetchPacientes = async () => {
            setLoadingPacientes(true);
            try {
                const res = await api.get('/carteirinhas', { params: { limit: 500 } });
                const list = res.data.data || res.data || [];
                // Unique by id_paciente or carteirinha
                const unique = [];
                const seen = new Set();
                for (const p of list) {
                    const key = p.id_paciente || p.carteirinha || p.id;
                    if (key && !seen.has(key)) {
                        seen.add(key);
                        unique.push({
                            id_paciente: p.id_paciente || String(p.id),
                            nome: p.paciente || 'Sem Nome',
                            carteirinha: p.carteirinha || ''
                        });
                    }
                }
                setPacientes(unique);
            } catch (err) {
                console.error('Erro ao buscar pacientes:', err);
            } finally {
                setLoadingPacientes(false);
            }
        };
        fetchPacientes();

        if (modalMode === 'edit' && docToEdit) {
            setFormData({
                id_paciente: docToEdit.id_paciente || '',
                nome_paciente: docToEdit.nome_paciente || '',
                url_arquivo: docToEdit.url_arquivo || '',
                data: docToEdit.data || docToEdit.data_relatorio || new Date().toISOString().split('T')[0],
                nome_profissional: docToEdit.nome_profissional || '',
                nome_medico: docToEdit.nome_medico || '',
                especialidade: docToEdit.especialidade || '',
                observacoes: docToEdit.observacoes || '',
                carga: docToEdit.carga || '',
                tipo_carga_horaria: docToEdit.tipo_carga_horaria || 'semanal',
            });
            setUploadMode(docToEdit.url_arquivo ? 'url' : 'upload');
        } else {
            setFormData({
                id_paciente: '',
                nome_paciente: '',
                url_arquivo: '',
                data: new Date().toISOString().split('T')[0],
                nome_profissional: '',
                nome_medico: '',
                especialidade: '',
                observacoes: '',
                carga: '',
                tipo_carga_horaria: 'semanal',
            });
            setFile(null);
            setUploadMode('upload');
        }
        setError('');
    }, [isOpen, modalMode, docToEdit]);

    if (!isOpen) return null;

    const filteredPacientes = pacientes.filter(p => 
        p.nome.toLowerCase().includes(searchPaciente.toLowerCase()) ||
        p.carteirinha.includes(searchPaciente)
    );

    const handleSelectPaciente = (e) => {
        const idPac = e.target.value;
        const selected = pacientes.find(p => p.id_paciente === idPac);
        setFormData(prev => ({
            ...prev,
            id_paciente: idPac,
            nome_paciente: selected ? selected.nome : prev.nome_paciente
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.id_paciente && modalMode === 'create') {
            setError('Selecione um paciente.');
            return;
        }

        if (uploadMode === 'upload' && !file && modalMode === 'create') {
            setError('Selecione um arquivo para upload.');
            return;
        }

        if (uploadMode === 'url' && !formData.url_arquivo) {
            setError('Informe a URL do arquivo.');
            return;
        }

        setSubmitting(true);
        try {
            const isRM = tipo === 'RM';

            if (modalMode === 'edit') {
                if (isRM) {
                    await api.put(`/docs/rm/${docToEdit.id}`, {
                        nome_paciente: formData.nome_paciente,
                        url_arquivo: formData.url_arquivo,
                        data_relatorio: formData.data,
                        nome_medico: formData.nome_medico,
                        especialidade: formData.especialidade,
                        observacoes: formData.observacoes,
                    });
                } else {
                    await api.put(`/docs/clinicos/${docToEdit.id}`, {
                        nome_paciente: formData.nome_paciente,
                        url_arquivo: formData.url_arquivo,
                        carga: formData.carga,
                        tipo_carga_horaria: formData.tipo_carga_horaria,
                        data: formData.data,
                        nome_profissional: formData.nome_profissional,
                    });
                }
            } else {
                // Modo Criação
                if (uploadMode === 'upload' && file) {
                    const dataForm = new FormData();
                    dataForm.append('file', file);
                    dataForm.append('id_paciente', formData.id_paciente);
                    dataForm.append('nome_paciente', formData.nome_paciente || '');

                    if (isRM) {
                        dataForm.append('data_relatorio', formData.data || '');
                        dataForm.append('nome_medico', formData.nome_medico || '');
                        dataForm.append('especialidade', formData.especialidade || '');
                        dataForm.append('observacoes', formData.observacoes || '');
                        await api.post('/docs/rm/upload', dataForm, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                    } else {
                        dataForm.append('tipo_relatorio', tipo);
                        dataForm.append('data', formData.data || '');
                        dataForm.append('nome_profissional', formData.nome_profissional || '');
                        dataForm.append('carga', formData.carga || '');
                        dataForm.append('tipo_carga_horaria', formData.tipo_carga_horaria || 'semanal');
                        await api.post('/docs/clinicos/upload', dataForm, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                    }
                } else {
                    // Modo URL manual
                    if (isRM) {
                        await api.post('/docs/rm', {
                            id_paciente: formData.id_paciente,
                            nome_paciente: formData.nome_paciente,
                            url_arquivo: formData.url_arquivo,
                            data_relatorio: formData.data,
                            nome_medico: formData.nome_medico,
                            especialidade: formData.especialidade,
                            observacoes: formData.observacoes,
                        });
                    } else {
                        await api.post('/docs/clinicos', {
                            id_paciente: formData.id_paciente,
                            tipo_relatorio: tipo,
                            nome_paciente: formData.nome_paciente,
                            url_arquivo: formData.url_arquivo,
                            carga: formData.carga,
                            tipo_carga_horaria: formData.tipo_carga_horaria,
                            data: formData.data,
                            nome_profissional: formData.nome_profissional,
                        });
                    }
                }
            }

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Erro ao salvar documento:', err);
            setError(err.response?.data?.detail || 'Erro ao salvar documento. Verifique os dados e tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    const isRM = tipo === 'RM';
    const modalTitle = modalMode === 'edit'
        ? `Editar ${isRM ? 'Relatório Médico' : tipo === 'PTS' ? 'Relatório Clínico (PTS)' : 'Avaliação Inicial (Anexo II)'}`
        : `Novo ${isRM ? 'Relatório Médico' : tipo === 'PTS' ? 'Relatório Clínico (PTS)' : 'Avaliação Inicial (Anexo II)'}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
                    <h2 className="text-lg font-bold text-slate-100">{modalTitle}</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-sm text-red-400">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Paciente Selection */}
                    {modalMode === 'create' ? (
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                Paciente *
                            </label>
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    placeholder="Filtrar por nome ou carteirinha..."
                                    value={searchPaciente}
                                    onChange={(e) => setSearchPaciente(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary"
                                />
                                <Select
                                    value={formData.id_paciente}
                                    onChange={handleSelectPaciente}
                                    required
                                >
                                    <option value="">Selecione o paciente...</option>
                                    {filteredPacientes.map((p, idx) => (
                                        <option key={`${p.id_paciente}-${idx}`} value={p.id_paciente}>
                                            {p.nome} {p.carteirinha ? `(${p.carteirinha})` : ''}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                Paciente
                            </label>
                            <Input
                                value={formData.nome_paciente}
                                onChange={(e) => setFormData({ ...formData, nome_paciente: e.target.value })}
                            />
                        </div>
                    )}

                    {/* Origem do Arquivo */}
                    {modalMode === 'create' && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                Origem do Arquivo *
                            </label>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <button
                                    type="button"
                                    onClick={() => setUploadMode('upload')}
                                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                                        uploadMode === 'upload'
                                            ? 'bg-primary/10 border-primary text-primary'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <Upload size={14} /> Upload de Arquivo (PDF)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUploadMode('url')}
                                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                                        uploadMode === 'url'
                                            ? 'bg-primary/10 border-primary text-primary'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <LinkIcon size={14} /> Informar URL Externa
                                </button>
                            </div>

                            {uploadMode === 'upload' ? (
                                <div className="border-2 border-dashed border-slate-700 hover:border-slate-600 rounded-xl p-4 text-center bg-slate-800/40">
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                        onChange={(e) => setFile(e.target.files[0])}
                                        className="hidden"
                                        id="doc-file-upload"
                                    />
                                    <label htmlFor="doc-file-upload" className="cursor-pointer block">
                                        <Upload size={24} className="mx-auto text-slate-400 mb-1" />
                                        <span className="text-xs text-slate-300 font-medium">
                                            {file ? file.name : 'Clique para selecionar o arquivo PDF'}
                                        </span>
                                        <span className="block text-[10px] text-slate-500 mt-0.5">
                                            PDF, Imagens ou Word até 20MB
                                        </span>
                                    </label>
                                </div>
                            ) : (
                                <Input
                                    placeholder="https://sistemaevoluir.com.br/painel/.../pdf/..."
                                    value={formData.url_arquivo}
                                    onChange={(e) => setFormData({ ...formData, url_arquivo: e.target.value })}
                                />
                            )}
                        </div>
                    )}

                    {modalMode === 'edit' && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                URL do Arquivo
                            </label>
                            <Input
                                value={formData.url_arquivo}
                                onChange={(e) => setFormData({ ...formData, url_arquivo: e.target.value })}
                            />
                        </div>
                    )}

                    {/* Data */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                Data do Documento *
                            </label>
                            <Input
                                type="date"
                                value={formData.data}
                                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                                required
                            />
                        </div>

                        {/* Campos específicos por Tipo */}
                        {isRM ? (
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Nome do Médico
                                </label>
                                <Input
                                    placeholder="Ex: Dr. Fulano de Tal"
                                    value={formData.nome_medico}
                                    onChange={(e) => setFormData({ ...formData, nome_medico: e.target.value })}
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Profissional Responsável
                                </label>
                                <Input
                                    placeholder="Ex: Terapeuta Ocupacional..."
                                    value={formData.nome_profissional}
                                    onChange={(e) => setFormData({ ...formData, nome_profissional: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    {isRM ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Especialidade
                                </label>
                                <Input
                                    placeholder="Ex: Neurologia, Psiquiatria..."
                                    value={formData.especialidade}
                                    onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Observações
                                </label>
                                <Input
                                    placeholder="Observações complementares..."
                                    value={formData.observacoes}
                                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Carga Horária (Sessões)
                                </label>
                                <Input
                                    placeholder="Ex: 40"
                                    value={formData.carga}
                                    onChange={(e) => setFormData({ ...formData, carga: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Periodicidade da Carga
                                </label>
                                <Select
                                    value={formData.tipo_carga_horaria}
                                    onChange={(e) => setFormData({ ...formData, tipo_carga_horaria: e.target.value })}
                                >
                                    <option value="semanal">Semanal</option>
                                    <option value="mensal">Mensal</option>
                                    <option value="anual">Anual</option>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" isLoading={submitting}>
                            {modalMode === 'edit' ? 'Salvar Alterações' : 'Criar Documento'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
