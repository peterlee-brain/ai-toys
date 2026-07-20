package binance

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/peterlee/true-social/backend/internal/conf"
)

type Client struct {
	restEndpoint string
	wsEndpoint   string
	httpClient   *http.Client
}

func NewClient(c *conf.DataBinance) *Client {
	return &Client{
		restEndpoint: strings.TrimRight(c.RestEndpoint, "/"),
		wsEndpoint:   strings.TrimRight(c.WebsocketEndpoint, "/"),
		httpClient:   &http.Client{Timeout: 10 * time.Second},
	}
}

type Kline struct {
	Symbol    string
	Interval  string
	OpenTime  int64
	CloseTime int64
	Open      string
	High      string
	Low       string
	Close     string
	Volume    string
	EventTime int64
	IsFinal   bool
}

func (c *Client) GetKlines(ctx context.Context, symbol, interval string, startTime, endTime int64, limit int) ([]Kline, error) {
	if limit <= 0 {
		limit = 3
	}
	values := url.Values{}
	values.Set("symbol", strings.ToUpper(symbol))
	values.Set("interval", interval)
	values.Set("limit", strconv.Itoa(limit))
	if startTime > 0 {
		values.Set("startTime", strconv.FormatInt(startTime, 10))
	}
	if endTime > 0 {
		values.Set("endTime", strconv.FormatInt(endTime, 10))
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.restEndpoint+"/api/v3/klines?"+values.Encode(), nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("binance klines status: %s", resp.Status)
	}

	var raw [][]any
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	out := make([]Kline, 0, len(raw))
	for _, row := range raw {
		if len(row) < 7 {
			continue
		}
		openTime, _ := numberToInt64(row[0])
		closeTime, _ := numberToInt64(row[6])
		out = append(out, Kline{
			Symbol:    strings.ToUpper(symbol),
			Interval:  interval,
			OpenTime:  openTime,
			CloseTime: closeTime,
			Open:      toString(row[1]),
			High:      toString(row[2]),
			Low:       toString(row[3]),
			Close:     toString(row[4]),
			Volume:    toString(row[5]),
			EventTime: time.Now().UnixMilli(),
			IsFinal:   closeTime < time.Now().UnixMilli(),
		})
	}
	return out, nil
}

func (c *Client) WatchKline(ctx context.Context, symbol, interval string, handle func(Kline)) error {
	stream := strings.ToLower(symbol) + "@kline_" + interval
	conn, _, err := websocket.DefaultDialer.DialContext(ctx, c.wsEndpoint+"/"+stream, nil)
	if err != nil {
		return err
	}
	defer conn.Close()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
		_, raw, err := conn.ReadMessage()
		if err != nil {
			return err
		}
		var msg wsKlineMessage
		if err := json.Unmarshal(raw, &msg); err != nil {
			return err
		}
		handle(Kline{
			Symbol:    msg.Symbol,
			Interval:  msg.Kline.Interval,
			OpenTime:  int64(msg.Kline.OpenTime),
			CloseTime: int64(msg.Kline.CloseTime),
			Open:      msg.Kline.Open,
			High:      msg.Kline.High,
			Low:       msg.Kline.Low,
			Close:     msg.Kline.Close,
			Volume:    msg.Kline.Volume,
			EventTime: int64(msg.EventTime),
			IsFinal:   msg.Kline.IsFinal,
		})
	}
}

type wsKlineMessage struct {
	EventTime flexInt64
	Symbol    string
	Kline     struct {
		OpenTime  flexInt64
		CloseTime flexInt64
		Interval  string
		Open      string
		Close     string
		High      string
		Low       string
		Volume    string
		IsFinal   bool
	}
}

func (m *wsKlineMessage) UnmarshalJSON(raw []byte) error {
	var top map[string]json.RawMessage
	if err := json.Unmarshal(raw, &top); err != nil {
		return err
	}
	_ = json.Unmarshal(top["E"], &m.EventTime)
	_ = json.Unmarshal(top["s"], &m.Symbol)
	var k map[string]json.RawMessage
	if err := json.Unmarshal(top["k"], &k); err != nil {
		return err
	}
	_ = json.Unmarshal(k["t"], &m.Kline.OpenTime)
	_ = json.Unmarshal(k["T"], &m.Kline.CloseTime)
	_ = json.Unmarshal(k["i"], &m.Kline.Interval)
	_ = json.Unmarshal(k["o"], &m.Kline.Open)
	_ = json.Unmarshal(k["c"], &m.Kline.Close)
	_ = json.Unmarshal(k["h"], &m.Kline.High)
	_ = json.Unmarshal(k["l"], &m.Kline.Low)
	_ = json.Unmarshal(k["v"], &m.Kline.Volume)
	_ = json.Unmarshal(k["x"], &m.Kline.IsFinal)
	return nil
}

func numberToInt64(v any) (int64, bool) {
	switch x := v.(type) {
	case float64:
		return int64(x), true
	case json.Number:
		n, err := x.Int64()
		return n, err == nil
	default:
		return 0, false
	}
}

type flexInt64 int64

func (f *flexInt64) UnmarshalJSON(raw []byte) error {
	var n int64
	if len(raw) > 0 && raw[0] == '"' {
		var s string
		if err := json.Unmarshal(raw, &s); err != nil {
			return err
		}
		if s == "" {
			*f = 0
			return nil
		}
		parsed, err := strconv.ParseInt(s, 10, 64)
		if err != nil {
			return err
		}
		n = parsed
	} else {
		if err := json.Unmarshal(raw, &n); err != nil {
			return err
		}
	}
	*f = flexInt64(n)
	return nil
}

func toString(v any) string {
	switch x := v.(type) {
	case string:
		return x
	case float64:
		return strconv.FormatFloat(x, 'f', -1, 64)
	default:
		return fmt.Sprint(x)
	}
}
