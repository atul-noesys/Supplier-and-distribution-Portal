import type { NextRequest } from "next/server";
import pkg from "../../../package.json";

export const runtime = "edge";

export default async function handler(request: NextRequest) {
  if (request.method === "POST") {
    try {
      const authHeader = request.headers.get("Authorization");
      const body = await request.json();
      const rowId = body.ROWID;

      if (!rowId) {
        return new Response(
          JSON.stringify({ message: "ROWID is required" }),
          {
            headers: { "content-type": "application/json" },
            status: 400,
          },
        );
      }

      const response = await fetch(
        "https://nooms.infoveave.app/api/v10/ngauge/forms/42/get-row",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authHeader && { Authorization: authHeader }),
            "x-web-app": "Infoveave",
            "x-web-app-version": pkg.version,
          },
          body: JSON.stringify({
            "primaryKeyData": {
              "primaryKey": "ROWID",
              "value": String(rowId)
            },
            "tableName": "purchase_order_items"
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return new Response(
        JSON.stringify({
          message: "Fetched Data Successfully",
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
