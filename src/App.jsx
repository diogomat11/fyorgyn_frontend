import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import React from 'react';
import Importacoes from './pages/Importacoes';
import Carteirinhas from './pages/Carteirinhas';
import Logs from './pages/Logs';
import Login from './pages/Login';
import BaseGuias from './pages/BaseGuias';
import GestaoPei from './pages/GestaoPei';
import Agendamentos from './pages/Agendamentos';
import Manual from './pages/Manual';
import Prioridades from './pages/Prioridades';
import GestaoLotes from './pages/GestaoLotes';
import LotesAgendamentos from './pages/LotesAgendamentos';
import Conciliacao from './pages/Conciliacao';
import ProtocoloFichas from './pages/ProtocoloFichas';
import GestaoTerapias from './pages/GestaoTerapias';
import MainLayout from './layouts/MainLayout';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? <MainLayout>{children}</MainLayout> : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('is_admin') === 'true';
  if (!token) return <Navigate to="/login" />;
  return isAdmin ? <MainLayout>{children}</MainLayout> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <PrivateRoute>
            <Importacoes />
          </PrivateRoute>
        } />

        <Route path="/guias" element={
          <PrivateRoute>
            <BaseGuias />
          </PrivateRoute>
        } />

        <Route path="/jobs" element={
          <PrivateRoute>
            <Importacoes />
          </PrivateRoute>
        } />

        <Route path="/carteirinhas" element={
          <PrivateRoute>
            <Carteirinhas />
          </PrivateRoute>
        } />

        <Route path="/pei" element={
          <PrivateRoute>
            <GestaoPei />
          </PrivateRoute>
        } />

        <Route path="/agendamentos" element={
          <PrivateRoute>
            <Agendamentos />
          </PrivateRoute>
        } />

        <Route path="/manual" element={
          <PrivateRoute>
            <Manual />
          </PrivateRoute>
        } />

        <Route path="/logs" element={
          <PrivateRoute>
            <Logs />
          </PrivateRoute>
        } />

        <Route path="/prioridades" element={
          <AdminRoute>
            <Prioridades />
          </AdminRoute>
        } />

        <Route path="/terapias" element={
          <PrivateRoute>
            <GestaoTerapias />
          </PrivateRoute>
        } />

        {/* Faturamento - Sub-rotas */}
        <Route path="/faturamento/lotes" element={
          <PrivateRoute>
            <GestaoLotes />
          </PrivateRoute>
        } />

        <Route path="/faturamento/agendamentos" element={
          <PrivateRoute>
            <LotesAgendamentos />
          </PrivateRoute>
        } />

        <Route path="/faturamento/conciliacao" element={
          <PrivateRoute>
            <Conciliacao />
          </PrivateRoute>
        } />

        <Route path="/faturamento/protocolo" element={
          <PrivateRoute>
            <ProtocoloFichas />
          </PrivateRoute>
        } />

        {/* Redirect antigo /lotes para novo path */}
        <Route path="/lotes" element={<Navigate to="/faturamento/lotes" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
