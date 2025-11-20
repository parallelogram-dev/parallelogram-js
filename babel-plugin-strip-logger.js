/**
 * Babel plugin to strip this.logger calls
 * Used for production builds to remove debug code
 * Note: eventBus calls are preserved as they are functional, not debug code
 */
export default function stripLoggerPlugin() {
  return {
    name: 'strip-logger',
    visitor: {
      // Remove this.logger?.method(...) calls
      ExpressionStatement(path) {
        const { expression } = path.node;

        // Check for optional chain expressions like this.logger?.info(...)
        if (expression.type === 'OptionalCallExpression') {
          const callee = expression.callee;

          // Check if it's this.logger?.method (NOT eventBus)
          if (
            callee.type === 'OptionalMemberExpression' &&
            callee.object.type === 'MemberExpression' &&
            callee.object.object.type === 'ThisExpression' &&
            callee.object.property.name === 'logger'
          ) {
            // Remove the entire statement
            path.remove();
          }
        }

        // Also handle non-optional: this.logger.info(...)
        if (expression.type === 'CallExpression') {
          const callee = expression.callee;

          if (
            callee.type === 'MemberExpression' &&
            callee.object.type === 'MemberExpression' &&
            callee.object.object.type === 'ThisExpression' &&
            callee.object.property.name === 'logger'
          ) {
            path.remove();
          }
        }
      }
    }
  };
}
