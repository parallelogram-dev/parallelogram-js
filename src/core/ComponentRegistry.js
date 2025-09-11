/**
 * ComponentRegistry - Core utility for building component registries
 * Provides a fluent API for defining component loader configurations
 * with sensible defaults and path conventions.
 */
export class ComponentRegistry {
    /**
     * Create a new ComponentRegistry instance
     * @param {Object} options - Configuration options
     * @param {string} [options.basePath='./components/'] - Base path for component imports
     * @param {string} [options.defaultPriority='normal'] - Default priority for components
     * @param {string} [options.fileExtension='.js'] - Default file extension
     * @param {boolean} [options.useMinified=false] - Whether to use .min.js files by default
     */
    constructor(options = {}) {
        this.basePath = options.basePath || '../components/';
        this.defaultPriority = options.defaultPriority || 'normal';
        this.fileExtension = options.fileExtension || '.js';
        this.useMinified = options.useMinified || false;
        this.registry = [];
    }

    /**
     * Add a component to the registry
     * @param {string} name - Component name (used for filename convention)
     * @param {string} selector - CSS selector for component elements
     * @param {Object} [options={}] - Component configuration options
     * @param {string} [options.priority] - Component loading priority ('critical', 'normal', 'low')
     * @param {string[]} [options.dependsOn] - Array of component names this depends on
     * @param {string} [options.exportName] - Name of the export (defaults to PascalCase of name)
     * @param {string} [options.path] - Custom import path (overrides convention)
     * @param {string} [options.filename] - Custom filename (overrides convention)
     * @returns {ComponentRegistry} This instance for chaining
     */
    component(name, selector, options = {}) {
        const config = {
            name,
            selector,
            priority: options.priority || this.defaultPriority,
            dependsOn: options.dependsOn,
            loader: this.createLoader(name, options)
        };

        this.registry.push(config);
        return this;
    }

    /**
     * Create a loader function for a component
     * @private
     * @param {string} name - Component name
     * @param {Object} options - Component options
     * @returns {Function} Async loader function
     */
    createLoader(name, options = {}) {
        const exportName = options.exportName || this.toPascalCase(name);
        const importPath = this.getImportPath(name, options);

        return async () => {
            try {
                const module = await import(importPath);

                // Handle different export patterns
                if (module[exportName]) {
                    return { default: module[exportName] };
                } else if (module.default) {
                    return module;
                } else {
                    throw new Error(`Export '${exportName}' not found in module ${importPath}`);
                }
            } catch (error) {
                throw new Error(`Failed to load component '${name}' from ${importPath}: ${error.message}`);
            }
        };
    }

    /**
     * Get the import path for a component
     * @private
     * @param {string} name - Component name
     * @param {Object} options - Component options
     * @returns {string} Import path
     */
    getImportPath(name, options) {
        if (options.path) {
            return options.path;
        }

        const filename = options.filename || this.getConventionalFilename(name);
        return `${this.basePath}${filename}`;
    }

    /**
     * Get conventional filename for a component
     * @private
     * @param {string} name - Component name
     * @returns {string} Filename
     */
    getConventionalFilename(name) {
        const pascalName = this.toPascalCase(name);
        const extension = this.useMinified ? '.min' + this.fileExtension : this.fileExtension;
        return `${pascalName}${extension}`;
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
            basePath: this.basePath
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

        // Check for missing dependencies
        this.registry.forEach(comp => {
            if (comp.dependsOn) {
                comp.dependsOn.forEach(dep => {
                    if (!componentNames.has(dep)) {
                        errors.push(`Component '${comp.name}' depends on '${dep}' which is not in the registry`);
                    }
                });
            }
        });

        // Check for circular dependencies (simplified check)
        const hasCycles = this.detectCycles();
        if (hasCycles.length > 0) {
            errors.push(`Circular dependencies detected: ${hasCycles.join(', ')}`);
        }

        // Check for duplicate selectors
        const selectors = new Map();
        this.registry.forEach(comp => {
            if (selectors.has(comp.selector)) {
                warnings.push(`Duplicate selector '${comp.selector}' used by '${comp.name}' and '${selectors.get(comp.selector)}'`);
            } else {
                selectors.set(comp.selector, comp.name);
            }
        });

        return {
            valid: errors.length === 0,
            errors,
            warnings
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
     * Create a new registry with different base configuration
     * @param {Object} options - New configuration options
     * @returns {ComponentRegistry} New registry instance
     */
    fork(options = {}) {
        return new ComponentRegistry({
            basePath: this.basePath,
            defaultPriority: this.defaultPriority,
            fileExtension: this.fileExtension,
            useMinified: this.useMinified,
            ...options
        });
    }

    /**
     * Static factory method for creating a registry with common configurations
     * @param {'dev'|'prod'|'custom'} preset - Configuration preset
     * @param {Object} [options={}] - Additional options
     * @returns {ComponentRegistry} Configured registry instance
     */
    static create(preset = 'dev', options = {}) {
        const presets = {
            dev: {
                basePath: '/dist/esm/components/',
                useMinified: false,
                fileExtension: '.js'
            },
            production: {
                basePath: '/dist/esm/components/',
                useMinified: true,
                fileExtension: '.js'
            },
            custom: {}
        };

        const config = { ...presets[preset], ...options };
        return new ComponentRegistry(config);
    }
}