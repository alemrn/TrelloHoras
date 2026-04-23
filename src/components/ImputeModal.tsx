import React from 'react';
import { X } from 'lucide-react';

type Props = {
  imputeEntryTitle?: string | null;
  imputeNick: string;
  setImputeNick: (v: string) => void;
  imputeCategory: 'Desarrollo' | 'Gestion' | 'Validación' | 'Producción';
  setImputeCategory: (v: 'Desarrollo' | 'Gestion' | 'Validación' | 'Producción') => void;
  handleImputeSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  closeImputeModal: () => void;
  isSubmitting?: boolean;
  error?: string | null;
};

export default function ImputeModal({ imputeEntryTitle, imputeNick, setImputeNick, imputeCategory, setImputeCategory, handleImputeSubmit, closeImputeModal, isSubmitting = false, error = null }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-sm">
      <div className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Imputar horas</h3>
              <p className="text-sm text-[var(--text-muted)] truncate mt-1" title={imputeEntryTitle}>{imputeEntryTitle}</p>
            </div>
            <button type="button" onClick={closeImputeModal} className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-surface-muted)] rounded-lg" aria-label="Cerrar imputar">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleImputeSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Nick Trello</label>
              <input required value={imputeNick} onChange={(e) => setImputeNick(e.target.value)} placeholder="Tu nick en Trello" disabled={isSubmitting} className="w-full px-3 py-2 bg-[var(--bg-surface-soft)] border border-[var(--border-default)] rounded-md text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent outline-none" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Categoría</label>
              <div className="grid grid-cols-2 gap-2">
                <label className={`cursor-pointer rounded-md p-2 text-sm font-bold ${imputeCategory === 'Desarrollo' ? 'bg-[var(--bg-surface)] text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'}`}>
                  <input type="radio" name="category" value="Desarrollo" className="sr-only" checked={imputeCategory === 'Desarrollo'} onChange={() => setImputeCategory('Desarrollo')} disabled={isSubmitting} />
                  Desarrollo
                </label>
                <label className={`cursor-pointer rounded-md p-2 text-sm font-bold ${imputeCategory === 'Gestion' ? 'bg-[var(--bg-surface)] text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'}`}>
                  <input type="radio" name="category" value="Gestion" className="sr-only" checked={imputeCategory === 'Gestion'} onChange={() => setImputeCategory('Gestion')} disabled={isSubmitting} />
                  Gestión
                </label>
                <label className={`cursor-pointer rounded-md p-2 text-sm font-bold ${imputeCategory === 'Validación' ? 'bg-[var(--bg-surface)] text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'}`}>
                  <input type="radio" name="category" value="Validación" className="sr-only" checked={imputeCategory === 'Validación'} onChange={() => setImputeCategory('Validación')} disabled={isSubmitting} />
                  Validación
                </label>
                <label className={`cursor-pointer rounded-md p-2 text-sm font-bold ${imputeCategory === 'Producción' ? 'bg-[var(--bg-surface)] text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'}`}>
                  <input type="radio" name="category" value="Producción" className="sr-only" checked={imputeCategory === 'Producción'} onChange={() => setImputeCategory('Producción')} disabled={isSubmitting} />
                  Producción
                </label>
              </div>
            </div>

            {error ? (
              <div className="rounded-md bg-[var(--danger-soft-alt)] text-[var(--danger)] px-3 py-2 text-sm">{error}</div>
            ) : null}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-[var(--brand-primary)] text-[var(--text-inverse)] rounded-md font-bold hover:bg-[var(--brand-primary-hover)] transition-colors disabled:opacity-60">
                {isSubmitting ? 'Imputando...' : 'Imputar'}
              </button>
              <button type="button" onClick={closeImputeModal} disabled={isSubmitting} className="px-4 py-2.5 bg-[var(--bg-surface-muted)] text-[var(--text-primary)] rounded-md font-bold hover:bg-[var(--border-default)] transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
