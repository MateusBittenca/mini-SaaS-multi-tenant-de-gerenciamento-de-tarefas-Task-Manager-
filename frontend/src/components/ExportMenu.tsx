import { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { Button } from './Button';

interface ExportMenuProps {
  onExport: (format: 'csv' | 'pdf') => Promise<void>;
  loading?: boolean;
}

export function ExportMenu({ onExport, loading }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async (format: 'csv' | 'pdf') => {
    setError('');
    setOpen(false);
    try {
      await onExport(format);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        className="shrink-0"
        onClick={() => setOpen((value) => !value)}
        loading={loading}
      >
        <Download className="w-4 h-4" />
        Exportar
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-surface border border-sand rounded-lg shadow-lg z-20 py-1">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-espresso hover:bg-cream-dark"
          >
            <FileSpreadsheet className="w-4 h-4" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-espresso hover:bg-cream-dark"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      )}

      {error && (
        <p className="absolute right-0 top-full mt-1 text-xs text-danger whitespace-nowrap">{error}</p>
      )}
    </div>
  );
}
