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
    // 沒有比對到任何關鍵字時的預設回覆，附上 Quick Reply 按鈕
    messages = [
      {
        type: 'text',
        text: '不好意思，我無法判斷這個問題，請稍候...由專人為您服務',
        quickReply: {
          items: [
            {
              type: 'action',
              action: { type: 'message', label: '專人服務', text: '專人服務' }
            }
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
