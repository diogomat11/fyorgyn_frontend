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
import MainLayout from './layouts/MainLayout';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? <MainLayout>{children}</MainLayout> : <Navigate to="/login" />;
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
          <PrivateRoute>
            <Prioridades />
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
