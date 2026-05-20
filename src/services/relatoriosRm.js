/**
 * Gestão Terapias (Relatório Médico) API Service
 * 
 * All API calls for the medical report therapy extraction module.
 * Uses the shared axios instance with auth interceptors.
 */
import api from './api';

const relatoriosRmApi = {
    /**
     * Extract therapies from a medical report URL via Gemini AI.
     * @param {Object} payload - { id_paciente, url_arquivo, nome_paciente?, id_relatorio? }
     * @returns {Promise<Object>} Extraction result
     */
    extrair: (payload) => api.post('/relatorios/extrair', payload),

    /**
     * List all therapy extractions for the current user.
     * @param {Object} params - { id_paciente?, area?, limit?, skip? }
     */
    listar: (params = {}) => api.get('/relatorios/', { params }),

    /**
     * Get details of a single extraction.
     * @param {number} id
     */
    getById: (id) => api.get(`/relatorios/${id}`),

    /**
     * Update extraction values (manual user adjustment).
     * @param {number} id
     * @param {Object} updates - Partial fields to update
     */
    atualizar: (id, updates) => api.put(`/relatorios/${id}`, updates),

    /**
     * Delete a therapy extraction record.
     * @param {number} id
     */
    deletar: (id) => api.delete(`/relatorios/${id}`),
};

export default relatoriosRmApi;
