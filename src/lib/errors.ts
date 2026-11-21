import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type ErrorBody = { error: { code: string; message: string; details?: unknown } };

export function errorResponse(err: unknown): NextResponse<ErrorBody> {
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request",
          details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
      },
      { status: 400 },
    );
  }
  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: err.message } }, { status: 404 });
  }
  if (err instanceof HttpError) {
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
  }
  console.error("[api] unhandled error", err);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
    { status: 500 },
  );
}

/**
 * Wrap a route handler: uniform error envelope + CDN cache headers.
 * Read endpoints are cacheable at the edge for a minute and served stale
 * while revalidating, which is plenty for catalog data.
 */
export function route<A extends unknown[]>(
  fn: (...args: A) => Promise<unknown>,
  opts: { cache?: boolean } = { cache: true },
) {
  return async (...args: A) => {
    try {
      const data = await fn(...args);
      if (data instanceof Response) return data;
      return NextResponse.json(data, {
        headers: opts.cache
          ? { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }
          : { "Cache-Control": "no-store" },
      });
    } catch (err) {
      return errorResponse(err);
    }
  };
}
