import { describe, expect, it, vi } from 'vitest';
import { DevLogger } from '../../../src/core/DevLogger.js';

const quiet = method => vi.spyOn(console, method).mockImplementation(() => {});

describe('DevLogger', () => {
  it('prefixes messages with its namespace, parallelogram by default', () => {
    const warn = quiet('warn');

    new DevLogger().warn('Check the config');

    expect(warn).toHaveBeenCalledWith('[parallelogram]', 'Check the config');
  });

  it('takes its namespace from the prefix of an options object', () => {
    const warn = quiet('warn');

    new DevLogger({ prefix: 'Demo' }).warn('Check the config');

    expect(warn).toHaveBeenCalledWith('[Demo]', 'Check the config');
  });

  it('keeps debug, log and info quiet until it is enabled', () => {
    const info = quiet('info');
    const logger = new DevLogger('app');

    logger.info('Hidden');
    logger.setEnabled(true);
    logger.info('Shown');

    expect(info.mock.calls).toEqual([['[app]', 'Shown']]);
  });

  it('keeps warnings and errors quiet when silent', () => {
    const warn = quiet('warn');
    const error = quiet('error');
    const logger = new DevLogger('app', true, true);

    logger.warn('Hidden');
    logger.error('Hidden');

    expect([warn.mock.calls.length, error.mock.calls.length]).toEqual([0, 0]);
  });

  it('gives a child logger a nested namespace that follows its parent being enabled later', () => {
    const info = quiet('info');
    const parent = new DevLogger();
    const child = parent.child('router');

    parent.setEnabled(true);
    child.info('Navigated');

    expect(info).toHaveBeenCalledWith('[parallelogram:router]', 'Navigated');
  });
});
