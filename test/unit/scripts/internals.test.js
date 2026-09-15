import { describe, expect, it } from 'vitest';
import { withoutInternalMembers } from '../../../scripts/types/internals.mjs';

const declarations = (...lines) => lines.join('\n');

describe('internal members', () => {
  it('removes an underscore property with its doc comment', () => {
    expect(
      withoutInternalMembers(
        declarations(
          'export declare class Router {',
          '    currentUrl: URL;',
          '    /**',
          '     * The navigation in progress',
          '     */',
          '    _navigation: {',
          '        url: URL;',
          '    } | null;',
          '    back(): void;',
          '}'
        )
      )
    ).toEqual({
      text: declarations(
        'export declare class Router {',
        '    currentUrl: URL;',
        '    back(): void;',
        '}'
      ),
      removed: 1,
    });
  });

  it('removes a method whose parameter and return types span lines', () => {
    const { text } = withoutInternalMembers(
      declarations(
        'export declare class Swapper {',
        "    /** Replace one fragment, even when it isn't found */",
        '    _processSingleFragment({ viewTarget }: {',
        '        viewTarget: any;',
        '    }, options: any): Promise<{',
        '        success: boolean;',
        '    }>;',
        '    swap(html: string): Promise<void>;',
        '}'
      )
    );

    expect(text).toBe(
      declarations('export declare class Swapper {', '    swap(html: string): Promise<void>;', '}')
    );
  });

  it('keeps protected underscore members', () => {
    const source = declarations(
      'export declare class BaseComponent {',
      '    protected _init(element: HTMLElement): ComponentState;',
      '    protected _getTargetElement(element: HTMLElement, options?: {',
      '        required?: boolean;',
      '    }): HTMLElement | null;',
      '}'
    );

    expect(withoutInternalMembers(source)).toEqual({ text: source, removed: 0 });
  });

  it('removes static members and accessors', () => {
    const { text } = withoutInternalMembers(
      declarations(
        'export declare class AlertManager {',
        '    static _globalInstance: AlertManager;',
        '    get _selector(): string;',
        '    static notify(message: string): () => void;',
        '}'
      )
    );

    expect(text).toBe(
      declarations(
        'export declare class AlertManager {',
        '    static notify(message: string): () => void;',
        '}'
      )
    );
  });

  it('leaves declarations outside classes alone', () => {
    const source = declarations(
      'export type Options = {',
      '    _legacy?: boolean;',
      '};',
      'export declare function _resetTrackers(): void;',
      'declare class Helper {',
      '    get(url: string): Promise<Response>;',
      '}'
    );

    expect(withoutInternalMembers(source).text).toBe(source);
  });
});
