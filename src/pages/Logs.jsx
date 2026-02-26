import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { RefreshCcw } from 'lucide-react';
import { formatDateTime } from '../utils/formatters';
import Pagination from '../components/Pagination';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

import WorkerList from '../components/WorkerList';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalItems, setTotalItems] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      const res = await api.get('/logs/', { params: { skip, limit: pageSize } });
      if (res.data.data) {
        setLogs(res.data.data);
        setTotalItems(res.data.total);
      } else {
        setLogs(res.data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [page, pageSize]);

  const getBadgeVariant = (level) => {
    switch (level) {
      case 'INFO': return 'primary';
      case 'WARN': return 'warning';
      case 'ERROR': return 'danger';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-primary">Logs do Sistema</h1>
        <Button onClick={fetchLogs} disabled={loading} variant="secondary">
          <RefreshCcw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      <div className="flex justify-end">
        <div className="items-end">
          <div className="text-xs text-text-secondary mb-1 text-right">Workers Linkados:</div>
          <WorkerList compact={true} />
        </div>
      </div>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50 text-text-secondary text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left w-48">Data</th>
                <th className="px-6 py-3 text-left w-24">Nível</th>
                <th className="px-6 py-3 text-left w-64">Contexto</th>
                <th className="px-6 py-3 text-left">Mensagem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-text-secondary font-mono whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                  <td className="px-6 py-4 text-sm">
                    <Badge variant={getBadgeVariant(log.level)}>{log.level}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {log.paciente && <div className="font-medium text-text-primary">{log.paciente}</div>}
                    {log.carteirinha && <div className="text-xs text-text-secondary">{log.carteirinha}</div>}
                    {log.job_id && <div className="text-xs text-text-secondary">Job #{log.job_id}</div>}
                    {!log.paciente && !log.carteirinha && !log.job_id && <span className="text-text-secondary">-</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary font-mono whitespace-pre-wrap">
                    {log.message}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr><td colSpan="4" className="px-6 py-10 text-center text-text-secondary">Nenhum log registrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-border">
          <Pagination
            currentPage={page}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </Card>
    </div>
  );
}
