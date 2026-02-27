'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Trash2, FileDown, Printer, CreditCard, CheckCircle2, ArrowRight, Plus } from 'lucide-react';
import { getFactureById, saveFacture, deleteFacture, getEntreprise, getDossierById } from '@/lib/store';
import { generateFacturePDF } from '@/lib/pdf';
import { exportTranchesToExcel } from '@/lib/excel';
import { formatDate, formatDateTime, formatMontant, modePaiementLabel, generateId, calculerBenefice } from '@/lib/utils';
import { getClientDisplayFromFacture, formatClientLabel } from '@/lib/clients';
import { FactureStatusBadge, TrancheStatusBadge } from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FullPageSpinner } from '@/components/ui/Spinner';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { FormInput, FormSelect } from '@/components/ui/FormField';
import type { Facture, ModePaiement, Paiement, StatutTranche } from '@/lib/types';
import { MODES_PAIEMENT } from '@/lib/types';
import toast from 'react-hot-toast';

export default function FactureDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [facture, setFacture] = useState<Facture | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showPaiement, setShowPaiement] = useState(false);
  const [editCouts, setEditCouts] = useState(false);
  const [coutsForm, setCoutsForm] = useState({ prixAchat: '', dedouanement: '' });
  const [depensesLignes, setDepensesLignes] = useState<Array<{ id: string; libelle: string; montant: string }>>([]);
  const [paiementTrancheId, setPaiementTrancheId] = useState<string | null>(null);
  const [paiementForm, setPaiementForm] = useState({
    montant: '', modePaiement: 'Especes' as ModePaiement, date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const f = getFactureById(id);
    if (!f) { router.push('/factures'); return; }
    updateOverdueTranches(f);
    setFacture(f);
  }, [id, router]);

  useEffect(() => {
    if (!facture) return;
    const existingLignes = (facture.depensesLignes && facture.depensesLignes.length > 0)
      ? facture.depensesLignes
      : ((facture.depenses ?? 0) > 0
          ? [{ id: generateId(), libelle: 'Dépenses diverses', montant: facture.depenses }]
          : []);
    setDepensesLignes(
      existingLignes.map((d) => ({
        id: d.id || generateId(),
        libelle: d.libelle || '',
        montant: String(d.montant || 0),
      })),
    );
  }, [facture]);

  function updateOverdueTranches(f: Facture) {
    const today = new Date().toISOString().split('T')[0];
    let changed = false;
    for (const t of f.tranches) {
      if (t.statut === 'En_attente' && t.dateEcheance < today) { t.statut = 'En_retard'; changed = true; }
    }
    if (changed) saveFacture(f);
  }

  function recalculate(f: Facture): Facture {
    const totalPaye = f.paiements.reduce((s, p) => s + p.montant, 0);
    f.montantPaye = totalPaye;
    f.montantRestant = f.prixTotalTTC - totalPaye;
    f.statut = totalPaye >= f.prixTotalTTC ? 'Soldee' : totalPaye > 0 ? 'Partiellement_payee' : 'En_attente';
    return f;
  }

  function handleEnregistrerPaiement() {
    if (!facture) return;
    const montant = parseFloat(paiementForm.montant);
    if (isNaN(montant) || montant <= 0) { toast.error('Montant invalide'); return; }

    const paiement: Paiement = {
      id: generateId(), factureId: facture.id, trancheId: paiementTrancheId,
      montant, date: paiementForm.date, modePaiement: paiementForm.modePaiement,
      dateCreation: new Date().toISOString(),
    };

    const updated = { ...facture, paiements: [...facture.paiements, paiement] };
    if (paiementTrancheId) {
      updated.tranches = updated.tranches.map((t) =>
        t.id === paiementTrancheId
          ? { ...t, datePaiement: paiementForm.date, statut: 'Payee' as StatutTranche, modePaiement: paiementForm.modePaiement }
          : t,
      );
    }

    const final = recalculate(updated);
    saveFacture(final);
    setFacture(final);
    closePaiementModal();
    toast.success('Paiement enregistré');
  }

  function canPayTranche(t: { numeroTranche: number; statut: string }): boolean {
    if (t.statut === 'Payee') return false;
    const prev = facture!.tranches.filter((x) => x.numeroTranche < t.numeroTranche);
    return prev.every((x) => x.statut === 'Payee');
  }

  function openTranchePayment(trancheId: string, montant: number) {
    const t = facture!.tranches.find((x) => x.id === trancheId);
    if (t && !canPayTranche(t)) {
      toast.error('Les tranches précédentes doivent être payées dans l\'ordre chronologique.');
      return;
    }
    setPaiementTrancheId(trancheId);
    setPaiementForm((prev) => ({ ...prev, montant: String(montant) }));
    setShowPaiement(true);
  }

  function closePaiementModal() {
    setShowPaiement(false);
    setPaiementTrancheId(null);
    setPaiementForm({ montant: '', modePaiement: 'Especes', date: new Date().toISOString().split('T')[0] });
  }

  if (!facture) return <FullPageSpinner />;

  const clientDisplay = getClientDisplayFromFacture(facture);
  const progress = facture.prixTotalTTC > 0
    ? Math.min(100, Math.round((facture.montantPaye / facture.prixTotalTTC) * 100))
    : 0;
  const dossier = getDossierById(facture.dossierId);
  const prixAchat = facture.prixAchat ?? 0;
  const dedouanement = facture.dedouanement ?? 0;
  const autresDepenses = (facture.depensesLignes && facture.depensesLignes.length > 0)
    ? facture.depensesLignes.reduce((sum, d) => sum + (d.montant || 0), 0)
    : (facture.depenses ?? 0);
  const depensesTotales = dedouanement + autresDepenses;
  const benefice = calculerBenefice(facture.prixTotalTTC, prixAchat, depensesTotales);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={`Facture`}
        subtitle={`${facture.id} — ${formatDate(facture.dateFacture)}`}
        backHref="/factures"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" icon={<Printer className="h-4 w-4" />} onClick={() => { generateFacturePDF(facture, getEntreprise()); toast.success('PDF généré'); }}>PDF</Button>
            {facture.tranches.length > 0 && (
              <Button variant="secondary" icon={<FileDown className="h-4 w-4" />} onClick={() => { exportTranchesToExcel(facture); toast.success('Échéancier exporté'); }}>Échéancier</Button>
            )}
            <Button variant="success" icon={<CreditCard className="h-4 w-4" />} onClick={() => { setPaiementTrancheId(null); setShowPaiement(true); }}>Paiement</Button>
            <Button variant="secondary" size="icon" onClick={() => setShowDelete(true)} className="text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
          </div>
        }
      />

      {/* Financial summary */}
      <Card>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Prix de vente</p>
            <p className="text-2xl font-bold tabular-nums text-ink sm:text-3xl">{formatMontant(facture.prixTotalTTC)}</p>
          </div>
          <div className="flex gap-6 sm:gap-8">
            <div className="text-right">
              <p className="text-xs font-medium text-green-600 dark:text-green-400">Payé</p>
              <p className="text-base font-semibold tabular-nums text-green-700 sm:text-lg dark:text-green-300">{formatMontant(facture.montantPaye)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Restant</p>
              <p className="text-base font-semibold tabular-nums text-amber-700 sm:text-lg dark:text-amber-300">{formatMontant(facture.montantRestant)}</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between">
            <FactureStatusBadge statut={facture.statut} />
            <span className="text-xs font-medium tabular-nums text-ink-muted">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : progress > 0 ? 'bg-blue-500' : 'bg-transparent'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-4 border-t border-edge-soft pt-3">
          <div className="flex flex-wrap items-end gap-4">
            {editCouts ? (
              <>
                <div>
                  <label className="block text-xs text-ink-muted">Prix d&apos;achat (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={coutsForm.prixAchat}
                    onChange={(e) => setCoutsForm((p) => ({ ...p, prixAchat: e.target.value }))}
                    className="mt-1 w-28 rounded-lg px-2 py-1 text-sm ring-1 ring-edge-soft"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-muted">Dédouanement (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={coutsForm.dedouanement}
                    onChange={(e) => setCoutsForm((p) => ({ ...p, dedouanement: e.target.value }))}
                    className="mt-1 w-28 rounded-lg px-2 py-1 text-sm ring-1 ring-edge-soft"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Dépenses</p>
                  {depensesLignes.length === 0 && (
                    <p className="text-xs text-ink-dim">Aucune dépense enregistrée.</p>
                  )}
                  {depensesLignes.map((depense) => (
                    <div key={depense.id} className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_160px_auto]">
                      <FormInput
                        name={`depense_libelle_${depense.id}`}
                        label="Libellé"
                        placeholder="Frais divers..."
                        value={depense.libelle}
                        onChange={(e) =>
                          setDepensesLignes((prev) =>
                            prev.map((d) => (d.id === depense.id ? { ...d, libelle: e.target.value } : d)),
                          )
                        }
                      />
                      <FormInput
                        name={`depense_montant_${depense.id}`}
                        label="Montant (FCFA)"
                        type="number"
                        min="0"
                        step="1"
                        value={depense.montant}
                        onChange={(e) =>
                          setDepensesLignes((prev) =>
                            prev.map((d) => (d.id === depense.id ? { ...d, montant: e.target.value } : d)),
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDepensesLignes((prev) => prev.filter((d) => d.id !== depense.id))
                        }
                        className="mt-6 rounded p-2 text-ink-dim hover:bg-red-50 hover:text-red-600"
                        title="Supprimer la dépense"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs sm:text-sm">
                    <span className="text-ink-secondary">
                      Total autres dépenses:{' '}
                      {formatMontant(
                        depensesLignes.reduce(
                          (sum, d) => sum + (parseFloat(d.montant) || 0),
                          0,
                        ),
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDepensesLignes((prev) => [
                          ...prev,
                          { id: generateId(), libelle: '', montant: '' },
                        ])
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-dashed border-edge-soft px-2 py-1 text-xs text-ink-secondary hover:border-blue-300 hover:text-blue-600"
                    >
                      <Plus className="h-3.5 w-3.5" /> Ajouter
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => {
                    const pa = parseFloat(coutsForm.prixAchat) || 0;
                    const de = parseFloat(coutsForm.dedouanement) || 0;
                    const lignesNettoyees = depensesLignes
                      .map((d) => ({
                        ...d,
                        libelle: d.libelle.trim(),
                        montant: parseFloat(d.montant) || 0,
                      }))
                      .filter((d) => d.libelle || d.montant > 0);
                    const totalDepensesAutres = lignesNettoyees.reduce(
                      (sum, d) => sum + d.montant,
                      0,
                    );
                    const updated = {
                      ...facture,
                      prixAchat: pa,
                      dedouanement: de,
                      depenses: totalDepensesAutres,
                      depensesLignes: lignesNettoyees.map(({ id, libelle, montant }) => ({
                        id,
                        libelle,
                        montant,
                      })),
                    };
                    saveFacture(updated);
                    setFacture(updated);
                    setEditCouts(false);
                    setDepensesLignes(
                      lignesNettoyees.map((d) => ({
                        id: d.id,
                        libelle: d.libelle,
                        montant: String(d.montant),
                      })),
                    );
                    toast.success('Coûts mis à jour');
                  }}>Enregistrer</Button>
                  <Button variant="secondary" size="sm" onClick={() => { setEditCouts(false); setCoutsForm({ prixAchat: String(prixAchat), dedouanement: String(dedouanement) }); }}>Annuler</Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-xs text-ink-muted">Prix d&apos;achat</span>
                  <p className="text-sm font-medium tabular-nums text-ink-secondary">{formatMontant(prixAchat)}</p>
                </div>
                <div>
                  <span className="text-xs text-ink-muted">Dédouanement</span>
                  <p className="text-sm font-medium tabular-nums text-ink-secondary">{formatMontant(dedouanement)}</p>
                </div>
                <div>
                  <span className="text-xs text-ink-muted">Autres dépenses</span>
                  <p className="text-sm font-medium tabular-nums text-ink-secondary">
                    {formatMontant(autresDepenses)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-ink-muted">Bénéfice</span>
                  <p className={`text-sm font-semibold tabular-nums ${benefice >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatMontant(benefice)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setEditCouts(true); setCoutsForm({ prixAchat: String(prixAchat), dedouanement: String(dedouanement) }); }}>Modifier coûts</Button>
              </>
            )}
          </div>
          <div className="mt-2 text-xs text-ink-muted">
            Bénéfice = Prix de vente ({formatMontant(facture.prixTotalTTC)}) - Prix d&apos;achat ({formatMontant(prixAchat)}) - Dédouanement ({formatMontant(dedouanement)}){autresDepenses > 0 && <> - Autres dépenses ({formatMontant(autresDepenses)})</>} = {formatMontant(benefice)}
          </div>
          {facture.depensesLignes && facture.depensesLignes.length > 0 && (
            <div className="mt-3 rounded-lg bg-muted p-3">
              <p className="text-xs font-medium uppercase text-ink-muted">Détails des dépenses</p>
              <div className="mt-2 space-y-1">
                {facture.depensesLignes.map((d) => (
                  <p key={d.id} className="text-sm text-ink-secondary">
                    {d.libelle || 'Dépense'}: {formatMontant(d.montant || 0)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="mt-4 border-t border-edge-soft pt-3 text-xs text-ink-dim">
          M = Million, Md = Milliard (1 000 millions). Devise : FCFA.
        </p>
      </Card>

      {/* Info grid: Client + Vehicle + Dossier */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Client</h3>
          <p className="text-sm font-medium text-ink">{formatClientLabel(clientDisplay)}</p>
          {clientDisplay.telephone && <p className="mt-1 text-sm text-ink-secondary">{clientDisplay.telephone}</p>}
          {clientDisplay.email && <p className="text-sm text-ink-secondary">{clientDisplay.email}</p>}
          {clientDisplay.adresse && <p className="mt-1 text-xs text-ink-muted">{clientDisplay.adresse}</p>}
        </Card>

        <Card>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Véhicule</h3>
          <p className="text-sm font-medium text-ink">{facture.referenceVehicule}</p>
          {facture.typeVehicule && <p className="mt-1 text-sm text-ink-secondary">{facture.typeVehicule}</p>}
          {facture.vin && <p className="mt-1 text-xs font-mono text-ink-muted">VIN: {facture.vin}</p>}
          {facture.paysDestination && <p className="text-xs text-ink-muted">Dest: {facture.paysDestination}</p>}
        </Card>

        <Card>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Paiement & Dossier</h3>
          <p className="text-sm text-ink-secondary">{modePaiementLabel(facture.modePaiement)}</p>
          {dossier ? (
            <Link href={`/dossiers/${facture.dossierId}`} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
              {dossier.numeroCH} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <p className="mt-1 text-xs text-ink-dim">{facture.dossierId.slice(0, 12)}...</p>
          )}
          {(facture.dateCreation || facture.dateModification) && (
            <div className="mt-3 border-t border-edge-soft pt-3 text-xs text-ink-muted">
              {facture.dateCreation && <p>Créée le {formatDateTime(facture.dateCreation)}</p>}
              {facture.dateModification && <p>Modifiée le {formatDateTime(facture.dateModification)}</p>}
            </div>
          )}
        </Card>
      </div>

      {/* Tranches */}
      {facture.tranches.length > 0 && (
        <Card padding={false}>
          <CardHeader title={`Échéancier (${facture.tranches.length} tranche${facture.tranches.length > 1 ? 's' : ''})`} />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-edge-soft">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-muted">N°</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-ink-muted">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-muted">Échéance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-muted">Paiement</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink-muted">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-ink-muted">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge-soft">
                {facture.tranches.map((t) => (
                  <tr key={t.id} className="table-row-hover">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink">T{t.numeroTranche}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-ink-secondary">{formatMontant(t.montant)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">{formatDate(t.dateEcheance)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-muted">{t.datePaiement ? formatDate(t.datePaiement) : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3"><TrancheStatusBadge statut={t.statut} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {t.statut !== 'Payee' && (
                        <button
                          onClick={() => openTranchePayment(t.id, t.montant)}
                          disabled={!canPayTranche(t)}
                          title={!canPayTranche(t) ? 'Payez les tranches précédentes d\'abord' : undefined}
                          className="rounded-lg bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                        >
                          Payer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Payment history */}
      <Card padding={false}>
        <CardHeader title="Historique des paiements" />
        {facture.paiements.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-ink-dim">Aucun paiement enregistré</p>
        ) : (
          <div className="divide-y divide-edge-soft">
            {[...facture.paiements].reverse().map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-6 py-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium tabular-nums text-ink">{formatMontant(p.montant)}</p>
                  <p className="text-xs text-ink-muted">
                    {formatDate(p.date)} — {modePaiementLabel(p.modePaiement)}
                    {p.trancheId && <span className="ml-1 text-ink-dim">(Tranche)</span>}
                    {p.dateCreation && <span className="ml-1 text-ink-dim">· Enregistré le {formatDateTime(p.dateCreation)}</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Payment modal */}
      {showPaiement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-ink">
              {paiementTrancheId ? 'Payer une tranche' : 'Enregistrer un paiement'}
            </h3>
            <div className="mt-4 space-y-4">
              <FormInput name="paiement_montant" label="Montant (FCFA)" type="number" min="0" step="1" placeholder="0" value={paiementForm.montant} onChange={(e) => setPaiementForm((p) => ({ ...p, montant: e.target.value }))} />
              <FormInput name="paiement_date" label="Date" type="date" value={paiementForm.date} onChange={(e) => setPaiementForm((p) => ({ ...p, date: e.target.value }))} />
              <FormSelect name="paiement_mode" label="Mode de paiement" options={MODES_PAIEMENT} value={paiementForm.modePaiement} onChange={(e) => setPaiementForm((p) => ({ ...p, modePaiement: e.target.value as ModePaiement }))} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={closePaiementModal}>Annuler</Button>
              <Button variant="success" onClick={handleEnregistrerPaiement}>Enregistrer</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={showDelete} title="Supprimer la facture" message={`Supprimer la facture ${facture.id} et tous ses paiements ? Cette action est irréversible.`} confirmLabel="Supprimer" danger onConfirm={() => { deleteFacture(id); toast.success('Facture supprimée'); router.push('/factures'); }} onCancel={() => setShowDelete(false)} />
    </div>
  );
}
