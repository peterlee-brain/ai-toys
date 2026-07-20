package data

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/peterlee/true-social/backend/internal/conf"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Data struct {
	redis     *redis.Client
	mongo     *mongo.Client
	db        *mongo.Database
	tokenMeta *mongo.Collection
	kline     *mongo.Collection
	mu        sync.RWMutex
	memMeta   map[string]any
	memKline  map[string]any
	memRedis  map[string]map[string]string
}

func NewData(ctx context.Context, c *conf.Data) (*Data, func(context.Context), error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:         c.Redis.Addr,
		Password:     c.Redis.Password,
		DB:           c.Redis.DB,
		DialTimeout:  c.Redis.DialTimeoutDuration(),
		ReadTimeout:  c.Redis.ReadTimeoutDuration(),
		WriteTimeout: c.Redis.WriteTimeoutDuration(),
	})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("connect redis failed, fallback to memory cache: %v", err)
		_ = rdb.Close()
		rdb = nil
	}

	mgo, err := mongo.Connect(ctx, options.Client().ApplyURI(c.Mongo.URI))
	if err != nil {
		log.Printf("connect mongo failed, fallback to memory store: %v", err)
		mgo = nil
	}
	if mgo != nil {
		if err := mgo.Ping(ctx, nil); err != nil {
			log.Printf("ping mongo failed, fallback to memory store: %v", err)
			_ = mgo.Disconnect(ctx)
			mgo = nil
		}
	}

	var db *mongo.Database
	var tokenMeta *mongo.Collection
	var kline *mongo.Collection
	if mgo != nil {
		db = mgo.Database(c.Mongo.Database)
		tokenMeta = db.Collection(defaultString(c.Mongo.TokenMetaCollection, "token_meta"))
		kline = db.Collection(defaultString(c.Mongo.KlineCollection, "token_price_minute"))
	}
	d := &Data{
		redis:     rdb,
		mongo:     mgo,
		db:        db,
		tokenMeta: tokenMeta,
		kline:     kline,
		memMeta:   make(map[string]any),
		memKline:  make(map[string]any),
		memRedis:  make(map[string]map[string]string),
	}

	cleanup := func(ctx context.Context) {
		if rdb != nil {
			if err := rdb.Close(); err != nil {
				log.Printf("close redis: %v", err)
			}
		}
		if mgo == nil {
			return
		}
		shutdownCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		if err := mgo.Disconnect(shutdownCtx); err != nil {
			log.Printf("disconnect mongo: %v", err)
		}
	}
	return d, cleanup, nil
}

func defaultString(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}

func (d *Data) usingMemoryMongo() bool {
	return d.tokenMeta == nil || d.kline == nil
}

func (d *Data) usingMemoryRedis() bool {
	return d.redis == nil
}
