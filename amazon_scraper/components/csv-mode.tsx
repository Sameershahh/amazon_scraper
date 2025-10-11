"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function CsvMode() {
  const [file, setFile] = useState<File | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [tableData, setTableData] = useState<{ headers: string[]; rows: string[][] } | null>(null)

  async function handleRun() {
    if (!file) {
      alert("Please upload a CSV first.")
      return
    }

    setLoading(true)
    setLogs(["Starting CSV scraper..."])
    setTableData(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/run-csv-scraper", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      if (data.success) {
        const newLogs = data.output.split("\n").filter((l: string) => l.trim() !== "")
        setLogs((prev) => [...prev, ...newLogs])
        await fetchPrices()
      } else {
        setLogs((prev) => [...prev, `❌ Error: ${data.error || "Unknown error"}`])
      }
    } catch (err: any) {
      setLogs((prev) => [...prev, `Request failed: ${err.message}`])
    } finally {
      setLoading(false)
    }
  }

  async function fetchPrices() {
    try {
      const res = await fetch("/api/get-prices")
      const data = await res.json()
      if (data.success) {
        setTableData({ headers: data.headers, rows: data.rows })
        setLogs((prev) => [...prev, "✅ Loaded prices.csv preview successfully."])
      } else {
        setLogs((prev) => [...prev, "⚠️ Could not find prices.csv file."])
      }
    } catch (err: any) {
      setLogs((prev) => [...prev, `Failed to load prices.csv: ${err.message}`])
    }
  }

  function handleDownload() {
    window.open("/api/download-csv", "_blank")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>CSV Products Scraper</CardTitle>
        <CardDescription>Upload your products.csv and scrape prices.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="csv">Upload products.csv</Label>
          <Input id="csv" type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>

        <div className="flex gap-3">
          <Button onClick={handleRun} disabled={loading || !file}>
            {loading ? "Running..." : "Run CSV Scraper"}
          </Button>

          <Button variant="outline" onClick={handleDownload}>
             Download csv
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

        {tableData && (
          <div className="mt-4 overflow-x-auto rounded-lg border">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 font-medium">
                <tr>
                  {tableData.headers.map((h, i) => (
                    <th key={i} className="px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, i) => (
                  <tr key={i} className="border-t">
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
