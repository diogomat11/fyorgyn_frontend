import React from 'react';
import { FileText, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';
import Card from './ui/Card';

/**
 * Dashboard metrics cards for a Protocolo lote.
 *
 * Props:
 *   loteStatus — object from GET /lotes/{id}/status (or null)
 */
export default function ProtocoloDashboard({ loteStatus, stats }) {
    if (!loteStatus) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                    <Card key={i} className="flex items-center gap-3 p-4 animate-pulse">
                        <div className="bg-slate-700/50 w-10 h-10 rounded-full" />
                        <div className="space-y-2">
                            <div className="bg-slate-700/50 h-3 w-16 rounded" />
                            <div className="bg-slate-700/50 h-5 w-10 rounded" />
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    const { total_arquivos, total_processado, total_sucesso, total_erro } = loteStatus;

    // Pricing
    const costPerFile = 0.02;
    
    // Batch Cost
    const batchCost = (total_sucesso * costPerFile).toFixed(2);
    
    // Monthly Cost (from stats)
    const monthlyCost = stats?.monthly_cost?.toFixed(2) || '0.00';
    const monthlySucesso = stats?.monthly_sucesso || 0;

    const cards = [
        {
            icon: FileText,
            label: 'Total Arquivos',
            value: total_arquivos,
            color: 'blue',
        },
        {
            icon: CheckCircle,
            label: 'Processados',
            value: total_processado,
            color: 'emerald',
        },
        {
            icon: CheckCircle,
            label: 'Sucesso',
            value: total_sucesso,
            color: 'green',
        },
        {
            icon: XCircle,
            label: 'Erros',
            value: total_erro,
            color: 'red',
        },
        {
            icon: DollarSign,
            label: 'Custo Mensal',
            value: `R$${monthlyCost}`,
            color: 'amber',
            subtitle: `${monthlySucesso} arqs/mês`,
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {cards.map((card, i) => {
                const Icon = card.icon;
                return (
                    <Card key={i} className="flex items-center gap-3 p-4">
                        <div className={`bg-${card.color}-500/10 p-2.5 rounded-full text-${card.color}-500`}>
                            <Icon size={20} />
                        </div>
                        <div>
                            <div className="text-xs text-text-secondary">{card.label}</div>
                            <div className="text-xl font-bold text-text-primary">{card.value}</div>
                            {card.subtitle && (
                                <div className="text-[10px] text-text-secondary">{card.subtitle}</div>
                            )}
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
