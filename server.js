const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static("public"));
app.get("/health", (_req, res) => res.json({ ok: true, game: "The Silly Shuffle" }));

const PORT = process.env.PORT || 3000;
const rooms = new Map();
const NICKNAMES = [
  "Waffle Wizard","Captain Noodle","Sir Wiggles","Professor Pickle","Disco Potato",
  "Muffin Bandit","Baron von Beans","Count Quackula","The Toast Ghost","Duchess Doodle",
  "Pancake Ranger","Biscuit Rocket","Mayor Marshmallow","Tiny Tornado","Jellybean Jones",
  "Lord Sprinkles","Noodle Nugget","Soggy Legend","Banana Detective","Cheddar Champion",
  "Pudding Ninja","The Great Zucchini","Wobble Goblin","Crumb Commander","Nacho Average Hero",
  "Fancy Turnip","Bubblegum Bandit","Cactus Pajamas","Sir Hops-a-Lot","Pickle McGiggles"
];
const PROMPTS = [
  "The secret ingredient in a superhero's breakfast is ____.",
  "The worst thing to hear from a tiny wizard is ____.",
  "Our town's new mascot is ____.",
  "The only thing scarier than a haunted house is ____.",
  "The royal chef was fired for serving ____.",
  "A very confusing thing to find in your shoe: ____.",
  "The next Olympic sport should be ____.",
  "The moon is actually made of ____.",
  "The best name for a pet dinosaur is ____.",
  "The school talent show was ruined by ____.",
  "A terrible slogan for a pillow company: ____.",
  "The world's least useful superpower is ____.",
  "The queen has declared tomorrow National ____ Day.",
  "The robot uprising was stopped by ____.",
  "Never trust a person who collects ____.",
  "The weirdest thing to bring to a picnic is ____.",
  "A pirate's biggest fear is ____.",
  "The new flavor of toothpaste is ____.",
  "The museum's most popular exhibit is ____.",
  "The secret to becoming famous is ____.",
  "A terrible thing to yell during yoga is ____.",
  "The first thing aliens asked for was ____.",
  "The most suspicious item at a bake sale is ____.",
  "A wizard's least magical spell is ____.",
  "The new name for Monday is ____.",
  "The world's fanciest sandwich contains ____.",
  "The true reason socks disappear is ____.",
  "A bad theme for a birthday party: ____.",
  "The mayor's emergency plan involves ____.",
  "The best way to impress a squirrel is ____."
];
const ANSWERS = [
  "A suspiciously confident pigeon","A tiny hat for a very large frog","Soup with a side of more soup",
  "A raccoon in a business suit","The world's dampest trumpet","A dramatic reading of the menu",
  "Seventeen ducks in a trench coat","A potato with leadership skills","An emotionally complicated lasagna",
  "A kazoo solo that lasts four hours","A llama with excellent credit","A haunted wheel of cheese",
  "A very polite goblin","A bucket full of tiny spoons","A goose who knows your secrets",
  "A wizard powered by snacks","A motivational speech from a turnip","A disco ball full of bees",
  "A sandwich that whispers","An extremely average dragon","A confused but enthusiastic hamster",
  "A golden toilet plunger","A penguin doing taxes","A dramatic amount of glitter",
  "A chicken wearing roller skates","A cloud shaped like a disappointed dad","A mysterious jar of elbows",
  "A tap-dancing meatball","A banana with a fake mustache","A professional napper",
  "A tiny orchestra of frogs","A very judgmental cupcake","A squirrel with a clipboard",
  "A cheese wheel named Kevin","A pair of suspiciously fancy pants","A llama-shaped alarm clock",
  "A bucket of birthday confetti","A sneeze that echoes forever","A spaghetti-powered scooter",
  "A haunted pair of flip-flops","A goose in tiny sunglasses","A dramatic slow-motion tumble",
  "A wizard's emergency snack drawer","A goldfish with a podcast","A very loud whisper",
  "A sleepy vampire in slippers","A moon made entirely of mashed potatoes","A raccoon running for mayor",
  "A suspiciously warm snowman","A tiny parade of bread rolls","A banana peel with ambition",
  "A sentient sock puppet","A giraffe in a raincoat","A pickle with stage fright",
  "A confused time-traveling librarian","A duck who invented jazz","A glitter cannon operated by hamsters",
  "A tiny knight riding a corgi","A dramatic reading of a grocery list","A sandwich with a PhD",
  "A frog who only speaks in riddles","A very fancy cardboard box","A mysterious kazoo",
  "A sleepy dragon with a day job","A hat that gives unsolicited advice","A robot that only makes pancakes",
  "A suspiciously elegant potato","A disco party in a mailbox","A swarm of extremely polite bees",
  "A wizard's coupon collection","A tiny parade marshal","A self-aware cheese puff",
  "A unicycle made of spaghetti","A penguin with a briefcase","A very dramatic breadstick",
  "A cloud of judgmental glitter","A pirate who is afraid of boats","A tiny opera about laundry",
  "A bear who sells artisanal buttons","A marching band of rubber ducks","A suspiciously helpful ghost",
  "A pair of tap-dancing trousers","A wizard's emotional support turnip","A snail with a jetpack",
  "A very official-looking banana","A chicken with a tiny briefcase","A mountain of squeaky toys",
  "A llama who reviews restaurants","A penguin running a lemonade stand","A highly trained potato",
  "A confused clown on a scooter","A tiny hat convention","A dramatic cheese fountain",
  "A hamster in a detective coat","A secret society of bread","A goose with a PhD",
  "A very small parade float","A wizard who forgot the password","A suspiciously talented spoon",
  "A sentient bowl of cereal","A disco-themed weather forecast","A tiny dragon doing bookkeeping",
  "A very polite explosion of confetti","A cow with a jazz album","A cucumber with stage presence",
  "A haunted karaoke machine","A frog in a tuxedo","A potato that knows karate",
  "A deeply confused birthday cake","A very enthusiastic dust bunny","A secret tunnel made of noodles",
  "A duck with a tiny megaphone","A dramatic reading of shampoo instructions","A committee of sleepy owls",
  "A banana with a five-year plan","A robot learning to yodel","A tiny llama parade"
];
const HOUSE_ANSWERS = [
  "A raccoon in a tiny judge wig","A singing potato with a clipboard","A duck who gives surprisingly good advice",
  "A very confident bowl of pudding","A tiny wizard on a lunch break","A goose with a dramatic backstory",
  "A hamster who has seen too much","A disco ball full of tiny frogs","A sandwich with big dreams",
  "A confused robot holding a cupcake","A llama who knows the rules","A tiny parade of judgmental ducks"
];
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
const code = () => crypto.randomBytes(3).toString("hex").toUpperCase();
const safeRoom = room => ({
  code: room.code, hostId: room.hostId, status: room.status, mode: room.mode,
  players: room.players.map(p => ({ id:p.id, nickname:p.nickname, score:p.score, isHost:p.id===room.hostId, connected:p.connected })),
  round: room.round, maxRounds: room.maxRounds, prompt: room.prompt,
  judgeId: room.judgeId, phase: room.phase, submissions: room.submissions.map(s => ({ id:s.id, nickname:s.nickname, answer:s.answer })),
  submittedCount: room.submissions.length, expectedCount: room.expectedIds.length,
  winner: room.winner, scoreboard: room.scoreboard, roundNumber: room.roundNumber,
  lastRound: room.lastRound, canEnd: room.mode === "custom" && room.status === "playing"
});
function sendRoom(room) { io.to(room.code).emit("state", safeRoom(room)); }
function player(room, id) { return room.players.find(p => p.id === id); }
function freshHand() { return shuffle(ANSWERS).slice(0, 7); }
function broadcastError(socket, message) { socket.emit("gameError", message); }

function startRound(room) {
  if (room.status !== "playing") return;
  room.roundNumber++;
  room.prompt = pick(PROMPTS);
  room.submissions = [];
  room.winner = null;
  room.lastRound = null;
  room.scoreboard = null;
  room.phase = "submit";
  room.expectedIds = [];
  room.judgeId = room.players.length >= 3 ? room.players[(room.roundNumber - 1) % room.players.length].id : null;
  for (const p of room.players) {
    if (p.id !== room.judgeId) room.expectedIds.push(p.id);
    if (!p.hand || p.hand.length < 7) p.hand = [...(p.hand || []), ...freshHand()].slice(0, 7);
  }
  room.houseAnswer = room.players.length === 2 ? pick(HOUSE_ANSWERS) : null;
  room.timerEndsAt = Date.now() + 45000;
  for (const p of room.players) io.to(p.id).emit("privateHand", p.hand);
  sendRoom(room);
  clearTimeout(room.timer);
  room.timer = setTimeout(() => onSubmitTimeout(room.code), 45000);
}
function onSubmitTimeout(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== "playing" || room.phase !== "submit") return;
  if (room.players.length === 2) {
    // Missing submissions are represented by a gentle fallback so the round can finish.
    for (const id of room.expectedIds) if (!room.submissions.some(s => s.id === id)) {
      const p = player(room, id);
      if (p) room.submissions.push({ id, nickname:p.nickname, answer: pick(p.hand), timedOut:true });
    }
    resolveDuel(room);
  } else {
    room.phase = "judge";
    room.timerEndsAt = Date.now() + 30000;
    clearTimeout(room.timer);
    room.timer = setTimeout(() => onJudgeTimeout(room.code), 30000);
    sendRoom(room);
  }
}
function onJudgeTimeout(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== "playing" || room.phase !== "judge") return;
  if (room.submissions.length) finishRound(room, pick(room.submissions));
  else finishRound(room, null);
}
function resolveDuel(room) {
  const house = { id:"house", nickname:"The Silly Shuffle", answer:room.houseAnswer, isHouse:true };
  const all = [...room.submissions, house];
  const chosen = pick(all);
  finishRound(room, chosen);
}
function finishRound(room, chosen) {
  clearTimeout(room.timer);
  room.phase = "reveal";
  room.winner = chosen ? { id:chosen.id, nickname:chosen.nickname, answer:chosen.answer, isHouse:!!chosen.isHouse } : null;
  if (chosen && !chosen.isHouse) {
    const p = player(room, chosen.id);
    if (p) p.score++;
  }
  room.scoreboard = [...room.players].sort((a,b) => b.score-a.score).map((p,i) => ({ rank:i+1, id:p.id, nickname:p.nickname, score:p.score }));
  room.lastRound = { number:room.roundNumber, winner:room.winner, scoreboard:room.scoreboard };
  sendRoom(room);
}
function finishGame(room) {
  clearTimeout(room.timer);
  room.status = "finished";
  room.phase = "finished";
  room.scoreboard = [...room.players].sort((a,b) => b.score-a.score).map((p,i) => ({ rank:i+1, id:p.id, nickname:p.nickname, score:p.score }));
  sendRoom(room);
}
function startGame(room) {
  room.status = "playing";
  room.roundNumber = 0;
  room.players.forEach(p => { p.score = 0; p.hand = freshHand(); });
  startRound(room);
}

io.on("connection", socket => {
  socket.on("createRoom", ({ mode = "custom" } = {}) => {
    if (!["custom","quick","party"].includes(mode)) mode = "custom";
    let roomCode; do { roomCode = code(); } while (rooms.has(roomCode));
    const room = { code:roomCode, hostId:socket.id, status:"lobby", mode, players:[], round:0,
      roundNumber:0, maxRounds:0, prompt:null, judgeId:null, phase:"lobby", submissions:[],
      expectedIds:[], winner:null, scoreboard:null, lastRound:null, timer:null };
    room.players.push({ id:socket.id, nickname:pick(NICKNAMES), score:0, connected:true, hand:freshHand() });
    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.emit("joined", { code:roomCode, id:socket.id });
    socket.emit("privateHand", player(room,socket.id).hand);
    sendRoom(room);
  });
  socket.on("joinRoom", ({ code:roomCode }) => {
    roomCode = String(roomCode || "").trim().toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) return broadcastError(socket, "That room code wasn't found. Check it and try again.");
    if (room.status !== "lobby") return broadcastError(socket, "That game has already started.");
    if (room.players.length >= 8) return broadcastError(socket, "This room is full (8 players max).");
    const nickname = pick(NICKNAMES.filter(n => !room.players.some(p => p.nickname === n)));
    room.players.push({ id:socket.id, nickname:nickname || "Mysterious Muffin", score:0, connected:true, hand:freshHand() });
    socket.join(roomCode);
    socket.emit("joined", { code:roomCode, id:socket.id });
    socket.emit("privateHand", player(room,socket.id).hand);
    sendRoom(room);
  });
  socket.on("startGame", ({ code:roomCode }) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room || room.hostId !== socket.id) return;
    if (room.players.length < 2 || room.status !== "lobby") return;
    room.mode = room.mode || "custom";
    room.maxRounds = room.mode === "quick" ? room.players.length : room.mode === "party" ? room.players.length * 2 : null;
    startGame(room);
  });
  socket.on("submitCard", ({ code:roomCode, answer }) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room || room.status !== "playing" || room.phase !== "submit") return;
    if (!room.expectedIds.includes(socket.id) || room.submissions.some(s => s.id === socket.id)) return;
    const p = player(room, socket.id);
    if (!p || !p.hand.includes(answer)) return broadcastError(socket, "Please choose a card from your hand.");
    p.hand = p.hand.filter(c => c !== answer);
    room.submissions.push({ id:p.id, nickname:p.nickname, answer });
    io.to(room.code).emit("submissionAdded", { answer, count:room.submissions.length, expected:room.expectedIds.length });
    io.to(p.id).emit("privateHand", p.hand);
    if (room.submissions.length >= room.expectedIds.length) {
      clearTimeout(room.timer);
      if (room.players.length === 2) resolveDuel(room);
      else {
        room.phase = "judge";
        room.timerEndsAt = Date.now() + 30000;
        room.timer = setTimeout(() => onJudgeTimeout(room.code), 30000);
        sendRoom(room);
      }
    } else sendRoom(room);
  });
  socket.on("chooseWinner", ({ code:roomCode, submissionId }) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room || room.status !== "playing" || room.phase !== "judge" || room.judgeId !== socket.id) return;
    const chosen = room.submissions.find(s => s.id === submissionId);
    if (!chosen) return;
    finishRound(room, chosen);
  });
  socket.on("nextRound", ({ code:roomCode }) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room || room.hostId !== socket.id || room.status !== "playing" || room.phase !== "reveal") return;
    if (room.mode !== "custom" && room.roundNumber >= room.maxRounds) return finishGame(room);
    startRound(room);
  });
  socket.on("endGame", ({ code:roomCode }) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room || room.hostId !== socket.id || room.mode !== "custom" || room.phase !== "reveal") return;
    finishGame(room);
  });
  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      const p = player(room, socket.id);
      if (!p) continue;
      if (room.status === "lobby") {
        room.players = room.players.filter(x => x.id !== socket.id);
        if (!room.players.length) rooms.delete(room.code);
        else {
          if (room.hostId === socket.id) room.hostId = room.players[0].id;
          sendRoom(room);
        }
      } else {
        p.connected = false;
        sendRoom(room);
      }
    }
  });
});

server.listen(PORT, "0.0.0.0", () => console.log(`The Silly Shuffle listening on ${PORT}`));
