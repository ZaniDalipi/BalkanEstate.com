/**
 * Payment Provider Registry
 *
 * Central registration point for all payment provider adapters.
 * The registry follows the Open/Closed Principle:
 * - Open for extension: add new providers by importing and registering them
 * - Closed for modification: existing code never needs to change
 *
 * To add a new provider:
 * 1. Create backend/src/services/providers/<name>Adapter.ts implementing IPaymentProvider
 * 2. Import and register it below
 * That's it — the universal webhook controller, payment factory, and routes
 * all discover providers automatically through this registry.
 */

import { IPaymentProvider } from '../../interfaces/IPaymentProvider';
import { payseraAdapter } from './payseraAdapter';
import { webhookLogger } from '../../utils/logger';

class ProviderRegistry {
  private providers = new Map<string, IPaymentProvider>();

  /**
   * Register a payment provider adapter.
   */
  public register(provider: IPaymentProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Get a provider by name, or null if not found.
   */
  public get(name: string): IPaymentProvider | null {
    return this.providers.get(name) || null;
  }

  /**
   * Get all registered providers.
   */
  public getAll(): IPaymentProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get all configured (ready-to-use) providers.
   */
  public getConfigured(): IPaymentProvider[] {
    return this.getAll().filter(p => p.isConfigured());
  }

  /**
   * Get all registered provider names.
   */
  public getNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get all providers that require raw body for webhook verification.
   * Used by the server to know which webhook paths should skip JSON parsing.
   */
  public getProvidersRequiringRawBody(): IPaymentProvider[] {
    return this.getAll().filter(p => p.requiresRawBody());
  }

  /**
   * Log the status of all registered providers on startup.
   */
  public logStatus(): void {
    for (const provider of this.getAll()) {
      if (provider.isConfigured()) {
        webhookLogger.info(`Payment provider configured: ${provider.displayName} (${provider.name})`);
      } else {
        webhookLogger.info(`Payment provider not configured: ${provider.displayName} (${provider.name})`);
      }
    }

    const configured = this.getConfigured();
    if (configured.length === 0) {
      webhookLogger.warn('No payment providers are configured. Set environment variables to enable payments.');
    }
  }
}

// Create and populate the registry
export const providerRegistry = new ProviderRegistry();

// Register all available providers
providerRegistry.register(payseraAdapter);

// To add a new provider, simply:
// import { newAdapter } from './newAdapter';
// providerRegistry.register(newAdapter);

export default providerRegistry;
