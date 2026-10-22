import { useSyncExternalStore } from 'react';

type Listener = () => void;

const listeners = new Set<Listener>();
const statusListeners = new Set<Listener>();

// Vrai pendant la synchro cloud qui suit une connexion : les écrans affichent alors des squelettes
let initialSyncing = false;

export const SyncEvent = {
  /** Notifie les écrans que le cache vient d'être actualisé depuis le cloud. */
  emit() {
    listeners.forEach((fn) => fn());
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  setInitialSyncing(value: boolean) {
    if (initialSyncing === value) return;
    initialSyncing = value;
    statusListeners.forEach((fn) => fn());
  },
  isInitialSyncing(): boolean {
    return initialSyncing;
  },
  subscribeStatus(fn: Listener): () => void {
    statusListeners.add(fn);
    return () => statusListeners.delete(fn);
  },
};

export function useInitialSyncing(): boolean {
  return useSyncExternalStore(SyncEvent.subscribeStatus, SyncEvent.isInitialSyncing);
}
