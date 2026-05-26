package monitor

import (
	"context"
	"fmt"
	"log"

	"github.com/IBM/sarama"
)

type Consumer struct {
	group  sarama.ConsumerGroup
	topics []string
	store  *Store
	broker *Broker
}

func NewConsumer(cfg KafkaConfig, store *Store, broker *Broker) (*Consumer, error) {
	saramaConfig := sarama.NewConfig()
	saramaConfig.Consumer.Group.Rebalance.Strategy = sarama.NewBalanceStrategyRoundRobin()
	saramaConfig.Consumer.Offsets.Initial = sarama.OffsetOldest

	group, err := sarama.NewConsumerGroup(cfg.Brokers, cfg.GroupID, saramaConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create monitor consumer group: %w", err)
	}

	return &Consumer{
		group:  group,
		topics: []string{cfg.Topics.Orders, cfg.Topics.Couriers, cfg.Topics.Locations},
		store:  store,
		broker: broker,
	}, nil
}

func (c *Consumer) Start(ctx context.Context) {
	for {
		if err := c.group.Consume(ctx, c.topics, c); err != nil {
			if ctx.Err() != nil {
				return
			}
			log.Printf("monitor consumer error: %v", err)
		}

		if ctx.Err() != nil {
			return
		}
	}
}

func (c *Consumer) Close() error {
	return c.group.Close()
}

func (c *Consumer) Setup(sarama.ConsumerGroupSession) error {
	return nil
}

func (c *Consumer) Cleanup(sarama.ConsumerGroupSession) error {
	return nil
}

func (c *Consumer) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
	for {
		select {
		case <-session.Context().Done():
			return nil
		case message, ok := <-claim.Messages():
			if !ok {
				return nil
			}

			event, err := ParseMonitoredEvent(message.Value, message.Topic, message.Partition, message.Offset)
			if err != nil {
				log.Printf(
					"failed to parse monitor event topic=%s partition=%d offset=%d: %v",
					message.Topic,
					message.Partition,
					message.Offset,
					err,
				)
				session.MarkMessage(message, "")
				continue
			}

			c.store.Add(event)
			c.broker.Publish(event)
			session.MarkMessage(message, "")
		}
	}
}
