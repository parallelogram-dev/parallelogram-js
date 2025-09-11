export class DevLogger {
  constructor(namespace, enabled = false) {
    this.namespace = namespace;
    this.enabled = enabled;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  _getPrefix(level) {
    return `${new Date().toISOString()} [${this.namespace}] ${level}:`;
  }

  debug(...args) {
    if (this.enabled) {
      console.debug(this._getPrefix('DEBUG'), ...args);
    }
  }

  log(...args) {
    if (this.enabled) {
      console.log(this._getPrefix('LOG'), ...args);
    }
  }

  info(...args) {
    if (this.enabled) {
      console.info(this._getPrefix('INFO'), ...args);
    }
  }

  warn(...args) {
    if (this.enabled) {
      console.warn(this._getPrefix('WARN'), ...args);
    }
  }

  error(...args) {
    console.error(this._getPrefix('ERROR'), ...args);
  }

  child(subNamespace) {
    return new DevLogger(`${this.namespace}:${subNamespace}`, this.enabled);
  }

  group(label){ if (this.enabled && console.groupCollapsed) console.groupCollapsed(`[${this.namespace}] ${label}`); }
  groupEnd(){ if (this.enabled && console.groupEnd) console.groupEnd(); }
}

export function createLogger(namespace, forceEnabled) {
  if (forceEnabled !== undefined) {
    return new DevLogger(namespace, forceEnabled);
  }
  const isDebugMode =
    (typeof window !== 'undefined' && window.location?.search?.includes('debug=1')) ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('app:debug') === '1');
  return new DevLogger(namespace, isDebugMode);
}