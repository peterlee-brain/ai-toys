package translate

import "context"

// Translator translates selected English text for the reading Popover.
type Translator interface {
	Translate(ctx context.Context, in SelectionContext) (*Result, error)
}
