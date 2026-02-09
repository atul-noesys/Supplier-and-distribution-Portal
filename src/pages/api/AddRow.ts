import type { NextRequest } from "next/server";
import pkg from "../../../package.json";

export const runtime = "edge";

export default async function handler(request: NextRequest) {
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const authHeader = request.headers.get("Authorization");

      const response = await fetch("https://nooms.infoveave.app/api/v10/ngauge/forms/31/row",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authHeader && { Authorization: authHeader }),
            "x-web-app": "Infoveave",
            "x-web-app-version": pkg.version,
          },
          body: JSON.stringify(
            {
              "rowData": body,
              "tableName": "userregistration"
            }
          ),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return new Response(
        JSON.stringify({
          message: "Row Updated Successfully",
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
          details: "Please use put method",
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
