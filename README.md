# 在线你画我猜（AI 猜图）

一个多人实时涂鸦游戏：
- 玩家可在共享画布上绘画（实时同步）
- 支持设置昵称、画笔颜色和粗细
- 点击按钮让 AI 猜测你画的内容
- 若未配置 OpenAI Key，会使用本地兜底猜测

## 运行方式

```bash
npm install
npm start
```

打开：`http://localhost:3000`

## 可选：接入 OpenAI 识图

创建 `.env`：

```bash
OPENAI_API_KEY=你的key
OPENAI_MODEL=gpt-4.1-mini
```

> 不配置也可以运行，只是 AI 猜测会使用本地兜底逻辑。
