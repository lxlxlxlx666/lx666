const socket = io();

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const lineWidthInput = document.getElementById('lineWidth');
const clearBtn = document.getElementById('clearBtn');
const guessBtn = document.getElementById('guessBtn');
const playersList = document.getElementById('players');
const messageList = document.getElementById('messages');
const nameInput = document.getElementById('nameInput');
const setNameBtn = document.getElementById('setNameBtn');

let drawing = false;
let lastPoint = null;

ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.strokeStyle = colorPicker.value;
ctx.lineWidth = Number(lineWidthInput.value);

function getPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const isTouch = event.touches && event.touches[0];
  const clientX = isTouch ? event.touches[0].clientX : event.clientX;
  const clientY = isTouch ? event.touches[0].clientY : event.clientY;

  return {
    x: ((clientX - rect.left) / rect.width) * canvas.width,
    y: ((clientY - rect.top) / rect.height) * canvas.height,
  };
}

function drawLine(from, to, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function onDrawStart(event) {
  event.preventDefault();
  drawing = true;
  lastPoint = getPointFromEvent(event);

  socket.emit('draw:start', {
    point: lastPoint,
    color: colorPicker.value,
    width: Number(lineWidthInput.value),
  });
}

function onDrawMove(event) {
  if (!drawing) return;
  event.preventDefault();

  const point = getPointFromEvent(event);
  const color = colorPicker.value;
  const width = Number(lineWidthInput.value);

  drawLine(lastPoint, point, color, width);
  socket.emit('draw:move', {
    from: lastPoint,
    to: point,
    color,
    width,
  });

  lastPoint = point;
}

function onDrawEnd() {
  if (!drawing) return;
  drawing = false;
  socket.emit('draw:end');
}

canvas.addEventListener('mousedown', onDrawStart);
canvas.addEventListener('mousemove', onDrawMove);
window.addEventListener('mouseup', onDrawEnd);

canvas.addEventListener('touchstart', onDrawStart, { passive: false });
canvas.addEventListener('touchmove', onDrawMove, { passive: false });
window.addEventListener('touchend', onDrawEnd);

clearBtn.addEventListener('click', () => {
  socket.emit('canvas:clear');
});

guessBtn.addEventListener('click', () => {
  const imageDataUrl = canvas.toDataURL('image/png', 0.8);
  socket.emit('ai:guess', { imageDataUrl });
});

setNameBtn.addEventListener('click', () => {
  socket.emit('player:setName', nameInput.value);
  nameInput.value = '';
});

colorPicker.addEventListener('input', () => {
  ctx.strokeStyle = colorPicker.value;
});

lineWidthInput.addEventListener('input', () => {
  ctx.lineWidth = Number(lineWidthInput.value);
});

socket.on('draw:start', ({ point }) => {
  lastPoint = point;
});

socket.on('draw:move', ({ from, to, color, width }) => {
  drawLine(from, to, color, width);
  lastPoint = to;
});

socket.on('canvas:clear', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

socket.on('players:update', (players) => {
  playersList.innerHTML = '';
  players.forEach((player) => {
    const li = document.createElement('li');
    li.textContent = player.name;
    playersList.appendChild(li);
  });
});

socket.on('ai:message', ({ text, time }) => {
  const li = document.createElement('li');
  const localTime = new Date(time).toLocaleTimeString();
  li.textContent = `[${localTime}] ${text}`;
  messageList.prepend(li);
});
