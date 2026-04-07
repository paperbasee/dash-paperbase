import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

const FILENAME = "STOREFRONT_API_FRONTEND_PROMPT.md";

export async function GET() {
  try {
    const filePath = join(process.cwd(), "docs", FILENAME);
    const body = await readFile(filePath, "utf8");
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
