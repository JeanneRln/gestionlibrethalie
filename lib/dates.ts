import { indexService, SERVICES, type ServiceId } from "@/lib/services";

export function aujourdhuiParis(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function maintenantParisCle(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const valeur = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${valeur("year")}-${valeur("month")}-${valeur("day")}T${valeur("hour")}:${valeur("minute")}`;
}

export function repasEstPasse(date: string, service: ServiceId, maintenant = new Date()) {
  const heure = SERVICES.find((item) => item.id === service)?.heure ?? "23:59";
  return maintenantParisCle(maintenant) >= `${date}T${heure}`;
}

export function ajouterJours(iso: string, jours: number) {
  const [annee, mois, jour] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(annee, mois - 1, jour));
  date.setUTCDate(date.getUTCDate() + jours);
  return date.toISOString().slice(0, 10);
}

export function chaqueJour(debut: string, fin: string) {
  const jours: string[] = [];
  let curseur = debut;
  while (curseur <= fin && jours.length < 370) {
    jours.push(curseur);
    curseur = ajouterJours(curseur, 1);
  }
  return jours;
}

export function creneauxSejour(debut: string, fin: string, repasDebut: ServiceId, repasFin: ServiceId) {
  const jours = chaqueJour(debut, fin);
  const debutIndex = indexService(repasDebut);
  const finIndex = indexService(repasFin);
  const creneaux: { date: string; service: ServiceId }[] = [];
  jours.forEach((date, indexJour) => {
    SERVICES.forEach((service, index) => {
      if (indexJour === 0 && index < debutIndex) return;
      if (indexJour === jours.length - 1 && index > finIndex) return;
      creneaux.push({ date, service: service.id });
    });
  });
  return creneaux;
}

export function formaterJour(iso: string) {
  return capitaliser(formater(iso, { weekday: "long", day: "numeric", month: "long" }));
}

export function formaterJourCourt(iso: string) {
  return capitaliser(formater(iso, { weekday: "short", day: "numeric", month: "short" }));
}

function formater(iso: string, options: Intl.DateTimeFormatOptions) {
  const [annee, mois, jour] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: "UTC" }).format(
    new Date(Date.UTC(annee, mois - 1, jour)),
  );
}

function capitaliser(texte: string) {
  return texte.charAt(0).toLocaleUpperCase("fr-FR") + texte.slice(1);
}
