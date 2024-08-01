const TelegramBot = require('node-telegram-bot-api');
const web3 = require("@solana/web3.js");

const { customEditMessage, customSendMessage } = require("./customMessage");

// Mongo Model for track target wallets
const targetWalletModel = require("../db/model/target_wallets");

// Mongo DB action
const { addWallet, getExistWebhookData, deleteWallet } = require('../db/action/target_wallet_action');

const { BOT_STATE, GENERAL_ACTION } = require("../constant");

// Helius Service
const { addWebhook, createWebhook, editWebhook, deleteWebhook, removeWebhook, getTopholders } = require('./service/heliusService');

const bot = new TelegramBot(_config.BOT_SETTING.TOKEN);

const MAX_MESSAGE_LENGTH = 4096;

var botProgram = {
    bot: bot,
    call_time: 1,
    bot_state: BOT_STATE.START,
    chat_id: '',

    start: () => {

        bot.startPolling()
        console.log(` 🔌 ${global._config.BOT_SETTING.MASTER.toUpperCase()} BOT Connected to Polling...`);

        // Set custom commands
        const commands = [
            { command: 'start', description: 'Start the bot' },
            { command: 'add', description: 'Add wallet addresses' },
            { command: 'delete', description: 'Delete wallet addresses' },
            { command: 'holders', description: 'Fetch top token holders' },
        ];
      
        // Set custom commands when the bot starts up
        botProgram.bot.setMyCommands(commands).then(() => {
            console.log('Custom commands set successfully!');
        }).catch((error) => {
            console.error('Error setting custom commands:', error);
        });

        bot.on('polling_error', (error) => {
            console.log('polling error: ', error); // => 'EFATAL'
            return;
        });

        // when command is entered. ex: /start
        bot.onText(/.*/, async (message) => {
            const text = message.text;
            if (!text) return;
            
            //when '/start' command is entered
            if (text === "/start") {
                console.log(new Date(message.date * 1000), message.from.username, "started bot.");
                // for (let i = 1; i < 201; i++) {
                //     bot.deleteMessage(message.chat.id,message.message_id-i).catch(er=>{return})
                // }
                await botProgram.goToFirstPage(message, true);
                return;
            } else if (text === "/add") {
                console.log(new Date(message.date * 1000), message.from.username, "started /add bot.");
                await botProgram.goToAddWalletPage(message, true);
                return;
            } else if (text === "/delete") {
                console.log(new Date(message.date * 1000), message.from.username, "started /delete bot.");
                await botProgram.goToDeletePage(message, true);
                return;
            } else if (text === "/holders") {
                console.log(new Date(message.date * 1000), message.from.username, "started /holders bot.");
                await botProgram.goToFetchTokenHolders(message, true);
                return;
            }

            // when the user is first in this bot
            else if (botProgram.call_time == 1) {
                await botProgram.goToFirstPage(message, true);
                return;
            }

            //when command is entered into default input.
            else {
                const current_bot_state = botProgram.bot_state;
                switch (current_bot_state) {
                    // when add wallet for track
                    case BOT_STATE.ADD_WALLET: 
                        botProgram.addWallet(message);
                        return;
                    
                    case BOT_STATE.DELETE_WALLET:
                        botProgram.deleteWallet(message);
                        return;

                    case BOT_STATE.FETCH_TOKEN_HOLDERS:
                        botProgram.fetchTokenHolders(message);
                        return;
                    
                    default:
                        return;
                }

            }
        });

        //when button is clicked
        bot.on("callback_query", async (callback_data) => {
            if (!callback_data.data) return;

            // when the user is first in this bot
            else if (botProgram.call_time == 1) {
                await botProgram.goToFirstPage(callback_data.message, true);
                return;
            }

            const command = callback_data.data;
            switch (command) {
                case BOT_STATE.WELCOME:
                    await botProgram.goToFirstPage(callback_data.message, false);
                    return;

                case BOT_STATE.WALLET_MANAGE: 
                    await botProgram.goToWalletManageState(callback_data.message, false);
                    return;

                case BOT_STATE.ADD_WALLET:
                    await botProgram.goToAddWalletPage(callback_data.message, false);
                    return;

                case BOT_STATE.DELETE_WALLET:
                    await botProgram.goToDeletePage(callback_data.message, false);
                    return;

                case BOT_STATE.DELETE_ALL_WALLET:
                    await botProgram.goToDeleteAllPage(callback_data.message, false);
                    return;

                case BOT_STATE.COPY_ADDRESS:
                    await botProgram.goToCopyAddressPage(callback_data.message, false);
                    return;

                case BOT_STATE.DELETE_ALL_WALLET_YES:
                    await botProgram.deleteAllWallet(callback_data.message);
                    return;
                
                case GENERAL_ACTION.HELP:
                    await botProgram.goToHelpPage(callback_data.message, false);
                    return;
                
                case BOT_STATE.FETCH_TOKEN_HOLDERS:
                    await botProgram.goToFetchTokenHolders(callback_data.message, false);
                    return;
                
                default: 
                    return;
            }
            
            return;
        })

    },

    goToFirstPage: async (message, from_start = true) => {
        botProgram.chat_id = message.chat.id;
        botProgram.bot_state = BOT_STATE.WELCOME
        const text = "💹 SolanaHacker - Wallet Tracker \n\nThis bot helps you monitor transactions across your Solana wallets. After adding wallets, you'll receive immediate notifications for trade activities. \n\n";
        const inlineButtons = [
            [{ text: ' 💳 WALLET MANAGE', callback_data: BOT_STATE.WALLET_MANAGE }],
            [{ text: ' 📊 FETCH TOKEN HOLDERS', callback_data: BOT_STATE.FETCH_TOKEN_HOLDERS }],
            [{ text: ' ❓ HELP', callback_data: GENERAL_ACTION.HELP }]
        ];
        botProgram.call_time++;
        if (from_start) await customSendMessage(bot, message, text, inlineButtons);
        else await customEditMessage(bot, message, text, inlineButtons);
        return;
    },

    goToWalletManageState: async (message, from_start = true) => {
        botProgram.bot_state = BOT_STATE.WALLET_MANAGE;
        const wallet_list = await targetWalletModel.find({ chat_id: message.chat.id });
        let text = `Total wallets: ${wallet_list.length} \n\n🟢 Wallet is active\n🟠 You paused this wallet \n\n`;
        for (i in wallet_list) {
            text += wallet_list[i].is_active == true? '🟢': '🟠';
            text += `<a>/w_${wallet_list[i].index}</a> <code>${wallet_list[i].public_key}</code> (${wallet_list[i].tag})\n`;
            // text += `<span class="tg-spoiler">/w_${wallet_list[i].index}</span> <code>${wallet_list[i].public_key}</code> (${wallet_list[i].tag})\n`;
        }
        text += `\nTip: Click on w_... to change wallet settings in clude add, delete, active, pause wallet address.`;
        let inlineButtons = [];
        inlineButtons.push([{ text: ' ✨ Add Wallet', callback_data: BOT_STATE.ADD_WALLET }, { text: '🚮 Delete Wallet', callback_data: BOT_STATE.DELETE_WALLET }]);
        inlineButtons.push([{ text: ' ©️ Copy Wallet addresses', callback_data: BOT_STATE.COPY_ADDRESS }]);
        inlineButtons.push([{ text: ' 🔙 Back to FirstPage', callback_data: BOT_STATE.WELCOME }]);
        if (from_start) await customSendMessage(bot, message, text, inlineButtons);
        else await customEditMessage(bot, message, text, inlineButtons);
        return;
    },

    goToAddWalletPage: async (message, from_start = true) => {
        botProgram.chat_id = message.chat.id;
        botProgram.bot_state = BOT_STATE.ADD_WALLET;
        const text = "Great! You can now add multiple wallets at once. 🚀\n\nSimply send me each wallet address on a new line. If you'd like to assign a nickname (40 characters max) to any wallet, add it after a space following the wallet address. For example:\n\nWalletAddress1 Name1\nWalletAddress2 Name2\nWalletAddress3 Name3\n\nTip: It might take up to 2 min to start receiving notifications for new wallets!";
        const inlineButtons = [
            [{ text: ' 🔙 Back to FirstPage', callback_data: BOT_STATE.WELCOME }]
        ];
        if (from_start) await customSendMessage(bot, message, text, inlineButtons);
        else await customEditMessage(bot, message, text, inlineButtons);
        return;
    },

    goToDeletePage: async (message, from_start = true) => {
        botProgram.chat_id = message.chat.id;
        botProgram.bot_state = BOT_STATE.DELETE_WALLET;
        const text = "You can now delete multiple wallets at once. 🚀\n\nSimply send me each wallet address on a new line 🧹For example:\n\nWalletAddress1\nWalletAddress2\nWalletAddress3\n\nTip: click <u>DELETE ALL</u> button below to delete all wallets at once.";
        const inlineButtons = [
            [{ text: ' 🔙 Back to FirstPage', callback_data: BOT_STATE.WELCOME }],
            [{ text: ' ❌ DELETE ALL', callback_data: BOT_STATE.DELETE_ALL_WALLET }]
        ];
        if (from_start) await customSendMessage(bot, message, text, inlineButtons);
        else await customEditMessage(bot, message, text, inlineButtons);
        return;
    },

    goToDeleteAllPage: async (message, from_start = true) => {
        botProgram.chat_id = message.chat.id;
        botProgram.bot_state = BOT_STATE.DELETE_ALL_WALLET;
        const text = "❓Are you sure you want to delete all wallets? 😢";
        const inlineButtons = [
            [{ text: ' 🔙 No (Back to FirstPage)', callback_data: BOT_STATE.WELCOME }],
            [{ text: ' 👌 Yes', callback_data: BOT_STATE.DELETE_ALL_WALLET_YES }]
        ];
        if (from_start) await customSendMessage(bot, message, text, inlineButtons);
        else await customEditMessage(bot, message, text, inlineButtons);
        return;
    },

    goToCopyAddressPage: async (message, from_start = true) => {
        botProgram.chat_id = message.chat.id;
        botProgram.bot_state = BOT_STATE.DELETE_ALL_WALLET;
        let text = ' ';
        const same_user_rows = await targetWalletModel.find({ chat_id: message.chat.id });
        if (same_user_rows.length == 0) await bot.sendMessage(message.chat.id, `Oh 🙃, You haven't got any wallet. 0 wallet is registered.`, {
            reply_markup: JSON.stringify({
                force_reply: false
            })
        });
        else {
            for(i in same_user_rows) {
                text += `<code>${same_user_rows[i].public_key}</code>\n`;
            }
            const inlineButtons = [
                [{ text: ' 🔙 Back to FirstPage', callback_data: BOT_STATE.WELCOME }]
            ];
            if (from_start) await customSendMessage(bot, message, text, inlineButtons);
            else await customEditMessage(bot, message, text, inlineButtons);
        }
        
        return;
    },

    goToHelpPage: async (message, from_start = true) => {
        botProgram.chat_id = message.chat.id;
        let text = ` 🎊 Welcome to SolanaHacker 🚀 - Wallet Tracker.\n\n`;
        text += `This bot helps you monitor transactions across your Solana wallets 🎯 . \nAfter adding wallets, you'll receive immediate notifications for trade activities. 🛬 \n`
        text += `This bot use Helius webhook and you will recieve immediate notification from Helius webhook. ✨ \n\n`;
        text += `💻 What command you can use in this bot:\n/start - start the bot\n/add - add wallet address to receive real time notification for trade activities\n/delete - delete registerted wallet address to do not receive notification\n\n`;
        text += `This bot is updated time by time. ♻️\n If you have any opinion in using this bot, kindly leave comment to @admin. 💬 \n\n`;
        text += `Kindly use this bot to grab flying money 💸 .`;
        const inlineButtons = [
            [{ text: ' 🔙 Back to FirstPage', callback_data: BOT_STATE.WELCOME }]
        ];
        if (from_start) await customSendMessage(bot, message, text, inlineButtons);
        else await customEditMessage(bot, message, text, inlineButtons);
        return;
    },

    goToFetchTokenHolders: async (message, from_start = true) => {
        botProgram.chat_id = message.chat.id;
        botProgram.bot_state = BOT_STATE.FETCH_TOKEN_HOLDERS;
        let text = '';
        text += 'Great! You can get special token holders by one command at once.🚀\n\n';
        text += 'Simply send me each token address and percent on a new line. For example:\n\n'
        text += 'token_mint_address percent\n\n';
        text += 'Tip: If the token is very tradable and motible, it will gets more time. thanks for your patience and understanding.';
        const inlineButtons = [
            [{ text: ' 🔙 Back to FirstPage', callback_data: BOT_STATE.WELCOME }]
        ];
        botProgram.call_time++;
        if (from_start) await customSendMessage(bot, message, text, inlineButtons);
        else await customEditMessage(bot, message, text, inlineButtons);
        return;
    },

    // Add wallet for track
    addWallet: async (message) => {
        const recieved_message = message.text.split('\n');
        for (i in recieved_message) {
            const splited_message = recieved_message[i].split(' ');
            let newOne = {};
            newOne.public_key = splited_message[0];
            newOne.tag = recieved_message[i].replace(newOne.public_key, '').trim();
            let exist_data = await getExistWebhookData();
            let result_register;
            if (exist_data[0].length > 0) result_register = await addWebhook(newOne.public_key, ["SWAP"], exist_data[0], exist_data[1]);
            else result_register = await addWebhook(newOne.public_key, ["SWAP"]);
            if (result_register[0] == true) {
                newOne.webhook_id = result_register[1];
                const result = await addWallet(message.chat.id, newOne);
                await bot.sendMessage(message.chat.id, result, {
                    parse_mode: 'HTML',
                    reply_markup: JSON.stringify({
                        force_reply: false
                    })
                });
            } else {
                await bot.sendMessage(message.chat.id, result_register[1], {
                    reply_markup: JSON.stringify({
                        force_reply: false
                    })
                });
            }
        }
        return;
    },

    // Delete wallet
    deleteWallet: async (message) => {
        const recieved_message = message.text.split('\n');
        let wallet_cnt = 0;
        for (i in recieved_message) {
            const public_key = recieved_message[i].trim();
            const same_address_rows = await targetWalletModel.find({ public_key: public_key });
            if (same_address_rows.length > 1) {
                const result = await deleteWallet(message.chat.id, public_key);
                if (result.length > 0) {
                    await bot.sendMessage(message.chat.id, result, {
                        reply_markup: JSON.stringify({
                            force_reply: false
                        })
                    });
                } else wallet_cnt++;
            } else if (same_address_rows.length > 0) {
                if (same_address_rows[0].chat_id != message.chat.id) {
                    await bot.sendMessage(message.chat.id, `<code>${public_key}</code> isn't regietered. 😉`, {
                        parse_mode: 'HTML',
                        reply_markup: JSON.stringify({
                            force_reply: false
                        })
                    });
                } else {
                    let webhook_id = same_address_rows[0].webhook_id;
                    let result_delete = await removeWebhook(public_key, webhook_id);
                    if (result_delete[0] == true) {
                        const result = await deleteWallet(message.chat.id, public_key);
                        if (result.length > 0) {
                            await bot.sendMessage(message.chat.id, result, {
                                reply_markup: JSON.stringify({
                                    force_reply: false
                                })
                            });
                        } else wallet_cnt++;
                    } else {
                        await bot.sendMessage(message.chat.id, result_delete[1], {
                            reply_markup: JSON.stringify({
                                force_reply: false
                            })
                        });
                    }
                }
            } else {
                await bot.sendMessage(message.chat.id, `<code>${public_key}</code> isn't regietered. 😉`, {
                    parse_mode: 'HTML',
                    reply_markup: JSON.stringify({
                        force_reply: false
                    })
                });
            }
        }

        if (wallet_cnt > 0) await bot.sendMessage(message.chat.id, `Poof! ${wallet_cnt} wallets have vanished into thin air! Now, what other adventures await? ✨`, {
            reply_markup: JSON.stringify({
                force_reply: false
            })
        });

        return;
    },

    // Delete all wallet
    deleteAllWallet: async (message) => {
        const same_user_rows = await targetWalletModel.find({ chat_id: message.chat.id });
        let wallet_cnt = 0;
        for (i in same_user_rows) {
            const public_key = same_user_rows[i].public_key;
            const same_address_rows = await targetWalletModel.find({ public_key: public_key });
            if (same_address_rows.length > 1) {
                const result = await deleteWallet(message.chat.id, public_key);
                if (result.length > 0) {
                    await bot.sendMessage(message.chat.id, result, {
                        reply_markup: JSON.stringify({
                            force_reply: false
                        })
                    });
                } else wallet_cnt++;
            } else if (same_address_rows.length > 0) {
                let webhook_id = same_address_rows[0].webhook_id;
                let result_delete = await removeWebhook(public_key, webhook_id);
                if (result_delete[0] == true) {
                    const result = await deleteWallet(message.chat.id, public_key);
                    if (result.length > 0) {
                        await bot.sendMessage(message.chat.id, result, {
                            reply_markup: JSON.stringify({
                                force_reply: false
                            })
                        });
                    } else wallet_cnt++;
                } else {
                    await bot.sendMessage(message.chat.id, result_delete[1], {
                        reply_markup: JSON.stringify({
                            force_reply: false
                        })
                    });
                }
            } else {
                await bot.sendMessage(message.chat.id, `<code>${public_key}</code> isn't regietered. 😉`, {
                    parse_mode: 'HTML',
                    reply_markup: JSON.stringify({
                        force_reply: false
                    })
                });
            }
        };

        if (wallet_cnt > 0) 
        await bot.sendMessage(message.chat.id, `Poof! ${wallet_cnt} wallets have vanished into thin air! Now, what other adventures await? ✨`, {
            reply_markup: JSON.stringify({
                force_reply: false
            })
        });
        else 
        await bot.sendMessage(message.chat.id, `Oh, 😕 you haven't got any registered wallet yet.`, {
            reply_markup: JSON.stringify({
                force_reply: false
            })
        });

        return;
    },

    fetchTokenHolders: async (message) => {
        const splited_message = message.text.split(' ');
        const token_address = splited_message[0];
        const percent = splited_message[1];
        const holder_list_result = await getTopholders(token_address, percent);
        if (holder_list_result[0] == true) {
            const token_detail = holder_list_result[1].token_detail;
            const holder_list = holder_list_result[1].holder_list;
            holder_list.sort((a, b) => b.amount - a.amount);
            let chunks = [];
            let text = ` 🪩 Token detail\n Mint: <code>${token_address}</code>\n Total supply: ${formatNumber(token_detail.uiAmount)}\n Decimals: ${token_detail.decimals}\n\n`;
            text += ` 🥷 Top holders (Amount >= ${percent}%)\n`;
            for (i in holder_list) {
                const holder = holder_list[i];
                let item = `<code>${holder.owner}</code> ${formatNumber(holder.amount)} (${holder.percent.toFixed(2)}%)\n`;
                if ((text + item).length > MAX_MESSAGE_LENGTH) {
                    chunks.push(text);
                    text = item;
                } else {
                    text += item;
                }
            }
            if (text.length > 0) chunks.push(text);
            // if (text.length < MAX_MESSAGE_LENGTH) {
            //     await bot.sendMessage(message.chat.id, text, {
            //         parse_mode: 'HTML',
            //         reply_markup: JSON.stringify({
            //             force_reply: false
            //         })
            //     });
            // } else {
            //     const chunks = text.match(new RegExp(`.{1,${MAX_MESSAGE_LENGTH}}`, 'g'));
                for (const chunk of chunks) {
                    await bot.sendMessage(message.chat.id, chunk, {
                        parse_mode: 'HTML',
                        reply_markup: JSON.stringify({
                            force_reply: false
                        })
                    });
                }
            // }
        } else {
            await bot.sendMessage(message.chat.id, holder_list_result[1], {
                reply_markup: JSON.stringify({
                    force_reply: false
                })
            });
        }
        return;
    }
}

function formatNumber(n) {
    if (n < 1000) {
      return n.toString();
    } else if (n < 1000000) {
      return (n / 1000).toFixed(2).replace(/\.?0+$/, '') + 'K';
    } else {
      return (n / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
    }
  }

module.exports = botProgram;