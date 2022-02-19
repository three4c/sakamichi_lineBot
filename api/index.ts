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

const app = express();

const PORT = process.env.PORT || 3000;

const config = {
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
};

app.get("/", (req, res) => res.send("🎉Success Deploy🎊"));
app.post("/webhook", middleware(config), (req, res) => {
  console.log(req.body.events);

  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  );
});

const client = new Client(config);

const scraping = async (userId: string) => {
  const schedule: ScheduleType[] = [];
  let text = "";

  const categoryType: {
    [key: string]: string;
  } = {
    テレビ: "📺",
    ラジオ: "📻",
    配信: "🖥",
    雑誌: "📖",
    誕生日: "🎂",
  };

  await axios
    .get("https://www.hinatazaka46.com/s/official/media/list")
    .then((res) => {
      const $ = cheerio.load(res.data);
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

      text = schedule.map((item) => `${item.time}${item.text}`).join("\n");
    })
    .catch((error) => {
      text = `エラーが発生しました\n${error}`;
    });

  console.log(schedule);

  await client.pushMessage(userId, {
    type: "text",
    text,
  });
};

const handleEvent = async (event: any) => {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  let text = "";

  if (event.message.text === "予定") {
    text = "積分中...";
    scraping(event.source.userId);
  } else {
    text = "負けるな！しょげるな！林瑠奈です！";
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text,
  });
};

app.listen(PORT);
console.log(`Server running at ${PORT}`);
