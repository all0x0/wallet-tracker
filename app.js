// Config set 
require('dotenv').config();
global._config = require('./src/config');
// Connect db
const mongoConnect = require('./src/db');
let botProgram = require('./src/bot');

const copytradeModel = require('./src/db/model/copy_trade');

const web3 = require("@solana/web3.js");

const perf = require('execution-time')(console.log);

const copytradeService = require('./src/bot/service/copytradeService');

/* ---------------------- Register shyft callback api ---------------------------- */
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = global._config.PORT;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Endpoint to handle POST requests
app.post('/api/webhook', async (req, res) => {
    try {
        // Handle the POST request
        console.log('Received POST request with body:', new Date());
        // console.log(new Date());


        if(Object.keys(req.body).length == 0) return res.json({});

        let copywallet = req.body.fee_payer;
        let signatures = req.body.signatures;

        let executingCopytrades = await copytradeModel.find({ target_wallet_address: copywallet, is_open: true });

        let tokens_swapped = req.body.actions[0]?.info?.tokens_swapped;

        let input_token = tokens_swapped.in?.token_address;

        let output_token = tokens_swapped.out?.token_address;

        let target_token_name = input_token == 'So11111111111111111111111111111111111111112' ? tokens_swapped.out?.name: tokens_swapped.in?.name;
        let target_token_address = input_token == 'So11111111111111111111111111111111111111112' ? output_token: input_token;

        res.send('POST request received successfully');
    } catch (error) {
        console.log('Webhook error: ', error.message)
    }

});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Something broke!');
});

/* ----------------------------------- end of register shyft callback api --------------------------------------- */

// Start the server
app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);

    mongoConnect(async () => {
        // await copytradeService.shyftCallbackRemove('666ee8fa47e840c6e661aab2')
        console.log(await copytradeService.shyftCallbackList());
        await botProgram.start();
    });
});