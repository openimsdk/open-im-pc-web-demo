import { FC } from "react";

import Twemoji from "@/components/Twemoji";
import { formatBr } from "@/utils/common";
import { formatLink } from "@/utils/imCommon";

import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";

const CustomMessageRender: FC<IMessageItemProps> = ({ message }) => {
  let data = message.customElem?.data;

  data = formatLink(data!);
  data = formatBr(data);
  const patient = JSON.parse(data);
  return (
    <Twemoji dbSelectAll>
      <div
        className={styles.bubble}
        dangerouslySetInnerHTML={{
          __html: `${String(patient.Detail)}\n${String(patient.Title)}${String(
            patient.MessageBody,
          )}`,
        }}
      ></div>
    </Twemoji>
  );
};

export default CustomMessageRender;
