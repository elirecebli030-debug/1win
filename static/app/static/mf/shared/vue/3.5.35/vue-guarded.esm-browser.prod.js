// Guarded Vue runtime — detects/suppresses infinite watcher loops in production. See patches/vue+3.5.26.md

export * from './vue.esm-browser.prod.js';

import {
  getCurrentInstance,
  watch as _watch,
  watchEffect as _watchEffect,
} from './vue.esm-browser.prod.js';

let globalEnabled = true;

const tickCounters = new Map();
let resetScheduled = false;

function scheduleCounterReset() {
  if (!resetScheduled) {
    resetScheduled = true;
    queueMicrotask(() => {
      tickCounters.clear();
      resetScheduled = false;
    });
  }
}

function incrementAndGet(id) {
  scheduleCounterReset();
  const count = (tickCounters.get(id) || 0) + 1;
  tickCounters.set(id, count);
  return count;
}

function resolveComponentName() {
  try {
    const instance = getCurrentInstance();
    return (
      instance?.type?.__name ??
      instance?.type?.name ??
      undefined
    );
  } catch {
    return undefined;
  }
}

let globalOnLoop;

function defaultOnLoop(info) {
  console.error(
    `[WatcherLoopGuard] Watcher loop detected (>${info.limit} calls/tick)\n` +
      `  Component: ${info.componentName ?? '<unknown>'}\n` +
      `  Source: ${info.source}` +
      (info.watchValues
        ? `\n  New value: ${JSON.stringify(info.watchValues.newValue)}\n  Old value: ${JSON.stringify(info.watchValues.oldValue)}`
        : ''),
    '\n' + info.stack,
  );
}

function createGuard(sourceDesc, limit, onLoop) {
  const id = Symbol('watcher-guard');
  const componentName = resolveComponentName();

  return (watchValues) => {
    if (!globalEnabled) return true;

    const count = incrementAndGet(id);

    if (count > limit) {
      if (count === limit + 1) {
        const info = {
          count,
          limit,
          componentName,
          source: sourceDesc,
          stack: new Error('WatcherLoopGuard').stack || '',
          watchValues,
        };
        onLoop(info);
        if (globalOnLoop) globalOnLoop(info);
      }
      return false;
    }

    return true;
  };
}

function createGuardedWatch(config) {
  const limit = config?.limit ?? 100;
  const onLoop = config?.onLoop ?? defaultOnLoop;

  return function guardedWatch(source, callback, options) {
    const sourceDesc =
      typeof source === 'function'
        ? `source: ${source.toString().slice(0, 100)}`
        : `callback: ${callback.toString().slice(0, 100)}`;
    const check = createGuard(sourceDesc, limit, onLoop);

    const wrappedCallback = (...args) => {
      if (!check({ newValue: args[0], oldValue: args[1] })) return;
      return callback(...args);
    };

    return _watch(source, wrappedCallback, options);
  };
}

function createGuardedWatchEffect(config) {
  const limit = config?.limit ?? 100;
  const onLoop = config?.onLoop ?? defaultOnLoop;

  return (effect, options) => {
    const check = createGuard(effect.toString().slice(0, 200), limit, onLoop);

    return _watchEffect((onCleanup) => {
      if (!check()) return;
      effect(onCleanup);
    }, options);
  };
}

const _cfg = typeof window !== 'undefined' && window.INITIAL_DATA?.watcherLoopGuard;

if (_cfg && _cfg.enabled === false) {
  globalEnabled = false;
}

const _limit = _cfg?.limit;

export const watch = createGuardedWatch(_limit ? { limit: _limit } : {});
export const watchEffect = createGuardedWatchEffect(_limit ? { limit: _limit } : {});

if (typeof window !== 'undefined') {
  window.__watcherLoopGuard = {
    setEnabled: (v) => {
      globalEnabled = !!v;
    },
    setOnLoop: (fn) => {
      globalOnLoop = typeof fn === 'function' ? fn : undefined;
    },
  };
}
