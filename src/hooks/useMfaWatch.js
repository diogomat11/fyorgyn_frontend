import { useState, useCallback } from 'react';
import api from '../services/api';
import usePolling from './usePolling';

/**
 * Monitora pendências de código MFA (Bradesco/Faturi) do tenant logado.
 *
 * Polling de 3s em GET /jobs/mfa/pending. Expõe a pendência ativa (a primeira
 * em estado "required" — aguardando digitação), submit(codigo) e cancel().
 * O estado "provided" mantém a pendência viva enquanto o robô consome o código.
 *
 * Padrão da casa: polling REST (sem WS/SSE) — mesmo modelo do useProtocoloLote.
 */
export default function useMfaWatch(enabled = true) {
  const [pendencia, setPendencia] = useState(null); // { job_id, estado, expires_at, cycle, guia, rotina }
  const [erro, setErro] = useState('');

  const verificar = useCallback(async () => {
    try {
      const res = await api.get('/jobs/mfa/pending');
      const lista = res.data?.pendentes || [];
      setPendencia(lista.find((p) => p.estado === 'required') || lista[0] || null);
      setErro('');
    } catch {
      /* silencioso — o próximo ciclo tenta de novo */
    }
  }, []);

  usePolling(verificar, 3000, enabled);

  const submit = useCallback(
    async (codigo) => {
      if (!pendencia) return;
      const jobId = pendencia.job_id;
      // Re-verifica imediatamente após o submit (não espera o próximo ciclo)
      await api.post(`/jobs/${jobId}/mfa`, { codigo });
      await verificar();
    },
    [pendencia, verificar]
  );

  const cancel = useCallback(async () => {
    if (!pendencia) return;
    try {
      await api.post(`/jobs/${pendencia.job_id}/mfa/cancel`);
    } finally {
      await verificar();
    }
  }, [pendencia, verificar]);

  return { pendencia, submit, cancel, erro, setErro };
}
