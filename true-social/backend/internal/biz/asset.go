package biz

import (
	"context"

	"github.com/peterlee/true-social/backend/internal/model"
)

type AssetRepo interface {
	EnsureIndexes(ctx context.Context) error
	EnsureDefaultTokenMeta(ctx context.Context) error
	ListWhitelistedTokenMeta(ctx context.Context) ([]*model.TokenMeta, error)
	UpsertKline(ctx context.Context, item *model.KlineData) error
	SetLatestKline(ctx context.Context, rowKey string, value *model.RedisKlineValue) error
	SetClosedLatestKline(ctx context.Context, rowKey string, value *model.RedisKlineValue) error
	GetLatestKline(ctx context.Context, rowKey string) (*model.RedisKlineValue, error)
	DeleteKlineCache(ctx context.Context, rowKey string) error
}

func (u *AssetUsecase) EnsureIndexes(ctx context.Context) error {
	return u.repo.EnsureIndexes(ctx)
}

func (u *AssetUsecase) EnsureDefaultTokenMeta(ctx context.Context) error {
	return u.repo.EnsureDefaultTokenMeta(ctx)
}

func (u *AssetUsecase) ListWhitelistedTokenMeta(ctx context.Context) ([]*model.TokenMeta, error) {
	return u.repo.ListWhitelistedTokenMeta(ctx)
}

func (u *AssetUsecase) UpsertKline(ctx context.Context, item *model.KlineData) error {
	return u.repo.UpsertKline(ctx, item)
}

func (u *AssetUsecase) SetLatestKline(ctx context.Context, rowKey string, value *model.RedisKlineValue) error {
	return u.repo.SetLatestKline(ctx, rowKey, value)
}

func (u *AssetUsecase) SetClosedLatestKline(ctx context.Context, rowKey string, value *model.RedisKlineValue) error {
	return u.repo.SetClosedLatestKline(ctx, rowKey, value)
}

func (u *AssetUsecase) GetLatestKline(ctx context.Context, rowKey string) (*model.RedisKlineValue, error) {
	return u.repo.GetLatestKline(ctx, rowKey)
}

func (u *AssetUsecase) DeleteKlineCache(ctx context.Context, rowKey string) error {
	return u.repo.DeleteKlineCache(ctx, rowKey)
}
