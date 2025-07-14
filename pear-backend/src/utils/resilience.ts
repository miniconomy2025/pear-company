import pRetry, { AbortError } from "p-retry";
import CircuitBreaker from "opossum";
import type { AxiosError } from "axios";

/* ---- Types ---- */

export interface RetryOptions {
  retries?: number;            // default 3
  minTimeout?: number;         // ms, default 300
  maxTimeout?: number;         // ms, default 2000
  factor?: number;             // exponential factor, default 2
  isRetryable?: (err: unknown) => boolean; // default: 5xx / network
}

export interface BreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
}

export interface ResilienceOptions<T> {
  retry?: RetryOptions;
  breaker?: BreakerOptions;
  fallback?: () => T | Promise<T>; // graceful degradation data
}

function defaultIsRetryable(err: unknown): boolean {
  if ((err as AxiosError).isAxiosError) {
    const axErr = err as AxiosError;
    if (!axErr.response) return true; // network/timeout
    return [429, 502, 503, 504].includes(axErr.response.status);
  }
  return false;
}

export function resilient<T>(
  fn: () => Promise<T>,
  opts: ResilienceOptions<T> = {}
): () => Promise<T> {
  /* ---- Retry wrapper ---- */
  const retryable = () =>
    pRetry(
      async () => {
        try {
          return await fn();
        } catch (err) {
          const isRetryable = opts.retry?.isRetryable ?? defaultIsRetryable;
          if (!isRetryable(err)) {
            throw new AbortError((err as Error).message);
          }
          throw err;
        }
      },
      {
        retries: opts.retry?.retries ?? 3,
        factor: opts.retry?.factor ?? 2,
        minTimeout: opts.retry?.minTimeout ?? 300,
        maxTimeout: opts.retry?.maxTimeout ?? 2000,
        onFailedAttempt: (e) => {
          console.warn(
            `[resilience] retry ${e.attemptNumber}/${e.retriesLeft + e.attemptNumber}:`,
            e.message
          );
        },
      }
    );


  /* ----  Circuit breaker ---- */
  const breaker = new CircuitBreaker(retryable, {
    timeout: opts.breaker?.timeout ?? 6000,
    errorThresholdPercentage: opts.breaker?.errorThresholdPercentage ?? 50,
    resetTimeout: opts.breaker?.resetTimeout ?? 15000,
  });

  if (opts.fallback) breaker.fallback(opts.fallback);

  breaker.on("open", () => console.warn("[resilience] breaker OPEN"));
  breaker.on("halfOpen", () => console.info("[resilience] breaker HALF‑OPEN"));
  breaker.on("close", () => console.info("[resilience] breaker CLOSED"));


  /* ---- Return wrapped fn ---- */
  return () => breaker.fire();
}