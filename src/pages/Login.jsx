import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Key } from 'lucide-react';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Card from '../components/ui/Card';

const Login = () => {
    const [accessKey, setAccessKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', { access_key: accessKey.trim() });
            const { token, username, is_admin, user_id } = response.data;

            // Save to localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('username', username);
            localStorage.setItem('user_id', user_id);
            localStorage.setItem('is_admin', is_admin ? 'true' : 'false');

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
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
                        FyorGyn
                    </h1>
                    <p className="text-slate-400 text-sm">Plataforma Operacional para Clínicas</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-slate-300 mb-2 text-sm font-medium">Chave de Acesso</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-5 w-5 z-10" />
                            <Input
                                type="text"
                                value={accessKey}
                                onChange={(e) => setAccessKey(e.target.value)}
                                className="pl-10 py-3"
                                placeholder="Insira sua chave de acesso"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        isLoading={loading}
                        className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 py-3 shadow-cyan-500/20"
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
