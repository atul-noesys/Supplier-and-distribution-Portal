import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  GenericAbortSignal,
} from "axios";
type EventType = "LoggedOut";

import pkg from "../../package.json";

const messageResolvers = new Map<
  EventType,
  Map<string, (value: string) => void>
>();

export const raiseEvent = (event: EventType, payload: string) => {
  if (messageResolvers.has(event)) {
    const fns = messageResolvers.get(event)!;
    fns.forEach((fn) => fn(payload));
  }
};

const _authHeaders = (_hash?: string): AxiosRequestConfig => {
  return {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("access_token"),
      "x-web-app": "Infoveave",
      "x-web-app-version": pkg.version,
      "x-request-hash": _hash,
    },
  };
};

export const urlEncodedParams = <T>(config: AxiosRequestConfig<T>) => {
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

export const authConfig = <T>(
  config: Partial<AxiosRequestConfig<T>> & { hash?: string },
): AxiosRequestConfig<T> => ({
  ..._authHeaders(config.hash),
  responseType: "json",
  ...config,
});

export const baseAxiosConfig = (): AxiosRequestConfig => ({
  responseType: "json",
  headers: {
    "x-web-app": "Infoveave",
    "x-web-app-version": pkg.version,
  },
});

axios.interceptors.response.use(null, (rejected) => {
  if (rejected == null) {
    return Promise.reject(rejected);
  }
  if (rejected.config == null) {
    return Promise.reject(rejected);
  }
  if (axios.isCancel(true)) {
    // This was a cancelled request so do nothing
    return;
  }
  if (
    rejected.config.url.toLowerCase().indexOf("/connect/") == -1 &&
    rejected.response != null &&
    rejected.response.status === 401
  ) {
    raiseEvent("LoggedOut", "null");
  }
  return Promise.reject(rejected.response);
});
export { axios };
export type { AxiosError, AxiosResponse, GenericAbortSignal };

export const sleep = (ms: number): Promise<never> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
