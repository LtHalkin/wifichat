# Chat

A messenger with accounts, friends, group chats, and saved message history.

## What's new from the simple version

- **Accounts** — sign up with a username + password, log in from any device
- **Friends** — send/accept friend requests by username
- **Group chats** — create a named group with any of your friends
- **Persistence** — messages, friends, and accounts are saved to a `data.json` file on the server, so they survive restarts

## Running it

1. Install [Node.js](https://nodejs.org) if you haven't already.
2. In this folder, run:
   ```
   npm install
   node server.js
   ```
3. Open the printed URL (`http://localhost:3000`) in Chrome. On other devices on the same WiFi, use the printed IP address instead.

## Deploying (recommended, so no one needs Node installed)

This is a normal Node + Express app, so it deploys the same way as before (Render, Railway, Fly.io, etc.):

- **Build command:** `npm install`
- **Start command:** `node server.js`

⚠️ **Important — data persistence on free hosting tiers:** This app stores everything in a single `data.json` file on disk. Most free hosting tiers (including Render's free plan) use *ephemeral* disks — the file survives normal restarts and sleep/wake cycles, but gets wiped whenever you redeploy (push new code). That means:

- Accounts, friends, and messages will stick around day-to-day
- They'll be **erased** the next time you update and redeploy the app

If you plan to keep updating the app and want data to survive that, the fix is to swap the JSON file for a real database (e.g. Render's free Postgres add-on). That's a bigger change — let me know if you want it set up, otherwise the current version is simpler to maintain and fine for casual use.

## How it works

- `server.js` — Express server for the REST API (signup/login/friends/conversations) plus a WebSocket server for real-time messages
- `db.js` — a small JSON-file-backed data store (users, sessions, friendships, conversations, messages)
- `public/` — the frontend: `index.html`, `styles.css`, `app.js`

## Notes

- Passwords are hashed (never stored in plain text).
- A user can only DM or group-chat with people who've accepted their friend request.
- Message history loads automatically when you open a conversation.
