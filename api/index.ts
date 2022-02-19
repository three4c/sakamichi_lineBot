import dotenv from "dotenv";
import express from "express";
import puppeteer from "puppeteer";
import { Client, middleware } from "@line/bot-sdk";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

const config = {
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
};

app.get("/", (req, res) => res.send("🎉 Success Deploy 🎊"));
app.post("/webhook", middleware(config), (req, res) => {
  console.log(req.body.events);

  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  );
});

const client = new Client(config);

const scraping = async (userId: string) => {
  const browser = await puppeteer.launch({ args: ["--lang=ja"] });
  const page = await browser.newPage();

  /** cosole.logで値を確認 */
  // page.on("console", (msg) => {
  //   for (let i = 0; i < msg.args.length; ++i)
  //     console.log(`${i}: ${msg.args[i]}`);
  // });

  await page.goto("https://www.nogizaka46.com/s/n46/", {
    waitUntil: "networkidle0",
  });

  await page.waitForTimeout(1000);

  const data = await page.$$eval(".tp--sc__list .m--scone__a", (list) => {
    const genreType: {
      [key: string]: string;
    } = {
      TV: "📺",
      WEB: "🖥",
      ラジオ: "📻",
      書籍: "📖",
      誕生日: "🎂",
    };

    return list.map((item) => ({
      start: item.querySelector(".m--scone__start")
        ? `⏰${item.querySelector(".m--scone__start").textContent}\n`
        : "",
      title: `${
        genreType[item.querySelector(".m--scone__cat__name").textContent]
      }${item.querySelector(".m--scone__ttl").textContent}\n`,
      href: `🔍${item.getAttribute("href")}\n`,
    }));
  });

  await browser.close();

  // console.log("data", data);

  await client.pushMessage(userId, {
    type: "text",
    text: data
      .map((item) => `${item.start}${item.title}${item.href}`)
      .join("\n"),
  });
};

const handleEvent = async (event: any) => {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  let mes = "";

  if (event.message.text === "予定") {
    mes = "積分中...";
    scraping(event.source.userId);
  } else {
    mes = "負けるな！しょげるな！林瑠奈です！";
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: mes,
  });
};

app.listen(PORT);
console.log(`Server running at ${PORT}`);
