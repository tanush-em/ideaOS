import { toJSONSchema, type z } from "zod";

/**
 * Convert a Zod schema to a plain JSON Schema object.
 * Uses Zod 4's native converter (zod-to-json-schema is incompatible with Zod 4).
 */
export function zodToJsonSchemaObject(
  schema: z.ZodTypeAny,
  _name?: string
): Record<string, unknown> {
  const jsonSchema = toJSONSchema(schema) as Record<string, unknown>;
  // Drop meta that some providers reject or ignore
  const { $schema: _schema, ...rest } = jsonSchema;
  return rest;
}

/**
 * Gemini responseSchema accepts only a subset of JSON Schema
 * (no $ref / definitions / $schema / additionalProperties / minLength, etc.).
 */
export function toGoogleResponseSchema(
  schema: Record<string, unknown>
): Record<string, unknown> {
  return sanitizeForGoogle(schema);
}

const GOOGLE_ALLOWED_KEYS = new Set([
  "type",
  "description",
  "nullable",
  "format",
  "enum",
  "properties",
  "required",
  "items",
  "minItems",
  "maxItems",
]);

function sanitizeForGoogle(node: unknown): Record<string, unknown> {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    return { type: "string" };
  }

  const input = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const key of GOOGLE_ALLOWED_KEYS) {
    if (!(key in input)) continue;
    const value = input[key];

    if (key === "properties" && value && typeof value === "object") {
      const props: Record<string, unknown> = {};
      for (const [propName, propSchema] of Object.entries(
        value as Record<string, unknown>
      )) {
        props[propName] = sanitizeForGoogle(propSchema);
      }
      out.properties = props;
      continue;
    }

    if (key === "items") {
      out.items = sanitizeForGoogle(value);
      continue;
    }

    if (key === "required" && Array.isArray(value)) {
      out.required = value.filter((v) => typeof v === "string");
      continue;
    }

    out[key] = value;
  }

  // Ensure object schemas always declare type
  if (out.properties && !out.type) {
    out.type = "object";
  }

  return out;
}

export function parseAndValidate<T>(
  schema: z.ZodType<T>,
  raw: string
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      return {
        success: false,
        error: result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      };
    }
    return { success: true, data: result.data };
  } catch {
    return { success: false, error: "Response was not valid JSON" };
  }
}
