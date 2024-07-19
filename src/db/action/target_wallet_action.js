const web3 = require("@solana/web3.js");
let targetWalletModel = require('../model/target_wallets');

const addWallet = async (chat_id, newOne) => {
    let is_exist = await targetWalletModel.find({ public_key: newOne.public_key, chat_id: chat_id });
    if (is_exist.length > 0) {
        return `Wallet <code>${newOne.public_key}</code>\nThis wallet already exists.`;
    } else {
        let max_index = await targetWalletModel.aggregate([{ $group: { _id: null, maxField: { $max: "$index" }} }]);
        let newWallet = new targetWalletModel();
        newWallet.public_key = newOne.public_key;
        newWallet.index = max_index.length > 0 ? max_index[0].maxField + 1: 0;
        newWallet.tag = newOne.tag;
        newWallet.chat_id = chat_id;
        newWallet.webhook_id = newOne.webhook_id;
        await newWallet.save();
        return `Wallet <code>${newOne.public_key}</code>\nAdded successfully! 🎉\nThis change may take up to 2 minutes to take effect.`;
    }
}

const getExistWebhookData = async () => {
    let last_field = (await targetWalletModel.find().limit(1).sort({createdAt: -1}));
    if(last_field.length > 0) {
        let wallet_list = [];
        let filtered_list = await targetWalletModel.find({ webhook_id: last_field[0].webhook_id });
        filtered_list.map(row => {
            wallet_list.push(row.public_key);
        });
        return [last_field[0].webhook_id, wallet_list];
    }
    else return ['', []];
}

const deleteWallet = async (chat_id, public_key) => {
    try {
        await targetWalletModel.deleteOne({ chat_id: chat_id, public_key: public_key });
        return '';
    } catch (e) {
        console.log(e);
        return String(e);
    }
}

module.exports = {
    addWallet,
    getExistWebhookData,
    deleteWallet
}