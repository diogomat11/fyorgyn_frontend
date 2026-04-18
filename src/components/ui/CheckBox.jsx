import { motion } from 'motion/react';

/**
 * CheckBox – componente animado com SVG via motion/react.
 *
 * Props:
 *  checked   {boolean}  – estado atual do checkbox
 *  onClick   {Function} – callback ao clicar
 *  size      {number}   – tamanho em px (padrão: 20)
 *  color     {string}   – cor do traço quando marcado (padrão: var primária do app)
 *  duration  {number}   – duração da animação em segundos (padrão: 0.4)
 *  label     {string}   – texto opcional exibido ao lado do checkbox
 *  disabled  {boolean}  – bloqueia interação
 *  className {string}   – classes Tailwind extras no wrapper
 */
export default function CheckBox({
    checked,
    onClick,
    size = 20,
    color = '#6366f1',
    duration = 0.4,
    label,
    disabled = false,
    className = '',
}) {
    return (
        <div
            className={`inline-flex items-center gap-2 select-none ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
            onClick={disabled ? undefined : onClick}
            role="checkbox"
            aria-checked={checked}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => { if (!disabled && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); onClick(); } }}
        >
            <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
                <motion.path
                    d="M 2.45 24.95 V 33.95 C 2.45 35.9382 4.0618 37.55 6.05 37.55 H 33.95 C 35.9382 37.55 37.55 35.9382 37.55 33.95 V 6.05 C 37.55 4.0618 35.9382 2.45 33.95 2.45 H 6.05 C 4.0618 2.45 2.45 4.0618 2.45 6.05 V 22.0617 C 2.45 23.0443 2.8516 23.9841 3.5616 24.6633 L 10.0451 30.8649 C 11.5404 32.2952 13.9308 32.1735 15.2731 30.5988 L 36.2 6.05"
                    stroke={checked ? color : '#475569'}
                    strokeLinecap="round"
                    strokeWidth={3}
                    animate={{
                        strokeDasharray: checked ? 150 : 132,
                        strokeDashoffset: checked ? -134 : 0,
                    }}
                    transition={{
                        duration,
                        ease: 'easeInOut',
                    }}
                />
            </svg>
            {label && (
                <span className={`text-sm ${checked ? 'text-text-primary' : 'text-text-secondary'} transition-colors duration-200`}>
                    {label}
                </span>
            )}
        </div>
    );
}
