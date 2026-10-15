// Default warning-page wording (Tendril's own copy), chosen from the visitor's language.

export type WarningCopy = { title: string; message: string; button: string; leave: string; destination: string; leftTitle: string; leftMessage: string };

export const WARNING_COPY: Record<string, WarningCopy> = {
  en: {
    title: "Adults only",
    message: "This link leads to content intended for adults. Please confirm you're 18 or older to continue.",
    button: "I'm 18 or older, continue",
    leave: "Take me back",
    destination: "You'll be taken to",
    leftTitle: "No problem",
    leftMessage: "You can close this page now.",
  },
  es: {
    title: "Solo para adultos",
    message: "Este enlace lleva a contenido para adultos. Confirma que tienes 18 años o más para continuar.",
    button: "Tengo 18 años o más, continuar",
    leave: "Volver",
    destination: "Irás a",
    leftTitle: "De acuerdo",
    leftMessage: "Ya puedes cerrar esta página.",
  },
  pt: {
    title: "Somente para adultos",
    message: "Este link leva a conteúdo para adultos. Confirme que você tem 18 anos ou mais para continuar.",
    button: "Tenho 18 anos ou mais, continuar",
    leave: "Voltar",
    destination: "Você será levado a",
    leftTitle: "Tudo bem",
    leftMessage: "Você já pode fechar esta página.",
  },
  fr: {
    title: "Réservé aux adultes",
    message: "Ce lien mène à un contenu destiné aux adultes. Confirmez que vous avez 18 ans ou plus pour continuer.",
    button: "J'ai 18 ans ou plus, continuer",
    leave: "Revenir en arrière",
    destination: "Vous allez être redirigé vers",
    leftTitle: "Pas de souci",
    leftMessage: "Vous pouvez fermer cette page.",
  },
  de: {
    title: "Nur für Erwachsene",
    message: "Dieser Link führt zu Inhalten für Erwachsene. Bitte bestätige, dass du mindestens 18 Jahre alt bist.",
    button: "Ich bin 18 oder älter, weiter",
    leave: "Zurück",
    destination: "Du wirst weitergeleitet zu",
    leftTitle: "Kein Problem",
    leftMessage: "Du kannst diese Seite jetzt schließen.",
  },
  it: {
    title: "Solo per adulti",
    message: "Questo link porta a contenuti per adulti. Conferma di avere almeno 18 anni per continuare.",
    button: "Ho 18 anni o più, continua",
    leave: "Torna indietro",
    destination: "Verrai portato su",
    leftTitle: "Nessun problema",
    leftMessage: "Ora puoi chiudere questa pagina.",
  },
};

export const SUPPORTED_LANGS = Object.keys(WARNING_COPY);

/** Picks the best supported language from an Accept-Language header (falls back to English). */
export function pickLang(acceptLanguage: string | null | undefined): string {
  if (!acceptLanguage) return "en";
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .filter((x) => x.lang && !Number.isNaN(x.q))
    .sort((a, b) => b.q - a.q);
  return ranked.find((x) => WARNING_COPY[x.lang])?.lang ?? "en";
}

/** Default wording for a template: its own English copy if it has one, else the shared translations. */
export function templateCopy(template: { defaultCopyEn?: { title: string; message: string; button: string } }, lang: string): WarningCopy {
  const base = WARNING_COPY[lang] ?? WARNING_COPY.en;
  return lang === "en" && template.defaultCopyEn ? { ...base, ...template.defaultCopyEn } : base;
}
