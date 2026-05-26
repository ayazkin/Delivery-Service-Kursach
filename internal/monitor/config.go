package monitor

import (
	"os"
	"strings"
)

type Config struct {
	Host  string
	Port  string
	Kafka KafkaConfig
}

type KafkaConfig struct {
	Brokers []string
	GroupID string
	Topics  Topics
}

type Topics struct {
	Orders    string
	Couriers  string
	Locations string
}

func LoadConfig() Config {
	return Config{
		Host: getEnv("MONITOR_HOST", "0.0.0.0"),
		Port: getEnv("MONITOR_PORT", "8090"),
		Kafka: KafkaConfig{
			Brokers: splitCSV(getEnv("KAFKA_BROKERS", "localhost:9092")),
			GroupID: getEnv("KAFKA_GROUP_ID", "delivery-monitor-service"),
			Topics: Topics{
				Orders:    getEnv("KAFKA_TOPIC_ORDERS", "orders"),
				Couriers:  getEnv("KAFKA_TOPIC_COURIERS", "couriers"),
				Locations: getEnv("KAFKA_TOPIC_LOCATIONS", "locations"),
			},
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return defaultValue
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))

	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			result = append(result, part)
		}
	}

	return result
}
