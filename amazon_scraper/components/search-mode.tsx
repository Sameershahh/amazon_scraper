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
  setLogs: React.Dispatch<React.SetStateAction<string[]>>;
}

export function SearchMode({ keyword, setKeyword, logs, setLogs }: SearchModeProps) {
  const [loading, setLoading] = useState(false);

  async function handleRun() {
    setLoading(true);
    setLogs(["Starting scraper..."]);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/run-scraper`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, headless: true, max_items: 20 }),
      });
      if (!res.ok) throw new Error("Scraper failed");

      const data = await res.json();
      setLogs((prev) => [...prev, data.message]);
    } catch (err: any) {
      setLogs((prev) => [...prev, `Error: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-pretty">Search Scraper</CardTitle>
        <CardDescription>Enter a keyword to scrape products and store temporarily in DB.</CardDescription>
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
          <Button onClick={handleRun} disabled={loading}>
            {loading ? "Running..." : "Run Scraper"}
          </Button>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Live Status / Logs</div>
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
