const listeners = new Set();
let nextId = 1;
const DEFAULT_DURATION = 3000;

function emit(event) {
  listeners.forEach((cb) => cb(event));
}

export function showToast(message, { variant = 'error', duration = DEFAULT_DURATION } = {}) {
  const id = nextId++;
  emit({ type: 'add', item: { id, message, variant } });
  setTimeout(() => emit({ type: 'remove', id }), duration);
  return id;
}

export function subscribeToasts(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const toast = {
  error: (msg) => showToast(msg, { variant: 'error' }),
  info: (msg) => showToast(msg, { variant: 'info' }),
};
