import axios, { AxiosRequestConfig } from "axios";
import type { NextRequest } from "next/server";
import pkg from "../../../package.json";

export const runtime = "edge";

type signInBodyContentType = {
  username: string;
  password: string;
  rememberMe: boolean;
};

const baseAxiosConfig = (): AxiosRequestConfig => ({
  responseType: "json",
  headers: {
    "x-web-app": "Infoveave",
    "x-web-app-version": pkg.version,
  },
});

const urlEncodedParams = <T>(config: AxiosRequestConfig<T>) => {
  const newConfig = Object.assign({}, config);
  newConfig.transformRequest = [
    function (data: Record<string, string | number>) {
      const str: string[] = [];
      for (const p in data) {
        if (data[p]) {
          str.push(encodeURIComponent(p) + "=" + encodeURIComponent(data[p]));
        }
      }
      return str.join("&");
    },
  ];
  return newConfig;
};

const scopes = [
  "openid",
  "profile",
  "email",
  "infoveaveId",
  "roles",
  "v3",
  "analysis.manage",
  "analysis.read",
  "analysis.execute",
  "job.read",
  "job.manage",
  "task.read",
  "task.manage",
  "job.execute",
  "scipyr.access",
  "ml.access",
  "datamanage.read",
  "datamanage.manage",
  "report.read",
  "user.manage",
  "report.manage",
  "visualize.access",
] as const;

export default async function handler(request: NextRequest) {
  if (request.method === "POST") {
    const bodyContent: signInBodyContentType = await request.json();
    const { username, password } = bodyContent;

    try {
      if (process.env.NODE_ENV === "development") {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      }

      const apiResponse = await axios.post(
        `https://infoveave.app/connect/token`,
        {
          grant_type: "password",
          username: username,
          password: password,
          scope: scopes.join(" "),
          acr_values: `tenant: nooms, otp: null}`,
          client_id: "Infoveave.WebApp",
          client_secret: "B7190B8A-DDA2-43C1-A248-18AE9F8B25E9",
        },
        urlEncodedParams(baseAxiosConfig()),
      );

      return new Response(
        JSON.stringify({ message: "Signup successful", data: apiResponse }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(error.response?.data);

        return new Response(
          JSON.stringify({
            message: "Failed to login",
            details: error.response?.data,
          }),
          {
            headers: { "content-type": "application/json" },
            status: error.response?.status || 400,
          },
        );
      } else {
        console.error("Unexpected error:", error);

        return new Response(
          JSON.stringify({ message: "An unexpected error occurred" }),
          {
            headers: { "content-type": "application/json" },
            status: 400,
          },
        );
      }
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
