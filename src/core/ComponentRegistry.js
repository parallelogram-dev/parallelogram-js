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
   * Create a registry; a shortcut for `new ComponentRegistry(options)`
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.defaultPriority='normal'] - Default priority for components
   * @returns {ComponentRegistry} New registry instance
   */
  static create(options = {}) {
    return new ComponentRegistry(options);
  }
}
