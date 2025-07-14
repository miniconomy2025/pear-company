import pRetry, { AbortError } from "p-retry";
import CircuitBreaker from "opossum";
import type { AxiosError } from "axios";

/* ---- Types ---- */

export interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  factor?: number;
  isRetryable?: (err: unknown) => boolean;
}

export interface BreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
}

export interface ResilienceOptions<T extends (...args: any[]) => Promise<any>> {
  retry?: RetryOptions;
  breaker?: BreakerOptions;
  fallback?: (...args: Parameters<T>) => ReturnType<T> | Promise<ReturnType<T>>;
}

function defaultIsRetryable(err: unknown): boolean {
  if ((err as AxiosError).isAxiosError) {
    const axErr = err as AxiosError;
    if (!axErr.response) return true;
    return [429, 502, 503, 504].includes(axErr.response.status);
  }
  return false;
}

export function resilient<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  opts: ResilienceOptions<T> = {}
): T {
  const {
    retry = {},
    breaker = {
      timeout: 6000,
      errorThresholdPercentage: 50,
      resetTimeout: 15000,
    },
    fallback,
  } = opts;

  const wrapped = (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const retryable = () =>
      pRetry(
        async () => {
          try {
            return await fn(...args);
          } catch (err) {
            const isRetryable = retry.isRetryable ?? defaultIsRetryable;
            if (!isRetryable(err)) {
              throw new AbortError((err as Error).message);
            }
            throw err;
          }
        },
        {
          retries: retry.retries ?? 3,
          factor: retry.factor ?? 2,
          minTimeout: retry.minTimeout ?? 300,
          maxTimeout: retry.maxTimeout ?? 2000,
          onFailedAttempt: (e) => {
            console.warn(
              `[resilience] retry ${e.attemptNumber}/${e.retriesLeft + e.attemptNumber}:`,
              e.message
            );
          },
        }
      );

    const breakerInstance = new CircuitBreaker(retryable, breaker);

    if (fallback) breakerInstance.fallback((...args: Parameters<T>) => fallback(...args));

    breakerInstance.on("open", () => console.warn("[resilience] breaker OPEN"));
    breakerInstance.on("halfOpen", () => console.info("[resilience] breaker HALF‑OPEN"));
    breakerInstance.on("close", () => console.info("[resilience] breaker CLOSED"));

    return breakerInstance.fire();
  };

  return wrapped as T;
}
