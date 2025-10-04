export type RequestIdListener = (requestId: string | null) => void;

class DebugEventEmitter {
  private requestIdListeners = new Set<RequestIdListener>();

  onRequestId(listener: RequestIdListener): () => void {
    this.requestIdListeners.add(listener);
    return () => this.requestIdListeners.delete(listener);
  }

  emitRequestId(requestId: string | null): void {
    this.requestIdListeners.forEach(listener => listener(requestId));
  }
}

export const debugEvents = new DebugEventEmitter();

export const recordRequestId = (requestId: string | null) => {
  debugEvents.emitRequestId(requestId ?? null);
};
