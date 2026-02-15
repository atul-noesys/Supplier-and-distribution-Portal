import { axios, AxiosResponse, authConfig } from "./axios";
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

export type CurrentUser = {
  firstName: string;
  email: string;
  lastName: string;
  userName: string;
  roleId: number;
};

export class NguageStore {
  count = 0;
  approvalData: Document[] = [];
  searchText: string = "";
  currentUser: CurrentUser | null = null;

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
      let token = null;
      if (typeof window !== "undefined") {
        token = localStorage.getItem("access_token");
      }

      const response = await axios.post(
        "/api/GetData",
        tableData,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );
      return response.data.data;
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

  async UpdateRowData(
    rowData: RowData,
    rowId: string,
  ): Promise<{ result: boolean; error: string }> {
    try {
      // Get token from localStorage (client-side only)
      let token = null;
      if (typeof window !== "undefined") {
        token = localStorage.getItem("access_token");
      }

      // Combine ROWID with row data
      const requestBody = {
        ROWID: rowId,
        ...rowData,
      };

      await axios.put("/api/EditRow", requestBody, {
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

  async UpdateRowDataDynamic(
    rowData: RowData,
    rowId: string,
    formId: number,
    tableName: string,
  ): Promise<{ result: boolean; error: string }> {
    try {
      // Get token from localStorage (client-side only)
      let token = null;
      if (typeof window !== "undefined") {
        token = localStorage.getItem("access_token");
      }

      // Combine ROWID, formId, tableName with row data
      const requestBody = {
        ROWID: rowId,
        formId: formId,
        tableName: tableName,
        ...rowData,
      };

      await axios.put("/api/EditRowDynamic", requestBody, {
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
          tenant: "nooms",
        },
      }).use(Tus, {
        endpoint: "https://nooms.infoveave.app/ngaugeFileUpload/",
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
    tableNumber: number,
    tableName: string,
  ): Promise<{ result: string | null; error: string }> {
    try {
      // Get token from localStorage (client-side only)
      let token = null;
      if (typeof window !== "undefined") {
        token = localStorage.getItem("access_token");
      }

      const { data }: AxiosResponse<string> = await axios.post(
        "/api/AddRow",
        {
          tableNumber,
          tableName,
          ...rowData,
        },
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

  async GetRowData(
    formId: number,
    rowId: string | number,
    tableName: string,
  ): Promise<RowData | null> {
    try {
      const response = await axios.post(
        "/api/GetRowDataDynamic",
        {
          formId: formId,
          ROWID: rowId,
          tableName,
        },
        authConfig({}),
      );

      return response.data.data;
    } catch (error) {
      console.error("Error fetching row data:", error);
      return null;
    }
  }

  async GetCurrentUser(): Promise<CurrentUser | null> {
    try {
      let token = null;
      if (typeof window !== "undefined") {
        token = localStorage.getItem("access_token");
      }

      const response = await axios.get(
        "/api/GetCurrentUser",
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      const userData: CurrentUser = {
        firstName: response.data.data.firstName,
        email: response.data.data.email,
        lastName: response.data.data.lastName,
        userName: response.data.data.userName,
        roleId: response.data.data.roleId,
      };

      this.currentUser = userData;
      return userData;
    } catch (error) {
      console.error("Error fetching current user:", error);
      return null;
    }
  }
}
