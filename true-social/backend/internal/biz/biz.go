package biz

type AssetUsecase struct {
	repo AssetRepo
}

func NewAssetUsecase(repo AssetRepo) *AssetUsecase {
	return &AssetUsecase{repo: repo}
}
