"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useMemo, useState } from "react";
import type { SimpleMDEReactProps } from "react-simplemde-editor";

const MarkdownEditor = dynamic(() => import("react-simplemde-editor"), { ssr: false });

type SubscriptionNotesEditorProps = {
  name: string;
  label: string;
  initialValue?: string | null;
};

export default function SubscriptionNotesEditor({
  name,
  label,
  initialValue,
}: SubscriptionNotesEditorProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const fieldId = useId();
  const options = useMemo<NonNullable<SimpleMDEReactProps["options"]>>(
    () => ({
      autofocus: false,
      spellChecker: false,
      status: false,
      placeholder: "Add context, cancellation steps, or reminders...",
      toolbar: [
        "bold",
        "italic",
        "heading",
        "|",
        "quote",
        "unordered-list",
        "ordered-list",
        "|",
        "link",
        "|",
        "preview",
        "side-by-side",
        "|",
        "guide",
      ],
    }),
    [],
  );

  useEffect(() => {
    setValue(initialValue ?? "");
  }, [initialValue]);

  return (
    <label className="form-field">
      {label}
      <div className="notes-editor-shell" id={fieldId}>
        <MarkdownEditor
          className="notes-editor"
          id={`${fieldId}-textarea`}
          value={value}
          onChange={setValue}
          options={options}
        />
      </div>
      <input name={name} type="hidden" value={value} />
    </label>
  );
}
