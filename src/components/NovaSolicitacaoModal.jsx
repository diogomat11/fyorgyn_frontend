import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import api from '../services/api';
import SearchableSelect from './SearchableSelect';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';

export default function NovaSolicitacaoModal({ isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [convenios, setConvenios] = useState([]);
    const [carteirinhas, setCarteirinhas] = useState([]);

    const [formData, setFormData] = useState({
        id_convenio: '',
        carteirinha_id: '',
        codigo_procedimento: '',
        qtde_solicitada: 1,
        observacao: ''
    });

    useEffect(() => {
        if (isOpen) {
            api.get('/convenios/').then(res => setConvenios(res.data)).catch(console.error);
        }
    }, [isOpen]);

    useEffect(() => {
        if (formData.id_convenio) {
            api.get(`/carteirinhas/?id_convenio=${formData.id_convenio}&limit=1000`)
                .then(res => setCarteirinhas(res.data.data || res.data))
                .catch(console.error);
        } else {
            setCarteirinhas([]);
            setFormData(prev => ({ ...prev, carteirinha_id: '' }));
        }
    }, [formData.id_convenio]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.id_convenio || !formData.carteirinha_id || !formData.codigo_procedimento) {
            alert('Preencha os campos obrigatórios (Convênio, Paciente e Procedimento).');
            return;
        }

        setLoading(true);
        try {
            const rotinaMap = {
                6: '1', // IPASGO -> op1_autorizar_facplan.py is mapped as Rotina 1 by user request
                3: '1', // Amil / Sulamerica default to 1 for now (to be implemented over time)
                7: '1'
            };

            const selectedRotina = rotinaMap[formData.id_convenio] || '1';

            // Build the payload that matches the standard jobs endpoint
            const payload = {
                type: 'single', // Assuming we map to a single carteirinha operation
                rotina: selectedRotina,
                id_convenio: parseInt(formData.id_convenio),
                carteirinha_ids: [parseInt(formData.carteirinha_id)],
                params: JSON.stringify({
                    codigo_procedimento: formData.codigo_procedimento,
                    qtde_solicitada: parseInt(formData.qtde_solicitada),
                    observacao: formData.observacao
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-slate-900/50">
                    <h2 className="text-lg font-bold text-text-primary">Solicitar Autorização</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-red-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
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

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Código do Procedimento (TUSS) *</label>
                        <Input
                            type="text"
                            value={formData.codigo_procedimento}
                            onChange={(e) => setFormData({ ...formData, codigo_procedimento: e.target.value })}
                            placeholder="Ex: 50000470"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Quantidade Solicitada *</label>
                        <Input
                            type="number"
                            min="1"
                            value={formData.qtde_solicitada}
                            onChange={(e) => setFormData({ ...formData, qtde_solicitada: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Observação / Justificativa</label>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none h-24"
                            value={formData.observacao}
                            onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                            placeholder="Informações adicionais para a solicitação..."
                        />
                    </div>

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
