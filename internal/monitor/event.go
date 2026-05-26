package monitor

import (
	"encoding/json"
	"fmt"
)

type MonitoredEvent struct {
	ID        string          `json:"id"`
	Type      string          `json:"type"`
	Timestamp string          `json:"timestamp"`
	Topic     string          `json:"topic"`
	Partition int32           `json:"partition"`
	Offset    int64           `json:"offset"`
	Data      json.RawMessage `json:"data"`
}

type rawEvent struct {
	ID        string          `json:"id"`
	Type      string          `json:"type"`
	Timestamp string          `json:"timestamp"`
	Data      json.RawMessage `json:"data"`
}

func ParseMonitoredEvent(value []byte, topic string, partition int32, offset int64) (MonitoredEvent, error) {
	var raw rawEvent
	if err := json.Unmarshal(value, &raw); err != nil {
		return MonitoredEvent{}, fmt.Errorf("failed to unmarshal monitored event: %w", err)
	}

	if raw.Data == nil {
		raw.Data = json.RawMessage("null")
	}

	return MonitoredEvent{
		ID:        raw.ID,
		Type:      raw.Type,
		Timestamp: raw.Timestamp,
		Topic:     topic,
		Partition: partition,
		Offset:    offset,
		Data:      raw.Data,
	}, nil
}
