"use client";

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  headingsPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  quotePlugin,
  toolbarPlugin,
  UndoRedo,
} from "@mdxeditor/editor";
import { useId, useState } from "react";

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

  return (
    <label className="form-field">
      {label}
      <div className="notes-editor-shell" id={fieldId}>
        <MDXEditor
          className="notes-editor"
          markdown={value}
          onChange={setValue}
          placeholder="Add context, cancellation steps, or reminders..."
          plugins={[
            headingsPlugin(),
            listsPlugin(),
            linkPlugin(),
            quotePlugin(),
            markdownShortcutPlugin(),
            toolbarPlugin({
              toolbarContents: () => (
                <>
                  <UndoRedo />
                  <BoldItalicUnderlineToggles />
                  <ListsToggle />
                  <BlockTypeSelect />
                  <CreateLink />
                </>
              ),
            }),
          ]}
        />
      </div>
      <input name={name} type="hidden" value={value} />
    </label>
  );
}
