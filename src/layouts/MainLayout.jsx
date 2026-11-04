import React from 'react';
import Sidebar from '../components/Sidebar';
import MfaWatcher from '../components/MfaWatcher';

export default function MainLayout({ children }) {
    return (
        <div className="min-h-screen bg-background text-text-primary flex">
            <Sidebar />
            <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
                <div className="w-full">
                    {children}
                </div>
            </main>
            {/* Modal global de código MFA (Bradesco/Faturi) — abre em qualquer tela */}
            <MfaWatcher />
        </div>
    );
}
