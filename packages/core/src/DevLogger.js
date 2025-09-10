export class DevLogger {
  constructor(ns, enabled = false){ this.ns = ns; this.enabled = enabled; }
  setEnabled(v){ this.enabled = !!v; }
  _pfx(level){ return `${new Date().toISOString()} [${this.ns}] ${level}:`; }
  log(...a){ if (this.enabled) console.log(this._pfx('log'), ...a); }
  info(...a){ if (this.enabled) console.info(this._pfx('info'), ...a); }
  warn(...a){ if (this.enabled) console.warn(this._pfx('warn'), ...a); }
  error(...a){ console.error(this._pfx('error'), ...a); }
  group(label){ if (this.enabled && console.groupCollapsed) console.groupCollapsed(`[${this.ns}] ${label}`); }
  groupEnd(){ if (this.enabled && console.groupEnd) console.groupEnd(); }
  time(label){ if (this.enabled && console.time) console.time(`[${this.ns}] ${label}`); }
  timeEnd(label){ if (this.enabled && console.timeEnd) console.timeEnd(`[${this.ns}] ${label}`); }
}
