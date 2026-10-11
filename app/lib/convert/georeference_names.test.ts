import {
  georeferenceAnnotation,
  labelledGeoreferencePage,
} from "test/georeference_annotation";
import { expect, test } from "vitest";
import { getGeoreferenceNames } from "./georeference_names";

test("uses a shared manifest for the import and canvas labels for map folders", () => {
  expect(getGeoreferenceNames(labelledGeoreferencePage())).toEqual({
    name: "Historical atlas",
    maps: ["North sheet", "South sheet"],
  });
});

test("reads a canvas target and a single partOf object", () => {
  const annotation = georeferenceAnnotation();
  expect(
    getGeoreferenceNames({
      ...annotation,
      target: {
        ...annotation.target,
        source: {
          id: "https://example.com/canvas",
          type: "Canvas",
          label: { none: ["Sheet 1"] },
          partOf: {
            id: "https://example.com/manifest",
            type: "Manifest",
            label: { nl: ["Kaartenboek"] },
          },
        },
      },
    }),
  ).toEqual({ name: "Kaartenboek", maps: ["Sheet 1"] });
});

test("uses English, untagged, then other available language values", () => {
  const page = labelledGeoreferencePage();
  const withLabel = (label: Record<string, string[]>) =>
    getGeoreferenceNames({ ...page, label }).name;
  expect(
    withLabel({
      nl: ["Atlas"],
      none: ["Untitled"],
      en: ["English title", "Subtitle"],
    }),
  ).toBe("English title; Subtitle");
  expect(withLabel({ en: [" "], none: ["Untagged title"] })).toBe(
    "Untagged title",
  );
  expect(withLabel({ nl: ["Kaartenboek"] })).toBe("Kaartenboek");
});

test("does not name an entire import after only one of its manifests", () => {
  const page = labelledGeoreferencePage();
  page.items[1].target.source.partOf[0].partOf[0].id =
    "https://example.com/another-manifest";
  expect(getGeoreferenceNames(page)).toEqual({
    name: undefined,
    maps: ["North sheet", "South sheet"],
  });
});

test("falls back when labels are missing or unusable", () => {
  expect(getGeoreferenceNames(georeferenceAnnotation())).toEqual({
    name: undefined,
    maps: ["Map 1"],
  });
  const annotation = georeferenceAnnotation();
  expect(
    getGeoreferenceNames({
      ...annotation,
      label: { en: [null, {}, " "] },
    }),
  ).toEqual({ name: undefined, maps: ["Map 1"] });
  expect(getGeoreferenceNames(null)).toEqual({ name: undefined, maps: [] });
});

test("uses a canvas label as the import name when no manifest is labelled", () => {
  const annotation = georeferenceAnnotation();
  expect(
    getGeoreferenceNames({
      ...annotation,
      target: {
        ...annotation.target,
        source: {
          ...annotation.target.source,
          type: "Canvas",
          label: { en: ["City map"] },
        },
      },
    }),
  ).toEqual({ name: "City map", maps: ["City map"] });
});
