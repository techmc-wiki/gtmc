package main

import (
	"errors"
	"fmt"
	"os"
	"sort"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/types"
)

func pdfPageCount(path string) (int, error) {
	ctx, err := readPDFContext(path, model.LISTINFO)
	if err != nil {
		return 0, fmt.Errorf("read PDF %s: %w", path, err)
	}
	return ctx.PageCount, nil
}

func readPDFContext(path string, cmd model.CommandMode) (*model.Context, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	conf := model.NewDefaultConfiguration()
	conf.Cmd = cmd
	conf.ValidationMode = model.ValidationRelaxed
	return api.ReadAndValidate(f, conf)
}

func extractNamedDestinations(path string) (map[string]int, error) {
	ctx, err := readPDFContext(path, model.LISTINFO)
	if err != nil {
		return nil, fmt.Errorf("read destinations from %s: %w", path, err)
	}
	pageRefs := make(map[int]int, ctx.PageCount)
	for i := 1; i <= ctx.PageCount; i++ {
		_, ref, _, err := ctx.PageDict(i, false)
		if err != nil {
			return nil, fmt.Errorf("read page %d: %w", i, err)
		}
		pageRefs[ref.ObjectNumber.Value()] = i - 1
	}
	result := map[string]int{}
	if ctx.Dests != nil {
		collectDestDict(ctx, ctx.Dests, pageRefs, result)
	}
	if err := ctx.LocateNameTree("Dests", false); err == nil && ctx.Names["Dests"] != nil {
		collectNameTree(ctx, ctx.Names["Dests"], pageRefs, result)
	}
	return result, nil
}

func collectDestDict(ctx *model.Context, dict types.Dict, pageRefs map[int]int, result map[string]int) {
	keys := make([]string, 0, len(dict))
	for key := range dict {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		value := dict[key]
		value = dereferenceObject(ctx, value)
		if index, ok := destinationPageIndex(ctx, value, pageRefs); ok {
			decoded, err := types.DecodeName(key)
			if err != nil {
				decoded = key
			}
			result[decoded] = index
		}
	}
}

func collectNameTree(ctx *model.Context, node *model.Node, pageRefs map[int]int, result map[string]int) {
	if node == nil {
		return
	}
	if len(node.Kids) > 0 {
		for _, child := range node.Kids {
			collectNameTree(ctx, child, pageRefs, result)
		}
	}
	if names, ok := node.D["Names"]; ok {
		arr := dereferenceObject(ctx, names)
		values, ok := arr.(types.Array)
		if !ok {
			return
		}
		for i := 0; i+1 < len(values); i += 2 {
			key, ok := nameTreeKey(ctx, values[i])
			if !ok {
				continue
			}
			if index, ok := destinationPageIndex(ctx, dereferenceObject(ctx, values[i+1]), pageRefs); ok {
				result[key] = index
			}
		}
	}
}

func nameTreeKey(ctx *model.Context, value types.Object) (string, bool) {
	value = dereferenceObject(ctx, value)
	switch v := value.(type) {
	case types.StringLiteral:
		return v.Value(), true
	case types.HexLiteral:
		decoded, err := types.StringLiteralToString(types.StringLiteral(v))
		if err == nil {
			return decoded, true
		}
		return string(v), true
	case types.Name:
		decoded, err := types.DecodeName(string(v))
		if err == nil {
			return decoded, true
		}
		return string(v), true
	default:
		return "", false
	}
}

func destinationPageIndex(ctx *model.Context, value types.Object, pageRefs map[int]int) (int, bool) {
	value = dereferenceObject(ctx, value)
	arr, ok := value.(types.Array)
	if !ok || len(arr) == 0 {
		return 0, false
	}
	page, ok := arr[0].(types.IndirectRef)
	if !ok {
		return 0, false
	}
	index, ok := pageRefs[page.ObjectNumber.Value()]
	return index, ok
}

func dereferenceObject(ctx *model.Context, value types.Object) types.Object {
	ref, ok := value.(types.IndirectRef)
	if !ok {
		return value
	}
	object, err := ctx.Dereference(ref)
	if err != nil || object == nil {
		return value
	}
	return object
}

func validateHexColor(value string) (float64, float64, float64, error) {
	value = stringsTrimPrefix(value, "#")
	if len(value) != 6 {
		return 0, 0, 0, errors.New("background must be a 6-digit RGB color such as #f5f4ef")
	}
	var rgb [3]uint64
	for i := range rgb {
		var err error
		rgb[i], err = parseHexByte(value[i*2 : i*2+2])
		if err != nil {
			return 0, 0, 0, errors.New("background must be a 6-digit RGB color such as #f5f4ef")
		}
	}
	return float64(rgb[0]) / 255, float64(rgb[1]) / 255, float64(rgb[2]) / 255, nil
}

func stringsTrimPrefix(value, prefix string) string {
	if len(value) >= len(prefix) && value[:len(prefix)] == prefix {
		return value[len(prefix):]
	}
	return value
}
func parseHexByte(value string) (uint64, error) {
	var n uint64
	if len(value) != 2 {
		return 0, errors.New("invalid hex")
	}
	for _, c := range value {
		n *= 16
		switch {
		case c >= '0' && c <= '9':
			n += uint64(c - '0')
		case c >= 'a' && c <= 'f':
			n += uint64(c - 'a' + 10)
		case c >= 'A' && c <= 'F':
			n += uint64(c - 'A' + 10)
		default:
			return 0, errors.New("invalid hex")
		}
	}
	return n, nil
}
