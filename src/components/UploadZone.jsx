import React, { useRef, useState, useCallback } from 'react';
import { Upload, FolderOpen, X, FileText } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';

/**
 * Drag & Drop upload zone with folder selection support.
 * 
 * Props:
 *   onFilesSelected(files: File[]) — callback when files are chosen
 *   disabled — disables interaction during upload
 *   maxFiles — maximum number of files allowed
 */
export default function UploadZone({ onFilesSelected, disabled = false, maxFiles = 100 }) {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, [disabled]);

    const processFiles = useCallback((fileList) => {
        const files = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.pdf'));
        if (files.length === 0) {
            alert('Selecione apenas arquivos PDF.');
            return;
        }
        if (files.length > maxFiles) {
            alert(`Máximo de ${maxFiles} arquivos por lote.`);
            return;
        }
        setSelectedFiles(files);
    }, [maxFiles]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (disabled) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    }, [disabled, processFiles]);

    const handleFileChange = useCallback((e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
        }
    }, [processFiles]);

    const removeFile = useCallback((index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleSubmit = useCallback(() => {
        if (selectedFiles.length === 0) return;
        onFilesSelected(selectedFiles);
    }, [selectedFiles, onFilesSelected]);

    const clearAll = useCallback(() => {
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (folderInputRef.current) folderInputRef.current.value = '';
    }, []);

    const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    return (
        <Card className="relative">
            <h3 className="text-lg font-semibold text-text-primary mb-4 border-b border-border pb-2">
                Upload de Fichas PDF
            </h3>

            {/* Drop Zone */}
            <div
                className={`
                    relative border-2 border-dashed rounded-xl p-5 text-center transition-all duration-200 cursor-pointer
                    ${dragActive
                        ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                        : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/30'
                    }
                    ${disabled ? 'opacity-50 pointer-events-none' : ''}
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !disabled && fileInputRef.current?.click()}
            >
                <Upload
                    size={32}
                    className={`mx-auto mb-2 transition-colors ${dragActive ? 'text-blue-400' : 'text-slate-500'}`}
                />
                <p className="text-text-primary font-medium mb-1">
                    Arraste PDFs aqui ou clique para selecionar
                </p>
                <p className="text-text-secondary text-sm">
                    Máximo {maxFiles} arquivos por lote • Apenas .pdf
                </p>
            </div>

            {/* Hidden file inputs */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={handleFileChange}
            />
            <input
                ref={folderInputRef}
                type="file"
                accept=".pdf"
                multiple
                // @ts-ignore
                webkitdirectory=""
                directory=""
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Action buttons */}
            <div className="flex gap-3 mt-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                    disabled={disabled}
                    className="text-slate-400 hover:text-slate-200"
                >
                    <FolderOpen size={16} className="mr-1.5" />
                    Selecionar Pasta
                </Button>

                {selectedFiles.length > 0 && (
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAll}
                            className="text-red-400 hover:text-red-300"
                        >
                            <X size={16} className="mr-1" />
                            Limpar ({selectedFiles.length})
                        </Button>
                        <div className="flex-1" />
                        <Button
                            onClick={handleSubmit}
                            disabled={disabled}
                            className="px-6"
                        >
                            {disabled ? 'Enviando...' : `Processar Lote (${selectedFiles.length})`}
                        </Button>
                    </>
                )}
            </div>

            {/* Selected files preview */}
            {selectedFiles.length > 0 && (
                <div className="mt-4 bg-slate-900/50 rounded-lg border border-border p-3 max-h-[200px] overflow-y-auto">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider">
                            {selectedFiles.length} arquivo(s) selecionado(s) — {formatSize(totalSize)}
                        </span>
                    </div>
                    <div className="space-y-1">
                        {selectedFiles.map((file, i) => (
                            <div
                                key={`${file.name}-${i}`}
                                className="flex items-center gap-2 text-sm text-text-primary py-1 px-2 rounded hover:bg-slate-800/50 group"
                            >
                                <FileText size={14} className="text-blue-400 flex-shrink-0" />
                                <span className="truncate flex-1">{file.name}</span>
                                <span className="text-xs text-text-secondary flex-shrink-0">{formatSize(file.size)}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                    className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}
