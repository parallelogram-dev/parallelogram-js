import { bracketBalance } from './members.mjs';

/**
 * Internal members removed from declarations tsc wrote
 *
 * An underscore member is internal unless it is `protected`, as BaseComponent's helpers for
 * subclasses are. tsc can't leave these out itself: `@internal` doesn't strip properties assigned
 * in a constructor. The declarations are read as tsc lays them out, with class members indented
 * four spaces, each ending in a semicolon once its brackets close, and doc comments directly above.
 */

const CLASS_HEADING =
  /^(?:export\s+)?(?:declare\s+)?(?:default\s+)?(?:abstract\s+)?class\s.*\{\s*$/;
const MEMBER =
  /^ {4}((?:(?:static|readonly|protected|private|public|abstract|accessor|async|get|set)\s+)*)([A-Za-z_$][\w$]*)/;
const DOC_START = /^ {4}\/\*\*/;
const DOC_END = /\*\/\s*$/;
const COMMENT_LINE = /^\s*(?:\/\*\*|\*|\/\/)/;

/**
 * @param {string} line - The first line of a member
 * @returns {boolean}
 */
function isInternal(line) {
  const match = line.match(MEMBER);
  return Boolean(match) && match[2].startsWith('_') && !/\bprotected\b/.test(match[1]);
}

/**
 * Declarations without their classes' internal members
 *
 * @param {string} declarations - A declaration file as tsc wrote it
 * @returns {{ text: string, removed: number }}
 */
export function withoutInternalMembers(declarations) {
  const lines = declarations.split('\n');
  const kept = [];
  let removed = 0;
  let inClass = false;
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!inClass || line === '}') {
      kept.push(line);
      inClass = inClass ? false : CLASS_HEADING.test(line);
      index++;
      continue;
    }

    const chunk = [];
    if (DOC_START.test(line)) {
      while (index < lines.length) {
        chunk.push(lines[index]);
        index++;
        if (DOC_END.test(chunk.at(-1))) break;
      }
      if (index >= lines.length || lines[index] === '}') {
        kept.push(...chunk);
        continue;
      }
    }

    const first = lines[index];
    let depth = 0;
    while (index < lines.length) {
      const current = lines[index];
      chunk.push(current);
      index++;
      if (!COMMENT_LINE.test(current)) depth += bracketBalance(current);
      if (depth === 0 && /;\s*$/.test(current)) break;
    }

    if (isInternal(first)) {
      removed++;
    } else {
      kept.push(...chunk);
    }
  }

  return { text: kept.join('\n'), removed };
}
