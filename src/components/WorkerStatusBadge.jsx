import React from 'react';
import Badge from './ui/Badge';
import { Activity, Power, AlertTriangle, Cpu, RefreshCw } from 'lucide-react';

const WorkerStatusBadge = ({ status, lastHeartbeat }) => {
    const getStatusConfig = () => {
        // Check if offline based on time (if not handled by parent)
        const now = new Date();
        const lastStr = lastHeartbeat.endsWith('Z') ? lastHeartbeat : `${lastHeartbeat}Z`;
        const last = new Date(lastStr);
        const diff = (now - last) / 1000; // seconds

        // If no heartbeat for > 60s, assume offline regardless of db status
        if (diff > 60 || diff < 0) {
            return { variant: 'error', icon: Power, label: 'Offline', text: 'text-error' };
        }

        switch (status) {
            case 'restarting':
                return { variant: 'warning', icon: RefreshCw, label: 'Reiniciando...', text: 'text-amber-500' };
            case 'idle':
                return { variant: 'success', icon: Activity, label: 'Online/Ocioso', text: 'text-success' };
            case 'processing':
            case 'busy':
            case 'working':
                return { variant: 'info', icon: Cpu, label: 'Em uso', text: 'text-info' };
            case 'error':
                return { variant: 'danger', icon: AlertTriangle, label: 'Erro', text: 'text-error' };
            case 'offline':
                return { variant: 'danger', icon: Power, label: 'Offline', text: 'text-error' };
            default:
                // Default to offline if unknown status
                return { variant: 'default', icon: Power, label: status || 'Desconhecido', text: 'text-text-secondary' };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    return (
        <div className={`flex items-center gap-1.5 ${config.text}`}>
            <Icon size={14} />
            <span className="text-xs font-medium">{config.label}</span>
        </div>
    );
};

export default WorkerStatusBadge;
