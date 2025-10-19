"use client";

import { useEffect, useState } from "react";
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
import { getProducts } from "@/lib/api";

type Mode = "csv" | "search";

export default function Page() {
  const [mode, setMode] = useState<Mode>("csv");
  const [headless, setHeadless] = useState(true);
  const [maxItems, setMaxItems] = useState(50);
  const [keyword, setKeyword] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [message, setMessage] = useState("No data found yet.");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadMode, setDownloadMode] = useState<"combined" | "separate">(
    "combined"
  );
  const [products, setProducts] = useState<any[]>([]);
  const isCsvMode = mode === "csv";

  // Auto clear DB
  useEffect(() => {
    const clearDB = async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clear_db`, {
          method: "DELETE",
        });
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Database cleared on refresh.`,
        ]);
      } catch (err) {
        console.warn("Auto DB clear failed:", err);
      }
    };
    clearDB();
  }, []);

  async function handleRunCsv() {
    try {
      setLoading(true);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Starting CSV scrape (maxItems=${maxItems}, headless=${headless})...`,
      ]);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scrape-csv?max_items=${maxItems}&headless=${headless}`
      );
      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const data = await res.json();
      setMessage(data.message || "CSV scrape completed successfully.");

      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ${data.message || "CSV scrape finished."}`,
      ]);
    } catch (err: any) {
      setMessage("CSV scrape failed.");
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ${String(err)}`,
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunSearch() {
    const term = keyword.trim() || "laptop";
    setLogs([
      `[${new Date().toLocaleTimeString()}] Starting scraper for "${term}"...`,
    ]);
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/run-scraper`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: term, headless, max_items: 1 }),
      });
      if (!res.ok) throw new Error("FastAPI server error.");

      const data = await res.json();
      setMessage(`Search scrape finished for "${term}".`);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ${data.message || "Search scrape finished."}`,
      ]);

      const p = await getProducts();
      setProducts(p);
    } catch (err: any) {
      setMessage(`Error scraping for "${term}".`);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ${String(err)}`,
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadCSV() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/download_csv?mode=${downloadMode}`
      );
      if (!res.ok) {
        const errMsg = await res.text();
        throw new Error(`Server responded with error: ${errMsg}`);
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) throw new Error("Empty CSV file received");

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        downloadMode === "combined"
          ? "all_products.csv"
          : "separate_keyword_csvs.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Downloaded ${downloadMode} file successfully.`,
      ]);
    } catch (err: any) {
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] CSV download failed: ${String(
          err.message || err
        )}`,
      ]);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          {/* Sidebar */}
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
                <Label htmlFor="maxItems">Max items (CSV mode)</Label>
                <Input
                  id="maxItems"
                  type="number"
                  min={1}
                  max={500}
                  value={maxItems}
                  onChange={(e) => setMaxItems(parseInt(e.target.value))}
                  className="mt-2"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              {isCsvMode ? (
                <Button
                  onClick={handleRunCsv}
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Running..." : "Run CSV Scraper"}
                </Button>
              ) : (
                <Button
                  onClick={handleRunSearch}
                  variant="secondary"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Running..." : "Run Search Scraper"}
                </Button>
              )}

              <Separator className="my-2" />

              <Label>Download Mode</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="combined"
                    name="downloadMode"
                    checked={downloadMode === "combined"}
                    onChange={() => setDownloadMode("combined")}
                  />
                  <Label htmlFor="combined" className="cursor-pointer ml-2">
                    Combined CSV (All keywords)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="separate"
                    name="downloadMode"
                    checked={downloadMode === "separate"}
                    onChange={() => setDownloadMode("separate")}
                  />
                  <Label htmlFor="separate" className="cursor-pointer ml-2">
                    Separate CSV (Each keyword)
                  </Label>
                </div>
              </div>

              <Button
                onClick={handleDownloadCSV}
                variant="secondary"
                className="w-full mt-3"
                disabled={loading}
              >
                Download CSV
              </Button>
            </div>
          </aside>

          {/* Main content */}
          <section className="flex flex-col gap-6">
            {isCsvMode ? (
              <CsvMode file={csvFile} onUploadFile={setCsvFile} message={message} />
            ) : (
              <SearchMode
                keyword={keyword}
                setKeyword={setKeyword}
                logs={logs}
                setLogs={setLogs}
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
