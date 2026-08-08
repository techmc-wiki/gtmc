package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	corepdf "github.com/pdfcpu/pdfcpu/pkg/pdfcpu"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/types"
)

type postprocessOptions struct {
	Cover      string
	Body       string
	Out        string
	Outlines   string
	Background string
	Title      string
	Subject    string
	Author     string
}

type outlineNode struct {
	Title    string        `json:"title"`
	Page     int           `json:"page"`
	Children []outlineNode `json:"children"`
}

func postprocess(opts postprocessOptions) error {
	coverPages, err := pdfPageCount(opts.Cover)
	if err != nil {
		return fmt.Errorf("count cover pages: %w", err)
	}
	bodyPages, err := pdfPageCount(opts.Body)
	if err != nil {
		return fmt.Errorf("count body pages: %w", err)
	}
	outlineBytes, err := os.ReadFile(opts.Outlines)
	if err != nil {
		return fmt.Errorf("read outlines: %w", err)
	}
	var tree []outlineNode
	if err := json.Unmarshal(outlineBytes, &tree); err != nil {
		return fmt.Errorf("parse outlines: %w", err)
	}
	if len(tree) == 0 {
		return errors.New("outline JSON must contain at least one root item")
	}
	if _, _, _, err := validateHexColor(opts.Background); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(opts.Out), 0o755); err != nil {
		return fmt.Errorf("create output directory: %w", err)
	}

	temp, err := os.CreateTemp(filepath.Dir(opts.Out), ".pdfgen-merge-*.pdf")
	if err != nil {
		return err
	}
	tempName := temp.Name()
	defer os.Remove(tempName)
	if err := mergeBodyBase(temp, opts.Body, opts.Cover); err != nil {
		temp.Close()
		return err
	}
	if err := temp.Close(); err != nil {
		return err
	}
	ctx, err := readPDFContext(tempName, model.MERGECREATE)
	if err != nil {
		return fmt.Errorf("read merged PDF: %w", err)
	}
	if ctx.PageCount != bodyPages+coverPages {
		return fmt.Errorf("merged page count %d, want %d", ctx.PageCount, bodyPages+coverPages)
	}
	if err := prependBackground(ctx, opts.Background); err != nil {
		return err
	}
	bookmarks := make([]corepdf.Bookmark, 0, len(tree))
	for _, node := range tree {
		bookmarks = append(bookmarks, convertBookmark(node, coverPages))
	}
	if err := corepdf.AddBookmarks(ctx, bookmarks, true); err != nil {
		return fmt.Errorf("write outlines: %w", err)
	}
	properties := map[string]string{}
	if opts.Title != "" {
		properties["Title"] = opts.Title
	}
	if opts.Subject != "" {
		properties["Subject"] = opts.Subject
	}
	if opts.Author != "" {
		properties["Author"] = opts.Author
	}
	if len(properties) > 0 {
		if err := corepdf.PropertiesAdd(ctx, properties); err != nil {
			return fmt.Errorf("set metadata: %w", err)
		}
	}
	output, err := os.CreateTemp(filepath.Dir(opts.Out), ".pdfgen-out-*.pdf")
	if err != nil {
		return err
	}
	outputName := output.Name()
	defer os.Remove(outputName)
	if err := api.WriteContext(ctx, output); err != nil {
		output.Close()
		return fmt.Errorf("write output PDF: %w", err)
	}
	if err := output.Close(); err != nil {
		return err
	}
	if err := os.Rename(outputName, opts.Out); err != nil {
		return fmt.Errorf("publish output PDF: %w", err)
	}
	return nil
}

func mergeBodyBase(dst io.Writer, bodyPath, coverPath string) error {
	body, err := os.Open(bodyPath)
	if err != nil {
		return fmt.Errorf("open body PDF: %w", err)
	}
	defer body.Close()
	cover, err := os.Open(coverPath)
	if err != nil {
		return fmt.Errorf("open cover PDF: %w", err)
	}
	defer cover.Close()
	conf := model.NewDefaultConfiguration()
	conf.CreateBookmarks = false
	conf.MergeBookmarkMode = model.MergeBookmarkModePreserve
	conf.OptimizeBeforeWriting = false
	if err := api.MergeRaw([]io.ReadSeeker{cover, body}, dst, false, conf); err != nil {
		return fmt.Errorf("merge body and cover: %w", err)
	}
	return nil
}

func prependBackground(ctx *model.Context, value string) error {
	r, g, b, err := validateHexColor(value)
	if err != nil {
		return err
	}
	for pageNr := 1; pageNr <= ctx.PageCount; pageNr++ {
		pageDict, _, inherited, err := ctx.PageDict(pageNr, false)
		if err != nil {
			return fmt.Errorf("background page %d: %w", pageNr, err)
		}
		if inherited == nil || inherited.MediaBox == nil {
			return fmt.Errorf("background page %d: missing media box", pageNr)
		}
		stream := fmt.Sprintf("q %.4f %.4f %.4f rg 0 0 %s %s re f Q\n", r, g, b, formatPDFNumber(inherited.MediaBox.Width()), formatPDFNumber(inherited.MediaBox.Height()))
		bgRef, err := ctx.StreamDictIndRef([]byte(stream))
		if err != nil {
			return fmt.Errorf("background page %d stream: %w", pageNr, err)
		}
		contents, found := pageDict.Find("Contents")
		if !found || contents == nil {
			pageDict.Update("Contents", *bgRef)
			continue
		}
		if existing, ok := contents.(types.Array); ok {
			next := make(types.Array, 0, len(existing)+1)
			next = append(next, *bgRef)
			next = append(next, existing...)
			pageDict.Update("Contents", next)
		} else {
			pageDict.Update("Contents", types.Array{*bgRef, contents})
		}
	}
	return nil
}
func formatPDFNumber(value float64) string {
	return strings.TrimRight(strings.TrimRight(fmt.Sprintf("%.4f", value), "0"), ".")
}
func convertBookmark(node outlineNode, coverPages int) corepdf.Bookmark {
	children := make([]corepdf.Bookmark, 0, len(node.Children))
	for _, child := range node.Children {
		children = append(children, convertBookmark(child, coverPages))
	}
	return corepdf.Bookmark{Title: node.Title, PageFrom: node.Page + coverPages + 1, Kids: children}
}
