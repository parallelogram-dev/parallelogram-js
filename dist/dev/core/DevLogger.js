class DevLogger {
  constructor(namespace, enabled = false, silent = false) {
    this.namespace = namespace;
    this.enabled = enabled;
    this.silent = silent;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  setSilent(silent) {
    this.silent = Boolean(silent);
  }

  _getPrefix(level) {
    return `${new Date().toISOString()} [${this.namespace}] ${level}:`;
  }

  debug(...args) {
    if (this.silent || !this.enabled) return;
    console.debug(this._getPrefix('DEBUG'), ...args);
  }

  log(...args) {
    if (this.silent || !this.enabled) return;
    console.log(this._getPrefix('LOG'), ...args);
  }

  info(...args) {
    if (this.silent || !this.enabled) return;
    console.info(this._getPrefix('INFO'), ...args);
  }

  warn(...args) {
    if (this.silent) return;
    console.warn(this._getPrefix('WARN'), ...args);
  }

  error(...args) {
    if (this.silent) return;
    console.error(this._getPrefix('ERROR'), ...args);
  }

  child(subNamespace) {
    return new DevLogger(`${this.namespace}:${subNamespace}`, this.enabled, this.silent);
  }

  group(label, data) {
    if (this.silent || !this.enabled || !console.groupCollapsed) return;

    /* Open the group with just the label */
    console.groupCollapsed(`[${this.namespace}] ${label}`);

    /* Log data separately inside the group if provided */
    if (data && typeof data === 'object') {
      console.log('Details:', data);
    }
  }
  groupEnd() {
    if (this.silent || !this.enabled || !console.groupEnd) return;
    console.groupEnd();
  }
}

function createLogger(namespace, forceEnabled) {
  if (forceEnabled !== undefined) {
    return new DevLogger(namespace, forceEnabled);
  }
  const isDebugMode =
    (typeof window !== 'undefined' && window.location?.search?.includes('debug=1')) ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('app:debug') === '1');
  return new DevLogger(namespace, isDebugMode);
}

export { DevLogger, createLogger };
