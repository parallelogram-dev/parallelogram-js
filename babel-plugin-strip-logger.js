/**
 * Babel plugin to strip this.logger and this.eventBus calls
 * Used for production builds to remove debug code
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

          // Check if it's this.logger?.method or this.eventBus?.method
          if (
            callee.type === 'OptionalMemberExpression' &&
            callee.object.type === 'MemberExpression' &&
            callee.object.object.type === 'ThisExpression' &&
            (callee.object.property.name === 'logger' ||
             callee.object.property.name === 'eventBus')
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
            (callee.object.property.name === 'logger' ||
             callee.object.property.name === 'eventBus')
          ) {
            path.remove();
          }
        }
      }
    }
  };
}
