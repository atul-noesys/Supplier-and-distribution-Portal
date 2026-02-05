import type { NextRequest } from "next/server";
import pkg from "../../../package.json";

export const runtime = "edge";

export default async function handler(request: NextRequest) {
  if (request.method === "POST") {
    try {
      const authHeader = request.headers.get("Authorization");

      // For edge runtime, we need to handle FormData differently
      const formData = await request.formData();
      const file = formData.get("file") as File;
      const fileName = formData.get("fileName") as string;

      if (!file) {
        return new Response(JSON.stringify({ message: "No file provided" }), {
          headers: { "content-type": "application/json" },
          status: 400,
        });
      }

      // Convert the file to ArrayBuffer for binary transmission
      const fileBuffer = await file.arrayBuffer();

      const response = await fetch(
        "https://docms.infoveave.app/ngaugeFileUpload/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/pdf",
            ...(authHeader && { Authorization: authHeader }),
            "x-web-app": "Infoveave",
            "x-web-app-version": pkg.version,
          },
          body: fileBuffer,
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return new Response(
        JSON.stringify({
          message: "File uploaded successfully",
          data: data.data,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      );
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
