import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Add token to all requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle 401 Unauthorized (Session Expired)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Clear session
            localStorage.removeItem('token');
            localStorage.removeItem('username');

            // Redirect to login if not already there
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ── Capabilities: integradores de agendamento habilitados ao usuário (gating de OPs) ──
// Fonte: GET /integradores/meus (plano docs/plano_integradores_agendamento.md, D5).
export const lerMeusIntegradoresCache = () => {
    try {
        return JSON.parse(localStorage.getItem('meus_integradores') || '[]');
    } catch {
        return [];
    }
};

export const carregarMeusIntegradores = async () => {
    try {
        const { data } = await api.get('/integradores/meus');
        const lista = data || [];
        localStorage.setItem('meus_integradores', JSON.stringify(lista));
        return lista;
    } catch (e) {
        console.error('Erro ao carregar integradores habilitados (usando cache):', e);
        return lerMeusIntegradoresCache();
    }
};

export default api;
