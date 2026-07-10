/**
 * Protocolo Fichas API Service
 * 
 * All API calls for the PDF extraction module.
 * Uses the shared axios instance with auth interceptors.
 */
import api from './api';

const protocoloApi = {
    /**
     * Upload PDFs and create a new batch (lote).
     * @param {File[]} files - Array of File objects
     * @returns {Promise<{lote_id: number, total_arquivos: number, status: string}>}
     */
    createLote: (files, convenio = 'unimed_goiania') => {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        formData.append('convenio', convenio);
        return api.post('/protocolo/lotes', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    /**
     * List all batches for the current user.
     */
    listLotes: (params = {}) => api.get('/protocolo/lotes', { params }),

    /**
     * Get detailed status of a batch (includes all file details).
     * Used for polling.
     */
    getLoteStatus: (loteId) => api.get(`/protocolo/lotes/${loteId}/status`),

    /**
     * Reprocess only files that failed or need review.
     */
    reprocessErrors: (loteId) => api.post(`/protocolo/lotes/${loteId}/reprocessar`),

    /**
     * Cancel an active processing lote.
     */
    cancelLote: (loteId) => api.post(`/protocolo/lotes/${loteId}/cancelar`),

    /**
     * Download an individual processed file.
     */
    downloadFile: (arquivoId) => api.get(`/protocolo/arquivos/${arquivoId}/download`, {
        responseType: 'blob',
    }),

    /**
     * Download ZIP file (partitioned).
     * @param {number} loteId
     * @param {number} part - Part number (1-indexed)
     */
    downloadZip: (loteId, part = 1) => api.get(`/protocolo/lotes/${loteId}/download-zip`, {
        params: { part },
        responseType: 'blob',
    }),

    /**
     * Update the final filename of a file (manual override).
     */
    updateFileName: (arquivoId, nomeFinal) =>
        api.patch(`/protocolo/arquivos/${arquivoId}`, { nome_final: nomeFinal }),

    /**
     * Update the atendimentos (dates/signatures) of a file.
     */
    updateAtendimentos: (arquivoId, atendimentos) =>
        api.patch(`/protocolo/arquivos/${arquivoId}/atendimentos`, { atendimentos }),

    /**
     * Delete an individual file from the session.
     */
    deleteFile: (arquivoId) => api.delete(`/protocolo/arquivos/${arquivoId}`),

    /**
     * Get Gemini API configuration status.
     */
    getConfig: () => api.get('/protocolo/config'),

    /**
     * Get monthly statistics.
     */
    getStats: () => api.get('/protocolo/stats'),

    /**
     * Gravar os atendimentos de um arquivo específico em protocolo_itens.
     */
    gravarArquivo: (arquivoId) => api.post(`/protocolo/arquivos/${arquivoId}/gravar`),

    /**
     * Gravar os atendimentos de todos os arquivos com sucesso de um lote em protocolo_itens.
     */
    gravarLote: (loteId, ignoreUnsigned = false) => 
        api.post(`/protocolo/lotes/${loteId}/gravar-todos`, null, { params: { ignore_unsigned: ignoreUnsigned } }),

    /**
     * Listar e filtrar itens de protocolo persistidos.
     */
    listItens: (params = {}) => api.get('/protocolo/itens', { params }),

    /**
     * Obter todos os itens para exportação.
     */
    exportItens: (params = {}) => api.get('/protocolo/itens/exportar', { params }),

    /**
     * Acionar conciliação dos itens de protocolo.
     */
    conciliarItens: (idConvenio, faturamentoLoteId = null) => 
        api.post('/protocolo/itens/conciliar', null, { params: { id_convenio: idConvenio, faturamento_lote_id: faturamentoLoteId } }),
};

export default protocoloApi;
