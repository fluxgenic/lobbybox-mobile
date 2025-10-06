export type ParcelEventListener = () => void;

const listeners = new Set<ParcelEventListener>();

export const parcelEvents = {
  subscribe(listener: ParcelEventListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  emitParcelCreated() {
    listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('parcelEvents listener error', error);
      }
    });
  },
};
