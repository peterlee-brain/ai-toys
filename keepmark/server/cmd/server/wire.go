//go:build wireinject
// +build wireinject

// The build tag makes sure the stub is not built in the final build.

package main

import (
	"log/slog"

	"server/internal/biz"
	"server/internal/conf"
	"server/internal/data"
	pkg "server/internal/pkg"
	"server/internal/server"
	"server/internal/service"

	"github.com/go-kratos/kratos/v3"
	"github.com/google/wire"
)

// wireApp init kratos application.
func wireApp(*conf.Server, *conf.Data, *conf.Ai, *slog.Logger) (*kratos.App, func(), error) {
	panic(wire.Build(server.ProviderSet, data.ProviderSet, pkg.ProviderSet, biz.ProviderSet, service.ProviderSet, newApp))
}
