import axios from "axios";
import cheerio from "cheerio";
import dotenv from "dotenv";
import express from "express";
import {
  Client,
  middleware,
  WebhookEvent,
  MessageAPIResponseBase,
} from "@line/bot-sdk";

interface ScheduleType {
  time: string;
  text: string;
  url: string;
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

/** 特定の文字列に反応し、リプライする */
const replayMessage = async (
  event: WebhookEvent
): Promise<MessageAPIResponseBase> => {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  let text = "";

  if (event.message.text === "予定") {
    const response = await scraping();

    if (response) {
      const schedule = analysis(response);
      text = schedule
        .map((item) => `${item.time}${item.text}${item.url}`)
        .join("\n");
    } else {
      text = "問題が発生しました";
    }
  } else {
    text = "負けるな！しょげるな！林瑠奈です！";
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text,
  });
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

  const categoryType: {
    [key: string]: string;
  } = {
    テレビ: "📺",
    WEB: "🖥",
    ラジオ: "📻",
    配信: "🚀",
    雑誌: "📖",
    誕生日: "🎂",
  };

  const $ = cheerio.load(response);
  $(".p-schedule__item").each((_, element) => {
    const time = $(element).find(".c-schedule__time--list").text().trim()
      ? `⏰${$(element).find(".c-schedule__time--list").text().trim()}\n`
      : "";

    const url = `🔍https://www.hinatazaka46.com${$(element)
      .find("a")
      .attr("href")}\n`;

    const text = `${
      categoryType[$(element).find(".c-schedule__category").text().trim()]
    }${$(element).find(".c-schedule__text").text().trim()}\n`;

    schedule.push({
      time,
      text,
      url,
    });
  });

  return schedule;
};

app.listen(PORT);
console.log(`Server running at ${PORT}`);
