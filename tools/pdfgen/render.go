package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/cdproto/runtime"
	"github.com/chromedp/chromedp"
)

type renderOptions struct {
	HTMLPath     string
	OutPath      string
	MermaidJS    string
	Fonts        []string
	ReportPages  bool
	ReportDests  bool
	Chromium     string
	HeaderFooter bool
}

type renderReport struct {
	Pages int            `json:"pages"`
	Dests map[string]int `json:"dests"`
}

func renderPDF(parent context.Context, opts renderOptions) error {
	htmlPath, err := filepath.Abs(opts.HTMLPath)
	if err != nil {
		return fmt.Errorf("resolve HTML path: %w", err)
	}
	htmlInfo, err := os.Stat(htmlPath)
	if err != nil {
		return fmt.Errorf("read HTML: %w", err)
	}
	if htmlInfo.IsDir() {
		return fmt.Errorf("HTML path is a directory: %s", htmlPath)
	}
	outPath, err := filepath.Abs(opts.OutPath)
	if err != nil {
		return fmt.Errorf("resolve output path: %w", err)
	}
	if err := os.MkdirAll(filepath.Dir(outPath), 0o755); err != nil {
		return fmt.Errorf("create output directory: %w", err)
	}
	chromiumPath, err := resolveChromium(opts.Chromium)
	if err != nil {
		return err
	}

	allocOpts := []chromedp.ExecAllocatorOption{
		chromedp.ExecPath(chromiumPath), chromedp.Headless, chromedp.NoSandbox,
		chromedp.Flag("disable-setuid-sandbox", true), chromedp.Flag("disable-dev-shm-usage", true),
	}
	allocCtx, cancelAlloc := chromedp.NewExecAllocator(parent, allocOpts...)
	defer cancelAlloc()
	browserCtx, cancelBrowser := chromedp.NewContext(allocCtx)
	defer cancelBrowser()
	runCtx, cancelRun := context.WithTimeout(browserCtx, 2*time.Minute)
	defer cancelRun()

	fileURL := (&url.URL{Scheme: "file", Path: htmlPath}).String()
	var pdfData []byte
	actions := []chromedp.Action{
		chromedp.Navigate(fileURL),
		chromedp.Poll(`document.readyState === "complete"`, nil, chromedp.WithPollingTimeout(30*time.Second)),
	}
	if opts.MermaidJS != "" {
		mermaidPath, err := filepath.Abs(opts.MermaidJS)
		if err != nil {
			return fmt.Errorf("resolve Mermaid path: %w", err)
		}
		script, err := os.ReadFile(mermaidPath)
		if err != nil {
			return fmt.Errorf("read Mermaid script: %w", err)
		}
		quoted, _ := json.Marshal(string(script))
		actions = append(actions,
			chromedp.Evaluate(fmt.Sprintf(`(() => { const s = document.createElement("script"); s.textContent = %s; document.head.appendChild(s); })()`, quoted), nil),
			chromedp.Poll(`(() => typeof window.mermaid !== "undefined")()`, nil, chromedp.WithPollingTimeout(30*time.Second)),
			chromedp.Evaluate(mermaidRenderScript(opts.HeaderFooter), nil),
		)
	}
	actions = append(actions, fontReadinessAction(opts.Fonts))
	actions = append(actions,
		chromedp.ActionFunc(func(ctx context.Context) error {
			params := page.PrintToPDF().
				WithDisplayHeaderFooter(opts.HeaderFooter).
				WithPrintBackground(true).
				WithPaperWidth(8.27).
				WithPaperHeight(11.7).
				WithPreferCSSPageSize(true).
				WithGenerateTaggedPDF(true)
			if opts.HeaderFooter {
				var title string
				if err := chromedp.Evaluate(`document.title`, &title).Do(ctx); err != nil {
					return fmt.Errorf("read document title: %w", err)
				}
				params = params.WithHeaderTemplate(headerTemplate(title)).WithFooterTemplate(footerTemplate())
			} else {
				params = params.WithHeaderTemplate("<span></span>").WithFooterTemplate("<span></span>")
			}
			data, _, err := params.Do(ctx)
			if err != nil {
				return fmt.Errorf("print PDF: %w", err)
			}
			pdfData = data
			return nil
		}),
	)
	if err := chromedp.Run(runCtx, actions...); err != nil {
		return fmt.Errorf("render HTML: %w", err)
	}
	if err := os.WriteFile(outPath, pdfData, 0o644); err != nil {
		return fmt.Errorf("write PDF: %w", err)
	}
	if opts.ReportPages || opts.ReportDests {
		pages, err := pdfPageCount(outPath)
		if err != nil {
			return err
		}
		report := renderReport{Dests: map[string]int{}}
		if opts.ReportPages {
			report.Pages = pages
		}
		if opts.ReportDests {
			dests, err := extractNamedDestinations(outPath)
			if err != nil {
				return err
			}
			report.Dests = dests
		}
		enc := json.NewEncoder(os.Stdout)
		enc.SetEscapeHTML(false)
		if err := enc.Encode(report); err != nil {
			return err
		}
	}
	return nil
}

type fontReadinessReport struct {
	ElapsedMS     int      `json:"elapsedMs"`
	Failed        []string `json:"failed"`
	ReadyTimedOut bool     `json:"readyTimedOut"`
}

func fontReadinessAction(fonts []string) chromedp.Action {
	requestedFonts := fonts
	if requestedFonts == nil {
		requestedFonts = []string{}
	}
	fontsJSON, _ := json.Marshal(requestedFonts)
	expression := fmt.Sprintf(`(async () => {
  const requested = %s;
  const deadlineMs = 30000;
  const started = performance.now();
  const remaining = () => Math.max(0, deadlineMs - (performance.now() - started));
  let readyTimedOut = false;
  const ready = Promise.resolve(document.fonts.ready).catch(() => undefined);
  await Promise.race([
    ready,
    new Promise((resolve) => setTimeout(() => { readyTimedOut = true; resolve(); }, deadlineMs)),
  ]);
  const failed = () => requested.filter((descriptor) => !document.fonts.check(descriptor));
  let unresolved = failed();
  if (unresolved.length > 0 && remaining() > 0) {
    const loads = Promise.allSettled(unresolved.map((descriptor) => document.fonts.load(descriptor)));
    while (unresolved.length > 0 && remaining() > 0) {
      await Promise.race([
        loads,
        new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining()))),
      ]);
      unresolved = failed();
    }
  }
  return {
    elapsedMs: Math.round(performance.now() - started),
    failed: unresolved,
    readyTimedOut,
  };
})()`, fontsJSON)

	return chromedp.ActionFunc(func(ctx context.Context) error {
		started := time.Now()
		result, exception, err := runtime.Evaluate(expression).
			WithAwaitPromise(true).
			WithReturnByValue(true).
			Do(ctx)
		elapsedMS := time.Since(started).Milliseconds()
		if err != nil {
			return fmt.Errorf("font readiness failed after %dms while waiting for %s: %w", elapsedMS, strings.Join(fonts, ", "), err)
		}
		if exception != nil {
			return fmt.Errorf("font readiness threw after %dms while waiting for %s: %s", elapsedMS, strings.Join(fonts, ", "), exception.Error())
		}
		var report fontReadinessReport
		if err := json.Unmarshal(result.Value, &report); err != nil {
			return fmt.Errorf("font readiness returned invalid result after %dms: %w", elapsedMS, err)
		}
		if len(report.Failed) > 0 {
			return fmt.Errorf("font readiness timed out after %dms; failed fonts: %s", report.ElapsedMS, strings.Join(report.Failed, ", "))
		}
		return nil
	})
}

func mermaidRenderScript(_ bool) string {
	// Keep this script equivalent to generate-pdf.ts: initialize light/strict
	// Mermaid, render every mermaid-diagram concurrently, and leave a visible
	// error block with the original source on render failure.
	return `(async () => {
      const config = {startOnLoad:false, securityLevel:"strict", suppressErrorRendering:true, theme:"base", darkMode:false,
        fontFamily:'var(--font-geist-sans), var(--font-noto-sans-sc, "PingFang SC"), sans-serif',
        themeVariables:{background:"#f5f4ef",primaryColor:"#fcfbf8",primaryTextColor:"#20283c",primaryBorderColor:"#4a5468",lineColor:"#4a5468",secondaryColor:"#c9cfdd",tertiaryColor:"#f5f4ef",edgeLabelBackground:"#fcfbf8"}};
      const mermaid = window.mermaid;
      const diagrams = document.querySelectorAll("mermaid-diagram");
      mermaid.initialize(config);
      await Promise.all([...diagrams].map(async (diagram, index) => {
        const source = diagram.textContent?.trim() ?? "";
        try { const result = await mermaid.render("pdf-mermaid-" + index, source); diagram.innerHTML = result.svg; diagram.setAttribute("data-rendered", "true"); }
        catch { const message = document.createElement("p"); const fallback = document.createElement("pre"); message.className="mermaid-error"; message.textContent="Unable to render Mermaid diagram."; fallback.textContent=source; diagram.replaceChildren(message, fallback); diagram.setAttribute("data-rendered", "error"); }
      }));
      return true;
    })()`
}

func headerTemplate(title string) string {
	title = strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(title, "&", "&amp;"), "<", "&lt;"), "\"", "&quot;")
	return `<div style="font-size:7pt; font-family:ui-monospace, 'SF Mono', Menlo, Consolas, monospace; color:#4a5468; width:100%; text-align:center; padding-top:8px; letter-spacing:0.22em; text-transform:uppercase; -webkit-print-color-adjust:exact;">` + title + ` <span style="color:#1d6a96;">&#9632;</span></div>`
}
func footerTemplate() string {
	return `<div style="font-size:8pt; font-family:ui-monospace, 'SF Mono', Menlo, Consolas, monospace; color:#4a5468; width:100%; text-align:center; padding-bottom:6px; letter-spacing:0.08em; -webkit-print-color-adjust:exact;"><span class="pageNumber"></span></div>`
}

func resolveChromium(explicit string) (string, error) {
	candidates := []string{}
	if strings.TrimSpace(explicit) != "" {
		candidates = append(candidates, explicit)
	}
	if env := strings.TrimSpace(os.Getenv("PDFGEN_CHROMIUM")); env != "" {
		candidates = append(candidates, env)
	}
	home, _ := os.UserHomeDir()
	candidates = append(candidates,
		filepath.Join(home, ".cache", "ms-playwright", "chromium_headless_shell-1234", "chrome-headless-shell-linux64", "chrome-headless-shell"),
		filepath.Join(home, "Library", "Caches", "ms-playwright", "chromium_headless_shell-1234", "chrome-headless-shell-mac-arm64", "chrome-headless-shell"),
		filepath.Join(home, "Library", "Caches", "ms-playwright", "chromium_headless_shell-1234", "chrome-headless-shell-mac-x64", "chrome-headless-shell"),
		filepath.Join(home, "Library", "Caches", "ms-playwright", "chromium-1234", "chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
		filepath.Join(home, "Library", "Caches", "ms-playwright", "chromium-1234", "chrome-mac", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
		"/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		"/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
	)
	// Also discover versioned Playwright directories without relying on shell globbing.
	for _, root := range []string{filepath.Join(home, ".cache", "ms-playwright"), filepath.Join(home, "Library", "Caches", "ms-playwright")} {
		entries, _ := os.ReadDir(root)
		for _, entry := range entries {
			if !entry.IsDir() {
				continue
			}
			name := strings.ToLower(entry.Name())
			if !strings.Contains(name, "chromium") {
				continue
			}
			children, _ := os.ReadDir(filepath.Join(root, entry.Name()))
			for _, child := range children {
				if !child.IsDir() {
					continue
				}
				for _, rel := range []string{"chrome-headless-shell", filepath.Join("chrome-headless-shell-mac-arm64", "chrome-headless-shell"), filepath.Join("chrome-headless-shell-mac-x64", "chrome-headless-shell"), filepath.Join("chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"), filepath.Join("chrome-mac", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing")} {
					candidates = append(candidates, filepath.Join(root, entry.Name(), child.Name(), rel))
				}
			}
		}
	}
	seen := map[string]bool{}
	for _, candidate := range candidates {
		if candidate == "" || seen[candidate] {
			continue
		}
		seen[candidate] = true
		resolved, err := exec.LookPath(candidate)
		if err == nil {
			return resolved, nil
		}
		info, err := os.Stat(candidate)
		if err == nil && !info.IsDir() && info.Mode()&0o111 != 0 {
			return candidate, nil
		}
	}
	return "", errors.New("no Chromium executable found; pass --chromium or set PDFGEN_CHROMIUM (probed Playwright caches and common system paths)")
}
