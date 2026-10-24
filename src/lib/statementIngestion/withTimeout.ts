/**
 * Runs one email's work, giving up after `ms`. The work can't be stopped
 * part-way, so it's told through `signal` instead, and checks it before it
 * changes anything: an email given up on adds no statement and fills in no last 4.
 */
export async function withTimeout<T>(work: (signal: AbortSignal) => Promise<T>, ms: number, onTimeout: () => T): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(onTimeout());
    }, ms);
  });
  try {
    return await Promise.race([work(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

