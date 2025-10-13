import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function DELETE(req) {
  try {
    // Get filename from query params, default to 'prices.csv'
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename") || "prices.csv";

    // Absolute path to 'data' folder in project root
    const dataDir = path.join(process.cwd(), "data");
    const filePath = path.join(dataDir, filename);

    // Debugging log to confirm path
    console.log("Looking for file at:", filePath);

    // Security check: ensure deletion is inside 'data'
    if (!filePath.startsWith(dataDir)) {
      return NextResponse.json(
        { success: false, error: "Invalid file path" },
        { status: 400 }
      );
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error("File not found:", filePath);
      return NextResponse.json(
        { success: false, error: `File not found: ${filename}` },
        { status: 404 }
      );
    }

    // Delete file asynchronously
    await fs.promises.unlink(filePath);

    console.log("File deleted successfully:", filePath);
    return NextResponse.json({
      success: true,
      message: `${filename} deleted successfully`,
    });
  } catch (err) {
    console.error("Error deleting file:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
