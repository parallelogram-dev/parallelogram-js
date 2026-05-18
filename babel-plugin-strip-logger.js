/**
 * Babel plugin to strip debug-level this.logger calls in production builds.
 *
 * Strips: this.logger?.debug(), .log(), .info(), .group(), .groupEnd()
 * Preserves: this.logger?.warn() and .error() — these surface real issues
 *   to consumers and must remain in production. Pairs with DevLogger, which
 *   always writes warn/error to console regardless of debug mode.
 *
 * eventBus calls are always preserved as they are functional, not debug.
 */
const STRIP_METHODS = new Set(['debug', 'log', 'info', 'group', 'groupEnd']);

function isLoggerCallToStrip(callee) {
  const isMember =
    callee.type === 'MemberExpression' || callee.type === 'OptionalMemberExpression';
  if (!isMember) return false;

  const obj = callee.object;
  const isThisLogger =
    (obj.type === 'MemberExpression' || obj.type === 'OptionalMemberExpression') &&
    obj.object.type === 'ThisExpression' &&
    obj.property.name === 'logger';
  if (!isThisLogger) return false;

  return STRIP_METHODS.has(callee.property.name);
}

export default function stripLoggerPlugin() {
  return {
    name: 'strip-logger',
    visitor: {
      ExpressionStatement(path) {
        const { expression } = path.node;
        if (
          expression.type === 'OptionalCallExpression' ||
          expression.type === 'CallExpression'
        ) {
          if (isLoggerCallToStrip(expression.callee)) {
            path.remove();
          }
        }
      },
    },
  };
}
