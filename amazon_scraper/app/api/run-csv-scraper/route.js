import { spawn } from "child_process"
import path from "path"
import { NextResponse } from "next/server"
import fs from "fs"

export async function POST(req) {
  try {
    const formData = await req.formData()
    const file = formData.get("file")

    // Save uploaded CSV temporarily
    const dataDir = path.join(process.cwd(), "data")
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir)
    const csvPath = path.join(dataDir, "products.csv")
    const arrayBuffer = await file.arrayBuffer()
    fs.writeFileSync(csvPath, Buffer.from(arrayBuffer))

    // ✅ Dynamically locate your Python scraper file
    const scraperPath = "D:\\Projects\\amazon_scraper\\scraper.py"

    console.log(`[run-csv-scraper] Starting scraper.py from ${scraperPath}`)

    // ✅ Run Python script using spawn (unbuffered mode)
    const pythonProcess = spawn("python", ["-u", scraperPath, "--mode", "csv"], {
      cwd: process.cwd(),
    })

    // ✅ Stream Python stdout live to the Node console
    pythonProcess.stdout.on("data", (data) => {
      console.log(`[scraper.py] ${data.toString().trim()}`)
    })

    // ✅ Stream Python stderr too (for debugging)
    pythonProcess.stderr.on("data", (data) => {
      console.error(`[scraper.py ERROR] ${data.toString().trim()}`)
    })

    // ✅ Return response when process ends
    return new Promise((resolve) => {
      pythonProcess.on("close", (code) => {
        console.log(`[run-csv-scraper] Python process exited with code ${code}`)
        resolve(
          NextResponse.json({
            success: code === 0,
            message:
              code === 0
                ? "Scraping completed successfully"
                : `Scraper exited with code ${code}`,
          })
        )
      })
    })
  } catch (err) {
    console.error("[run-csv-scraper ERROR]", err)
    return NextResponse.json({ success: false, error: err.message })
  }
}
