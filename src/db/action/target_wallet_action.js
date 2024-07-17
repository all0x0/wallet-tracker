const web3 = require("@solana/web3.js");
let targetWalletModel = require('../model/target_wallets');

let addWallet = async (chat_id, newOne) => {
    let is_exist = await targetWalletModel.find({ public_key: newOne.public_key });
    if (is_exist.length > 0) {
        return `Wallet ${newOne.public_key}\nThis wallet already exists.`;
    } else {
        let max_index = await targetWalletModel.aggregate([{ $group: { _id: null, maxField: { $max: "$index" }} }]);
        let newWallet = new targetWalletModel();
        newWallet.public_key = newOne.public_key;
        newWallet.index = max_index.length > 0 ? max_index[0].maxField + 1: 0;
        newWallet.tag = newOne.tag;
        newWallet.chat_id = chat_id;
        await newWallet.save();
        return `Wallet ${newOne.public_key}\nAdded successfully! 🎉`;
    }
}

module.exports = {
    addWallet
}