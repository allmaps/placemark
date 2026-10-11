import type { ImportOptions } from "app/lib/convert";
import { getGeoreferenceNames } from "app/lib/convert/georeference_names";
import { parseOrError } from "app/lib/errors";
import { pluralize } from "app/lib/utils";
import { useFormikContext } from "formik";
import { captureException } from "integrations/errors";
import { useEffect, useState } from "react";
import { FieldCheckbox, TextWell } from "./elements";

export function GeoreferenceOptionsForm({
  file,
  onNameChange,
}: {
  file: File | string;
  onNameChange: (name: string | undefined) => void;
}) {
  const { values } = useFormikContext<ImportOptions>();
  const [names, setNames] = useState<ReturnType<typeof getGeoreferenceNames>>();
  const active = values.type === "georeference";
  useEffect(() => {
    setNames(undefined);
    onNameChange(undefined);
    if (!active) return;
    let cancelled = false;
    const text = typeof file === "string" ? Promise.resolve(file) : file.text();
    void text
      .then((text) => {
        if (!cancelled) {
          const names = parseOrError(text)
            .map(getGeoreferenceNames)
            .toMaybe()
            .extract();
          setNames(names);
          onNameChange(names?.name);
        }
      })
      .catch((e) => captureException(e));
    return () => {
      cancelled = true;
    };
  }, [active, file, onNameChange]);
  if (!active) return null;
  return (
    <div className="space-y-4">
      {!!names?.maps.length && (
        <TextWell>{pluralize("map", names.maps.length)}</TextWell>
      )}
      <fieldset className="space-y-2 text-sm">
        <legend className="pb-2">Import as</legend>
        {(
          [
            ["layer", "Allmaps layer"],
            ["points", "Control points"],
            ["mask", "Mask polygons"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-x-2">
            <FieldCheckbox
              type="checkbox"
              name={`georeferenceOptions.${key}`}
            />
            <span>{label}</span>
          </label>
        ))}
        <TextWell>
          All maps in this annotation share one background layer. Imported
          points and polygons are independent of the map layer.
        </TextWell>
      </fieldset>
    </div>
  );
}
