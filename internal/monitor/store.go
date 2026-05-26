package monitor

import "sync"

const maxStoredEvents = 100

type Store struct {
	mu     sync.RWMutex
	events []MonitoredEvent
}

func NewStore() *Store {
	return &Store{
		events: make([]MonitoredEvent, 0, maxStoredEvents),
	}
}

func (s *Store) Add(event MonitoredEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.events = append(s.events, cloneEvent(event))
	if len(s.events) > maxStoredEvents {
		s.events = s.events[len(s.events)-maxStoredEvents:]
	}
}

func (s *Store) List() []MonitoredEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()

	events := make([]MonitoredEvent, len(s.events))
	for i, event := range s.events {
		events[i] = cloneEvent(event)
	}

	return events
}

func cloneEvent(event MonitoredEvent) MonitoredEvent {
	event.Data = append(event.Data[:0:0], event.Data...)
	return event
}
