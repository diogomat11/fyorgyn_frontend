import React, { useState } from 'react';
import useMfaWatch from '../hooks/useMfaWatch';
import MfaCodeModal from './MfaCodeModal';

/**
 * Watcher global de MFA (Bradesco/Faturi) — montado no MainLayout.
 *
 * Enquanto houver job do tenant aguardando código (login do Faturi), abre o
 * MfaCodeModal em qualquer tela — cobre lotes da Importações e jobs
 * individuais, mesmo que o usuário tenha navegado para outra página.
 */
export default function MfaWatcher() {
  const { pendencia, submit, cancel } = useMfaWatch();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  if (!pendencia) return null;

  // Backend fora do ar não gera response — mensagem genérica de e.message
  // ("timeout of 30000ms exceeded") não diz nada ao usuário.
  const descreverErro = (e, fallback) => {
    if (e?.code === 'ECONNABORTED') return 'Servidor não respondeu (tempo esgotado) — tente novamente';
    if (!e?.response) return 'Sem conexão com o servidor — verifique o backend e tente novamente';
    return e.response?.data?.detail || e.message || fallback;
  };

  const handleSubmit = async (codigo) => {
    setLoading(true);
    setErro('');
    try {
      await submit(codigo);
    } catch (e) {
      setErro(descreverErro(e, 'Falha ao enviar o código'));
      throw e; // modal mantém aberto com erro inline
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      await cancel();
    } catch (e) {
      setErro(descreverErro(e, 'Falha ao cancelar — tente novamente'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MfaCodeModal
      pendencia={pendencia}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      loading={loading}
      erro={erro}
    />
  );
}
