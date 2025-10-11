import fs from "fs"
import path from "path"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const filePath = path.resolve("D:\\Projects\\amazon_scraper\\data\\prices.csv") // <-- adjust if needed
    if (!fs.existsSync(filePath)) {
      return new NextResponse("File not found", { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=prices.csv",
      },
    })
  } catch (error) {
    console.error("Download error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
