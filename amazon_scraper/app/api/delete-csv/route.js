import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("filename") || "prices.csv";

  try {
    const filePath = path.join(process.cwd(), "data", filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return NextResponse.json({ success: true, message: `${filename} deleted successfully` });
    } else {
      return NextResponse.json({ success: false, error: "File not found" });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
