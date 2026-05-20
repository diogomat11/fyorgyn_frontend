import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Selecione...",
    labelKey = "label",
    valueKey = "value",
    disabled = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [filteredOptions, setFilteredOptions] = useState([]);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Initial filter on open or options change
    useEffect(() => {
        // Limit to 1500 items for performance
        setFilteredOptions(options.slice(0, 1500));
    }, [options]);

    // Handle search filtering
    useEffect(() => {
        if (!search) {
            setFilteredOptions(options.slice(0, 1500));
            return;
        }
        const lowerSearch = search.toLowerCase();
        const filtered = options.filter(opt =>
            String(opt[labelKey]).toLowerCase().includes(lowerSearch) ||
            String(opt[valueKey]).toLowerCase().includes(lowerSearch)
        ).slice(0, 1500);
        setFilteredOptions(filtered);
    }, [search, options, labelKey, valueKey]);

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option) => {
        onChange(option[valueKey]);
        setIsOpen(false);
        setSearch(''); // Optional: clear search on select? or keep? Keeping clear is usually better UX for single select.
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
        setSearch('');
    };

    const selectedOption = options.find(opt => opt[valueKey] == value); // Loose equality for string/int mix

    return (
        <div className="relative" ref={containerRef}>
            <div
                className={`w-full bg-slate-800 border border-slate-700 rounded-md flex items-center justify-between cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-600'}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{ minHeight: '38px', padding: '4px 8px' }}
            >
                <div className="flex-1 truncate text-white">
                    {selectedOption ? selectedOption[labelKey] : <span className="text-slate-400">{placeholder}</span>}
                </div>

                <div className="flex items-center gap-1">
                    {value && !disabled && (
                        <button
                            onClick={handleClear}
                            className="p-1 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"
                            title="Limpar"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-[9999] w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-slate-700">
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar..."
                            className="w-full bg-slate-900 text-white border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                            autoFocus
                            onClick={(e) => e.stopPropagation()} // Prevent closing
                        />
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt[valueKey]}
                                    className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between ${opt[valueKey] == value ? 'bg-blue-900/50 text-blue-200' : 'text-slate-300 hover:bg-slate-700'}`}
                                    onClick={() => handleSelect(opt)}
                                >
                                    <span>{opt[labelKey]}</span>
                                    {opt[valueKey] == value && <Check size={14} />}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-sm text-slate-500 text-center">
                                Nenhum resultado encontrado
                            </div>
                        )}
                        {options.length > filteredOptions.length && filteredOptions.length > 0 && (
                            <div className="px-3 py-1 text-xs text-slate-600 text-center border-t border-slate-800">
                                Mostrando {filteredOptions.length} de {options.length}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
