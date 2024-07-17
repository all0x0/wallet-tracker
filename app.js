// Config set 
require('dotenv').config();
global._config = require('./src/config');
// Connect db
const mongoConnect = require('./src/db');
let botProgram = require('./src/bot');

const web3 = require("@solana/web3.js");

const perf = require('execution-time')(console.log);

mongoConnect(async () => {
    await botProgram.start();
});