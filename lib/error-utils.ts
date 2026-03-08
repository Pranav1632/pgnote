interface ErrorWithCode {
  code?: unknown;
  name?: string;
  message?: string;
  stack?: string;
}

function asErrorWithCode(error: unknown): ErrorWithCode {
  if (error && typeof error === "object") {
    return error as ErrorWithCode;
  }
  return {};
}

export function inferInfraErrorCode(error: unknown, fallbackCode: string): string {
  const normalized = asErrorWithCode(error);
  const name = typeof normalized.name === "string" ? normalized.name : "";
  const message = typeof normalized.message === "string" ? normalized.message : "";

  if (message.includes("Invalid environment configuration")) {
    return "ENV_CONFIG_INVALID";
  }

  if (
    name.includes("MongooseServerSelectionError") ||
    name.includes("MongoServerSelectionError")
  ) {
    return "DB_UNREACHABLE";
  }

  if (name.includes("MongoNetworkError")) {
    return "DB_NETWORK_ERROR";
  }

  if (name.includes("MongoTimeoutError")) {
    return "DB_TIMEOUT";
  }

  if (normalized.code === 11000) {
    return "DUPLICATE_KEY";
  }

  return fallbackCode;
}

export function logServerError(
  context: string,
  error: unknown,
  metadata: Record<string, unknown> = {}
): void {
  const normalized = asErrorWithCode(error);
  const message =
    typeof normalized.message === "string" ? normalized.message : String(error);

  console.error(`[${context}]`, {
    ...metadata,
    name: normalized.name ?? "UnknownError",
    code: normalized.code,
    message,
    stack: normalized.stack,
  });
}
