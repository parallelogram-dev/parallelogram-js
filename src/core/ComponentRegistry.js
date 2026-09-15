/**
 * ComponentRegistry - Core utility for building component registries
 * Provides a fluent API for defining component loader configurations,
 * with a default priority for components that don't set their own.
 */
export class ComponentRegistry {
  /**
   * Create a new ComponentRegistry instance
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.defaultPriority='normal'] - Default priority for components
   */
  constructor(options = {}) {
    this.defaultPriority = options.defaultPriority || 'normal';
    this.registry = [];
  }

  /**
   * Add a component to the registry
   * @param {string} name - Component name, which `dependsOn` refers to
   * @param {string} selector - CSS selector for component elements
   * @param {Object} options - Component configuration options
   * @param {Function} options.loader - Loads the component's module or class
   * @param {string} [options.priority] - Component loading priority; the registry's default priority when not set
   * @param {string[]} [options.dependsOn] - Array of component names this depends on
   * @param {string} [options.exportName] - The named export to use when the module has no default export
   * @returns {ComponentRegistry} This instance for chaining
   * @throws {Error} If no loader is given or the name is already registered.
   */
  component(name, selector, options = {}) {
    if (!options.loader) {
      throw new Error(`Component '${name}' must provide a loader function`);
    }
    if (this.registry.some(entry => entry.name === name)) {
      throw new Error(`A component named '${name}' is already registered`);
    }

    const config = {
      name,
      selector,
      priority: options.priority || this.defaultPriority,
      dependsOn: options.dependsOn,
      exportName: options.exportName,
      loader: options.loader,
    };

    this.registry.push(config);
    return this;
  }

  /**
   * Convert string to PascalCase
   * @private
   * @param {string} str - Input string
   * @returns {string} PascalCase string
   */
  toPascalCase(str) {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Get the built registry array
   * @returns {Array} Component registry configuration
   */
  build() {
    return [...this.registry];
  }

  /**
   * Clear the registry
   * @returns {ComponentRegistry} This instance for chaining
   */
  clear() {
    this.registry = [];
    return this;
  }

  /**
   * Get registry statistics
   * @returns {Object} Registry statistics
   */
  getStats() {
    const priorities = this.registry.reduce((acc, comp) => {
      acc[comp.priority] = (acc[comp.priority] || 0) + 1;
      return acc;
    }, {});

    const withDependencies = this.registry.filter(comp => comp.dependsOn?.length > 0).length;

    return {
      totalComponents: this.registry.length,
      priorities,
      withDependencies,
    };
  }

  /**
   * Validate the registry for circular dependencies and missing dependencies
   * @returns {Object} Validation result
   */
  validate() {
    const componentNames = new Set(this.registry.map(comp => comp.name));
    const errors = [];
    const warnings = [];

    /* Check for missing dependencies */
    this.registry.forEach(comp => {
      if (comp.dependsOn) {
        comp.dependsOn.forEach(dep => {
          if (!componentNames.has(dep)) {
            errors.push(
              `Component '${comp.name}' depends on '${dep}' which is not in the registry`
            );
          }
        });
      }
    });

    /* Check for circular dependencies (simplified check) */
    const hasCycles = this.detectCycles();
    if (hasCycles.length > 0) {
      errors.push(`Circular dependencies detected: ${hasCycles.join(', ')}`);
    }

    /* Check for duplicate selectors */
    const selectors = new Map();
    this.registry.forEach(comp => {
      if (selectors.has(comp.selector)) {
        warnings.push(
          `Duplicate selector '${comp.selector}' used by '${comp.name}' and '${selectors.get(comp.selector)}'`
        );
      } else {
        selectors.set(comp.selector, comp.name);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detect circular dependencies
   * @private
   * @returns {Array} Component names involved in cycles
   */
  detectCycles() {
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    const visit = (componentName, path = []) => {
      if (recursionStack.has(componentName)) {
        const cycleStart = path.indexOf(componentName);
        cycles.push(path.slice(cycleStart).concat(componentName).join(' -> '));
        return;
      }

      if (visited.has(componentName)) {
        return;
      }

      visited.add(componentName);
      recursionStack.add(componentName);

      const component = this.registry.find(comp => comp.name === componentName);
      if (component?.dependsOn) {
        component.dependsOn.forEach(dep => {
          visit(dep, [...path, componentName]);
        });
      }

      recursionStack.delete(componentName);
    };

    this.registry.forEach(comp => {
      if (!visited.has(comp.name)) {
        visit(comp.name);
      }
    });

    return cycles;
  }

  /**
   * Create a new, empty registry with this registry's configuration, overridden by the given options
   * @param {Object} [options={}] - Configuration options to override
   * @param {string} [options.defaultPriority] - Default priority for components
   * @returns {ComponentRegistry} New registry instance
   */
  fork(options = {}) {
    return new ComponentRegistry({
      defaultPriority: this.defaultPriority,
      ...options,
    });
  }

  /**
   * Create a registry; a shortcut for `new ComponentRegistry(options)`
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.defaultPriority='normal'] - Default priority for components
   * @returns {ComponentRegistry} New registry instance
   */
  static create(options = {}) {
    return new ComponentRegistry(options);
  }
}
