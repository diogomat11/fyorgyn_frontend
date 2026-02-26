import api from './api';

export async function listPei(params = {}) {
    // Filter out empty strings to avoid 422 errors on optional dates
    const cleanParams = {};
    Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
            cleanParams[key] = params[key];
        }
    });

    const res = await api.get('/pei/', { params: cleanParams });
    return res.data;
}

export async function getPeiStats(params = {}) {
    // Filter out empty strings to avoid 422 errors
    const cleanParams = {};
    Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
            cleanParams[key] = params[key];
        }
    });
    const res = await api.get('/pei/dashboard', { params: cleanParams });
    return res.data;
}

export async function overridePei(guiaId, peiSemanal) {
    const res = await api.post('/pei/override', {
        guia_id: guiaId,
        pei_semanal: parseFloat(peiSemanal)
    });
    return res.data;
}

export async function exportPei(params = {}) {
    try {
        // Filter out empty strings to avoid 422 errors
        const cleanParams = {};
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                cleanParams[key] = params[key];
            }
        });

        const res = await api.get('/pei/export', {
            params: cleanParams,
            responseType: 'blob'
        });

        // Create download link
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `pei_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Export failed:", error);
        alert("Falha ao exportar Excel. Verifique se o backend está rodando e se há dados.");
    }
}
