"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CsvModeProps {
  file: File | null;
  onUploadFile: React.Dispatch<React.SetStateAction<File | null>>;
  message: string;
}

export function CsvMode({ file: externalFile, onUploadFile, message }: CsvModeProps) {
  const [file, setFile] = useState<File | null>(externalFile);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleRun() {
    setLoading(true);
    setLogs(["Running CSV scraper..."]);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scrape-csv?max_items=50&headless=true`);
      if (!res.ok) throw new Error("CSV scraping failed");
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
        <CardTitle>CSV Products Scraper</CardTitle>
        <CardDescription>Run scraping from existing CSV data (stored temporarily in DB).</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="csv">Upload products.csv (optional)</Label>
          <Input
            id="csv"
            type="file"
            accept=".csv"
            onChange={(e) => {
              const selected = e.target.files?.[0] || null;
              setFile(selected);
              onUploadFile(selected);
            }}
          />
        </div>

        <div className="flex gap-3">
          <Button onClick={handleRun} disabled={loading}>
            {loading ? "Running..." : "Run CSV Scraper"}
          </Button>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Live Logs</div>
          <div className="max-h-48 overflow-auto rounded-md bg-background p-2 text-xs leading-relaxed">
            {logs.length === 0 ? (
              <div className="text-muted-foreground">No logs yet.</div>
            ) : (
              <ul className="list-inside list-disc space-y-1">
                {logs.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {message && <div className="p-3 text-sm text-muted-foreground text-center">{message}</div>}
      </CardContent>
    </Card>
  );
}
