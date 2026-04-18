import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { X, Save } from 'lucide-react';
import { maskCarteirinha, validateCarteirinha, maskCodigoBeneficiario, maskSulamerica, maskNumerics } from '../utils/formatters';
import Button from './ui/Button';
import { Input, Select } from './ui/Input';
import Card from './ui/Card';

export default function EditCarteirinhaModal({ carteirinha, convenios, onClose, onSave }) {
    const [formData, setFormData] = useState({
        carteirinha: '',
        paciente: '',
        id_paciente: '',
        codigo_beneficiario: '',
        status: 'ativo'
    });
    const [loading, setLoading] = useState(false);

    const isIpasgoSelected = (id) => {
        if (!id || !convenios) return false;
        const selected = convenios.find(c => c.id_convenio.toString() === id.toString());
        return selected?.nome?.toLowerCase().includes('ipasgo');
    };

    const handleCarteirinhaFormat = (value, id_convenio) => {
        if (!id_convenio || !convenios) return value;
        const selected = convenios.find(c => c.id_convenio.toString() === id_convenio.toString());
        if (!selected) return value;

        const nome = selected.nome.toLowerCase();
        if (nome.includes('unimed')) {
            return maskCarteirinha(value);
        } else if (nome.includes('sulamerica')) {
            return maskSulamerica(value);
        } else if (nome.includes('amil') || nome.includes('ipasgo')) {
            return maskNumerics(value, selected.digitos_carteirinha || 9);
        }
        return maskNumerics(value, selected.digitos_carteirinha);
    };

    useEffect(() => {
        if (carteirinha) {
            setFormData({
                carteirinha: carteirinha.carteirinha,
                paciente: carteirinha.paciente,
                id_paciente: carteirinha.id_paciente || '',
                codigo_beneficiario: carteirinha.codigo_beneficiario || '',
                status: carteirinha.status || 'ativo'
            });
        }
    }, [carteirinha]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateCarteirinha(formData.carteirinha)) {
            alert("Carteirinha inválida! Deve conter 21 caracteres");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                carteirinha: formData.carteirinha,
                paciente: formData.paciente,
                id_paciente: formData.id_paciente ? parseInt(formData.id_paciente) : null,
                codigo_beneficiario: formData.codigo_beneficiario ? formData.codigo_beneficiario : null,
                status: formData.status
            };
            await api.put(`/carteirinhas/${carteirinha.id}`, payload);
            onSave();
            onClose();
        } catch (error) {
            alert("Erro ao salvar: " + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    if (!carteirinha) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-text-primary">Editar Carteirinha</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Carteirinha</label>
                        <Input
                            type="text"
                            value={formData.carteirinha}
                            onChange={e => setFormData({ ...formData, carteirinha: handleCarteirinhaFormat(e.target.value, carteirinha.id_convenio) })}
                            required
                            maxLength={25}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Paciente</label>
                        <Input
                            type="text"
                            value={formData.paciente}
                            onChange={e => setFormData({ ...formData, paciente: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">ID Paciente</label>
                            <Input
                                type="number"
                                value={formData.id_paciente}
                                onChange={e => setFormData({ ...formData, id_paciente: e.target.value })}
                                placeholder="123"
                            />
                        </div>
                        {isIpasgoSelected(carteirinha.id_convenio) && (
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Código do Paciente no Convênio *</label>
                                <Input
                                    type="text"
                                    value={formData.codigo_beneficiario}
                                    onChange={e => setFormData({ ...formData, codigo_beneficiario: maskCodigoBeneficiario(e.target.value) })}
                                    placeholder="1180507-2"
                                    required
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
                        <Select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="ativo">Ativo</option>
                            <option value="inativo">Inativo</option>
                        </Select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" isLoading={loading}>
                            <Save size={16} className="mr-2" /> Salvar
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
