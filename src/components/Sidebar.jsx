import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Activity, LogOut, Table, BookOpen, Calendar, Zap, Layers, Sparkles, Key, GitBranch, ChevronDown, ChevronRight, Folder } from 'lucide-react';

const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="mt-2 mb-2">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Icon size={16} /> {title}
                </div>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {isOpen && (
                <div className="flex flex-col ml-6 pl-3 border-l border-slate-700 space-y-1 mt-1">
                    {children}
                </div>
            )}
        </div>
    );
};

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Adjusted isActive to only check exact match or query params where needed, 
    // returning the class string directly since we'll use it in the sub-items.
    const getLinkClass = (path, exact = false) => {
        const isMatch = exact ? location.pathname === path && !location.search : (location.pathname === path || (path.includes('?') && location.pathname + location.search === path));
        // Also handle special case for guias autorizadas which might have no search param
        if (path === '/guias?aba=autorizadas' && location.pathname === '/guias' && !location.search.includes('aba=')) {
            return 'px-4 py-2 text-sm font-medium rounded-lg transition-all bg-primary/10 text-primary border-r-2 border-primary';
        }

        return isMatch 
            ? 'px-4 py-2 text-sm font-medium rounded-lg transition-all bg-primary/10 text-primary border-r-2 border-primary' 
            : 'px-4 py-2 text-sm font-medium rounded-lg transition-all text-slate-400 hover:text-slate-100 hover:bg-slate-800/50';
    };

    const getTopLinkClass = (path) => {
        return (location.pathname === path || (path === '/' && location.pathname === '/jobs'))
            ? 'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all bg-primary/10 text-primary border-r-2 border-primary'
            : 'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all text-slate-400 hover:text-slate-100 hover:bg-slate-800/50';
    };

    const username = localStorage.getItem('username') || 'Usuário';
    const isAdmin = localStorage.getItem('is_admin') === 'true';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        navigate('/login');
    };

    return (
        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0">
            <div className="p-6">
                <div className="font-bold text-xl text-slate-100 tracking-tight">FyorGyn</div>
                <div className="text-[10px] text-slate-500 mt-1">Plataforma Operacional para Clínicas</div>
            </div>

            <div className="px-6 py-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                    Olá, {username}
                </div>
            </div>

            <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
                <Link to="/" className={getTopLinkClass('/')}>
                    <FileText size={18} /> Importações
                </Link>

                <CollapsibleSection title="Cadastros" icon={Folder}>
                    <Link to="/carteirinhas" className={getLinkClass('/carteirinhas')}>Carteirinhas</Link>
                    <Link to="/corpo-clinico" className={getLinkClass('/corpo-clinico')}>Corpo Clínico</Link>
                </CollapsibleSection>

                <CollapsibleSection title="Autorizações" icon={Table}>
                    <Link to="/guias?aba=autorizadas" className={getLinkClass('/guias?aba=autorizadas')}>Guias</Link>
                    <Link to="/guias?aba=solicitacoes" className={getLinkClass('/guias?aba=solicitacoes')}>Solicitações</Link>
                    <Link to="/pei" className={getLinkClass('/pei')}>Gestão PEI</Link>
                    <Link to="/terapias" className={getLinkClass('/terapias')}>Gestão Terapias</Link>
                    <Link to="/agenda-fixa" className={getLinkClass('/agenda-fixa')}>Agenda Fixa</Link>
                </CollapsibleSection>

                <CollapsibleSection title="Faturamento" icon={Layers}>
                    <Link to="/agendamentos" className={getLinkClass('/agendamentos')}>Agendamentos</Link>
                    <Link to="/pipeline" className={getLinkClass('/pipeline')}>Workflow Faturamento</Link>
                    <Link to="/faturamento/lotes" className={getLinkClass('/faturamento/lotes')}>Lotes - Convênios</Link>
                    <Link to="/faturamento/agendamentos" className={getLinkClass('/faturamento/agendamentos')}>Lotes Agendamentos</Link>
                    <Link to="/faturamento/conciliacao" className={getLinkClass('/faturamento/conciliacao')}>Conciliação</Link>
                    <Link to="/faturamento/protocolo" className={getLinkClass('/faturamento/protocolo')}>Protocolo SADT</Link>
                </CollapsibleSection>

                <Link to="/manual" className={getTopLinkClass('/manual')}>
                    <BookOpen size={18} /> Manual de Utilização
                </Link>
                <Link to="/logs" className={getTopLinkClass('/logs')}>
                    <Activity size={18} /> Logs
                </Link>

                {isAdmin && (
                    <CollapsibleSection title="Administração" icon={Key} defaultOpen={false}>
                        <Link to="/prioridades" className={getLinkClass('/prioridades')}>Prioridades</Link>
                        <Link to="/credenciais" className={getLinkClass('/credenciais')}>Credenciais</Link>
                        <Link to="/gestao-convenios" className={getLinkClass('/gestao-convenios')}>Gestão Convênios</Link>
                        <Link to="/usuarios" className={getLinkClass('/usuarios')}>Usuários</Link>
                    </CollapsibleSection>
                )}
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
