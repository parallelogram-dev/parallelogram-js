import { afterEach, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import frameworkStyles from '../../../src/styles/framework/index.scss';

const rootValue = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const surfaceColours = () => {
  const probe = document.createElement('div');
  probe.style.background = 'var(--surface-panel-color-bg)';
  probe.style.color = 'var(--color-surface)';
  document.body.append(probe);
  const { backgroundColor, color } = getComputedStyle(probe);
  probe.remove();
  return { role: color, surface: backgroundColor };
};

describe('dark theme', () => {
  const cleanups = [];

  afterEach(async () => {
    cleanups.splice(0).forEach(cleanup => cleanup());
    delete document.documentElement.dataset.theme;
    await commands.emulateColorScheme('light');
  });

  const addFrameworkStyles = () => {
    const style = document.createElement('style');
    style.textContent = frameworkStyles;
    document.head.append(style);
    cleanups.push(() => style.remove());
  };

  it('uses the light surface by default', () => {
    addFrameworkStyles();

    expect(surfaceColours()).toEqual({
      role: 'rgb(255, 255, 255)',
      surface: 'rgb(255, 255, 255)',
    });
  });

  it('switches the surface role and the surfaces that read it when data-theme is dark', () => {
    addFrameworkStyles();
    document.documentElement.dataset.theme = 'dark';

    expect([rootValue('--color-surface'), surfaceColours()]).toEqual([
      '#171d26',
      { role: 'rgb(23, 29, 38)', surface: 'rgb(23, 29, 38)' },
    ]);
  });

  it('follows a dark colour scheme preference', async () => {
    addFrameworkStyles();
    await commands.emulateColorScheme('dark');

    expect(surfaceColours()).toEqual({
      role: 'rgb(23, 29, 38)',
      surface: 'rgb(23, 29, 38)',
    });
  });

  it('keeps light values when data-theme is light under a dark preference', async () => {
    addFrameworkStyles();
    await commands.emulateColorScheme('dark');
    document.documentElement.dataset.theme = 'light';

    expect(surfaceColours()).toEqual({
      role: 'rgb(255, 255, 255)',
      surface: 'rgb(255, 255, 255)',
    });
  });
});
