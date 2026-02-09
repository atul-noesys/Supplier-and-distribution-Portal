import type { NextRequest } from "next/server";
import pkg from "../../../package.json";

export const runtime = "edge";

export default async function handler(request: NextRequest) {
  if (request.method === "GET") {
    try {
      const authHeader = request.headers.get("Authorization");

      const response = await fetch(
        "https://nooms.infoveave.app/api/v10/User/CurrentUser",
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

      const data = await response.json();
      return new Response(
        JSON.stringify({
          message: "User data fetched successfully",
          data: {
            firstName: data.firstName,
            email: data.email,
            lastName: data.lastName,
            userName: data.userName,
          },
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      );
    } catch (error) {
      console.error("Proxy error:", error);
      return new Response(JSON.stringify({ message: "Failed to fetch user data" }), {
        headers: { "content-type": "application/json" },
        status: 401,
      });
    }
  } else {
    return new Response(
      JSON.stringify(
        {
          message: "Method not allowed",
          details: "Please use GET method for fetching current user",
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
