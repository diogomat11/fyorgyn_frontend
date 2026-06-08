import React, { useState } from 'react';
import { BookOpen, Monitor, FileText, Database, Activity, Users, ChevronRight } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

const manualSections = [
    {
        id: 'intro',
        title: 'Introdução',
        icon: BookOpen,
        content: (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-text-primary">Manual do Usuário</h2>
                <p className="text-text-secondary">
                    Bem-vindo ao manual de utilização do sistema <strong>FyorGyn - Plataforma Operacional para Clínicas</strong>.
                    Este guia foi criado para orientar você em todas as operações disponíveis na plataforma, com passo a passo claro e detalhado.
                </p>
                <div className="bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded text-blue-400">
                    <strong>Nota:</strong> Utilize o menu lateral para navegar entre os tópicos deste manual.
                </div>
            </div>
        )
    },
    {
        id: 'access',
        title: 'Acesso ao Sistema',
        icon: Users,
        content: (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-text-primary">Acesso ao Sistema</h2>
                <p className="text-text-secondary">Para acessar o sistema, você deve possuir um usuário e senha cadastrados.</p>
                <ol className="list-decimal list-inside space-y-2 text-text-secondary ml-4">
                    <li>Acesse a URL do sistema no seu navegador.</li>
                    <li>Na tela de login, insira sua <strong>Chave de Acesso</strong> (fornecida pelo administrador).</li>
                    <li>Clique no botão <strong>Acessar Sistema</strong>.</li>
                </ol>
                <div className="bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded text-amber-500">
                    Se a sua sessão expirar por inatividade, você será redirecionado automaticamente para a tela de login.
                </div>
            </div>
        )
    },
    {
        id: 'jobs',
        title: 'Visão Geral / Importações',
        icon: FileText,
        content: (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-text-primary">Visão Geral e Importações</h2>
                <p className="text-text-secondary">
                    Ao entrar no sistema, você verá a barra de status no topo, contendo:
                </p>
                <div className="flex gap-2 flex-wrap mb-4">
                    <Badge variant="info">Total Carteirinhas</Badge>
                    <Badge variant="success">Total Guias</Badge>
                    <Badge variant="warning">Jobs</Badge>
                </div>

                <p className="text-text-secondary">Este módulo também é o coração da automação, onde você cria as requisições.</p>

                <h3 className="text-xl font-semibold text-text-primary">Criar Nova Solicitação</h3>
                <div className="space-y-2 text-text-secondary">
                    <p>No painel superior "Nova Solicitação", você pode iniciar um processo de importação:</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>Única</strong>: Atualiza um único paciente.</li>
                        <li><strong>Múltipla</strong>: Permite selecionar vários pacientes de uma vez.</li>
                        <li><strong>Todos</strong>: Atualiza toda a base de carteirinhas (Use com cautela!).</li>
                        <li><strong>Paciente Temporário</strong>: Para consultar um paciente que ainda não está na base.</li>
                    </ul>
                </div>

                <h3 className="text-xl font-semibold text-text-primary">Monitoramento</h3>
                <p className="text-text-secondary">A lista inferior mostra todas as solicitações realizadas. Status possíveis:</p>
                <div className="flex gap-2 flex-wrap">
                    <Badge variant="warning">Pendente</Badge>
                    <Badge variant="info">Processando</Badge>
                    <Badge variant="success">Sucesso</Badge>
                    <Badge variant="error">Erro</Badge>
                </div>
            </div>
        )
    },
    {
        id: 'guides',
        title: 'Base Guias',
        icon: Database,
        content: (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-text-primary">Módulo: Base Guias</h2>
                <p className="text-text-secondary">Aqui você consulta todo o histórico de guias importadas.</p>
                <ul className="list-disc list-inside space-y-2 text-text-secondary ml-4">
                    <li><strong>Filtros</strong>: Pesquise por Paciente, Carteirinha ou Data de Importação.</li>
                    <li><strong>Exportação</strong>: Clique no botão <span className="text-primary font-bold">Exportar</span> para baixar um relatório em Excel (.xlsx).</li>
                    <li><strong>Ordenação</strong>: Clique nos cabeçalhos da tabela para ordenar os resultados.</li>
                </ul>
            </div>
        )
    },
    {
        id: 'pei',
        title: 'Gestão PEI',
        icon: Activity,
        content: (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-text-primary">Módulo: Gestão PEI</h2>
                <p className="text-text-secondary">Controle e validação dos Planos de Ensino Individualizado (PEI).</p>

                <h3 className="text-lg font-semibold text-text-primary">Operações</h3>
                <ol className="list-decimal list-inside space-y-2 text-text-secondary ml-4">
                    <li>
                        <strong>Validar/Editar PEI</strong>:
                        Guias com status <Badge variant="warning">Pendente</Badge> possuem um botão de edição.
                        Clique no lápis, digite o novo valor e salve. O status mudará para <Badge variant="success">Validado</Badge>.
                    </li>
                    <li>
                        <strong>Exportação</strong>: Gere planilhas Excel com os dados de validade e status.
                    </li>
                </ol>
            </div>
        )
    },
    {
        id: 'users',
        title: 'Carteirinhas',
        icon: Users,
        content: (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-text-primary">Módulo: Carteirinhas</h2>
                <p className="text-text-secondary">Gerenciamento completo da base de dados de pacientes.</p>

                <h3 className="text-lg font-semibold text-text-primary">Cadastro Manual</h3>
                <p className="text-text-secondary">Para adicionar um único paciente:</p>
                <ol className="list-decimal list-inside space-y-1 text-text-secondary ml-4">
                    <li>Clique no botão <strong>+ Nova Carteirinha</strong>.</li>
                    <li>Preencha o formulário (Carteirinha, Nome, IDs).</li>
                    <li>Clique em <strong>Salvar</strong>.</li>
                </ol>

                <h3 className="text-lg font-semibold text-text-primary">Edição e Exclusão</h3>
                <p className="text-text-secondary">Na tabela de listagem:</p>
                <ul className="list-disc list-inside space-y-1 text-text-secondary ml-4">
                    <li>Use o ícone <strong>Lápis</strong> para editar dados cadastrais.</li>
                    <li>Use o ícone <strong>Lixeira</strong> para remover um paciente.</li>
                </ul>

                <h3 className="text-lg font-semibold text-text-primary">Importação em Lote</h3>
                <ol className="list-decimal list-inside space-y-1 text-text-secondary ml-4">
                    <li>Clique no botão <strong>Upload Carteirinhas</strong>.</li>
                    <li>Selecione o arquivo Excel/CSV.</li>
                    <li>Clique em <strong>Importar</strong>.</li>
                </ol>
            </div>
        )
    },
    {
        id: 'logs',
        title: 'Logs',
        icon: Activity,
        content: (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-text-primary">Módulo: Logs</h2>
                <p className="text-text-secondary">Área técnica para verificação de saúde do sistema. Exibe mensagens de erro, avisos e informações de processamento dos robôs.</p>
                <p className="text-text-secondary">Use o botão <strong>Atualizar</strong> para carregar os eventos mais recentes.</p>
            </div>
        )
    }
];

export default function Manual() {
    const [activeSection, setActiveSection] = useState('intro');

    const activeContent = manualSections.find(s => s.id === activeSection);

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6">

            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 flex-shrink-0">
                <Card className="h-full overflow-y-auto">
                    <h3 className="text-lg font-bold text-text-primary mb-4 px-2">Conteúdo</h3>
                    <nav className="space-y-1">
                        {manualSections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeSection === section.id
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-text-secondary hover:bg-slate-800 hover:text-text-primary'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <section.icon size={18} />
                                    <span>{section.title}</span>
                                </div>
                                {activeSection === section.id && <ChevronRight size={16} />}
                            </button>
                        ))}
                    </nav>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 h-full overflow-y-auto">
                <Card className="h-full">
                    <div className="prose prose-invert max-w-none">
                        {activeContent?.content}
                    </div>
                </Card>
            </div>
        </div>
    );
}
