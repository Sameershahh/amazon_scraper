"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { CsvMode } from "@/components/csv-mode";
import { SearchMode } from "@/components/search-mode";
import { PriceHistory } from "@/components/price-history";
import { NavBar } from "@/components/nav-bar";

type Mode = "csv" | "search";

export default function Page() {
  const [mode, setMode] = useState<Mode>("csv");
  const [headless, setHeadless] = useState<boolean>(true);
  const [maxItems, setMaxItems] = useState<number>(50);
  const [keyword, setKeyword] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [message, setMessage] = useState<string>("No prices.csv found");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // --- CSV download/delete states ---
  const [csvDownloaded, setCsvDownloaded] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");
  const [resultCsv] = useState("prices.csv");

  const isCsvMode = mode === "csv";

  // --- existing handlers ---
  function handleRunCsv() {
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] CSV Scraper started (headless=${headless}, maxItems=${maxItems})`,
      `[${new Date().toLocaleTimeString()}] Reading prices.csv ...`,
      `[${new Date().toLocaleTimeString()}] Queueing ${Math.max(1, Math.min(maxItems, 100))} items for scraping ...`,
      `[${new Date().toLocaleTimeString()}] Fetching price data ...`,
      `[${new Date().toLocaleTimeString()}] Done. Results saved.`,
    ]);
    setMessage("✅ CSV scrape completed successfully (placeholder).");
  }

  async function handleRunSearch() {
    const term = keyword.trim() || "laptop";
    setLogs([`[${new Date().toLocaleTimeString()}] Starting scraper for "${term}"...`]);
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scrape?keyword=${term}`);
      if (!res.ok) throw new Error("FastAPI server error or not running.");

      const data = await res.json();
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${data.message}`]);
      setMessage(`✅ Search scrape finished for "${term}".`);
    } catch (err) {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ❌ ${String(err)}`]);
      setMessage(`❌ Error scraping for "${term}".`);
    } finally {
      setLoading(false);
    }
  }

  // --- NEW: Delete CSV handler (robust JSON / HTML handling) ---
  // --- NEW: Delete CSV handler ---
async function handleDeleteCsv() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(`${apiUrl}/delete-csv`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = await res.json();

    if (data.success) {
      setCsvDownloaded(false);
      setDeleteMsg(`✅ prices.csv deleted successfully`);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✅ prices.csv deleted successfully`,
      ]);
    } else {
      setDeleteMsg(`❌ Delete failed: ${data.error}`);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ❌ Delete failed: ${data.error}`,
      ]);
    }
  } catch (err) {
    setDeleteMsg(`❌ Error: ${err}`);
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ❌ ${String(err)}`,
    ]);
  }
}

  // --- Called by SearchMode after download success ---
  function handleMarkDownloaded() {
    setCsvDownloaded(true);
    setDeleteMsg("");
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ✅ CSV download completed (client)`,
    ]);
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          {/* LEFT SIDEBAR (no CSV buttons) */}
          <aside className="rounded-lg border bg-card p-4 md:sticky md:top-6 md:h-fit md:self-start">
            <div className="mb-4">
              <h2 className="text-sm font-medium text-muted-foreground">Mode</h2>
              <div className="mt-2">
                <RadioGroup
                  value={mode}
                  onValueChange={(v) => setMode(v as Mode)}
                  className="grid grid-cols-2 gap-2"
                >
                  <div className="flex items-center gap-2 rounded-md border p-2">
                    <RadioGroupItem id="csv" value="csv" />
                    <Label htmlFor="csv" className="cursor-pointer">
                      CSV Mode
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border p-2">
                    <RadioGroupItem id="search" value="search" />
                    <Label htmlFor="search" className="cursor-pointer">
                      Search Mode
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <Checkbox
                id="headless"
                checked={headless}
                onCheckedChange={(v) => setHeadless(Boolean(v))}
              />
              <Label htmlFor="headless">Headless Browser</Label>
            </div>

            {isCsvMode && (
              <div className="mb-4">
                <Label htmlFor="maxItems">Max items (CSV mode only)</Label>
                <Input
                  id="maxItems"
                  type="number"
                  min={1}
                  max={500}
                  value={Number.isFinite(maxItems) ? maxItems : 50}
                  onChange={(e) =>
                    setMaxItems(Number.parseInt(e.target.value || "0", 10))
                  }
                  className="mt-2"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={handleRunCsv} className="w-full" disabled={loading}>
                Run CSV Scraper
              </Button>

              <Button
                onClick={handleRunSearch}
                variant="secondary"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Running..." : "Run Search Scraper"}
              </Button>

              {deleteMsg && <p className="text-xs text-gray-500 mt-2">{deleteMsg}</p>}
            </div>
          </aside>

          {/* RIGHT CONTENT AREA */}
          <section className="flex flex-col gap-6">
            {isCsvMode ? (
              <CsvMode file={csvFile} onUploadFile={setCsvFile} message={message} />
            ) : (
              // Pass callbacks to SearchMode
              <SearchMode
                keyword={keyword}
                setKeyword={setKeyword}
                logs={logs}
                setLogs={setLogs}
                onCsvDownloaded={handleMarkDownloaded} // notify when downloaded
                onDeleteCsv={handleDeleteCsv} // delete handler
                csvDownloaded={csvDownloaded}
                resultCsv={resultCsv}
              />
            )}
            <Separator />
            <PriceHistory />
          </section>
        </div>
      </main>
    </div>
  );
}
