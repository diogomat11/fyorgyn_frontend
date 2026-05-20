import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, AlertCircle, Save } from 'lucide-react';
import Button from './ui/Button';

/**
 * A Popover-style frame for editing atendimentos.
 * Positioned relative to its parent container.
 */
export default function ProtocoloAtendimentosPopover({ isOpen, onClose, file, onSave }) {
    const [atendimentos, setAtendimentos] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && file) {
            setAtendimentos(file.atendimentos || []);
        }
    }, [isOpen, file]);

    if (!isOpen || !file) return null;

    const handleAdd = () => {
        setAtendimentos([...atendimentos, { data: '', assinatura: 'Não' }]);
    };

    const handleRemove = (index) => {
        setAtendimentos(atendimentos.filter((_, i) => i !== index));
    };

    const handleChange = (index, field, value) => {
        const newAtendimentos = [...atendimentos];
        newAtendimentos[index][field] = value;
        setAtendimentos(newAtendimentos);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(file.id, atendimentos);
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-[350px] bg-slate-900 border border-blue-500/50 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-slate-800/80">
                <div>
                    <h3 className="text-sm font-bold text-text-primary">Editar Datas</h3>
                    <p className="text-[10px] text-text-secondary truncate max-w-[200px]">
                        {file.nome_original}
                    </p>
                </div>
                <button onClick={onClose} className="text-text-secondary hover:text-red-400 p-1 rounded-full transition-colors">
                    <X size={16} />
                </button>
            </div>

            {/* Content */}
            <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar bg-slate-950/50">
                <div className="space-y-3">
                    {atendimentos.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-border rounded-lg text-text-secondary">
                            <p className="text-xs">Nenhuma data registrada</p>
                        </div>
                    ) : (
                        atendimentos.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-slate-800/40 rounded border border-border/30 group">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={item.data}
                                        onChange={(e) => handleChange(idx, 'data', e.target.value)}
                                        placeholder="DD-MM-AAAA"
                                        className="bg-slate-900 border border-border/50 text-text-primary text-[11px] px-2 py-1.5 rounded w-full focus:border-blue-500 outline-none transition-colors"
                                    />
                                </div>
                                <div className="w-20">
                                    <select
                                        value={item.assinatura}
                                        onChange={(e) => handleChange(idx, 'assinatura', e.target.value)}
                                        className="bg-slate-900 border border-border/50 text-text-primary text-[11px] px-2 py-1.5 rounded w-full focus:border-blue-500 outline-none transition-colors appearance-none cursor-pointer"
                                    >
                                        <option value="Sim">Sim</option>
                                        <option value="Não">Não</option>
                                    </select>
                                </div>
                                <button
                                    onClick={() => handleRemove(idx)}
                                    className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))
                    )}

                    <button
                        onClick={handleAdd}
                        className="w-full py-2 border border-dashed border-border hover:border-blue-500/50 hover:bg-blue-500/5 text-blue-400 text-[11px] rounded transition-all"
                    >
                        + Adicionar Data
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-slate-800/80 border-t border-border flex justify-end gap-2">
                <button 
                    onClick={onClose} 
                    className="text-xs text-text-secondary hover:text-text-primary px-3 py-1.5"
                    disabled={saving}
                >
                    Cancelar
                </button>
                <Button 
                    size="sm"
                    onClick={handleSave} 
                    disabled={saving} 
                    className="bg-blue-600 hover:bg-blue-500 h-8 px-4"
                >
                    {saving ? '...' : <><Save size={14} className="mr-1.5" /> Salvar</>}
                </Button>
            </div>
        </div>
    );
}
