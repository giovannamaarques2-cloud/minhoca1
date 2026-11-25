// ===== SERVIDOR: é ele quem manda no jogo =====
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } }); // aceita conexões de qualquer origem

app.use(express.static('public')); // entrega o index.html

const MAPA = 3000;     // tamanho do mundo
const VELOCIDADE = 4;  // pixels por "tick"
const RAIO = 8;        // espessura da minhoca
const TICKS = 30;      // atualizações por segundo

const jogadores = {};  // todas as minhocas vivas
const comidas = [];

const rand = (n) => Math.random() * n;
const novaComida = () => ({ x: rand(MAPA), y: rand(MAPA), cor: Math.floor(rand(360)) });
for (let i = 0; i < 200; i++) comidas.push(novaComida());

function nascer(id, nome) {
  const x = 300 + rand(MAPA - 600);
  const y = 300 + rand(MAPA - 600);
  const corpo = [];
  for (let i = 0; i < 20; i++) corpo.push({ x: x - i * VELOCIDADE, y });
  jogadores[id] = {
    id, nome, corpo,
    angulo: 0,
    cor: Math.floor(rand(360)),
    crescer: 0,
    pontos: 0,
  };
}

function morrer(j) {
  // vira comida espalhada
  for (let i = 0; i < j.corpo.length; i += 4) {
    comidas.push({ x: j.corpo[i].x + rand(10) - 5, y: j.corpo[i].y + rand(10) - 5, cor: j.cor });
  }
  delete jogadores[j.id];
  io.to(j.id).emit('morreu', j.pontos);
}

// ===== O que acontece quando alguém conecta =====
io.on('connection', (socket) => {
  console.log('Entrou:', socket.id);

  socket.on('entrar', (nome) => {
    nascer(socket.id, String(nome || 'Anônimo').slice(0, 15));
  });

  // o cliente só manda PRA ONDE quer ir; o servidor move
  socket.on('angulo', (a) => {
    const j = jogadores[socket.id];
    if (j && typeof a === 'number') j.angulo = a;
  });

  socket.on('disconnect', () => {
    delete jogadores[socket.id];
    console.log('Saiu:', socket.id);
  });
});

// ===== Loop do jogo: roda 30x por segundo =====
setInterval(() => {
  const lista = Object.values(jogadores);

  for (const j of lista) {
    // 1. move a cabeça
    const cabeca = j.corpo[0];
    j.corpo.unshift({
      x: cabeca.x + Math.cos(j.angulo) * VELOCIDADE,
      y: cabeca.y + Math.sin(j.angulo) * VELOCIDADE,
    });
    if (j.crescer > 0) j.crescer--;
    else j.corpo.pop();

    // 2. come comida
    const h = j.corpo[0];
    for (let i = comidas.length - 1; i >= 0; i--) {
      if (Math.hypot(comidas[i].x - h.x, comidas[i].y - h.y) < RAIO + 6) {
        comidas.splice(i, 1);
        j.crescer += 3;
        j.pontos++;
      }
    }
  }
  while (comidas.length < 200) comidas.push(novaComida());

  // 3. colisões
  for (const j of lista) {
    const h = j.corpo[0];
    let morto = h.x < 0 || h.y < 0 || h.x > MAPA || h.y > MAPA; // bateu na parede
    if (!morto) {
      for (const o of lista) {
        if (o.id === j.id) continue;
        if (o.corpo.some((p) => Math.hypot(p.x - h.x, p.y - h.y) < RAIO)) { morto = true; break; }
      }
    }
    if (morto) morrer(j);
  }

  // 4. manda o estado atual para TODOS os jogadores
  io.emit('estado', {
    jogadores: Object.values(jogadores).map((j) => ({
      id: j.id, nome: j.nome, cor: j.cor, pontos: j.pontos, corpo: j.corpo,
    })),
    comidas,
  });
}, 1000 / TICKS);

const PORTA = process.env.PORT || 3000;
server.listen(PORTA, () => console.log(`Jogo rodando na porta ${PORTA}`));