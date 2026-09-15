import { afterEach, describe, expect, it } from 'vitest';
import '../../../src/components/PSelect.js';
import '../../../src/components/PDatetime.js';

const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

describe('form control web components without page styles', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it.each(['p-select', 'p-datetime'])('%s shows a bordered control of a usable size', async tag => {
    const element = document.createElement(tag);
    document.body.append(element);
    await nextFrame();

    const { width, height } = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    expect({
      tall: height >= 32,
      wide: width >= 160,
      bordered: Number.parseFloat(style.borderTopWidth) > 0,
    }).toEqual({ tall: true, wide: true, bordered: true });
  });

  it('lets page styles size and border the control instead', async () => {
    const style = document.createElement('style');
    style.textContent = '.compact { min-height: 0; height: 20px; border: 0; }';
    document.head.append(style);
    const element = document.createElement('p-select');
    element.className = 'compact';
    document.body.append(element);
    await nextFrame();

    expect([
      element.getBoundingClientRect().height,
      getComputedStyle(element).borderTopWidth,
    ]).toEqual([20, '0px']);
    style.remove();
  });
});
