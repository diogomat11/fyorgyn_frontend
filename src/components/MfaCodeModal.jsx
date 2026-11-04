import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock } from 'lucide-react';
import Button from './ui/Button';
import { Input } from './ui/Input';

/**
 * Modal de digitação do código MFA do Bradesco/Faturi (padrão visual da casa).
 *
 * Props:
 *  - pendencia: { job_id, estado, expires_at, cycle, guia } (de useMfaWatch)
 *  - onSubmit(codigo): Promise — POST do código; erro fica inline no modal
 *  - onCancel(): Promise — cancela a digitação (job → MFA_CANCELLED)
 *  - loading: boolean — desabilita botões durante o submit
 *  - erro: string — mensagem de erro da última tentativa
 *
 * Countdown derivado de expires_at (fornecido pelo backend — fonte da verdade).
 */
export default function MfaCodeModal({ pendencia, onSubmit, onCancel, loading = false, erro = '' }) {
  const [codigo, setCodigo] = useState('');
  const [restante, setRestante] = useState(null);

  useEffect(() => {
    if (!pendencia?.expires_at) {
      setRestante(null);
      return undefined;
    }
    const alvo = new Date(pendencia.expires_at).getTime();
    const tick = () => {
      const seg = Math.max(0, Math.floor((alvo - Date.now()) / 1000));
      setRestante(seg);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [pendencia?.expires_at]);

  // Novo ciclo (código rejeitado) limpa o campo para nova digitação
  useEffect(() => {
    setCodigo('');
  }, [pendencia?.job_id, pendencia?.cycle]);

  if (!pendencia) return null;

  const aguardandoWorker = pendencia.estado === 'provided';
  const expirado = restante === 0;
  const mm = restante === null ? '--' : String(Math.floor(restante / 60)).padStart(2, '0');
  const ss = restante === null ? '--' : String(restante % 60).padStart(2, '0');
  const cicloInvalido = pendencia.cycle >= 2;

  const confirmar = async (e) => {
    e.preventDefault();
    if (!codigo || codigo.length < 4 || loading || aguardandoWorker || expirado) return;
    try {
      await onSubmit(codigo);
    } catch {
      /* erro já fica inline (prop erro) — modal permanece aberto */
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-indigo-500/10 p-2.5 rounded-full text-indigo-400">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Código de verificação — Bradesco</h3>
            <p className="text-xs text-slate-400">Portal de Faturamento (Faturi)</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-sm font-mono text-slate-300">
            <Clock size={16} className="text-amber-400" />
            <span className={expirado ? 'text-red-400' : ''}>{mm}:{ss}</span>
          </div>
        </div>

        <p className="text-sm text-slate-300 mb-1">
          O portal enviou um código de verificação para você (validade de 24h no banco —
          normalmente é pedido 1x ao dia).
        </p>
        {pendencia.guia && (
          <p className="text-xs text-slate-400 mb-3">
            Operação em andamento: guia <span className="font-mono text-slate-300">{pendencia.guia}</span>
          </p>
        )}

        {cicloInvalido && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-amber-300 mb-3">
            Código anterior rejeitado pelo portal — digite o novo código enviado.
          </div>
        )}
        {expirado && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-300 mb-3">
            Tempo esgotado. A operação será encerrada com erro — execute-a novamente quando puder digitar o código.
          </div>
        )}
        {erro && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-300 mb-3">
            {erro}
          </div>
        )}

        <form onSubmit={confirmar} className="space-y-4">
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="Código de 4 a 8 dígitos"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 8))}
            disabled={aguardandoWorker || expirado}
            className="text-center text-lg tracking-[0.5em] font-mono"
          />
          {aguardandoWorker && (
            <p className="text-xs text-center text-emerald-400">
              Código recebido — o robô está validando no portal...
            </p>
          )}
          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
              disabled={codigo.length < 4 || aguardandoWorker || expirado}
            >
              Confirmar código
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
