import React from 'react';

// Repassa props padrão de div (onClick, style, title...): sem o spread,
// handlers passados pelas páginas eram silenciosamente ignorados — os cards
// do dashboard (BaseGuias/GestaoPei) não respondiam ao clique.
export default function Card({ children, className = '', noPadding = false, ...divProps }) {
    return (
        <div className={`
      bg-surface/50 backdrop-blur-sm border border-border rounded-xl shadow-sm
      ${noPadding ? '' : 'p-6'}
      ${className}
    `} {...divProps}>
            {children}
        </div>
    );
}
