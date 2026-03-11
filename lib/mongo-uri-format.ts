export const MONGO_URI_REGEX = /^mongodb(?:\+srv)?:\/\/.+/i;

export function getMongoDatabaseName(uri: string): string | null {
  const normalizedUri = uri.trim();
  if (!MONGO_URI_REGEX.test(normalizedUri)) {
    return null;
  }

  const withoutProtocol = normalizedUri.replace(/^mongodb(?:\+srv)?:\/\//i, "");
  const firstSlashIndex = withoutProtocol.indexOf("/");
  if (firstSlashIndex === -1) {
    return null;
  }

  const databaseSection = withoutProtocol.slice(firstSlashIndex + 1).split("?")[0]?.trim() ?? "";
  if (!databaseSection) {
    return null;
  }

  return decodeURIComponent(databaseSection);
}

export function hasMongoDatabaseName(uri: string): boolean {
  return getMongoDatabaseName(uri) !== null;
}
