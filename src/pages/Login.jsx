import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Lock, Cpu, Key } from 'lucide-react';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Card from '../components/ui/Card';

const Login = () => {
    const [login, setLogin] = useState('');
    const [senha, setSenha] = useState('');
    const [workerKey, setWorkerKey] = useState('');
    const [accessKey, setAccessKey] = useState('');
    const [mode, setMode] = useState('user'); // 'user' or 'key'
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const payload = mode === 'user' 
                ? { login: login.trim(), senha, worker_key: workerKey.trim() || undefined }
                : { access_key: accessKey.trim() };

            const response = await api.post('/auth/login', payload);
            const { token, username, is_admin, user_id, perfil, worker_key, prefixo_identificacao } = response.data;

            // Save to localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('username', username);
            localStorage.setItem('user_id', user_id);
            localStorage.setItem('perfil', perfil || 'gestor');
            localStorage.setItem('is_admin', is_admin ? 'true' : 'false');
            if (worker_key) localStorage.setItem('worker_key', worker_key);
            if (prefixo_identificacao) localStorage.setItem('prefixo_identificacao', prefixo_identificacao);

            // Capabilities do tenant (integradores de agendamento habilitados) — usadas
            // pelo gating de botões de OPs; busca fire-and-forget com cache local.
            api.get('/integradores/meus')
                .then(res => localStorage.setItem('meus_integradores', JSON.stringify(res.data || [])))
                .catch(() => localStorage.setItem('meus_integradores', '[]'));

            // Redirect
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Erro ao efetuar login.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-cyan-500/10 blur-[150px] rounded-full"></div>
                <div className="absolute bottom-0 right-0 w-2/3 h-2/3 bg-purple-500/10 blur-[150px] rounded-full"></div>
            </div>

            <Card className="z-10 w-full max-w-md bg-slate-900/80 backdrop-blur-md shadow-2xl p-8 border-slate-700/50">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
                        FyorGyn
                    </h1>
                    <p className="text-slate-400 text-sm">Plataforma Operacional para Clínicas</p>
                </div>

                {/* Mode Selector */}
                <div className="flex border-b border-slate-800 mb-6 text-sm font-medium">
                    <button
                        type="button"
                        onClick={() => setMode('user')}
                        className={`flex-1 pb-3 text-center transition-colors border-b-2 ${
                            mode === 'user'
                                ? 'border-cyan-500 text-cyan-400 font-semibold'
                                : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        Usuário e Senha
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('key')}
                        className={`flex-1 pb-3 text-center transition-colors border-b-2 ${
                            mode === 'key'
                                ? 'border-cyan-500 text-cyan-400 font-semibold'
                                : 'border-transparent text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        Chave API Legada
                    </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    {mode === 'user' ? (
                        <>
                            <div>
                                <label className="block text-slate-300 mb-1.5 text-xs font-medium uppercase tracking-wider">
                                    Usuário / Login
                                </label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4 z-10" />
                                    <Input
                                        type="text"
                                        value={login}
                                        onChange={(e) => setLogin(e.target.value)}
                                        className="pl-10 py-2.5 text-sm"
                                        placeholder="Digite seu usuário ou login"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-300 mb-1.5 text-xs font-medium uppercase tracking-wider">
                                    Senha
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4 z-10" />
                                    <Input
                                        type="password"
                                        value={senha}
                                        onChange={(e) => setSenha(e.target.value)}
                                        className="pl-10 py-2.5 text-sm"
                                        placeholder="Digite sua senha"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-300 mb-1.5 text-xs font-medium uppercase tracking-wider flex justify-between">
                                    <span>Código do Worker</span>
                                    <span className="text-[10px] text-slate-500 font-normal">(Obrigatório p/ Faturamento)</span>
                                </label>
                                <div className="relative">
                                    <Cpu className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4 z-10" />
                                    <Input
                                        type="text"
                                        value={workerKey}
                                        onChange={(e) => setWorkerKey(e.target.value)}
                                        className="pl-10 py-2.5 text-sm font-mono"
                                        placeholder="Ex: WORKER_R1_LOCAL"
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="block text-slate-300 mb-1.5 text-xs font-medium uppercase tracking-wider">
                                Chave de Acesso API
                            </label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4 z-10" />
                                <Input
                                    type="text"
                                    value={accessKey}
                                    onChange={(e) => setAccessKey(e.target.value)}
                                    className="pl-10 py-2.5 text-sm"
                                    placeholder="Insira sua chave de acesso"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center leading-relaxed">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        isLoading={loading}
                        className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 py-3 shadow-cyan-500/20 text-sm font-semibold mt-4"
                    >
                        Acessar Sistema
                    </Button>
                </form>
            </Card>

            {/* Footer Logo */}
            <div className="absolute bottom-8 text-center z-10 flex flex-col items-center">
                <div className="text-slate-500 text-xs mb-1">Developed by</div>
                <h2 className="text-xl font-bold text-slate-300 tracking-wider flex items-center gap-2">
                    BALDURROK
                </h2>
            </div>
        </div>
    );
};

export default Login;
