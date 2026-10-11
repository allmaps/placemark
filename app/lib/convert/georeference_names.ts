import type { JsonObject, JsonValue } from "type-fest";

function asObject(value: JsonValue | undefined): JsonObject | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }
}

function readLabel(value: JsonValue | undefined): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  const label = asObject(value);
  if (!label) return;
  // Prefer English for this English-language UI, then untagged text.
  for (const values of [label.en, label.none, ...Object.values(label)]) {
    if (!Array.isArray(values)) continue;
    const text = values
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
      .join("; ");
    if (text) return text;
  }
}

function getResources(value: JsonValue | undefined): JsonObject[] {
  if (Array.isArray(value)) return value.flatMap(getResources);
  const resource = asObject(value);
  return resource ? [resource, ...getResources(resource.partOf)] : [];
}

/** Read embedded labels before the annotation parser removes extra metadata. */
export function getGeoreferenceNames(input: JsonValue): {
  name?: string;
  maps: string[];
} {
  const document = asObject(input);
  const annotations =
    document?.type === "Annotation"
      ? [document]
      : document?.type === "AnnotationPage" && Array.isArray(document.items)
        ? document.items
        : [];
  const names = annotations.map((item) => {
    const annotation = asObject(item);
    const source = asObject(asObject(annotation?.target)?.source);
    const resources = getResources(source);
    const canvas = resources.find((resource) => resource.type === "Canvas");
    const manifest = resources.find((resource) => resource.type === "Manifest");
    return {
      manifest,
      name:
        readLabel(canvas?.label) ||
        readLabel(source?.label) ||
        readLabel(annotation?.label) ||
        readLabel(manifest?.label),
    };
  });
  const manifest = names.find((map) =>
    readLabel(map.manifest?.label),
  )?.manifest;
  const commonManifest =
    manifest?.id && names.every((map) => map.manifest?.id === manifest.id)
      ? readLabel(manifest.label)
      : undefined;
  return {
    name:
      readLabel(document?.label) ||
      commonManifest ||
      (names.length === 1 ? names[0].name : undefined),
    maps: names.map((map, index) => map.name || `Map ${index + 1}`),
  };
}
