import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Activity, LogOut, Table, BookOpen, Calendar, Zap } from 'lucide-react';

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const isActive = (path) => location.pathname === path ? 'bg-primary/10 text-primary border-r-2 border-primary' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50';
    const username = localStorage.getItem('username') || 'Usuário';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        navigate('/login');
    };

    return (
        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0">
            <div className="p-6">
                <div className="font-bold text-xl text-slate-100 tracking-tight">Base Guias Unimed</div>
                <div className="text-xs text-slate-500 mt-1">By Baldurrok</div>
            </div>

            <div className="px-6 py-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                    Olá, {username}
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                <Link to="/" className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${isActive('/') || isActive('/jobs') ? 'bg-primary/10 text-primary border-r-2 border-primary' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'}`}>
                    <FileText size={18} /> Importações
                </Link>
                <div className="mt-2 mb-2">
                    <div className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
                        <Table size={16} /> Autorizações
                    </div>
                    <div className="flex flex-col ml-6 pl-3 border-l border-slate-700 space-y-1">
                        <Link to="/guias?aba=autorizadas" className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${location.pathname === '/guias' && (location.search === '?aba=autorizadas' || !location.search.includes('aba=')) ? 'bg-primary/10 text-primary border-r-2 border-primary' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'}`}>
                            Guias
                        </Link>
                        <Link to="/guias?aba=solicitacoes" className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${location.pathname === '/guias' && location.search === '?aba=solicitacoes' ? 'bg-primary/10 text-primary border-r-2 border-primary' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'}`}>
                            Solicitações
                        </Link>
                    </div>
                </div>
                <Link to="/pei" className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${isActive('/pei')}`}>
                    <Table size={18} /> Gestão PEI
                </Link>
                <Link to="/agendamentos" className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${isActive('/agendamentos')}`}>
                    <Calendar size={18} /> Agendamentos
                </Link>
                <Link to="/carteirinhas" className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${isActive('/carteirinhas')}`}>
                    <Users size={18} /> Carteirinhas
                </Link>
                <Link to="/manual" className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${isActive('/manual')}`}>
                    <BookOpen size={18} /> Manual de Utilização
                </Link>
                <Link to="/logs" className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${isActive('/logs')}`}>
                    <Activity size={18} /> Logs
                </Link>
                <Link to="/prioridades" className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${isActive('/prioridades')}`}>
                    <Zap size={18} /> Prioridades
                </Link>
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                    <LogOut size={18} /> Sair
                </button>
            </div>

            <div className="p-4 text-center">
                <div className="text-[10px] text-slate-600 uppercase tracking-widest">Developed by</div>
                <div className="text-xs font-bold text-slate-500 mt-0.5">BALDURROK</div>
            </div>
        </div>
    );
}
