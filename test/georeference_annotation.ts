export function georeferenceAnnotation() {
  return {
    id: "https://example.com/annotations/map-1",
    type: "Annotation" as const,
    motivation: "georeferencing",
    target: {
      type: "SpecificResource",
      source: {
        id: "https://example.com/image",
        type: "ImageService3",
        width: 1000,
        height: 1000,
      },
      selector: {
        type: "SvgSelector",
        value: '<svg><polygon points="0,0 1000,0 1000,1000 0,1000" /></svg>',
      },
    },
    body: {
      type: "FeatureCollection",
      transformation: { type: "polynomial" },
      features: [
        [[0, 0], [4, 53]],
        [[1000, 0], [5, 53]],
        [[0, 1000], [4, 52]],
      ].map(([resourceCoords, coordinates]) => ({
        type: "Feature",
        properties: { resourceCoords },
        geometry: { type: "Point", coordinates },
      })),
    },
  };
}

export function labelledGeoreferencePage() {
  return {
    type: "AnnotationPage",
    items: ["North sheet", "South sheet"].map((label, index) => {
      const annotation = georeferenceAnnotation();
      return {
        ...annotation,
        id: `https://example.com/annotations/map-${index + 1}`,
        target: {
          ...annotation.target,
          source: {
            ...annotation.target.source,
            partOf: [{
              id: `https://example.com/canvases/${index + 1}`,
              type: "Canvas",
              label: { en: [label] },
              partOf: [{
                id: "https://example.com/manifest",
                type: "Manifest",
                label: { en: ["Historical atlas"] },
              }],
            }],
          },
        },
      };
    }),
  };
}
