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
  console.log('userId:', event.source.userId); 
  // 暫時加這行，之後可以刪掉
  const userText = event.message.text;
  // 特別處理「專人服務」：通知管理員 + 回覆使用者
  if (userText.includes('專人服務')) {
    // 推播給管理員
    client.pushMessage({
      to: process.env.ADMIN_USER_ID,
      messages: [
        {
          type: 'text',
          text: `📢 有使用者請求專人服務！\n使用者ID：${event.source.userId}`
        }
      ]
    }).catch((err) => console.error('推播管理員失敗:', err));

    // 回覆使用者
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: '已通知專人為您服務，請稍候，我們會盡快與您聯繫！' }]
    });
  }

  // 原本的關鍵字比對邏輯
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
    messages = [
      {
        type: 'text',
        text: '不好意思，我無法判斷這個問題，請稍候...由專人為您服務',
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '專人服務', text: '專人服務' } }
          ]
        }
      }
    ];
  }

  return client.replyMessage({
    replyToken: event.replyToken,
    messages
  });
}
app.listen(process.env.PORT || 3000, () => {
  console.log('伺服器已啟動');
});
