import { useState, useCallback } from 'react';
import protocoloApi from '../services/protocolo';
import usePolling from './usePolling';

/**
 * Hook for managing Protocolo Lote lifecycle.
 * 
 * Handles: upload → polling → status updates → reprocess → download
 */
export default function useProtocoloLote() {
    const [activeLoteId, setActiveLoteId] = useState(null);
    const [loteStatus, setLoteStatus] = useState(null);
    const [lotes, setLotes] = useState([]);
    const [stats, setStats] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    // Determine if we should poll (only when lote is pending/processing)
    const shouldPoll = activeLoteId &&
        loteStatus &&
        ['pending', 'processing'].includes(loteStatus.status);

    const fetchStats = useCallback(async () => {
        try {
            const res = await protocoloApi.getStats();
            setStats(res.data);
        } catch (e) {
            console.error('Stats error:', e);
        }
    }, []);

    // Poll the active lote status
    const fetchStatus = useCallback(async () => {
        if (!activeLoteId) return;
        try {
            const res = await protocoloApi.getLoteStatus(activeLoteId);
            const data = res.data;
            setLoteStatus(data);
            setError(null);

            // Refresh stats when processing completes
            if (['completed', 'error', 'cancelled'].includes(data.status)) {
                fetchStats();
            }
        } catch (e) {
            console.error('Polling error:', e);
        }
    }, [activeLoteId, fetchStats]);

    usePolling(fetchStatus, 3000, shouldPoll);

    // Fetch list of all lotes
    const fetchLotes = useCallback(async () => {
        try {
            const res = await protocoloApi.listLotes({ limit: 15 });
            const lotesData = res.data.data || [];
            // backend already returns sorted by created_at desc
            setLotes(lotesData);

            // Auto-load the latest session (highest ID) if none active
            if (lotesData.length > 0 && !activeLoteId) {
                const latest = lotesData[0];
                setActiveLoteId(latest.id);
                
                // Fetch status for this latest lote
                const statusRes = await protocoloApi.getLoteStatus(latest.id);
                setLoteStatus(statusRes.data);
            }

        } catch (e) {
            console.error('Error fetching lotes:', e);
        }
    }, []);

    // Upload files and create a new lote
    const uploadFiles = useCallback(async (files) => {
        setUploading(true);
        setError(null);
        try {
            const res = await protocoloApi.createLote(files);
            const newLoteId = res.data.lote_id;
            setActiveLoteId(newLoteId);

            // Immediately fetch status
            const statusRes = await protocoloApi.getLoteStatus(newLoteId);
            setLoteStatus(statusRes.data);

            // Refresh lotes list
            fetchLotes();

            return newLoteId;
        } catch (e) {
            const msg = e.response?.data?.detail || e.message;
            setError(msg);
            throw e;
        } finally {
            setUploading(false);
        }
    }, [fetchLotes]);

    // Select an existing lote to view/poll
    const selectLote = useCallback(async (loteId) => {
        setActiveLoteId(loteId);
        try {
            const res = await protocoloApi.getLoteStatus(loteId);
            setLoteStatus(res.data);
        } catch (e) {
            console.error('Error fetching lote:', e);
        }
    }, []);

    // Reprocess errors
    const reprocessErrors = useCallback(async () => {
        if (!activeLoteId) return;
        try {
            await protocoloApi.reprocessErrors(activeLoteId);
            // Immediately refresh
            const res = await protocoloApi.getLoteStatus(activeLoteId);
            setLoteStatus(res.data);
        } catch (e) {
            const msg = e.response?.data?.detail || e.message;
            setError(msg);
        }
    }, [activeLoteId]);

    // Cancel active lote
    const cancelLote = useCallback(async () => {
        if (!activeLoteId) return;
        try {
            await protocoloApi.cancelLote(activeLoteId);
            // Immediately refresh
            const res = await protocoloApi.getLoteStatus(activeLoteId);
            setLoteStatus(res.data);
            fetchLotes();
        } catch (e) {
            const msg = e.response?.data?.detail || e.message;
            setError(msg);
        }
    }, [activeLoteId, fetchLotes]);

    // Download individual file
    const downloadFile = useCallback(async (arquivoId, filename) => {
        try {
            const res = await protocoloApi.downloadFile(arquivoId);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || 'download.pdf';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Download error:', e);
        }
    }, []);

    // Download ZIP
    const downloadZip = useCallback(async (part = 1) => {
        if (!activeLoteId) return;
        try {
            const res = await protocoloApi.downloadZip(activeLoteId, part);
            const totalParts = parseInt(res.headers['x-total-parts'] || '1');
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = totalParts > 1 ? `LOTE - ${String(part).padStart(2, '0')}.zip` : 'LOTE.zip';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            return totalParts;
        } catch (e) {
            console.error('ZIP download error:', e);
        }
    }, [activeLoteId]);

    // Update filename
    const updateFileName = useCallback(async (arquivoId, novoNome) => {
        try {
            await protocoloApi.updateFileName(arquivoId, novoNome);
            // Refresh status
            if (activeLoteId) {
                const res = await protocoloApi.getLoteStatus(activeLoteId);
                setLoteStatus(res.data);
            }
        } catch (e) {
            console.error('Update error:', e);
        }
    }, [activeLoteId]);

    // Delete file
    const deleteFile = useCallback(async (arquivoId) => {
        try {
            await protocoloApi.deleteFile(arquivoId);
            // Refresh status
            if (activeLoteId) {
                const res = await protocoloApi.getLoteStatus(activeLoteId);
                setLoteStatus(res.data);
            }
        } catch (e) {
            console.error('Delete error:', e);
        }
    }, [activeLoteId]);

    // Update atendimentos
    const updateAtendimentos = useCallback(async (arquivoId, atendimentos) => {
        try {
            await protocoloApi.updateAtendimentos(arquivoId, atendimentos);
            // Refresh status
            if (activeLoteId) {
                const res = await protocoloApi.getLoteStatus(activeLoteId);
                setLoteStatus(res.data);
            }
        } catch (e) {
            console.error('Update atendimentos error:', e);
            throw e;
        }
    }, [activeLoteId]);

    // Clear active lote
    const clearLote = useCallback(() => {
        setActiveLoteId(null);
        setLoteStatus(null);
        setError(null);
    }, []);

    return {
        // State
        activeLoteId,
        loteStatus,
        lotes,
        stats,
        uploading,
        error,

        // Actions
        uploadFiles,
        selectLote,
        fetchLotes,
        fetchStats,
        reprocessErrors,
        cancelLote,
        downloadFile,
        downloadZip,
        updateFileName,
        updateAtendimentos,
        deleteFile,
        clearLote,
        setActiveLoteId,
    };
}
