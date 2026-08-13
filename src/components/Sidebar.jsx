import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, FileText, Activity, LogOut, Table, BookOpen, Layers, Key, ChevronDown, ChevronRight, Folder, ShieldCheck } from 'lucide-react';

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();

    const username = localStorage.getItem('username') || 'Usuário';
    const isAdmin = localStorage.getItem('is_admin') === 'true';
    const perfil = localStorage.getItem('perfil') || 'gestor';

    // Exclusive Accordion state: only ONE section open at a time
    const [openSection, setOpenSection] = useState(() => {
        const path = location.pathname;
        if (['/carteirinhas', '/corpo-clinico'].includes(path)) return 'cadastros';
        if (['/guias', '/pei', '/terapias', '/agenda-fixa'].includes(path)) return 'autorizacoes';
        if (['/agendamentos', '/pipeline', '/faturamento/lotes', '/faturamento/agendamentos', '/faturamento/conciliacao', '/faturamento/protocolo'].includes(path)) return 'faturamento';
        if (['/gestao-integradores', '/gestao-convenios', '/clientes'].includes(path)) return 'administracao';
        return 'autorizacoes'; // Default
    });

    const toggleSection = (sectionKey) => {
        setOpenSection(prev => prev === sectionKey ? null : sectionKey);
    };

    const getLinkClass = (path, exact = false) => {
        const isMatch = exact ? location.pathname === path && !location.search : (location.pathname === path || (path.includes('?') && location.pathname + location.search === path));
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

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('user_id');
        localStorage.removeItem('perfil');
        localStorage.removeItem('is_admin');
        navigate('/login');
    };

    return (
        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 shrink-0 border-b border-slate-800/60">
                <div className="font-bold text-xl text-slate-100 tracking-tight">FyorGyn</div>
                <div className="text-[10px] text-slate-500 mt-1">Plataforma Operacional para Clínicas</div>
            </div>

            {/* User Greeting */}
            <div className="px-6 py-3 shrink-0 bg-slate-950/20">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Olá, <span className="text-cyan-400">{username}</span>
                </div>
            </div>

            {/* Scrollable Navigation Items - Accordion Exclusivo */}
            <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto scrollbar-none">
                <Link to="/" className={getTopLinkClass('/')}>
                    <FileText size={18} /> Importações
                </Link>

                {/* Section: Cadastros */}
                <div className="mt-1 mb-1">
                    <button 
                        onClick={() => toggleSection('cadastros')}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Folder size={16} className="text-slate-400" /> Cadastros
                        </div>
                        {openSection === 'cadastros' ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                    {openSection === 'cadastros' && (
                        <div className="flex flex-col ml-6 pl-3 border-l border-slate-700 space-y-1 mt-1">
                            <Link to="/carteirinhas" className={getLinkClass('/carteirinhas')}>Carteirinhas</Link>
                            <Link to="/unidades" className={getLinkClass('/unidades')}>Unidades</Link>
                            <Link to="/corpo-clinico" className={getLinkClass('/corpo-clinico')}>Corpo Clínico</Link>
                        </div>
                    )}
                </div>

                {/* Section: Autorizações */}
                <div className="mt-1 mb-1">
                    <button 
                        onClick={() => toggleSection('autorizacoes')}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Table size={16} className="text-slate-400" /> Autorizações
                        </div>
                        {openSection === 'autorizacoes' ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                    {openSection === 'autorizacoes' && (
                        <div className="flex flex-col ml-6 pl-3 border-l border-slate-700 space-y-1 mt-1">
                            <Link to="/guias?aba=autorizadas" className={getLinkClass('/guias?aba=autorizadas')}>Guias</Link>
                            <Link to="/guias?aba=solicitacoes" className={getLinkClass('/guias?aba=solicitacoes')}>Solicitações</Link>
                            <Link to="/pei" className={getLinkClass('/pei')}>Gestão PEI</Link>
                            <Link to="/terapias" className={getLinkClass('/terapias')}>Gestão Terapias</Link>
                            <Link to="/agenda-fixa" className={getLinkClass('/agenda-fixa')}>Agenda Fixa</Link>
                        </div>
                    )}
                </div>

                {/* Section: Faturamento */}
                <div className="mt-1 mb-1">
                    <button 
                        onClick={() => toggleSection('faturamento')}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Layers size={16} className="text-slate-400" /> Faturamento
                        </div>
                        {openSection === 'faturamento' ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                    {openSection === 'faturamento' && (
                        <div className="flex flex-col ml-6 pl-3 border-l border-slate-700 space-y-1 mt-1">
                            <Link to="/agendamentos" className={getLinkClass('/agendamentos')}>Agendamentos</Link>
                            <Link to="/pipeline" className={getLinkClass('/pipeline')}>Workflow Faturamento</Link>
                            <Link to="/faturamento/lotes" className={getLinkClass('/faturamento/lotes')}>Lotes - Convênios</Link>
                            <Link to="/faturamento/agendamentos" className={getLinkClass('/faturamento/agendamentos')}>Lotes Agendamentos</Link>
                            <Link to="/faturamento/conciliacao" className={getLinkClass('/faturamento/conciliacao')}>Conciliação</Link>
                            <Link to="/faturamento/protocolo" className={getLinkClass('/faturamento/protocolo')}>Protocolo SADT</Link>
                        </div>
                    )}
                </div>

                <Link to="/manual" className={getTopLinkClass('/manual')}>
                    <BookOpen size={18} /> Manual de Utilização
                </Link>
                <Link to="/logs" className={getTopLinkClass('/logs')}>
                    <Activity size={18} /> Logs
                </Link>

                {/* Credenciais para Gestores e Admins */}
                {(isAdmin || perfil === 'gestor') && (
                    <Link to="/credenciais" className={getTopLinkClass('/credenciais')}>
                        <ShieldCheck size={18} /> Credenciais Portais
                    </Link>
                )}

                {(isAdmin || perfil === 'gestor') && (
                    <Link to="/gestao-usuarios" className={getTopLinkClass('/gestao-usuarios')}>
                        <Users size={18} /> Gestão de Usuários
                    </Link>
                )}

                {/* Section: Administração (Apenas Admin) */}
                {isAdmin && (
                    <div className="mt-1 mb-1">
                        <button 
                            onClick={() => toggleSection('administracao')}
                            className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Key size={16} className="text-slate-400" /> Administração
                            </div>
                            {openSection === 'administracao' ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        </button>
                        {openSection === 'administracao' && (
                            <div className="flex flex-col ml-6 pl-3 border-l border-slate-700 space-y-1 mt-1">
                                <Link to="/gestao-integradores" className={getLinkClass('/gestao-integradores')}>Gestão Integradores</Link>
                                <Link to="/gestao-convenios" className={getLinkClass('/gestao-convenios')}>Gestão Convênios</Link>
                                <Link to="/clientes" className={getLinkClass('/clientes')}>Clientes (Admin)</Link>
                            </div>
                        )}
                    </div>
                )}
            </nav>

            {/* Footer Fixado no Rodapé */}
            <div className="p-4 border-t border-slate-800 shrink-0 bg-slate-900">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2.5 w-full text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                    <LogOut size={18} /> Sair
                </button>
                <div className="p-2 text-center text-[10px] text-slate-600 uppercase tracking-widest mt-1">
                    Developed by <span className="font-bold text-slate-500">BALDURROK</span>
                </div>
            </div>
        </div>
    );
}
