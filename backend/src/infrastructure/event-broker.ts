export interface DomainEvent {
  type: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

type EventHandler = (event: DomainEvent) => void;

export interface EventBroker {
  publish(event: DomainEvent): void;
  subscribe(eventType: string, handler: EventHandler): () => void;
}

export class InMemoryEventBroker implements EventBroker {
  private readonly subscribers = new Map<string, Set<EventHandler>>();

  publish(event: DomainEvent): void {
    const handlers = this.subscribers.get(event.type);
    if (!handlers || handlers.size === 0) {
      return;
    }

    for (const handler of handlers) {
      handler(event);
    }
  }

  subscribe(eventType: string, handler: EventHandler): () => void {
    const handlers = this.subscribers.get(eventType) ?? new Set<EventHandler>();
    handlers.add(handler);
    this.subscribers.set(eventType, handlers);

    return () => {
      const current = this.subscribers.get(eventType);
      if (!current) {
        return;
      }
      current.delete(handler);
      if (current.size === 0) {
        this.subscribers.delete(eventType);
      }
    };
  }
}
