package translate

// SelectionContext mirrors POST /v1/translate body fields used for Kimi.
type SelectionContext struct {
	Selection string
	Sentence  string
}

// Result is the Popover translate response shape.
type Result struct {
	Word        string
	Lemma       string
	Pos         string
	Meaning     string
	Collocation string
}
