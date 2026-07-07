package conf

import (
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

type Bootstrap struct {
	App    *App    `yaml:"app"`
	Server *Server `yaml:"server"`
	Data   *Data   `yaml:"data"`
}

type App struct {
	Name string `yaml:"name"`
	Env  string `yaml:"env"`
}

type Server struct {
	HTTP   *ServerHTTP   `yaml:"http"`
	Worker *ServerWorker `yaml:"worker"`
}

type ServerHTTP struct {
	Addr    string `yaml:"addr"`
	Timeout string `yaml:"timeout"`
}

func (h *ServerHTTP) TimeoutDuration() time.Duration {
	return parseDuration(h.Timeout, 5*time.Second)
}

type ServerWorker struct {
	BNKlineSubworker *ServerBNKlineWorkerOption `yaml:"bn_kline_subworker"`
}

type ServerBNKlineWorkerOption struct {
	Mode                  string `yaml:"mode"`
	BackfillCron          string `yaml:"backfill_cron"`
	BackfillLookbackMins  int    `yaml:"backfill_lookback_minutes"`
	TokenMetaPollInterval string `yaml:"token_meta_poll_interval"`
	SentinelInterval      string `yaml:"sentinel_interval"`
	SeedDefaultSymbol     bool   `yaml:"seed_default_symbol"`
}

func (o *ServerBNKlineWorkerOption) BackfillLookback() time.Duration {
	if o.BackfillLookbackMins <= 0 {
		return time.Hour
	}
	return time.Duration(o.BackfillLookbackMins) * time.Minute
}

func (o *ServerBNKlineWorkerOption) TokenMetaPollDuration() time.Duration {
	return parseDuration(o.TokenMetaPollInterval, 5*time.Minute)
}

func (o *ServerBNKlineWorkerOption) SentinelDuration() time.Duration {
	return parseDuration(o.SentinelInterval, time.Minute)
}

type Data struct {
	Mongo   *DataMongo   `yaml:"mongo"`
	Redis   *DataRedis   `yaml:"redis"`
	Binance *DataBinance `yaml:"binance"`
}

type DataMongo struct {
	URI                 string `yaml:"uri"`
	Database            string `yaml:"database"`
	TokenMetaCollection string `yaml:"token_meta_collection"`
	KlineCollection     string `yaml:"kline_collection"`
}

type DataRedis struct {
	Addr         string `yaml:"addr"`
	Password     string `yaml:"password"`
	DB           int    `yaml:"db"`
	DialTimeout  string `yaml:"dial_timeout"`
	ReadTimeout  string `yaml:"read_timeout"`
	WriteTimeout string `yaml:"write_timeout"`
}

func (r *DataRedis) DialTimeoutDuration() time.Duration {
	return parseDuration(r.DialTimeout, 3*time.Second)
}

func (r *DataRedis) ReadTimeoutDuration() time.Duration {
	return parseDuration(r.ReadTimeout, 10*time.Second)
}

func (r *DataRedis) WriteTimeoutDuration() time.Duration {
	return parseDuration(r.WriteTimeout, 10*time.Second)
}

type DataBinance struct {
	WebsocketEndpoint string `yaml:"websocket_endpoint"`
	RestEndpoint      string `yaml:"rest_endpoint"`
	Interval          string `yaml:"interval"`
	RestLimitPerMin   int    `yaml:"rest_limit_per_minute"`
	SentinelLimit      int    `yaml:"sentinel_limit"`
}

func Load(path string) (*Bootstrap, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var cfg Bootstrap
	if err := yaml.Unmarshal(raw, &cfg); err != nil {
		return nil, err
	}
	cfg.applyDefaults()
	return &cfg, nil
}

func (b *Bootstrap) applyDefaults() {
	if b.App == nil {
		b.App = &App{Name: "svc-kline", Env: "development"}
	}
	if b.Server == nil {
		b.Server = &Server{}
	}
	if b.Server.HTTP == nil {
		b.Server.HTTP = &ServerHTTP{Addr: "0.0.0.0:8080", Timeout: "5s"}
	}
	if b.Server.Worker == nil {
		b.Server.Worker = &ServerWorker{}
	}
	if b.Data == nil {
		b.Data = &Data{}
	}
	if b.Data.Mongo == nil {
		b.Data.Mongo = &DataMongo{}
	}
	if b.Data.Mongo.Database == "" {
		b.Data.Mongo.Database = "keywa_asset"
	}
	if b.Data.Mongo.TokenMetaCollection == "" {
		b.Data.Mongo.TokenMetaCollection = "token_meta"
	}
	if b.Data.Mongo.KlineCollection == "" {
		b.Data.Mongo.KlineCollection = "token_price_minute"
	}
	if b.Data.Redis == nil {
		b.Data.Redis = &DataRedis{Addr: "127.0.0.1:6379"}
	}
	if b.Data.Binance == nil {
		b.Data.Binance = &DataBinance{}
	}
	if b.Data.Binance.WebsocketEndpoint == "" {
		b.Data.Binance.WebsocketEndpoint = "wss://stream.binance.com:9443/ws"
	}
	if b.Data.Binance.RestEndpoint == "" {
		b.Data.Binance.RestEndpoint = "https://api.binance.com"
	}
	if b.Data.Binance.Interval == "" {
		b.Data.Binance.Interval = "1m"
	}
	if b.Data.Binance.RestLimitPerMin <= 0 {
		b.Data.Binance.RestLimitPerMin = 1000
	}
	if b.Data.Binance.SentinelLimit <= 0 {
		b.Data.Binance.SentinelLimit = 3
	}
}

func parseDuration(s string, fallback time.Duration) time.Duration {
	if s == "" {
		return fallback
	}
	d, err := time.ParseDuration(s)
	if err != nil {
		return fallback
	}
	return d
}
