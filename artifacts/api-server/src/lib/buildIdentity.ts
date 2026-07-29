export const API_BUILD_STARTED_AT = new Date().toISOString();
export const API_BUILD_LABEL =
  process.env.LUMINAE_API_BUILD_LABEL ?? API_BUILD_STARTED_AT;
