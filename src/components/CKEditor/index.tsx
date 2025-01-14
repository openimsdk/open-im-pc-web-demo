import "./index.scss";
import "ckeditor5/ckeditor5.css";

import { ClassicEditor } from "@ckeditor/ckeditor5-editor-classic";
import { Essentials } from "@ckeditor/ckeditor5-essentials";
import { ImageInline, ImageInsert } from "@ckeditor/ckeditor5-image";
import { Paragraph } from "@ckeditor/ckeditor5-paragraph";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import { useLatest } from "ahooks";
import {
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  useImperativeHandle,
  useRef,
} from "react";

import EmojiAdapterPlugin from "./plugins/emojiAdapter";

export type CKEditorRef = {
  focus: (moveToEnd?: boolean) => void;
  insertEmoji: (emojiData: EmojiData) => void;
};

interface CKEditorProps {
  value: string;
  placeholder?: string;
  enterWithShift?: boolean;
  onChange?: (value: string) => void;
  onEnter?: () => void;
  onContextMenu?: () => void;
}

export interface EmojiData {
  src: string;
  alt: string;
}

const keyCodes = {
  delete: 46,
  backspace: 8,
};

const Index: ForwardRefRenderFunction<CKEditorRef, CKEditorProps> = (
  { value, placeholder, enterWithShift, onChange, onEnter, onContextMenu },
  ref,
) => {
  const ckEditor = useRef<ClassicEditor | null>(null);
  const latestEnterWithShift = useLatest(enterWithShift);

  const focus = (moveToEnd = false) => {
    const editor = ckEditor.current;

    if (editor) {
      const model = editor.model;
      const view = editor.editing.view;
      const root = model.document.getRoot();
      if (moveToEnd && root) {
        const range = model.createRange(model.createPositionAt(root, "end"));

        model.change((writer) => {
          writer.setSelection(range);
        });
      }
      view.focus();
    }
  };

  const insertEmoji = (emojiData: EmojiData) => {
    const editor = ckEditor.current;
    editor?.model.change((writer) => {
      const emojiElement = writer.createElement(
        "emoji",
        emojiData as Record<string, any>,
      );

      const focusFlag = !editor.data.get().trim();

      const insertPosition = editor.model.document.selection.getFirstPosition();
      console.log(insertPosition);

      if (!insertPosition) return;

      writer.insert(emojiElement, insertPosition);
      setTimeout(() => focus(focusFlag));
    });
  };

  const listenKeydown = (editor: ClassicEditor) => {
    editor.editing.view.document.on(
      "keydown",
      (evt, data) => {
        if (data.keyCode === 13 && latestEnterWithShift.current === data.shiftKey) {
          data.preventDefault();
          evt.stop();
          onEnter?.();
          return;
        }

        if (data.keyCode === 13 && latestEnterWithShift.current) {
          data.preventDefault();
          evt.stop();

          editor.model.change((writer) => {
            const softBreakElement = writer.createElement("softBreak");
            const postion = editor.model.document.selection.getFirstPosition();
            if (!postion) return;
            writer.insert(softBreakElement, postion);
            writer.setSelection(softBreakElement, "after");
          });
          return;
        }

        if (data.keyCode === keyCodes.backspace || data.keyCode === keyCodes.delete) {
          const selection = editor.model.document.selection;
          const hasSelectContent = !editor.model.getSelectedContent(selection).isEmpty;
          const hasEditorContent = Boolean(editor.getData());

          if (!hasEditorContent) {
            return;
          }

          if (hasSelectContent) return;

          if (
            selection.focus?.nodeBefore &&
            (selection.focus?.nodeBefore.hasAttribute("mention") ||
              // @ts-ignore
              selection.focus?.nodeBefore.name === "imageInline" ||
              // @ts-ignore
              selection.focus?.nodeBefore.name === "emoji")
          ) {
            editor.model.change((writer) => {
              if (selection.focus?.nodeBefore) {
                writer.remove(selection.focus.nodeBefore);
              }
            });
            data.preventDefault();
            evt.stop();
          }
        }
      },
      { priority: "high" },
    );

    if (onContextMenu) {
      const editorElement = editor.ui.view.editable.element;
      editorElement?.addEventListener("contextmenu", (event) => {
        onContextMenu();
        event.preventDefault();
      });
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      focus,
      insertEmoji,
    }),
    [],
  );

  return (
    <CKEditor
      editor={ClassicEditor}
      data={value}
      config={{
        placeholder,
        toolbar: [],
        image: {
          toolbar: [],
          insert: {
            type: "inline",
          },
        },
        plugins: [Essentials, Paragraph, ImageInline, ImageInsert],
        extraPlugins: [EmojiAdapterPlugin],
      }}
      onReady={(editor) => {
        ckEditor.current = editor;
        listenKeydown(editor);
        focus(true);
      }}
      onChange={(event, editor) => {
        const data = editor.getData();
        onChange?.(data);
      }}
    />
  );
};

export default memo(forwardRef(Index));
