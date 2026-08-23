const express = require('express');
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken
});

const app = express();

// 關鍵字對應表：用陣列存多筆規則，依序比對
const replyRules = [
  {
    keywords: ['入金機', '硬幣機', '當機'],
    type: 'text',
    text: '幫我重開機試試看>>登錄帳號：ipc，密碼：123，選擇重新啟動'
  },
  {
    keywords: ['斷線', '暫停服務'],
    type: 'text',
    text: '已為您通報機房處理，線上稍後一下！'
  },
  {
    keywords: ['報修', '專線', '電話', '聯絡方式'],
    type: 'text',
    text: process.env.REPAIR_HOTLINE
  },
  {
    keywords: ['測試', 'TEST'],
    type: 'image',
    imageUrl: 'https://i.meee.com.tw/kQC1WZ8.png'
  }
];

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userText = event.message.text;

  // 依序比對每一組規則，看使用者的訊息有沒有包含關鍵字
  const matchedRule = replyRules.find((rule) =>
    rule.keywords.some((keyword) => userText.includes(keyword))
  );

  let messages;

  if (matchedRule) {
    if (matchedRule.type === 'image') {
      messages = [
        {
          type: 'image',
          originalContentUrl: matchedRule.imageUrl,
          previewImageUrl: matchedRule.imageUrl
        }
      ];
    } else {
      messages = [{ type: 'text', text: matchedRule.text }];
    }
  } else {
    // 沒有比對到任何關鍵字時的預設回覆
    messages = [{ type: 'text', text: '不好意思，我還聽不懂這個問題，可以換個說法嗎？' }];
  }

  return client.replyMessage({
    replyToken: event.replyToken,
    messages
  });
}

app.listen(process.env.PORT || 3000, () => {
  console.log('伺服器已啟動');
});
