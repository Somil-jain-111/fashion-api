/**
 * Auto-mocking proxy for NestJS testing-module providers: any method accessed
 * on the returned object lazily becomes a `jest.fn()`, cached so repeated
 * access returns the same mock instance (needed for `.mockResolvedValue()`
 * calls to actually take effect on the instance the service under test uses).
 * Avoids hand-writing `{ findById: jest.fn(), save: jest.fn(), ... }` for
 * every repository/provider dependency across every spec.
 */
export function createMock<T extends object>(): jest.Mocked<T> {
  const cache = new Map<PropertyKey, jest.Mock>();

  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        // Without this, `prop === 'then'` would resolve to a jest.fn() too,
        // making the mock look "thenable" to any `await` on it — Nest's own
        // module compilation awaits provider instances, so that hangs forever
        // instead of throwing (a well-known Proxy-auto-mock gotcha).
        if (prop === 'then') {
          return undefined;
        }

        if (!cache.has(prop)) {
          cache.set(prop, jest.fn());
        }
        return cache.get(prop);
      },
    }
  ) as jest.Mocked<T>;
}

/**
 * A chainable TypeORM SelectQueryBuilder mock: every fluent method (where,
 * andWhere, leftJoinAndSelect, orderBy, skip, take, setParameter, ...)
 * returns the same mock so calls keep chaining; terminal methods
 * (getOne/getMany/getManyAndCount/getCount) are plain jest.fn()s to
 * `.mockResolvedValue(...)` per test.
 */
export function createChainableQueryBuilderMock(): any {
  const terminal = ['getOne', 'getMany', 'getManyAndCount', 'getCount', 'getRawMany', 'getRawOne'];
  const cache = new Map<PropertyKey, jest.Mock>();
  const qb: any = new Proxy(
    {},
    {
      get: (_target, prop) => {
        // Same "then" gotcha as createMock — must not look thenable.
        if (prop === 'then') {
          return undefined;
        }

        if (!cache.has(prop)) {
          const fn = terminal.includes(prop as string)
            ? jest.fn().mockResolvedValue(undefined)
            : jest.fn().mockReturnValue(qb);
          cache.set(prop, fn);
        }
        return cache.get(prop);
      },
    }
  );
  return qb;
}
