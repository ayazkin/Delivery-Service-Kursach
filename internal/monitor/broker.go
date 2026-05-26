package monitor

import "sync"

const subscriberBufferSize = 16

type Broker struct {
	mu          sync.RWMutex
	subscribers map[chan MonitoredEvent]struct{}
}

func NewBroker() *Broker {
	return &Broker{
		subscribers: make(map[chan MonitoredEvent]struct{}),
	}
}

func (b *Broker) Subscribe() chan MonitoredEvent {
	ch := make(chan MonitoredEvent, subscriberBufferSize)

	b.mu.Lock()
	b.subscribers[ch] = struct{}{}
	b.mu.Unlock()

	return ch
}

func (b *Broker) Unsubscribe(ch chan MonitoredEvent) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if _, ok := b.subscribers[ch]; !ok {
		return
	}

	delete(b.subscribers, ch)
	close(ch)
}

func (b *Broker) Publish(event MonitoredEvent) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	for ch := range b.subscribers {
		select {
		case ch <- cloneEvent(event):
		default:
		}
	}
}
