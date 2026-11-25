// User-visible strings. Portuguese when the OS display language is Portuguese, else English.
// Every key must exist in every language; placeholders are written as {name}.

const DEFAULT_LANGUAGE = "en";

const STRINGS = {
  en: {
    "status.paused": "Paused",
    "status.pausedUntil": "Paused until {time}",
    "status.next": "Next reminder at {time}",
    "status.active": "Active",
    "pause.30": "30 minutes",
    "pause.60": "1 hour",
    "pause.120": "2 hours",
    "pause.untilResume": "Until I resume",
    "tray.remindNow": "Show reminder now",
    "tray.interval": "Interval",
    "tray.every": "Every {minutes} min",
    "tray.pause": "Pause alerts",
    "tray.pauseFor": "For {duration}",
    "tray.resume": "Resume alerts",
    "tray.settings": "Settings…",
    "tray.quit": "Quit",
    "startWithSystem": "Start with system",
    "popup.message": "💧 Time to drink water!",
    "linux.comment": "Reminds you to drink water",
    "window.minimize": "Minimize",
    "window.close": "Close to tray",
    "ring.next": "Next sip in",
    "ring.at": "at {time}",
    "ring.paused": "Paused",
    "ring.untilResume": "Until you resume",
    "ring.resumesAuto": "Resumes automatically",
    "action.remindNow": "Remind me now",
    "action.pause": "Pause",
    "action.resume": "Resume reminders",
    "interval.title": "Remind me every",
    "interval.value": "{minutes} min",
    "interval.less": "{minutes} minutes less",
    "interval.more": "{minutes} minutes more",
    "interval.preset": "{minutes} minutes",
    "toggle.startHint": "Launch quietly when you sign in",
    "toggle.startUnavailable": "Available in the installed app",
    "toggle.sound": "Play sound",
    "toggle.soundHint": "A soft chime with each reminder",
    "footer": "Closing this window keeps Water Reminder running in the tray.",
  },
  pt: {
    "status.paused": "Pausado",
    "status.pausedUntil": "Pausado até {time}",
    "status.next": "Próximo lembrete às {time}",
    "status.active": "Ativo",
    "pause.30": "30 minutos",
    "pause.60": "1 hora",
    "pause.120": "2 horas",
    "pause.untilResume": "Até eu retomar",
    "tray.remindNow": "Mostrar lembrete agora",
    "tray.interval": "Intervalo",
    "tray.every": "A cada {minutes} min",
    "tray.pause": "Pausar alertas",
    "tray.pauseFor": "Por {duration}",
    "tray.resume": "Retomar alertas",
    "tray.settings": "Configurações…",
    "tray.quit": "Sair",
    "startWithSystem": "Iniciar com o sistema",
    "popup.message": "💧 Hora de beber água!",
    "linux.comment": "Lembra você de beber água",
    "window.minimize": "Minimizar",
    "window.close": "Fechar para a bandeja",
    "ring.next": "Próximo gole em",
    "ring.at": "às {time}",
    "ring.paused": "Pausado",
    "ring.untilResume": "Até você retomar",
    "ring.resumesAuto": "Retoma automaticamente",
    "action.remindNow": "Lembrar agora",
    "action.pause": "Pausar",
    "action.resume": "Retomar lembretes",
    "interval.title": "Lembrar a cada",
    "interval.value": "{minutes} min",
    "interval.less": "{minutes} minutos a menos",
    "interval.more": "{minutes} minutos a mais",
    "interval.preset": "{minutes} minutos",
    "toggle.startHint": "Abre discretamente quando você entra",
    "toggle.startUnavailable": "Disponível no app instalado",
    "toggle.sound": "Tocar som",
    "toggle.soundHint": "Um toque suave a cada lembrete",
    "footer": "Fechar esta janela mantém o Water Reminder rodando na bandeja.",
  },
};

let language = DEFAULT_LANGUAGE;

// locales: OS preferred languages in order, e.g. ["pt-BR", "en-US"]; the first one decides.
function setLanguageFromLocales(locales) {
  const primary = String((locales && locales[0]) || "").toLowerCase();
  const code = primary.split(/[-_]/)[0];
  language = STRINGS[code] ? code : DEFAULT_LANGUAGE;
  return language;
}

function getLanguage() {
  return language;
}

function t(key, vars = {}) {
  const template = STRINGS[language][key] ?? STRINGS[DEFAULT_LANGUAGE][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match));
}

function getStrings() {
  return { language, strings: { ...STRINGS[DEFAULT_LANGUAGE], ...STRINGS[language] } };
}

module.exports = { setLanguageFromLocales, getLanguage, t, getStrings };
