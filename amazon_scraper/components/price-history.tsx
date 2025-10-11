"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { date: "09/01", price: 29.99 },
  { date: "09/05", price: 27.49 },
  { date: "09/10", price: 25.99 },
  { date: "09/15", price: 26.49 },
  { date: "09/20", price: 24.99 },
  { date: "09/25", price: 23.49 },
  { date: "09/30", price: 22.99 },
]

const recent = [
  { asin: "B0DXYZ123", date: "09/30", price: "$22.99" },
  { asin: "B09ABC456", date: "09/29", price: "$18.49" },
  { asin: "B08JKL789", date: "09/28", price: "$15.25" },
]

export function PriceHistory() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-pretty">Price History</CardTitle>
        <CardDescription>Recent prices and overall trend (placeholder).</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ASIN</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((r) => (
                <TableRow key={`${r.asin}-${r.date}`}>
                  <TableCell className="font-mono text-xs">{r.asin}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell className="font-medium">{r.price}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Price trend (placeholder)</div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="currentColor"
                  className="text-primary"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
