export type AuthEventListener = () => void;

class AuthEventEmitter {
  private unauthorizedListeners = new Set<AuthEventListener>();

  onUnauthorized(listener: AuthEventListener): () => void {
    this.unauthorizedListeners.add(listener);
    return () => this.unauthorizedListeners.delete(listener);
  }

  emitUnauthorized(): void {
    this.unauthorizedListeners.forEach(listener => listener());
  }
}

export const authEvents = new AuthEventEmitter();
