"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface SearchModeProps {
  keyword: string;
  setKeyword: (v: string) => void;
  logs: string[];
  setLogs: (v: string[]) => void;
  onCsvDownloaded: () => void;   // ✅ from page.tsx
  onDeleteCsv: () => void;       // ✅ from page.tsx
  csvDownloaded: boolean;        // ✅ controls visibility
  resultCsv: string;             // ✅ filename (prices.csv)
}

export function SearchMode({
  keyword,
  setKeyword,
  logs,
  setLogs,
  onCsvDownloaded,
  onDeleteCsv,
  csvDownloaded,
  resultCsv,
}: SearchModeProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function runScraper() {
    setLoading(true);
    setLogs(["🚀 Starting scraper..."]);

    try {
      const res = await fetch("http://localhost:5000/run-scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, headless: false, max_items: 5 }),
      });

      const data = await res.json();

      if (data.success) {
        const newLogs = data.output
          .split(/\r?\n/)
          .filter((l: string) => l.trim() !== "");
        setLogs((prev) => [...prev, ...newLogs, "✅ Scraper finished successfully!"]);
      } else {
        setLogs((prev) => [
          ...prev,
          `❌ Error: ${data.error || "Unknown error occurred."}`,
        ]);
      }
    } catch (err: any) {
      setLogs((prev) => [...prev, `⚠️ Request failed: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    try {
      const response = await fetch("/api/download-csv");
      if (!response.ok) throw new Error("Failed to download CSV");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = resultCsv;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      onCsvDownloaded(); // ✅ Notify parent
    } catch (err) {
      setLogs((prev) => [...prev, `❌ CSV download failed: ${String(err)}`]);
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true);
      await onDeleteCsv(); // ✅ handled by page.tsx
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-pretty">Search Scraper</CardTitle>
        <CardDescription>Enter a keyword to scrape.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="kw">Keyword or ASIN</Label>
          <Input
            id="kw"
            placeholder="e.g. wireless earbuds or B0C123ABC"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <Button onClick={runScraper} disabled={loading}>
            {loading ? "Running..." : "Run Scraper"}
          </Button>

          {/* ✅ Download CSV button */}
          <Button variant="outline" onClick={handleDownload}>
            ⬇ Download CSV
          </Button>

          {/* ✅ Delete CSV button appears only after download */}
          {csvDownloaded && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "🗑 Delete CSV"}
            </Button>
          )}
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Live Status / Logs
          </div>
          <div className="max-h-48 overflow-auto rounded-md bg-background p-2 text-xs leading-relaxed">
            {logs.length === 0 ? (
              <div className="text-muted-foreground">No logs yet.</div>
            ) : (
              <ul className="list-inside list-disc space-y-1">
                {logs.map((l, i) => (
                  <li key={`${l}-${i}`}>{l}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
