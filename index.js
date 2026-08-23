const express = require('express');
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: 'qmMG0xac02VHdKZvXc1KYR9YR7uN8fydOxAjTJiKsP8rgqMVc5n4iJIULUo5dXK+dE9tcES9d+wnshyPg9hKPzJJZkm60GQ/SqTKn//i02U/ziZUPoWLUqas5oKKtwxTgRrcr+iCW6nGXwBZEiFIeAdB04t89/1O/w1cDnyilFU=',
  channelSecret: 'fc0e421ee81773c0a0a062ebbebcc6dd'
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken
});

const app = express();

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

  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [
      {
        type: 'text',
        text: `你說了：${event.message.text}`
      }
    ]
  });
}

app.listen(3000, () => {
  console.log('伺服器已啟動，port 3000');
});