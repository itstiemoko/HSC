import { getClientById } from './store';
import type { Dossier, Facture, Location } from './types';

export interface ClientDisplay {
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  adresse?: string;
}

export function getClientDisplayFromDossier(d: Dossier): ClientDisplay {
  if (d.clientId) {
    const c = getClientById(d.clientId);
    if (c) return { nom: c.nom, prenom: c.prenom, telephone: c.telephone, email: c.email, adresse: c.adresse };
  }
  return {
    nom: d.nomClient ?? '',
    prenom: d.prenomClient ?? '',
    telephone: d.telephoneClient ?? '',
  };
}

export function getClientDisplayFromFacture(f: Facture): ClientDisplay {
  if (f.clientId) {
    const c = getClientById(f.clientId);
    if (c) return { nom: c.nom, prenom: c.prenom, telephone: c.telephone ?? '', email: c.email, adresse: c.adresse };
  }
  return {
    nom: f.nomClient ?? '',
    prenom: f.prenomClient ?? '',
    telephone: f.telephone ?? '',
    email: f.email,
    adresse: f.adresse,
  };
}

export function getClientDisplayFromLocation(l: Location): ClientDisplay {
  if (l.clientId) {
    const c = getClientById(l.clientId);
    if (c) return { nom: c.nom, prenom: c.prenom, telephone: c.telephone, email: c.email, adresse: c.adresse };
  }
  return {
    nom: l.nomClient ?? '',
    prenom: l.prenomClient ?? '',
    telephone: l.telephoneClient ?? '',
  };
}

export function formatClientLabel(display: ClientDisplay): string {
  const name = `${display.prenom} ${display.nom}`.trim();
  return name || '-';
}
