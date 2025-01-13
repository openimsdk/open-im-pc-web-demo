import { CheckOutlined, DownOutlined } from "@ant-design/icons";
import { useLatest } from "ahooks";
import { Button, Dropdown } from "antd";
import { t } from "i18next";
import { forwardRef, ForwardRefRenderFunction, memo, useRef, useState } from "react";

import CKEditor, { CKEditorRef, EmojiData } from "@/components/CKEditor";
import { getCleanText } from "@/components/CKEditor/utils";
import i18n from "@/i18n";
import { IMSDK } from "@/layout/MainContentWrap";
import { Patient } from "@/pages/chat/queryChat/data";
import MessageItem from "@/pages/chat/queryChat/MessageItem";
import { getSendAction, setSendAction as saveSendAction } from "@/utils/storage";

import SendActionBar from "./SendActionBar";
import { useFileMessage } from "./SendActionBar/useFileMessage";
import { useSendMessage } from "./useSendMessage";

const sendActions = [
  { label: t("placeholder.sendWithEnter"), key: "enter" },
  { label: t("placeholder.sendWithShiftEnter"), key: "enterwithshift" },
];

i18n.on("languageChanged", () => {
  sendActions[0].label = t("placeholder.sendWithEnter");
  sendActions[1].label = t("placeholder.sendWithShiftEnter");
});

const ChatFooter: ForwardRefRenderFunction<unknown, unknown> = (_, ref) => {
  const [html, setHtml] = useState("");
  const latestHtml = useLatest(html);
  const [sendAction, setSendAction] = useState(getSendAction());

  const editorWrapRef = useRef<HTMLDivElement>(null);
  const ckRef = useRef<CKEditorRef>(null);

  const { createFileMessage } = useFileMessage();
  const { sendMessage } = useSendMessage();

  const onChange = (value: string) => {
    setHtml(value);
  };

  const enterToSend = async () => {
    const cleanText = getCleanText(latestHtml.current);
    setHtml("");
    if (!cleanText) return;
    if (cleanText.includes("No") || cleanText.includes("no")) {
      const data = {
        Detail: "病患信息",
        Title: "病案号：",
        MessageBody: cleanText,
      };
      const { data: message } = await IMSDK.createCustomMessage({
        data: JSON.stringify(data),
        extension: "",
        description: "",
      });
      sendMessage({ message });
    } else {
      const message = (await IMSDK.createTextMessage(cleanText)).data;
      sendMessage({ message });
    }
  };

  const sendEmoji = (item: EmojiData) => ckRef.current?.insertEmoji(item);

  const updateSendAction = (action: string) => {
    setSendAction(action as "enter" | "enterwithshift");
    saveSendAction(action);
  };

  return (
    <footer className="relative h-full bg-white py-px">
      <div className="flex h-full flex-col border-t border-t-[var(--gap-text)]">
        <SendActionBar
          sendEmoji={sendEmoji}
          sendMessage={sendMessage}
          createFileMessage={createFileMessage}
        />
        <div
          ref={editorWrapRef}
          className="relative flex flex-1 flex-col overflow-hidden"
        >
          <CKEditor
            ref={ckRef}
            value={html}
            enterWithShift={sendAction === "enterwithshift"}
            onEnter={enterToSend}
            onChange={onChange}
            onContextMenu={
              !window.electronAPI
                ? undefined
                : () => window.electronAPI?.ipcInvoke("showInputContextMenu")
            }
          />
          <div className="flex items-center justify-end py-2 pr-3">
            <Dropdown.Button
              overlayClassName="send-action-dropdown"
              className="w-fit px-6 py-1"
              type="primary"
              icon={<DownOutlined />}
              menu={{
                items: sendActions.map((item) => ({
                  label: item.label,
                  key: item.key,
                  itemIcon: sendAction === item.key ? <CheckOutlined /> : undefined,
                  onClick: () => updateSendAction(item.key),
                })),
              }}
              onClick={enterToSend}
            >
              {t("placeholder.quickReply")}
            </Dropdown.Button>
            <Dropdown.Button
              overlayClassName="send-action-dropdown"
              className="w-fit px-6 py-1"
              type="primary"
              icon={<DownOutlined />}
              menu={{
                items: sendActions.map((item) => ({
                  label: item.label,
                  key: item.key,
                  itemIcon: sendAction === item.key ? <CheckOutlined /> : undefined,
                  onClick: () => updateSendAction(item.key),
                })),
              }}
              onClick={enterToSend}
            >
              {t("placeholder.send")}
            </Dropdown.Button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default memo(forwardRef(ChatFooter));
