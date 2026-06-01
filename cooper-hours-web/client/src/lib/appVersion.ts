const rawAppVersion = import.meta.env.VITE_APP_VERSION ?? "1.0.0";

export const appVersionNumber = rawAppVersion.replace(/^v/i, "");
export const appVersionLabel = `v${appVersionNumber}`;
