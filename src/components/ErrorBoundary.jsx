import React from 'react';

/**
 * Boundary global de erro: sem ele, qualquer crash de renderização desmonta a
 * árvore React inteira e o usuário vê uma página branca sem mensagem alguma.
 * Renderiza uma mensagem com botão de recarregar em vez disso.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('Erro não tratado na interface:', error, info?.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-200 gap-4 p-8">
                <div className="text-5xl">⚠</div>
                <h1 className="text-xl font-bold">Erro inesperado na interface</h1>
                <p className="text-sm text-slate-400 max-w-lg text-center">
                    Algo quebrou ao renderizar esta tela. Recarregue a página — se o erro
                    persistir, informe a mensagem abaixo.
                </p>
                <pre className="text-xs text-red-400 bg-slate-800 rounded-lg px-4 py-3 max-w-xl overflow-auto whitespace-pre-wrap">
                    {String(this.state.error?.message || this.state.error)}
                </pre>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded hover:bg-primary/30 transition-colors"
                >
                    Recarregar página
                </button>
            </div>
        );
    }
}

export default ErrorBoundary;
