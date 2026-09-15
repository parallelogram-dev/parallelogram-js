import { transformSync } from '@babel/core';
import { describe, expect, it } from 'vitest';
import stripLogger from '../../../scripts/babel-plugin-strip-logger.js';

const strip = statement =>
  transformSync(`class Example { run() { ${statement} this.done(); } }`, {
    plugins: [stripLogger],
    configFile: false,
    babelrc: false,
  }).code;

describe('strip logger babel plugin', () => {
  it.each([
    ['debug', "this.logger.debug('mounted', element);"],
    ['log', "this.logger.log('mounted');"],
    ['info', "this.logger.info('mounted');"],
    ['group', "this.logger.group('mount');"],
    ['groupEnd', 'this.logger.groupEnd();'],
    ['debug on an optional logger', "this.logger?.debug('mounted');"],
    ['info called optionally', "this.logger.info?.('mounted');"],
    ['group on an optional logger called optionally', "this.logger?.group?.('mount');"],
  ])('removes a %s call', (_, statement) => {
    expect(strip(statement)).not.toContain('logger');
  });

  it.each([
    ['warn', "this.logger.warn('missing target');"],
    ['error', "this.logger.error('load failed', error);"],
    ['warn on an optional logger', "this.logger?.warn('missing target');"],
    ['error on an optional logger called optionally', "this.logger?.error?.('load failed');"],
  ])('keeps a %s call', (_, statement) => {
    expect(strip(statement)).toContain('this.logger');
  });

  it('keeps a debug call on a logger that is not this.logger', () => {
    expect(strip("logger.debug('mounted');")).toContain('logger.debug');
  });

  it('keeps a debug call whose result is used', () => {
    expect(strip("const result = this.logger.debug('mounted');")).toContain('this.logger.debug');
  });

  it('keeps the statements around a removed call', () => {
    expect(strip("this.logger.debug('mounted');")).toContain('this.done()');
  });
});
