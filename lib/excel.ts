import * as XLSX from 'xlsx';
import type { Dossier, Facture, Tranche, Location, Client } from './types';
import { generateId, statutDossierLabel, statutFactureLabel, statutTrancheLabel, statutLocationLabel, modePaiementLabel, formatDate, calculerBenefice } from './utils';
import { getClientDisplayFromDossier, getClientDisplayFromLocation, getClientDisplayFromFacture, formatClientLabel } from './clients';

// ── Import Dossiers from Excel ──────────────────────────────

interface RawRow {
  [key: string]: string | number | undefined;
}

function findColumn(row: RawRow, candidates: string[]): string | undefined {
  for (const key of Object.keys(row)) {
    const normalized = key.toLowerCase().replace(/[^a-zàâäéèêëïîôùûüÿç0-9]/g, '');
    for (const c of candidates) {
      if (normalized.includes(c)) return key;
    }
  }
  return undefined;
}

export function parseExcelFile(data: ArrayBuffer): Dossier[] {
  const wb = XLSX.read(data, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: RawRow[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length === 0) return [];

  const first = rows[0];
  const colCH = findColumn(first, ['ch', 'numeroch', 'numch', 'nch']);
  const colChassis = findColumn(first, ['chassis', 'châssis']);
  const colAnnee = findColumn(first, ['annee', 'année', 'year']);
  const colRef = findColumn(first, ['ref', 'reference', 'refvehicule']);
  const colType = findColumn(first, ['type', 'typevehicule']);
  const colNom = findColumn(first, ['nom', 'nomclient']);
  const colPrenom = findColumn(first, ['prenom', 'prenomclient']);
  const colTel = findColumn(first, ['tel', 'telephone', 'phone']);
  const colStatut = findColumn(first, ['statut', 'status', 'etat']);
  const colNotes = findColumn(first, ['note', 'observation', 'commentaire']);

  function mapStatut(raw: string): Dossier['statut'] {
    const s = (raw || '').toLowerCase().replace(/[^a-zàâäéèêëïîôùûüÿç]/g, '');
    if (s.includes('cartegrise') && s.includes('sortie')) return 'CarteGrise_Sortie';
    if (s.includes('cartegrise') && s.includes('entree')) return 'CarteGrise_Entree';
    if (s.includes('cartegrise') && s.includes('entrée')) return 'CarteGrise_Entree';
    if (s.includes('provisoire') && s.includes('sortie')) return 'Provisoire_Sortie';
    if (s.includes('provisoire') && s.includes('entree')) return 'Provisoire_Entree';
    if (s.includes('provisoire') && s.includes('entrée')) return 'Provisoire_Entree';
    if (s.includes('lancé') || s.includes('lance')) return 'Lance';
    return 'Lance';
  }

  return rows.map((row) => ({
    id: generateId(),
    numeroCH: String(colCH ? row[colCH] ?? '' : ''),
    chassisCH: String(colChassis ? row[colChassis] ?? '' : ''),
    annee: String(colAnnee ? row[colAnnee] ?? '' : ''),
    referenceVehicule: String(colRef ? row[colRef] ?? '' : ''),
    typeVehicule: String(colType ? row[colType] ?? '' : ''),
    nomClient: String(colNom ? row[colNom] ?? '' : ''),
    prenomClient: String(colPrenom ? row[colPrenom] ?? '' : ''),
    telephoneClient: String(colTel ? row[colTel] ?? '' : ''),
    statut: mapStatut(String(colStatut ? row[colStatut] ?? '' : '')),
    dateCreation: new Date().toISOString(),
    notes: String(colNotes ? row[colNotes] ?? '' : ''),
  }));
}

// ── Export Clients to Excel ────────────────────────────────

export function exportClientsToExcel(clients: Client[], filename: string = 'clients.xlsx'): void {
  const data = clients.map((c) => ({
    'Nom': c.nom,
    'Prénom': c.prenom,
    'Téléphone': c.telephone,
    'Email': c.email ?? '',
    'Adresse': c.adresse ?? '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clients');

  ws['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 25 }, { wch: 30 }];
  XLSX.writeFile(wb, filename);
}

// ── Export Dossiers to Excel ────────────────────────────────

export function exportDossiersToExcel(dossiers: Dossier[], filename: string = 'dossiers.xlsx'): void {
  const data = dossiers.map((d) => {
    const c = getClientDisplayFromDossier(d);
    return {
      'Numéro CH': d.numeroCH,
      'Châssis CH': d.chassisCH ?? '',
      'Année': d.annee ?? '',
      'Référence Véhicule': d.referenceVehicule,
      'Type Véhicule': d.typeVehicule,
      'Nom Client': c.nom,
      'Prénom Client': c.prenom,
      'Téléphone': c.telephone,
      'Statut': statutDossierLabel(d.statut),
      'Date de création': formatDate(d.dateCreation),
      'Notes': d.notes,
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dossiers');

  const colWidths = [
    { wch: 15 }, // Numéro CH
    { wch: 18 }, // Châssis CH
    { wch: 10 }, // Année
    { wch: 18 }, // Référence Véhicule
    { wch: 15 }, // Type Véhicule
    { wch: 18 }, // Nom Client
    { wch: 18 }, // Prénom Client
    { wch: 15 }, // Téléphone
    { wch: 20 }, // Statut
    { wch: 14 }, // Date de création
    { wch: 30 }, // Notes
  ];
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, filename);
}

// ── Export Locations to Excel ───────────────────────────────

export function exportLocationsToExcel(locations: Location[], filename: string = 'locations.xlsx'): void {
  const data = locations.map((l) => {
    const c = getClientDisplayFromLocation(l);
    const depenses = l.depenses ?? l.depensesLignes?.reduce((sum, d) => sum + (d.montant || 0), 0) ?? 0;
    const benefice = l.montantTotal - depenses;
    return {
      'Référence': l.referenceCamion,
      'Type': l.typeCamion,
      'Client': formatClientLabel(c),
      'Téléphone': c.telephone,
      'Date début': formatDate(l.dateDebut),
      'Date fin': formatDate(l.dateFin),
      'Montant location': l.montantTotal,
      'Dépenses': depenses,
      'Bénéfice': benefice,
      'Statut': statutLocationLabel(l.statut),
      'Date création': formatDate(l.dateCreation),
      'Notes': l.notes,
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Locations');

  XLSX.writeFile(wb, filename);
}

// ── Export Factures to Excel ────────────────────────────────

export function exportFacturesToExcel(factures: Facture[], filename: string = 'factures.xlsx'): void {
  const data = factures.map((f) => {
    const prixAchat = f.prixAchat ?? 0;
    const dedouanement = f.dedouanement ?? f.depenses ?? 0;
    const benefice = calculerBenefice(f.prixTotalTTC, prixAchat, dedouanement);
    const c = getClientDisplayFromFacture(f);
    return {
      'N° Facture': f.id,
      'Client': formatClientLabel(c),
      'Téléphone': c.telephone,
      'Véhicule': f.referenceVehicule,
      'Type': f.typeVehicule,
      'VIN': f.vin,
      'Date': formatDate(f.dateFacture),
      'Prix de vente': f.prixTotalTTC,
      'Prix achat': prixAchat,
      'Dédouanement': dedouanement,
      'Bénéfice': benefice,
      'Payé': f.montantPaye,
      'Restant': f.montantRestant,
      'Mode paiement': modePaiementLabel(f.modePaiement),
      'Pays destination': f.paysDestination,
      'Statut': statutFactureLabel(f.statut),
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Factures');

  XLSX.writeFile(wb, filename);
}

// ── Export Tranches to Excel ────────────────────────────────

export function exportTranchesToExcel(facture: Facture, filename?: string): void {
  const fname = filename || `echeancier_${facture.id}.xlsx`;
  const data = facture.tranches.map((t: Tranche) => ({
    'ID Tranche': t.id,
    'Tranche N°': t.numeroTranche,
    'Montant': t.montant,
    'Échéance': formatDate(t.dateEcheance),
    'Date paiement': t.datePaiement ? formatDate(t.datePaiement) : '-',
    'Statut': statutTrancheLabel(t.statut),
    'Mode paiement': t.modePaiement ? modePaiementLabel(t.modePaiement) : '-',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Échéancier');

  XLSX.writeFile(wb, fname);
}

// ── Generate Excel Template ─────────────────────────────────

export function generateTemplate(): void {
  const data = [
    {
      'Numéro CH': 'CH-001',
      'Châssis CH': 'ABC123456789',
      'Année': '2024',
      'Référence Véhicule': 'REF-001',
      'Type Véhicule': 'Berline',
      'Nom Client': 'Diallo',
      'Prénom Client': 'Amadou',
      'Téléphone': '+223 70 00 00 00',
      'Statut': 'Lancé',
      'Notes': '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');

  ws['!cols'] = [
    { wch: 15 }, // Numéro CH
    { wch: 18 }, // Châssis CH
    { wch: 10 }, // Année
    { wch: 18 }, // Référence Véhicule
    { wch: 15 }, // Type Véhicule
    { wch: 18 }, // Nom Client
    { wch: 18 }, // Prénom Client
    { wch: 18 }, // Téléphone
    { wch: 20 }, // Statut
    { wch: 30 }, // Notes
  ];

  XLSX.writeFile(wb, 'template_dossiers.xlsx');
}

// ── Export full report ───────────────────────────────────────

export function exportFullReport(dossiers: Dossier[], factures: Facture[], locations?: Location[], filename: string = 'rapport_complet.xlsx'): void {
  const wb = XLSX.utils.book_new();
  const locs = locations ?? [];

  const dossierData = dossiers.map((d) => ({
    'Numéro CH': d.numeroCH,
    'Référence Véhicule': d.referenceVehicule,
    'Client': formatClientLabel(getClientDisplayFromDossier(d)),
    'Statut': statutDossierLabel(d.statut),
    'Date': formatDate(d.dateCreation),
  }));
  const ws1 = XLSX.utils.json_to_sheet(dossierData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Dossiers');

  const factureData = factures.map((f) => {
    const prixAchat = f.prixAchat ?? 0;
    const dedouanement = f.dedouanement ?? f.depenses ?? 0;
    const benefice = calculerBenefice(f.prixTotalTTC, prixAchat, dedouanement);
    return {
      'N° Facture': f.id,
      'Client': formatClientLabel(getClientDisplayFromFacture(f)),
      'Prix de vente': f.prixTotalTTC,
      'Prix achat': prixAchat,
      'Dédouanement': dedouanement,
      'Bénéfice': benefice,
      'Payé': f.montantPaye,
      'Restant': f.montantRestant,
      'Statut': statutFactureLabel(f.statut),
    };
  });
  const ws2 = XLSX.utils.json_to_sheet(factureData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Factures');

  if (locs.length > 0) {
    const locationData = locs.map((l) => ({
      'Référence': l.referenceCamion,
      'Client': formatClientLabel(getClientDisplayFromLocation(l)),
      'Montant': l.montantTotal,
      'Statut': statutLocationLabel(l.statut),
    }));
    const wsLoc = XLSX.utils.json_to_sheet(locationData);
    XLSX.utils.book_append_sheet(wb, wsLoc, 'Locations');
  }

  const totalVentes = factures.reduce((s, f) => s + f.prixTotalTTC, 0);
  const totalEncaisse = factures.reduce((s, f) => s + f.montantPaye, 0);
  const totalBenefice = factures.reduce((s, f) => s + calculerBenefice(f.prixTotalTTC, f.prixAchat ?? 0, f.dedouanement ?? f.depenses ?? 0), 0);
  const summaryData = [
    { 'Indicateur': 'Total dossiers', 'Valeur': dossiers.length },
    { 'Indicateur': 'Total factures', 'Valeur': factures.length },
    { 'Indicateur': 'Total locations', 'Valeur': locs.length },
    { 'Indicateur': 'Total ventes (FCFA)', 'Valeur': totalVentes },
    { 'Indicateur': 'Total encaissé (FCFA)', 'Valeur': totalEncaisse },
    { 'Indicateur': 'Total restant (FCFA)', 'Valeur': totalVentes - totalEncaisse },
    { 'Indicateur': 'Total bénéfice (FCFA)', 'Valeur': totalBenefice },
  ];
  const ws3 = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws3, 'Résumé');

  XLSX.writeFile(wb, filename);
}
