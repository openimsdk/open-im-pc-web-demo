import { MessageItem, MessageType } from "@openim/wasm-client-sdk";
import i18n, { t } from "i18next";
import { memo } from "react";
import { useCopyToClipboard } from "react-use";

import copy from "@/assets/images/messageMenu/copy.png";
import emoji from "@/assets/images/messageMenu/emoji.png";
import forward from "@/assets/images/messageMenu/forward.png";
import remove from "@/assets/images/messageMenu/remove.png";
import reply from "@/assets/images/messageMenu/reply.png";
import revoke from "@/assets/images/messageMenu/revoke.png";
import { IMSDK } from "@/layout/MainContentWrap";
import { useUserStore } from "@/store";
import { feedbackToast } from "@/utils/common";
import { emit } from "@/utils/events";
import { getUserCustomEmojis, setUserCustomEmojis } from "@/utils/storage";

import { deleteOneMessage, updateOneMessage } from "../useHistoryMessageList";

const messageMenuList = [
  {
    idx: 0,
    title: t("placeholder.add"),
    icon: emoji,
    hidden: false,
  },
  {
    idx: 1,
    title: t("placeholder.forward"),
    icon: forward,
    hidden: false,
  },
  {
    idx: 2,
    title: t("placeholder.copy"),
    icon: copy,
    hidden: false,
  },
  {
    idx: 3,
    title: t("placeholder.revoke"),
    icon: revoke,
    hidden: false,
  },
  {
    idx: 4,
    title: t("placeholder.delete"),
    icon: remove,
    hidden: false,
  },
  {
    idx: 5,
    title: t("placeholder.reply"),
    icon: reply,
    hidden: false,
  },
  {
    idx: 6,
    title: t("placeholder.quickReplyYes"),
    icon: reply,
    hidden: false,
  },
  {
    idx: 7,
    title: t("placeholder.quickReplyNo"),
    icon: reply,
    hidden: false,
  },
];

i18n.on("languageChanged", () => {
  messageMenuList[0].title = t("placeholder.add");
  messageMenuList[1].title = t("placeholder.forward");
  messageMenuList[2].title = t("placeholder.copy");
  messageMenuList[3].title = t("placeholder.revoke");
  messageMenuList[4].title = t("placeholder.delete");
  messageMenuList[5].title = t("placeholder.reply");
  messageMenuList[6].title = t("placeholder.quickReplyYes");
  messageMenuList[7].title = t("placeholder.quickReplyNo");
});

const canCopyTypes = [
  MessageType.TextMessage,
  MessageType.AtTextMessage,
  MessageType.QuoteMessage,
];

const canAddPhizTypes = [MessageType.PictureMessage, MessageType.FaceMessage];

const MessageMenuContent = ({
  message,
  conversationID,
  closeMenu,
}: {
  message: MessageItem;
  conversationID: string;
  closeMenu: () => void;
}) => {
  const selfUserID = useUserStore((state) => state.selfInfo.userID);
  const [_, copyToClipboard] = useCopyToClipboard();

  const getCustomEmojiData = () => {
    let sourceData = {
      path: "",
      url: "",
      width: 0,
      height: 0,
    };
    if (message.contentType === MessageType.PictureMessage) {
      sourceData = {
        path: message.pictureElem!.sourcePath,
        url: message.pictureElem!.sourcePicture.url,
        width: message.pictureElem!.sourcePicture.width,
        height: message.pictureElem!.sourcePicture.height,
      };
    }
    if (message.contentType === MessageType.FaceMessage) {
      const faceEl = JSON.parse(message.faceElem!.data);
      sourceData = {
        path: faceEl.path ?? "",
        url: faceEl.url,
        width: faceEl.width,
        height: faceEl.height,
      };
    }
    return sourceData;
  };

  const menuClick = (idx: number) => {
    switch (idx) {
      case 0:
        getUserCustomEmojis().then((res) => {
          setUserCustomEmojis([...res, getCustomEmojiData()]);
          feedbackToast({ msg: t("toast.addSuccess") });
        });
        break;
      case 1:
        emit("OPEN_CHOOSE_MODAL", {
          type: "FORWARD_MESSAGE",
          extraData: message,
        });
        break;
      case 2:
        copyToClipboard(getCopyText().trim());
        feedbackToast({ msg: t("toast.copySuccess") });
        break;
      case 3:
        tryRevoke();
        break;
      case 4:
        tryRemove();
        break;
      default:
        break;
    }
    closeMenu();
  };

  const tryRevoke = async () => {
    try {
      await IMSDK.revokeMessage({ conversationID, clientMsgID: message.clientMsgID });
      updateOneMessage({
        ...message,
        contentType: MessageType.RevokeMessage,
        notificationElem: {
          detail: JSON.stringify({
            clientMsgID: message.clientMsgID,
            revokeTime: Date.now(),
            revokerID: selfUserID,
            revokerNickname: t("you"),
            revokerRole: 0,
            seq: message.seq,
            sessionType: message.sessionType,
            sourceMessageSendID: message.sendID,
            sourceMessageSendTime: message.sendTime,
            sourceMessageSenderNickname: message.senderNickname,
          }),
        },
      });
    } catch (error) {
      feedbackToast({ error });
    }
  };

  const tryRemove = async () => {
    try {
      await IMSDK.deleteMessage({ clientMsgID: message.clientMsgID, conversationID });
      deleteOneMessage(message.clientMsgID);
    } catch (error) {
      feedbackToast({ error });
    }
  };

  const getCopyText = () => {
    const selection = window.getSelection()?.toString();
    return selection || message.textElem?.content || "";
  };

  const isSender = message.sendID === selfUserID;
  const moreThanRevokeLimit = message.sendTime < Date.now() - 5 * 60 * 1000;

  return (
    <div className="p-1">
      {messageMenuList.map((menu) => {
        if (menu.idx === 0 && !canAddPhizTypes.includes(message.contentType)) {
          return null;
        }

        if (menu.idx === 2 && !canCopyTypes.includes(message.contentType)) {
          return null;
        }

        if (menu.idx === 3) {
          if (moreThanRevokeLimit) return null;

          if (!isSender) return null;
        }

        return (
          <div
            className="flex cursor-pointer items-center rounded px-3 py-2 hover:bg-[var(--primary-active)]"
            key={menu.idx}
            onClick={() => menuClick(menu.idx)}
            onMouseDown={(e) => e.preventDefault()}
          >
            <img className="mr-2 h-3.5" width={14} src={menu.icon} alt={menu.title} />
            <div className="text-xs">{menu.title}</div>
          </div>
        );
      })}
    </div>
  );
};

export default memo(MessageMenuContent);
