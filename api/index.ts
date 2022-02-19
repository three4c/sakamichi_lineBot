import axios from "axios";
import cheerio from "cheerio";
import dotenv from "dotenv";
import express from "express";
import { Client, middleware } from "@line/bot-sdk";

interface ScheduleType {
  time: string;
  text: string;
}

dotenv.config();

const PORT = process.env.PORT || 3000;
const config = {
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
};
const app = express();
const client = new Client(config);

app.get("/", (_, res) => res.send("🎉Success Deploy🎊"));
app.post("/webhook", middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  );
});

const handleEvent = async (event: any) => {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  let text = "";

  if (event.message.text === "予定") {
    // text = "積分中...";
    const response = await scraping();
    if (response) {
      const schedule = analysis(response);
      text = schedule.map((item) => `${item.time}${item.text}`).join("\n");
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

const analysis = (response: string) => {
  const schedule: ScheduleType[] = [];

  const categoryType: {
    [key: string]: string;
  } = {
    テレビ: "📺",
    ラジオ: "📻",
    配信: "🖥",
    雑誌: "📖",
    誕生日: "🎂",
  };

  const $ = cheerio.load(response);
  $(".p-schedule__item").each((_, element) => {
    const time = $(element).find(".c-schedule__time--list").text().trim()
      ? `⏰${$(element).find(".c-schedule__time--list").text().trim()}\n`
      : "";
    const text = `${
      categoryType[$(element).find(".c-schedule__category").text().trim()]
    }${$(element).find(".c-schedule__text").text().trim()}\n`;

    schedule.push({
      time,
      text,
    });
  });

  return schedule;
};

app.listen(PORT);
console.log(`Server running at ${PORT}`);
