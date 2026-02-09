import type { NextRequest } from "next/server";
import pkg from "../../../package.json";

export const runtime = "edge";

export default async function handler(request: NextRequest) {
  if (request.method === "GET") {
    try {
      const url = new URL(request.url);
      const attachment = url.searchParams.get("attachment");

      const authHeader = request.headers.get("Authorization");

      const response = await fetch(
        `https://nooms.infoveave.app/E/N/nooms/${attachment}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(authHeader && { Authorization: authHeader }),
            "x-web-app": "Infoveave",
            "x-web-app-version": pkg.version,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const pdfBuffer = await response.arrayBuffer();

      return new Response(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${attachment}"`,
        },
        status: 200,
      });
    } catch (error) {
      console.error("Proxy error:", error);
      return new Response(JSON.stringify({ message: "Failed to fetch data" }), {
        headers: { "content-type": "application/json" },
        status: 401,
      });
    }
  } else {
    return new Response(
      JSON.stringify(
        {
          message: "Method not allowed",
          details: "Please use post method for signup",
        },
        null,
      ),
      {
        headers: { "content-type": "application/json" },
        status: 405,
      },
    );
  }
}
