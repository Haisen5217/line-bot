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
// 用來記錄「哪個使用者暫停到什麼時間」，key 是 userId，value 是解除暫停的時間戳記
const pausedUsers = new Map();
// 關鍵字對應表：用陣列存多筆規則，依序比對
const replyRules = [
  {
    keywords: ['入金機', '掃描器', 'QR', '重開機', '當機'],
    type: 'image',
    imageUrl: 'https://i.meee.com.tw/1132UBp.png'
  },
  {
    keywords: ['斷線', '中斷', '暫停服務'],
    type: 'text',
    text: '已為您通報機房處理，線上稍後一下！',
    notifyAdmin: true,
    adminText: (userId) => `📢 請協助通報機房清線路！\n02-21711112＃5301\n使用者ID：${userId}`
  },
  {
    keywords: ['報修', '專線', '電話', '聯絡方式'],
    type: 'text',
    text: process.env.REPAIR_HOTLINE
  },
  {
    keywords: ['硬幣機', '硬幣機故障', '重開硬幣機', '通訊失聯'],
    type: 'image',
    imageUrl: 'https://i.meee.com.tw/iWAWHkr.png'
  },
  {
    keywords: ['保險箱狀態異常無法存款', '保險箱'],
    type: 'text',
    text: '登入畫面輸入8888 >> \n帳號:admin >> \n密碼:v123 >> \n選擇存款流程測試 >> \n選擇感應器資料 >> \n選擇自我測試 >> \n選擇清空幣道 >> \n選擇清除錯誤狀態'
  }
];

// 把推播給所有管理員的邏輯獨立成一個函式，方便重複使用
function notifyAdmins(text) {
  const adminIds = process.env.ADMIN_USER_ID
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  adminIds.forEach((adminId) => {
    client.pushMessage({
      to: adminId,
      messages: [{ type: 'text', text }]
    }).catch((err) => console.error(`推播給 ${adminId} 失敗:`, err));
  });
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
  console.log('userId:', event.source.userId);
  const userText = event.message.text.trim();
  const userId = event.source.userId;

  // 判斷是不是「stop + 數字」的指令，例如 stop300
  const stopMatch = userText.match(/^stop(\d+)$/i);
  if (stopMatch) {
    const seconds = parseInt(stopMatch[1], 10);
    const resumeAt = Date.now() + seconds * 1000;
    pausedUsers.set(userId, resumeAt);
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: `好的，將暫停自動回覆 ${seconds} 秒，時間到會自動恢復。` }]
    });
  }

  // 判斷是不是「start」指令，立刻恢復自動回覆
  if (/^start$/i.test(userText)) {
    const wasPaused = pausedUsers.has(userId);
    pausedUsers.delete(userId);
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{
        type: 'text',
        text: wasPaused ? '已為您恢復自動回覆！' : '自動回覆本來就是開啟的！'
      }]
    });
  }

  // 檢查這個使用者現在是不是還在暫停期間
  if (pausedUsers.has(userId)) {
    const resumeAt = pausedUsers.get(userId);
    if (Date.now() < resumeAt) {
      return Promise.resolve(null);
    } else {
      pausedUsers.delete(userId);
    }
  }

  if (userText.includes('專人服務')) {
    notifyAdmins(`📢 有使用者請求專人服務！\n使用者ID：${userId}`);
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
    // 如果這條規則有標記需要通知管理員，就推播
    if (matchedRule.notifyAdmin) {
      notifyAdmins(matchedRule.adminText(userId));
    }

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
        text: '不好意思，我無法判斷！\n請選擇您需要以下哪一個協助 ↓',
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '入金機當機', text: '入金機當機' } },
            { type: 'action', action: { type: 'message', label: '硬幣機故障', text: '硬幣機故障' } },
            { type: 'action', action: { type: 'message', label: '連線中斷', text: '連線中斷' } },
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
