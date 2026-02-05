import axios, { AxiosResponse } from "axios";
import { makeAutoObservable } from "mobx";
import Uppy from "@uppy/core";
import Tus from "@uppy/tus";

export type PaginationData = {
  DeletedColumns: string[];
  filterData: (string | number | null)[][];
  TotalRowCount: number;
  data: Record<string, string | number | Date | null>[];
  tableName: string;
};

export type PrimaryKeyData = {
  primaryKey: string;
  value: string;
};

export type RowData = Record<string, string | number | null>;

export class NguageStore {
  count = 0;
  approvalData: Document[] = [];
  searchText: string = "";

  constructor() {
    makeAutoObservable(this);
  }

  async GetPaginationData(tableData: {
    table: string;
    skip: number;
    take: number | null;
    NGaugeId: string | undefined;
    filters?:
      | { [key: string]: { items: string[]; operator: string }[] }
      | undefined;
    sort?: { [keyValue: string]: string } | undefined;
  }): Promise<PaginationData | null> {
    try {
      // Get token from localStorage (client-side only)
      let token = null;
      if (typeof window !== "undefined") {
        token = localStorage.getItem("access_token");
      }

      const { data }: AxiosResponse<PaginationData> = await axios.post(
        "/api/GetAllData",
        tableData,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );
      return data;
    } catch {
      return null;
    }
  }

  get SearchText() {
    return this.searchText;
  }

  set SearchText(text: string) {
    this.searchText = text;
  }

  async UpdateRowData(editRowData: {
    rowData: RowData;
    primaryKeyData: PrimaryKeyData;
  }): Promise<{ result: boolean; error: string }> {
    try {
      // Get token from localStorage (client-side only)
      let token = null;
      if (typeof window !== "undefined") {
        token = localStorage.getItem("access_token");
      }

      await axios.put("/api/EditRow", editRowData, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      return { result: true, error: "" };
    } catch (e) {
      return { result: false, error: "error" };
    }
  }

  async UploadAttachFile(file: File, fileName: string) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = new Uppy({
        id: "upload",
        autoProceed: true,
        meta: {
          ContentType: file.type,
          Headers: {},
          Length: file.size,
          Name: fileName,
          FileName: fileName,
          tenant: "docms",
        },
      }).use(Tus, {
        endpoint: "https://infoveave.app/ngaugeFileUpload/",
        chunkSize: 1024 * 1024 * 5,
        removeFingerprintOnSuccess: true,
      });
      data.addFile({
        name: fileName,
        type: file.type,
        data: file,
        source: "Local",
        isRemote: false,
      });
      return true;
    } catch (error) {
      console.error("Upload error:", error);
      return false;
    }
  }

  async AddDataSourceRow(
    rowData: RowData,
  ): Promise<{ result: string | null; error: string }> {
    try {
      // Get token from localStorage (client-side only)
      let token = null;
      if (typeof window !== "undefined") {
        token = localStorage.getItem("access_token");
      }

      const { data }: AxiosResponse<string> = await axios.post(
        "/api/AddRow",
        rowData,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      return { result: data, error: "" };
    } catch (e) {
      return {
        result: null,
        error: (e as { data: { ref: string } }).data.ref ?? "",
      };
    }
  }
}
