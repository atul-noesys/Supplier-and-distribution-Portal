import type { NextApiRequest, NextApiResponse } from "next";
import pkg from "../../../package.json";
import axios from "axios";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "PUT") {
    try {
      const body = req.body;
      const authHeader = req.headers.authorization;
      const rowId = body.ROWID;
      const formId = body.formId;
      const tableName = body.tableName;

      if (!rowId) {
        return res.status(400).json({ message: "ROWID is required" });
      }

      if (!formId) {
        return res.status(400).json({ message: "formId is required" });
      }

      if (!tableName) {
        return res.status(400).json({ message: "tableName is required" });
      }

      if (!authHeader) {
        return res.status(401).json({ message: "Authorization header is required" });
      }

      const requestPayload = {
        primaryKeyData: {
          primaryKey: "ROWID",
          value: String(rowId),
        },
        tableName: tableName,
      };

      const response = await axios.patch(
        `https://nooms.infoveave.app/api/v10/ngauge/forms/${formId}/row/delete`,
        requestPayload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
            "x-web-app": "Infoveave",
            "x-web-app-version": pkg.version,
          },
        },
      );

      console.log("Upstream API response:", response.status, response.data);

      return res.status(200).json({
        message: "Row Updated Successfully",
        data: response.data.data,
      });
    } catch (error) {
      console.error("Proxy error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const statusCode = axios.isAxiosError(error) ? error.response?.status || 500 : 500;
      const errorData = axios.isAxiosError(error) ? error.response?.data : null;
      
      console.error("Error details:", { statusCode, errorData, errorMessage });
      
      return res.status(statusCode).json({ 
        message: "Failed to update row", 
        error: errorMessage,
        details: errorData,
      });
    }
  } else {
    return res.status(405).json({
      message: "Method not allowed",
      details: "Please use PUT method",
    });
  }
}
