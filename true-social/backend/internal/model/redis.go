package model

import (
	"fmt"
	"hash/fnv"
	"strings"
)

const (
	RedisKeyKlineLatest       = "kline:latest"
	RedisKeyKlineClosedLatest = "kline:closed_latest"
)

func KlineRowKey(chain, token string) string {
	return strings.ToLower(chain + "#" + token)
}

func RedisKeyKlineLatestShard(rowKey string, shardCount int) string {
	if shardCount <= 1 {
		return RedisKeyKlineLatest
	}
	return fmt.Sprintf("%s:%d", RedisKeyKlineLatest, hashString(rowKey)%uint32(shardCount))
}

func hashString(s string) uint32 {
	h := fnv.New32a()
	_, _ = h.Write([]byte(s))
	return h.Sum32()
}
