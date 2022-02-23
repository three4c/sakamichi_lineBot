import axios from "axios";
import cheerio from "cheerio";
import dotenv from "dotenv";
import express from "express";
import {
  Client,
  middleware,
  WebhookEvent,
  MessageAPIResponseBase,
  Message,
  FlexBubble,
} from "@line/bot-sdk";

interface ScheduleType {
  text: string;
  category: string;
  uri: string;
  time: string;
}

dotenv.config();

const PORT = process.env.PORT || 3000;

const config = {
  channelSecret: process.env.CHANNEL_SECRET || "",
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || "",
};

const app = express();
const client = new Client(config);

/** 表示確認用 */
app.get("/", (_, res) => res.send("🎉Success Deploy🎊"));

/** webhook周り */
app.post("/webhook", middleware(config), (req, res) => {
  Promise.all(req.body.events.map(replayMessage)).then((result) =>
    res.json(result)
  );
});

const textMessage = (text: string): Message => ({
  type: "text",
  text,
});

const flexMessageTemplate = (schedules: ScheduleType[]): Message => {
  const contents: FlexBubble[] = schedules.map((item) => ({
    type: "bubble",
    size: "nano",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: item.text,
              weight: "bold",
              wrap: true,
              size: "md",
            },
          ],
        },
        {
          type: "box",
          layout: "baseline",
          contents: [
            {
              type: "text",
              text: item.category,
              size: "sm",
            },
            {
              type: "text",
              text: item.time,
              align: "end",
              size: "sm",
            },
          ],
          margin: "lg",
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "separator",
        },
        {
          type: "button",
          action: {
            type: "uri",
            label: "詳細",
            uri: item.uri,
          },
          height: "sm",
          margin: "lg",
        },
      ],
    },
  }));

  return {
    type: "flex",
    altText: "本日の予定",
    contents: {
      type: "carousel",
      contents,
    },
  };
};

/** 特定の文字列に反応し、リプライする */
const replayMessage = async (
  event: WebhookEvent
): Promise<MessageAPIResponseBase> => {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  let message: Message;

  if (event.message.text === "予定") {
    const response = await scraping();

    if (response) {
      const schedules = analysis(response);
      console.log(schedules);
      message = flexMessageTemplate(schedules);
    } else {
      message = textMessage("問題が発生しました");
    }
  } else {
    message = textMessage("負けるな！しょげるな！林瑠奈です！");
  }

  return client.replyMessage(event.replyToken, message);
};

/** urlからスクレイピングした結果を文字列で返す */
const scraping = async () => {
  try {
    const response = await axios.get<string>(
      "https://www.hinatazaka46.com/s/official/media/list"
    );
    return response.data;
  } catch (error) {
    return "";
  }
};

/** 文字列をDOM解析し、整形する */
const analysis = (response: string) => {
  const schedule: ScheduleType[] = [];

  const $ = cheerio.load(response);
  $(".p-schedule__item").each((_, element) => {
    const text = $(element).find(".c-schedule__text").text().trim();
    const category = $(element).find(".c-schedule__category").text().trim();
    const uri = `https://www.hinatazaka46.com${$(element)
      .find("a")
      .attr("href")}`;
    const time =
      $(element)
        .find(".c-schedule__time--list")
        .text()
        .trim()
        .replace(/～/g, "") || " ";

    schedule.push({
      text,
      category,
      uri,
      time,
    });
  });

  return schedule;
};

app.listen(PORT);
console.log(`Server running at ${PORT}`);
