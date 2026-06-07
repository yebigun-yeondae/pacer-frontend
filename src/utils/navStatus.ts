export type NavStatus = 'navigating' | 'measuring' | 'rerouting';

let _current: NavStatus = 'measuring';
const _listeners = new Set<(s: NavStatus) => void>();

export const navStatusStore = {
  get: (): NavStatus => _current,
  set: (s: NavStatus) => {
    _current = s;
    _listeners.forEach(fn => fn(s));
  },
  subscribe: (fn: (s: NavStatus) => void): (() => void) => {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};
