// Config set 
require('dotenv').config();
global._config = require('./src/config');
// Connect db
const mongoConnect = require('./src/db');
let botProgram = require('./src/bot');

const axios = require('axios');

const web3 = require("@solana/web3.js");
const connection = new web3.Connection(process.env.HTTP_RPC_URL, { wsEndpoint: process.env.WSS_RPC_URL, commitment: 'confirmed' });

const perf = require('execution-time')(console.log);

const targetWalletModel = require('./src/db/model/target_wallets');

/**
 * Start web server for track wallets
 */
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = global._config.PORT;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

app.post(global._config.WEBHOOK_URI, async (req, res) => {
    try {
        console.log('Received POST request with body');
        if(Object.keys(req.body).length == 0) return res.json({});
        const response_data = req.body;
        console.log(response_data[0])
        console.log('\\\\\\\\\\\\\\'.repeat(10))
        console.log(response_data[0].nativeTransfers)
        console.log('////////////'.repeat(10))
        console.log(response_data[0].tokenTransfers)
        // console.log('-------'.repeat(10))
        // console.log(response_data[0].events.swap)
        // console.log('-------'.repeat(10))
        // console.log((response_data[0].events.swap.tokenOutputs)[0].rawTokenAmount)
        // console.log('-------'.repeat(10))
        // console.log((response_data[0].events.swap.tokenInputs)[0].rawTokenAmount)
        
        let targetWalletList = await targetWalletModel.find({ public_key: response_data[0].feePayer });
        console.log('-'.repeat(10), response_data[0].description);

        if (response_data[0].type != 'SWAP') {
            return res.json({});
            
        }

        let text = '';
        // text = text.replace(response_data[0].feePayer, `<a href="https://solscan.io/account/${response_data[0].feePayer}">{targetWalletInfoTag}</a>`);

        const swap_event = response_data[0].events.swap;

        let sub_description = '';

        // Native coin sol price
        const sol_description = (await axios.get(`https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112`))['data'];
        const sol_usd = Number(sol_description['data']['So11111111111111111111111111111111111111112']['price']);

        if(swap_event.nativeInput == null) {
            // 5qx8EmzhnxwPDzkNMdRLNFZ245pwpioeUN7EyzH4MhNh swapped 13998.633796059 TRUMP for 0.174925626 SOL (SELL)
            const token_data = (swap_event.tokenInputs)[0];

            let token_description = (await axios.get(`https://price.jup.ag/v6/price?ids=${token_data.mint}`))['data'];
            let token_description_data = {
                'mintSymbol': '',
                'vsToken': '',
                'vsTokenSymbol': '',
                'price': ''
            };
            if (Object.keys(token_description['data']).length > 0) {
                token_description_data = token_description['data'][token_data.mint];
            }

            const emoji_tag = ` ✴️ <a href="https://solscan.io/tx/${response_data[0].signature}"> SELL ${token_description_data['mintSymbol']} </a>`;
            text += emoji_tag + ` on ${response_data[0].source}\n`;
            text += ` 🔹 <a class="text-entity-link" href="https://solscan.io/account/${response_data[0].feePayer}">{targetWalletInfoTag}</a>\n  <code>${response_data[0].feePayer}</code>\n\n`;

            if(swap_event.nativeOutput == null) return res.json({});

            // const token_supply_data = await connection.getTokenSupply(new web3.PublicKey(token_data.mint));
            sub_description = ` 🔹 <a class="text-entity-link" href="https://solscan.io/account/${response_data[0].feePayer}">{targetWalletInfoTag}</a> swapped ${Number(token_data.rawTokenAmount.tokenAmount)/Math.pow(10, Number(token_data.rawTokenAmount.decimals))} <a class="text-entity-link" href="https://solscan.io/token/${token_data.mint}">${token_description_data['mintSymbol']}</a> for ${Number(swap_event.nativeOutput.amount / Math.pow(10, 9))} <a class="text-entity-link" href="https://solscan.io/token/So11111111111111111111111111111111111111112">SOL</a>\n\n`;
            // sub_description += `Ⓜ️ ${token_description_data['mintSymbol']}\nmint address: <a class="text-entity-link" href="https://solscan.io/token/${token_data.mint}">${token_data.mint}</a>\ndecimals: ${token_supply_data.value.decimals}\ntotal supply: ${token_supply_data.value.uiAmount}\nprice: ${token_description_data['price']} <a class="text-entity-link" href="https://solscan.io/token/${token_description_data['vsToken']}">${token_description_data['vsTokenSymbol']}</a>`;

            sub_description += ` 🔹 <a class="text-entity-link" href="https://solscan.io/account/${response_data[0].feePayer}">{targetWalletInfoTag}</a>\n<a class="text-entity-link" href="https://solscan.io/token/So11111111111111111111111111111111111111112">SOL</a>: + ${Number(swap_event.nativeOutput.amount / Math.pow(10, 9))} ($ + ${sol_usd * Number(swap_event.nativeOutput.amount / Math.pow(10, 9))})\n`;
            sub_description += `<a class="text-entity-link" href="https://solscan.io/token/${token_data.mint}">${token_description_data['mintSymbol']}</a>: - ${Number(token_data.rawTokenAmount.tokenAmount)/Math.pow(10, Number(token_data.rawTokenAmount.decimals))} ($ - ${Number(token_description_data['price']) * Number(token_data.rawTokenAmount.tokenAmount)/Math.pow(10, Number(token_data.rawTokenAmount.decimals))})\n\n`;

            sub_description += ` 🔗 ${token_description_data['mintSymbol']} : <a class="text-entity-link" href="https://birdeye.so/token/${token_data.mint}?chain=solana">BE</a> | <a class="text-entity-link" href="https://dexscreener.com/solana/${token_data.mint}?chain=solana">DS</a> | <a class="text-entity-link" href="https://www.dextools.io/app/en/solana/pair-explorer/${token_data.mint}">DT</a> | <a class="text-entity-link" href="https://photon-sol.tinyastro.io/en/lp/${token_data.mint}">PH</a> | <a class="text-entity-link" href="https://bullx.io/terminal?chainId=1399811149&address=${token_data.mint}&r=IXFHAMJ1FN9">Bullx</a>\n<code>${token_data.mint}</code>`;

        } else {
            // 5qx8EmzhnxwPDzkNMdRLNFZ245pwpioeUN7EyzH4MhNh swapped 0.174925626 SOL for 13998.633796059 TRUMP (BUY)
            const token_data = (swap_event.tokenOutputs)[0];
            const token_description = (await axios.get(`https://price.jup.ag/v6/price?ids=${token_data.mint}`))['data'];
            let token_description_data = {
                'mintSymbol': '',
                'vsToken': '',
                'vsTokenSymbol': '',
                'price': ''
            };
            if (Object.keys(token_description['data']).length > 0) {
                token_description_data = token_description['data'][token_data.mint];
            }

            const emoji_tag = ` ✳️ <a href="https://solscan.io/tx/${response_data[0].signature}"> BUY ${token_description_data['mintSymbol']} </a>`;
            text += emoji_tag + ` on ${response_data[0].source}\n`;
            text += `🔹<a class="text-entity-link" href="https://solscan.io/account/${response_data[0].feePayer}">{targetWalletInfoTag}</a>\n  <code>${response_data[0].feePayer}</code>\n\n`;

            if(swap_event.nativeInput == null) return res.json({});
            
            // const token_supply_data = await connection.getTokenSupply(new web3.PublicKey(token_data.mint));
            sub_description = ` 🔹 <a class="text-entity-link" href="https://solscan.io/account/${response_data[0].feePayer}">{targetWalletInfoTag}</a> swapped ${Number(swap_event.nativeInput.amount / Math.pow(10, 9))} <a class="text-entity-link" href="https://solscan.io/token/So11111111111111111111111111111111111111112">SOL</a> for ${Number(token_data.rawTokenAmount.tokenAmount)/Math.pow(10, Number(token_data.rawTokenAmount.decimals))} <a class="text-entity-link" href="https://solscan.io/token/${token_data.mint}">${token_description_data['mintSymbol']}</a>\n\n`;
            // sub_description += `Ⓜ️ <a class="text-entity-link" href="https://solscan.io/token/${token_data.mint}">${token_description_data['mintSymbol']}</a>\nmint address: <code>${token_data.mint}</code>\ndecimals: ${token_supply_data.value.decimals}\ntotal supply: ${token_supply_data.value.uiAmount}\nprice: ${token_description_data['price']} <a class="text-entity-link" href="https://solscan.io/token/${token_description_data['vsToken']}">${token_description_data['vsTokenSymbol']}</a>`;

            sub_description += ` 🔹 <a class="text-entity-link" href="https://solscan.io/account/${response_data[0].feePayer}">{targetWalletInfoTag}</a>\n<a class="text-entity-link" href="https://solscan.io/token/So11111111111111111111111111111111111111112">SOL</a>: - ${Number(swap_event.nativeInput.amount / Math.pow(10, 9))} ($ - ${sol_usd * Number(swap_event.nativeInput.amount / Math.pow(10, 9))})\n`;
            sub_description += `<a class="text-entity-link" href="https://solscan.io/token/${token_data.mint}">${token_description_data['mintSymbol']}</a>: + ${Number(token_data.rawTokenAmount.tokenAmount)/Math.pow(10, Number(token_data.rawTokenAmount.decimals))} ($ + ${Number(token_description_data['price']) * Number(token_data.rawTokenAmount.tokenAmount)/Math.pow(10, Number(token_data.rawTokenAmount.decimals))})\n\n`;

            sub_description += ` 🔗 ${token_description_data['mintSymbol']} : <a class="text-entity-link" href="https://birdeye.so/token/${token_data.mint}?chain=solana">BE</a> | <a class="text-entity-link" href="https://dexscreener.com/solana/${token_data.mint}?chain=solana">DS</a> | <a class="text-entity-link" href="https://www.dextools.io/app/en/solana/pair-explorer/${token_data.mint}">DT</a> | <a class="text-entity-link" href="https://photon-sol.tinyastro.io/en/lp/${token_data.mint}">PH</a> | <a class="text-entity-link" href="https://bullx.io/terminal?chainId=1399811149&address=${token_data.mint}&r=IXFHAMJ1FN9">Bullx</a>\n<code>${token_data.mint}</code>`;
        }

        text += sub_description;

        console.log(text);

        targetWalletList.map(targetWalletInfo => {
            text = text.replace(/{targetWalletInfoTag}/g, targetWalletInfo.tag);

            botProgram.bot.sendMessage(targetWalletInfo.chat_id, text, {
                parse_mode: 'HTML',
                disable_web_page_preview: true
            });

        });

        return res.json({});

    } catch (e) {
        console.log('error in webhook server');
        console.log(e);
    }
})

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Something broke!');
});

/**
 * End of server setting for wallet track
 */

app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);

    mongoConnect(async () => {
        // console.log(await connection.getTokenSupply(new web3.PublicKey('DGEkLmYvdgrVGbs9EqJNikrjgtqztFcEWSJwrFccKdzo')));
        // let transaction = await connection.getParsedTransaction('4RBgTjb3T2yMykYZSk5vSq4VJYdpgWEWMqwVAeksbrEgHHhpQLxFg6xt7MZ1BfA3MbpbQ64om4bRiGzxprRHDVoD', {"maxSupportedTransactionVersion": 0});
        // console.log(transaction.meta.postTokenBalances);

        // const solBalance = await connection.getBalance(new web3.PublicKey('EZNTdLmX4BmDVgaqnSxhFE48eNRsybrjMvyS9CQsQqeh'));
        // console.log(`${solBalance/web3.LAMPORTS_PER_SOL} sol`);

        // const tokenAccounts = await connection.getTokenAccountsByOwner(new web3.PublicKey('So11111111111111111111111111111111111111112'), {mint: new web3.PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') });

        // const balance = await connection.getTokenAccountBalance(tokenAccounts.value[0].pubkey);
        // console.log(balance);

        await botProgram.start();
    });
});