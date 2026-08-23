/*
const express = require('express');
const line = require('@line/bot-sdk');
const { distance } = require('fastest-levenshtein');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken
});

const app = express();

const replyRules = [
  {
    keywords: ['入金機', '掃描器', 'QR', '當機'],
    messages: [
      { type: 'text', 
        text: '幫我重開機試試看>>登錄帳號：ipc，密碼：123，選擇重新啟動' },
      {
        type: 'image',
        imageUrl: 'https://i.meee.com.tw/1132UBp.png'}
              ]
  },
  {
    keywords: ['斷線', '中斷', '暫停服務'],
    type: 'text',
    text: '已為您通報機房處理，線上稍後一下！'
  },
  {
    keywords: ['報修', '專線', '電話', '聯絡方式'],
    type: 'text',
    text: process.env.REPAIR_HOTLINE
  },
  {
    keywords: ['硬幣機', '硬幣機故障', '通訊失聯'],
    type: 'image',
    imageUrl: 'https://i.meee.com.tw/iWAWHkr.png'
  },
  {
    keywords: ['保險箱狀態異常無法存款', '保險箱'],
    type: 'text',
    text: '登入畫面輸入8888 >> 帳號:admin >> 密碼:v123 >> 選擇存款流程測試 >> 感應器資料 >> 自我測試 >> 清空幣道 >> 清除錯誤狀態'
  }
];

// 模糊比對函式：先看是否包含關鍵字，沒有的話再用編輯距離抓相似字串
function findMatchedRule(userText) {
  // 第一輪：完全包含（最準，優先）
  let matched = replyRules.find((rule) =>
    rule.keywords.some((keyword) => userText.includes(keyword))
  );
  if (matched) return matched;

  // 第二輪：模糊比對，抓「使用者句子中的片段」跟關鍵字很接近的情況
  let bestMatch = null;
  let bestScore = Infinity;

  replyRules.forEach((rule) => {
    rule.keywords.forEach((keyword) => {
      // 用滑動視窗，截取跟關鍵字等長的片段來比對，避免長短句差太多失真
      for (let i = 0; i <= userText.length - keyword.length + 2; i++) {
        const chunk = userText.slice(i, i + keyword.length);
        const d = distance(chunk, keyword);
        if (d < bestScore) {
          bestScore = d;
          bestMatch = rule;
        }
      }
    });
  });

  // 容錯門檻：編輯距離 <= 1 才算模糊命中（差一個字以內），避免誤判太多
  return bestScore <= 1 ? bestMatch : null;
}

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
  const matchedRule = findMatchedRule(userText);

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
    messages = [{ type: 'text', text: '不好意思，我無法判斷這個問題，請稍候...由專人為您服務' }];
  }

  return client.replyMessage({
    replyToken: event.replyToken,
    messages
  });
}

app.listen(process.env.PORT || 3000, () => {
  console.log('伺服器已啟動');
});
*/
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
    keywords: ['入金機', '掃描器', 'QR', '當機'],
    type: 'image',
    imageUrl: 'https://i.meee.com.tw/1132UBp.png'
  },
  {
    keywords: ['斷線', '中斷', '暫停服務'],
    type: 'text',
    text: '已為您通報機房處理，線上稍後一下！'
  },
  {
    keywords: ['報修', '專線', '電話', '聯絡方式'],
    type: 'text',
    text: process.env.REPAIR_HOTLINE
  },
  {
    keywords: ['硬幣機', '硬幣機故障', '通訊失聯'],
    type: 'image',
    imageUrl: 'https://i.meee.com.tw/iWAWHkr.png'
  },
  {
    keywords: ['保險箱狀態異常無法存款', '保險箱'],
    type: 'text',
    text: '登入畫面輸入8888 >> 帳號:admin >> 密碼:v123 >> 選擇存款流程測試 >> 感應器資料 >> 自我測試 >> 清空幣道 >> 清除錯誤狀態'
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
    messages = [{ type: 'text', text: '不好意思，我無法判斷這個問題，請稍候...由專人為您服務' }];
  }

  return client.replyMessage({
    replyToken: event.replyToken,
    messages
  });
}

app.listen(process.env.PORT || 3000, () => {
  console.log('伺服器已啟動');
});
