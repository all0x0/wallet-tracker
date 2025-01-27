const path = require('path');
const rootPath = path.normalize(__dirname);

let config = {
    ROOT: rootPath,
    PORT: process.env.PORT || 5800,
    WEBHOOK_SERVER: process.env.WEBHOOK_SERVER,
    HELIUS_API_KEY: process.env.HELIUS_API_KEY,
    WEBHOOK_URI: process.env.WEBHOOK_URI || '/api/webhook',
    MONGO_URI: process.env.DB || "mongodb://localhost:27017/wallet_tracker",
    BOT_SETTING: {
        BG_URL: process.env.BG_URL,
        TOKEN: process.env.TOKEN,
        MASTER: process.env.MASTER
    }
}

module.exports = config;