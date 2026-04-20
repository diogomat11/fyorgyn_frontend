import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Paperclip } from 'lucide-react';
import api from '../services/api';
import SearchableSelect from './SearchableSelect';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';

const TIPOS_ANEXO = [
    { value: 'relatorio_clinico', label: 'Relatório Clínico' },
    { value: 'relatorio_medico', label: 'Relatório Médico' },
    { value: 'plano_terapeutico', label: 'Plano Terapêutico' },
    { value: 'justificativa_clinica', label: 'Justificativa Clínica' },
];

export default function NovaSolicitacaoModal({ isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [convenios, setConvenios] = useState([]);
    const [carteirinhas, setCarteirinhas] = useState([]);
    const [procedimentosDisponiveis, setProcedimentosDisponiveis] = useState([]);

    const [formData, setFormData] = useState({
        id_convenio: '',
        carteirinha_id: '',
        observacao: ''
    });

    // Múltiplos procedimentos
    const [procedimentos, setProcedimentos] = useState([
        { codigo: '', qtde: 1 }
    ]);

    // Anexos
    const [anexos, setAnexos] = useState([]);

    useEffect(() => {
        if (isOpen) {
            api.get('/convenios/').then(res => setConvenios(res.data)).catch(console.error);
            // Reset form
            setFormData({ id_convenio: '', carteirinha_id: '', observacao: '' });
            setProcedimentos([{ codigo: '', qtde: 1 }]);
            setAnexos([]);
        }
    }, [isOpen]);

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
        setAnexos([...anexos, { tipo: 'relatorio_clinico', file: null }]);
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
        if (!formData.id_convenio || !formData.carteirinha_id || validProcedimentos.length === 0) {
            alert('Preencha os campos obrigatórios (Convênio, Paciente e pelo menos 1 Procedimento).');
            return;
        }

        setLoading(true);
        try {
            const rotinaMap = {
                6: '1', // IPASGO
                3: '1',
                7: '1'
            };

            const selectedRotina = rotinaMap[formData.id_convenio] || '1';

            const payload = {
                type: 'single',
                rotina: selectedRotina,
                id_convenio: parseInt(formData.id_convenio),
                carteirinha_ids: [parseInt(formData.carteirinha_id)],
                params: JSON.stringify({
                    procedimentos: validProcedimentos.map(p => ({
                        codigo_procedimento: p.codigo,
                        qtde_solicitada: parseInt(p.qtde) || 1
                    })),
                    // Backwards compat: first procedure as flat fields
                    codigo_procedimento: validProcedimentos[0]?.codigo,
                    qtde_solicitada: parseInt(validProcedimentos[0]?.qtde) || 1,
                    observacao: formData.observacao,
                    anexos: anexos
                        .filter(a => a.file)
                        .map(a => ({ tipo: a.tipo, nome: a.file?.name || '' }))
                })
            };

            await api.post('/jobs/', payload);
            alert('Solicitação de autorização enfileirada com sucesso!');
            if (onSuccess) onSuccess();
            onClose();
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-slate-900/50">
                    <h2 className="text-lg font-bold text-text-primary">Solicitar Autorização</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-red-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
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

                    {/* Paciente */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Paciente *</label>
                        <SearchableSelect
                            options={carteirinhas.map(c => ({
                                value: c.id,
                                label: c.paciente ? `${c.paciente} (${c.carteirinha})` : c.carteirinha
                            }))}
                            value={formData.carteirinha_id}
                            onChange={(val) => setFormData({ ...formData, carteirinha_id: val })}
                            placeholder={formData.id_convenio ? "Selecione o Paciente..." : "Selecione o convênio primeiro"}
                            disabled={!formData.id_convenio}
                        />
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
                                <div key={index} className="flex gap-2 items-end bg-slate-900/30 rounded-lg p-2 border border-border/40">
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
                                            <label className="block text-xs text-text-secondary mb-1">Arquivo</label>
                                        )}
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            onChange={(e) => updateAnexo(index, 'file', e.target.files[0] || null)}
                                            className="w-full text-xs text-text-secondary file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary/20 file:text-primary hover:file:bg-primary/30 file:cursor-pointer file:transition-colors"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeAnexo(index)}
                                        className="text-red-400 hover:text-red-300 transition-colors p-2"
                                        title="Remover anexo"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Observação */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Observação / Justificativa</label>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none h-20"
                            value={formData.observacao}
                            onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                            placeholder="Informações adicionais para a solicitação..."
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
        </div>
    );
}
