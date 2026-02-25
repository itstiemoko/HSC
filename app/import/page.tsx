'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { parseExcelFile, generateTemplate } from '@/lib/excel';
import { importDossiers, getDossiers } from '@/lib/store';
import { DossierStatusBadge } from '@/components/StatusBadge';
import type { Dossier } from '@/lib/types';
import { getClientDisplayFromDossier, formatClientLabel } from '@/lib/clients';
import toast from 'react-hot-toast';

export default function ImportPage() {
  const [preview, setPreview] = useState<Dossier[] | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<{ added: number; total: number } | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);

  const handleFile = useCallback((file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    const validExt = ['.xlsx', '.xls', '.csv'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExt.includes(ext)) {
      toast.error('Format non supporté. Utilisez .xlsx, .xls ou .csv');
      return;
    }

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const dossiers = parseExcelFile(data);
        if (dossiers.length === 0) {
          toast.error('Aucune donnée trouvée dans le fichier');
          return;
        }
        setPreview(dossiers);
        toast.success(`${dossiers.length} dossier(s) détecté(s)`);
      } catch {
        toast.error('Erreur lors de la lecture du fichier');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  }

  function handleImport() {
    if (!preview) return;
    const added = importDossiers(preview, replaceMode);
    const total = getDossiers().length;
    setImportResult({ added: replaceMode ? preview.length : added, total });
    setPreview(null);
    toast.success(`${replaceMode ? preview.length : added} dossier(s) importé(s)`);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Import Excel — Dossiers</h1>
        <p className="mt-1 text-sm text-ink-muted">Importez des dossiers depuis un fichier Excel ou CSV</p>
      </div>

      {/* Template download */}
      <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-900">Fichier modèle dossiers</p>
            <p className="text-xs text-blue-700">Téléchargez le template pour formater vos dossiers</p>
          </div>
        </div>
        <button
          onClick={() => { generateTemplate(); toast.success('Template téléchargé'); }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Download className="h-4 w-4" /> Télécharger
        </button>
      </div>

      {/* Drop zone */}
      {!preview && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`
            flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors
            ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-edge-soft bg-muted'}
          `}
        >
          <Upload className={`mb-4 h-10 w-10 ${dragActive ? 'text-blue-500' : 'text-ink-dim'}`} />
          <p className="text-center text-sm font-medium text-ink-secondary">
            Glissez-déposez votre fichier ici
          </p>
          <p className="mt-1 text-center text-xs text-ink-muted">ou</p>
          <label className="mt-3 cursor-pointer rounded-lg bg-card px-4 py-2 text-sm font-medium text-ink-secondary shadow-sm ring-1 ring-edge-soft hover:bg-muted">
            Parcourir les fichiers
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleInputChange}
              className="hidden"
            />
          </label>
          <p className="mt-3 text-xs text-ink-dim">Formats acceptés : .xlsx, .xls, .csv</p>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-card p-4 shadow-sm ring-1 ring-edge-soft">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-ink">{fileName}</p>
                <p className="text-xs text-ink-muted">{preview.length} dossier(s) détecté(s)</p>
              </div>
            </div>
            <button onClick={() => setPreview(null)} className="rounded p-1 text-ink-dim hover:text-ink-secondary">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Options */}
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={replaceMode}
                onChange={(e) => setReplaceMode(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-edge text-amber-600"
              />
              <div>
                <p className="text-sm font-medium text-amber-900">Remplacer toutes les données existantes</p>
                <p className="text-xs text-amber-700">
                  Si décoché, seuls les dossiers avec un numéro CH non existant seront ajoutés
                </p>
              </div>
            </label>
          </div>

          {/* Table preview */}
          <div className="overflow-x-auto rounded-xl bg-card shadow-sm ring-1 ring-edge-soft">
            <table className="min-w-full divide-y divide-edge-soft">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-muted">N° CH</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-muted">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-muted">Véhicule</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-muted">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge-soft">
                {preview.slice(0, 20).map((d, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-sm font-medium text-ink">{d.numeroCH || '-'}</td>
                    <td className="px-4 py-2 text-sm text-ink-secondary">{formatClientLabel(getClientDisplayFromDossier(d))}</td>
                    <td className="px-4 py-2 text-sm text-ink-muted">{d.referenceVehicule}</td>
                    <td className="px-4 py-2"><DossierStatusBadge statut={d.statut} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 20 && (
              <p className="border-t border-edge-soft px-4 py-3 text-center text-xs text-ink-muted">
                ... et {preview.length - 20} autre(s) dossier(s)
              </p>
            )}
          </div>

          {/* Import button */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setPreview(null)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-ink-secondary ring-1 ring-edge hover:bg-muted"
            >
              Annuler
            </button>
            <button
              onClick={handleImport}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              <Upload className="h-4 w-4" /> Importer {preview.length} dossier(s)
            </button>
          </div>
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-900">Import réussi</p>
            <p className="text-xs text-green-700">
              {importResult.added} dossier(s) importé(s). Total : {importResult.total} dossier(s) en base.
            </p>
            <Link href="/dossiers" className="mt-2 inline-block text-sm font-medium text-green-700 underline hover:text-green-900">
              Voir les dossiers
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
