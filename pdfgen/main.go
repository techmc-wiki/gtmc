package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type cliError struct{ msg string }

func (e *cliError) Error() string { return e.msg }

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintf(os.Stderr, "pdfgen: %v\n", err)
		os.Exit(1)
	}
}

func run(args []string) error {
	if len(args) == 0 || args[0] == "-h" || args[0] == "--help" || args[0] == "help" {
		printUsage(os.Stdout)
		return nil
	}
	switch args[0] {
	case "render":
		return runRender(args[1:])
	case "postprocess":
		return runPostprocess(args[1:])
	case "pages":
		return runPages(args[1:])
	default:
		return fmt.Errorf("unknown command %q (try pdfgen -h)", args[0])
	}
}

func runRender(args []string) error {
	fs := flag.NewFlagSet("render", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	htmlPath := fs.String("html", "", "complete HTML file to render")
	outPath := fs.String("out", "", "output PDF path")
	mermaidJS := fs.String("mermaid-js", "", "Mermaid JavaScript asset to inject")
	fonts := fs.String("fonts", "", "comma-separated CSS font checks")
	reportPages := fs.Bool("report-pages", false, "report page count as final JSON line")
	reportDests := fs.Bool("report-dests", false, "report named destination page map as final JSON line")
	chromium := fs.String("chromium", "", "Chromium executable path")
	headerFooter := fs.Bool("header-footer", false, "enable the GTMC running header and folio footer")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if *htmlPath == "" || *outPath == "" {
		return errors.New("render requires --html and --out")
	}
	if err := renderPDF(context.Background(), renderOptions{
		HTMLPath: *htmlPath, OutPath: *outPath, MermaidJS: *mermaidJS,
		Fonts: splitCSV(*fonts), ReportPages: *reportPages, ReportDests: *reportDests,
		Chromium: *chromium, HeaderFooter: *headerFooter,
	}); err != nil {
		return err
	}
	return nil
}

func runPostprocess(args []string) error {
	fs := flag.NewFlagSet("postprocess", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	cover := fs.String("cover", "", "cover PDF path")
	body := fs.String("body", "", "body PDF path")
	out := fs.String("out", "", "merged output PDF path")
	outlines := fs.String("outlines", "", "outline JSON path")
	background := fs.String("background", "", "full-page background color (#RRGGBB)")
	title := fs.String("title", "", "document title")
	subject := fs.String("subject", "", "document subject")
	author := fs.String("author", "", "document author")
	if err := fs.Parse(args); err != nil {
		return err
	}
	for name, value := range map[string]string{"--cover": *cover, "--body": *body, "--out": *out, "--outlines": *outlines, "--background": *background} {
		if value == "" {
			return fmt.Errorf("postprocess requires %s", name)
		}
	}
	return postprocess(postprocessOptions{Cover: *cover, Body: *body, Out: *out, Outlines: *outlines, Background: *background, Title: *title, Subject: *subject, Author: *author})
}

func runPages(args []string) error {
	fs := flag.NewFlagSet("pages", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	if err := fs.Parse(args); err != nil {
		return err
	}
	if fs.NArg() != 1 {
		return errors.New("pages requires exactly one PDF path")
	}
	count, err := pdfPageCount(fs.Arg(0))
	if err != nil {
		return err
	}
	return writeJSON(map[string]int{"pages": count})
}

func splitCSV(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	var result []string
	for _, item := range strings.Split(value, ",") {
		if strings.TrimSpace(item) != "" {
			result = append(result, strings.TrimSpace(item))
		}
	}
	return result
}

func writeJSON(value any) error {
	enc := json.NewEncoder(os.Stdout)
	enc.SetEscapeHTML(false)
	return enc.Encode(value)
}

func printUsage(w *os.File) {
	fmt.Fprintln(w, "pdfgen renders complete HTML with headless Chromium and post-processes PDFs.")
	fmt.Fprintln(w, "")
	fmt.Fprintln(w, "Usage:")
	fmt.Fprintln(w, "  pdfgen render --html <file> --out <file> [--mermaid-js <file>] [--fonts <comma-separated list>] [--header-footer] [--report-pages] [--report-dests] [--chromium <executable>]")
	fmt.Fprintln(w, "  pdfgen postprocess --cover <file> --body <file> --out <file> --outlines <json> --background <#RRGGBB> --title <s> --subject <s> --author <s>")
	fmt.Fprintln(w, "  pdfgen pages <file>")
	fmt.Fprintln(w, "")
	fmt.Fprintln(w, "Chromium resolution: --chromium, PDFGEN_CHROMIUM, then common Playwright/system locations.")
}

func absPath(path string) string {
	if path == "" {
		return ""
	}
	p, err := filepath.Abs(path)
	if err == nil {
		return p
	}
	return path
}
