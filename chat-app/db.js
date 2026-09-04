const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'data.json');

function defaultData() {
  return {
    users: [],          // { id, username, passwordHash, createdAt }
    sessions: [],        // { token, userId, createdAt }
    friendships: [],     // { id, requesterId, addresseeId, status: 'pending'|'accepted', createdAt }
    conversations: [],   // { id, type: 'dm'|'group', name, dmKey, memberIds: [], createdAt }
    messages: []         // { id, conversationId, senderId, text, createdAt }
  };
}

let saveQueued = false;

function save() {
  // Debounce writes slightly so bursts of messages don't hammer disk I/O
  if (saveQueued) return;
  saveQueued = true;
  setImmediate(() => {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    saveQueued = false;
  });
}

function load() {
  if (!fs.existsSync(DB_PATH)) {
    const data = defaultData();
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return data;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return { ...defaultData(), ...JSON.parse(raw) };
  } catch (err) {
    console.error('Failed to read data.json, starting fresh:', err.message);
    return defaultData();
  }
}

let db = load();

function id() {
  return crypto.randomUUID();
}

// ---- Users ----
function findUserByUsername(username) {
  const uname = username.toLowerCase();
  return db.users.find(u => u.username.toLowerCase() === uname);
}

function findUserById(userId) {
  return db.users.find(u => u.id === userId);
}

function createUser(username, passwordHash) {
  const user = { id: id(), username, passwordHash, createdAt: Date.now() };
  db.users.push(user);
  save();
  return user;
}

// ---- Sessions ----
function createSession(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  db.sessions.push({ token, userId, createdAt: Date.now() });
  save();
  return token;
}

function findSession(token) {
  return db.sessions.find(s => s.token === token);
}

function deleteSession(token) {
  db.sessions = db.sessions.filter(s => s.token !== token);
  save();
}

// ---- Friendships ----
function findFriendship(userIdA, userIdB) {
  return db.friendships.find(f =>
    (f.requesterId === userIdA && f.addresseeId === userIdB) ||
    (f.requesterId === userIdB && f.addresseeId === userIdA)
  );
}

function createFriendRequest(requesterId, addresseeId) {
  const fr = { id: id(), requesterId, addresseeId, status: 'pending', createdAt: Date.now() };
  db.friendships.push(fr);
  save();
  return fr;
}

function acceptFriendRequest(friendshipId) {
  const fr = db.friendships.find(f => f.id === friendshipId);
  if (fr) { fr.status = 'accepted'; save(); }
  return fr;
}

function declineFriendRequest(friendshipId) {
  db.friendships = db.friendships.filter(f => f.id !== friendshipId);
  save();
}

function getFriendsFor(userId) {
  const accepted = db.friendships.filter(f =>
    f.status === 'accepted' && (f.requesterId === userId || f.addresseeId === userId)
  );
  return accepted.map(f => {
    const otherId = f.requesterId === userId ? f.addresseeId : f.requesterId;
    return findUserById(otherId);
  }).filter(Boolean);
}

function getIncomingRequests(userId) {
  return db.friendships
    .filter(f => f.status === 'pending' && f.addresseeId === userId)
    .map(f => ({ friendshipId: f.id, user: findUserById(f.requesterId) }))
    .filter(r => r.user);
}

function getOutgoingRequests(userId) {
  return db.friendships
    .filter(f => f.status === 'pending' && f.requesterId === userId)
    .map(f => ({ friendshipId: f.id, user: findUserById(f.addresseeId) }))
    .filter(r => r.user);
}

function areFriends(userIdA, userIdB) {
  const f = findFriendship(userIdA, userIdB);
  return !!(f && f.status === 'accepted');
}

// ---- Conversations ----
function dmKeyFor(userIdA, userIdB) {
  return [userIdA, userIdB].sort().join(':');
}

function findDmConversation(userIdA, userIdB) {
  const key = dmKeyFor(userIdA, userIdB);
  return db.conversations.find(c => c.type === 'dm' && c.dmKey === key);
}

function createDmConversation(userIdA, userIdB) {
  const convo = {
    id: id(),
    type: 'dm',
    name: null,
    dmKey: dmKeyFor(userIdA, userIdB),
    memberIds: [userIdA, userIdB],
    createdAt: Date.now()
  };
  db.conversations.push(convo);
  save();
  return convo;
}

function createGroupConversation(name, memberIds) {
  const convo = {
    id: id(),
    type: 'group',
    name,
    dmKey: null,
    memberIds: [...new Set(memberIds)],
    createdAt: Date.now()
  };
  db.conversations.push(convo);
  save();
  return convo;
}

function findConversationById(convoId) {
  return db.conversations.find(c => c.id === convoId);
}

function getConversationsFor(userId) {
  return db.conversations.filter(c => c.memberIds.includes(userId));
}

function isMember(convoId, userId) {
  const c = findConversationById(convoId);
  return !!(c && c.memberIds.includes(userId));
}

// ---- Messages ----
function addMessage(conversationId, senderId, text) {
  const msg = { id: id(), conversationId, senderId, text, createdAt: Date.now() };
  db.messages.push(msg);
  save();
  return msg;
}

function getMessagesFor(conversationId, limit = 200) {
  return db.messages
    .filter(m => m.conversationId === conversationId)
    .slice(-limit);
}

function lastMessageFor(conversationId) {
  const msgs = db.messages.filter(m => m.conversationId === conversationId);
  return msgs.length ? msgs[msgs.length - 1] : null;
}

module.exports = {
  findUserByUsername, findUserById, createUser,
  createSession, findSession, deleteSession,
  findFriendship, createFriendRequest, acceptFriendRequest, declineFriendRequest,
  getFriendsFor, getIncomingRequests, getOutgoingRequests, areFriends,
  findDmConversation, createDmConversation, createGroupConversation,
  findConversationById, getConversationsFor, isMember,
  addMessage, getMessagesFor, lastMessageFor
};
