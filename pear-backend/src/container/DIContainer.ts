// Dependency Injection Pattern Implementation
export class DIContainer {
  private services = new Map<string, any>()
  private singletons = new Map<string, any>()

  // Register a service
  register<T>(name: string, factory: () => T, singleton = false): void {
    this.services.set(name, { factory, singleton })
  }

  // Resolve a service
  resolve<T>(name: string): T {
    const service = this.services.get(name)
    if (!service) {
      throw new Error(`Service ${name} not found`)
    }

    if (service.singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, service.factory())
      }
      return this.singletons.get(name)
    }

    return service.factory()
  }

  // Check if service exists
  has(name: string): boolean {
    return this.services.has(name)
  }
}

// Service locator for global access
export const container = new DIContainer()
