import fs from "fs"
import path from "path"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "prices.csv")

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, error: "No prices.csv found yet." }, { status: 404 })
    }

    const csv = fs.readFileSync(filePath, "utf-8")
    const lines = csv.trim().split("\n")
    const headers = lines[0].split(",")
    const rows = lines.slice(1).map((line) => line.split(","))

    return NextResponse.json({ success: true, headers, rows })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message })
  }
}
