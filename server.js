const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const OpenAI = require('openai');

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.use(express.static(path.join(__dirname, 'public')));

const players = new Map();

io.on('connection', (socket) => {
  players.set(socket.id, { id: socket.id, name: `玩家-${socket.id.slice(0, 4)}` });

  io.emit('players:update', Array.from(players.values()));

  socket.on('player:setName', (name) => {
    const cleanName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 20) : null;
    if (!cleanName) return;
    const player = players.get(socket.id);
    if (!player) return;
    player.name = cleanName;
    io.emit('players:update', Array.from(players.values()));
  });

  socket.on('draw:start', (payload) => socket.broadcast.emit('draw:start', payload));
  socket.on('draw:move', (payload) => socket.broadcast.emit('draw:move', payload));
  socket.on('draw:end', () => socket.broadcast.emit('draw:end'));
  socket.on('canvas:clear', () => io.emit('canvas:clear'));

  socket.on('ai:guess', async ({ imageDataUrl }) => {
    const guess = await guessDrawing(imageDataUrl);
    io.emit('ai:message', {
      text: guess,
      time: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
    io.emit('players:update', Array.from(players.values()));
  });
});

async function guessDrawing(imageDataUrl) {
  if (openai && typeof imageDataUrl === 'string' && imageDataUrl.startsWith('data:image/')) {
    try {
      const response = await openai.responses.create({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: '你在玩你画我猜。请根据这张简笔画，用中文给出一个最可能的猜测（不超过10个字）。只返回猜测词本身。',
              },
              {
                type: 'input_image',
                image_url: imageDataUrl,
              },
            ],
          },
        ],
      });

      const text = response.output_text?.trim();
      if (text) return `🤖 AI 猜测：${text}`;
    } catch (error) {
      console.error('OpenAI 识图失败，使用本地猜测逻辑。', error.message);
    }
  }

  return fallbackGuess(imageDataUrl);
}

function fallbackGuess(imageDataUrl) {
  const hints = [
    '太阳',
    '房子',
    '猫',
    '狗',
    '树',
    '汽车',
    '鱼',
    '飞机',
    '花',
    '火箭',
  ];

  if (typeof imageDataUrl !== 'string') {
    return `🤖 AI 猜测：${hints[Math.floor(Math.random() * hints.length)]}`;
  }

  const sizeScore = imageDataUrl.length % hints.length;
  return `🤖 AI 猜测：${hints[sizeScore]}`;
}

server.listen(PORT, () => {
  console.log(`服务器已启动：http://localhost:${PORT}`);
});
