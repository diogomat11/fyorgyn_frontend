/**
 * Recurso de Glosa API Service
 *
 * Chamadas do módulo de recurso de glosa IPASGO (importação OP10, itens,
 * catálogo de justificativas e envio OP16).
 */
import api from './api';

const recursoGlosaApi = {
    /** Lotes do IPASGO com protocolo e agregados dos itens de glosa. */
    listLotes: (params = {}) => api.get('/recurso-glosa/lotes', { params }),

    /** Grava o protocolo (capa) do lote no portal. */
    updateProtocolo: (idLote, protocolo) =>
        api.put(`/recurso-glosa/lotes/${idLote}/protocolo`, { protocolo }),

    /** Itens de glosa do lote com filtros (guia, paciente, data, status). */
    listItens: (params = {}) => api.get('/recurso-glosa/itens', { params }),

    /** Aplica uma justificativa a itens específicos ou a todos do lote. */
    aplicarJustificativa: (payload) => api.post('/recurso-glosa/itens/justificativa', payload),

    /** Catálogo de justificativas ativas do tenant. */
    listJustificativas: () => api.get('/recurso-glosa/justificativas'),

    createJustificativa: (descricao) => api.post('/recurso-glosa/justificativas', { descricao }),

    updateJustificativa: (id, payload) => api.put(`/recurso-glosa/justificativas/${id}`, payload),

    deleteJustificativa: (id) => api.delete(`/recurso-glosa/justificativas/${id}`),

    /** Dispara o job da OP16 (envio ao portal) para os itens prontos. */
    enviar: (idLote, itemIds = null) =>
        api.post(`/recurso-glosa/lotes/${idLote}/enviar`, itemIds ? { item_ids: itemIds } : {}),
};

export default recursoGlosaApi;
