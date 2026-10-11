import { expect, test, vi } from "vitest";

vi.mock("app/lib/worker", () => {
  return {};
});

import { DEFAULT_IMPORT_OPTIONS } from "app/lib/convert";
import { Georeference } from "app/lib/convert/georeference";
import { UIDMap } from "app/lib/id_mapper";
import { MemPersistence } from "app/lib/persistence/memory";
import { createStore } from "jotai";
import { dataAtom, layerConfigAtom, momentLogAtom } from "state/jotai";
import {
  georeferenceAnnotation,
  labelledGeoreferencePage,
} from "test/georeference_annotation";
import { twoPoints, wrapMap } from "test/helpers";
import { zLayerConfig } from "types";
import { getTargetMap, resultToTransact } from "./use_import";

test("an annotation page imports and undoes one named layer and separate data folders", async () => {
  const store = createStore();
  const persistence = new MemPersistence(UIDMap.empty(), store);
  const beforeLayers = store.get(layerConfigAtom).size;
  const result = (
    await Georeference.forwardString(
      JSON.stringify(labelledGeoreferencePage()),
      {
        ...DEFAULT_IMPORT_OPTIONS,
        type: "georeference",
        georeferenceOptions: { points: true, layer: true, mask: true },
      },
    )
  ).unsafeCoerce();
  const moment = resultToTransact({
    result,
    file: { name: "annotation.json" },
    track: ["import", { format: "georeference" }],
    layerConfigs: store.get(layerConfigAtom),
    sourceUrl: "https://example.com/annotation.json",
  });
  expect(moment.putLayerConfigs).toHaveLength(1);
  const layer = moment.putLayerConfigs![0];
  expect(layer).toMatchObject({
    name: "Historical atlas",
    annotation: { type: "AnnotationPage", items: [{}, {}] },
  });
  expect(moment.putFolders!.map((folder) => folder.name)).toEqual([
    "Historical atlas",
    "North sheet",
    "South sheet",
  ]);
  expect(zLayerConfig.safeParse(layer).success).toBe(true);
  expect(layer.at < [...store.get(layerConfigAtom).values()][0].at).toBe(true);
  await persistence.useTransact()(moment);
  expect(store.get(dataAtom).featureMap.size).toBe(8);
  expect(store.get(dataAtom).folderMap.size).toBe(3);
  expect(store.get(layerConfigAtom).size).toBe(beforeLayers + 1);
  expect(store.get(momentLogAtom).undo).toHaveLength(1);
  await persistence.useHistoryControl()("undo");
  expect(store.get(dataAtom).featureMap.size).toBe(0);
  expect(store.get(dataAtom).folderMap.size).toBe(0);
  expect(store.get(layerConfigAtom).size).toBe(beforeLayers);
  await persistence.useHistoryControl()("redo");
  expect(store.get(dataAtom).featureMap.size).toBe(8);
  expect(store.get(layerConfigAtom).get(layer.id)).toEqual(layer);
});

test("default annotation import creates only a layer with no folders or features", async () => {
  const result = (
    await Georeference.forwardString(JSON.stringify(georeferenceAnnotation()), {
      ...DEFAULT_IMPORT_OPTIONS,
      type: "georeference",
    })
  ).unsafeCoerce();
  const moment = resultToTransact({
    result,
    file: { name: "Imported text" },
    track: ["import", { format: "georeference" }],
  });
  expect(moment.putFeatures).toEqual([]);
  expect(moment.putFolders).toEqual([]);
  expect(moment.putLayerConfigs).toHaveLength(1);
  expect(moment.putLayerConfigs![0].name).toBe("Imported text");
  expect(zLayerConfig.safeParse(moment.putLayerConfigs![0]).success).toBe(true);
});

test("getTargetMap", () => {
  expect(getTargetMap({ featureMap: new Map() }, "x")).toMatchInlineSnapshot(`
    {
      "sourceMissingFieldCount": 0,
      "targetMap": Map {},
    }
  `);
  expect(
    getTargetMap({ featureMap: wrapMap(twoPoints) }, "b"),
  ).toMatchInlineSnapshot(`
      {
        "sourceMissingFieldCount": 1,
        "targetMap": Map {
          "1" => [
            {
              "at": "1",
              "feature": {
                "geometry": {
                  "coordinates": [
                    2,
                    3,
                  ],
                  "type": "Point",
                },
                "properties": {
                  "b": 1,
                },
                "type": "Feature",
              },
              "folderId": null,
              "id": "000000000000000000001",
              "wrappedFeatureCollectionId": "000000000000000000000",
            },
          ],
        },
      }
    `);
});
