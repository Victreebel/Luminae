const target = process.argv[2];
const common = [
  "LUMINAE_RELEASE_VERSION",
  "LUMINAE_BUILD_LABEL",
  "VITE_LUMINAE_OPERATOR_NAME",
  "VITE_LUMINAE_SUPPORT_EMAIL",
];
const required = target === "mac"
  ? ["LUMINAE_WEB_URL", ...common]
  : [
      "VITE_LUMINAE_API_ORIGIN",
      ...common,
      "LUMINAE_BUILD_STAMP",
      "LUMINAE_ANDROID_VERSION_CODE",
    ];

if (!['mac', 'android'].includes(target)) {
  throw new Error('Usage: node scripts/validate-release-environment.mjs <mac|android>');
}

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  throw new Error(`Missing release environment: ${missing.join(', ')}`);
}

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(process.env.VITE_LUMINAE_SUPPORT_EMAIL)) {
  throw new Error('VITE_LUMINAE_SUPPORT_EMAIL must be a valid monitored address');
}
if (/\.invalid$/i.test(process.env.VITE_LUMINAE_SUPPORT_EMAIL)) {
  throw new Error('VITE_LUMINAE_SUPPORT_EMAIL cannot use the reserved .invalid domain');
}

if (target === 'mac' && new URL(process.env.LUMINAE_WEB_URL).protocol !== 'https:') {
  throw new Error('LUMINAE_WEB_URL must use HTTPS');
}
if (target === 'android') {
  if (new URL(process.env.VITE_LUMINAE_API_ORIGIN).protocol !== 'https:') {
    throw new Error('VITE_LUMINAE_API_ORIGIN must use HTTPS');
  }
  const code = Number(process.env.LUMINAE_ANDROID_VERSION_CODE);
  if (!Number.isInteger(code) || code <= 0) {
    throw new Error('LUMINAE_ANDROID_VERSION_CODE must be a positive integer');
  }
}

console.log(`${target} release environment is complete`);
