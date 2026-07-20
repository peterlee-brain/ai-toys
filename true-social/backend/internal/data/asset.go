package data

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/peterlee/true-social/backend/internal/model"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (d *Data) EnsureIndexes(ctx context.Context) error {
	if d.usingMemoryMongo() {
		return nil
	}
	_, err := d.tokenMeta.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "is_whitelisted", Value: 1}}},
		{Keys: bson.D{{Key: "chain", Value: 1}, {Key: "token", Value: 1}}, Options: options.Index().SetUnique(true)},
	})
	if err != nil {
		return err
	}

	_, err = d.kline.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "chain", Value: 1}, {Key: "token", Value: 1}, {Key: "minute_ts", Value: -1}}},
		{Keys: bson.D{{Key: "minute_ts", Value: 1}}},
	})
	return err
}

func (d *Data) EnsureDefaultTokenMeta(ctx context.Context) error {
	if d.usingMemoryMongo() {
		meta := model.DefaultETHTokenMeta()
		d.mu.Lock()
		d.memMeta[meta.ID] = meta
		d.mu.Unlock()
		return nil
	}
	count, err := d.tokenMeta.CountDocuments(ctx, bson.M{"is_whitelisted": true})
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	meta := model.DefaultETHTokenMeta()
	_, err = d.tokenMeta.UpdateByID(ctx, meta.ID, bson.M{"$set": meta}, options.Update().SetUpsert(true))
	return err
}

func (d *Data) ListWhitelistedTokenMeta(ctx context.Context) ([]*model.TokenMeta, error) {
	if d.usingMemoryMongo() {
		d.mu.RLock()
		defer d.mu.RUnlock()
		out := make([]*model.TokenMeta, 0, len(d.memMeta))
		for _, v := range d.memMeta {
			item, ok := v.(*model.TokenMeta)
			if ok && item.IsWhitelisted {
				out = append(out, item)
			}
		}
		return out, nil
	}
	cur, err := d.tokenMeta.Find(ctx, bson.M{"is_whitelisted": true})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []*model.TokenMeta
	for cur.Next(ctx) {
		var item model.TokenMeta
		if err := cur.Decode(&item); err != nil {
			return nil, err
		}
		out = append(out, &item)
	}
	return out, cur.Err()
}

func (d *Data) UpsertKline(ctx context.Context, item *model.KlineData) error {
	if d.usingMemoryMongo() {
		now := time.Now()
		if item.CT.IsZero() {
			item.CT = now
		}
		item.UT = now
		d.mu.Lock()
		d.memKline[item.ID] = item
		d.mu.Unlock()
		return nil
	}
	now := time.Now()
	if item.CT.IsZero() {
		item.CT = now
	}
	item.UT = now
	_, err := d.kline.UpdateByID(ctx, item.ID, bson.M{
		"$setOnInsert": bson.M{"ct": item.CT},
		"$set": bson.M{
			"chain":     item.Chain,
			"token":     item.Token,
			"minute_ts": item.MinuteTS,
			"price_usd": item.PriceUSD,
			"source":    item.Source,
			"ut":        item.UT,
		},
	}, options.Update().SetUpsert(true))
	return err
}

func (d *Data) SetLatestKline(ctx context.Context, rowKey string, value *model.RedisKlineValue) error {
	return d.hsetJSON(ctx, model.RedisKeyKlineLatest, rowKey, value)
}

func (d *Data) SetClosedLatestKline(ctx context.Context, rowKey string, value *model.RedisKlineValue) error {
	return d.hsetJSON(ctx, model.RedisKeyKlineClosedLatest, rowKey, value)
}

func (d *Data) GetLatestKline(ctx context.Context, rowKey string) (*model.RedisKlineValue, error) {
	if d.usingMemoryRedis() {
		d.mu.RLock()
		raw := d.memRedis[model.RedisKeyKlineLatest][rowKey]
		d.mu.RUnlock()
		if raw == "" {
			return nil, nil
		}
		var out model.RedisKlineValue
		if err := json.Unmarshal([]byte(raw), &out); err != nil {
			return nil, err
		}
		return &out, nil
	}
	raw, err := d.redis.HGet(ctx, model.RedisKeyKlineLatest, rowKey).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, nil
		}
		return nil, err
	}
	var out model.RedisKlineValue
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (d *Data) DeleteKlineCache(ctx context.Context, rowKey string) error {
	if d.usingMemoryRedis() {
		d.mu.Lock()
		delete(d.memRedis[model.RedisKeyKlineLatest], rowKey)
		delete(d.memRedis[model.RedisKeyKlineClosedLatest], rowKey)
		d.mu.Unlock()
		return nil
	}
	if err := d.redis.HDel(ctx, model.RedisKeyKlineLatest, rowKey).Err(); err != nil {
		return err
	}
	return d.redis.HDel(ctx, model.RedisKeyKlineClosedLatest, rowKey).Err()
}

func (d *Data) hsetJSON(ctx context.Context, key, field string, value any) error {
	raw, err := json.Marshal(value)
	if err != nil {
		return err
	}
	if d.usingMemoryRedis() {
		d.mu.Lock()
		if d.memRedis[key] == nil {
			d.memRedis[key] = make(map[string]string)
		}
		d.memRedis[key][field] = string(raw)
		d.mu.Unlock()
		return nil
	}
	return d.redis.HSet(ctx, key, field, string(raw)).Err()
}
