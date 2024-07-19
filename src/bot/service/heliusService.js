const axios = require('axios');

const webhook_url = `http://${global._config.WEBHOOK_SERVER}:${global._config.PORT}${global._config.WEBHOOK_URI}`;

exports.addWebhook = async (wallet_address, transaction_types = ["SWAP"], webhook_id = '', previous_wallet_addresses = []) => {
    if(webhook_id.length > 0) {
        previous_wallet_addresses.push(wallet_address);
        return await this.editWebhook(webhook_id, previous_wallet_addresses, transaction_types);
    } else {
        return await this.createWebhook(wallet_address, transaction_types);
    }
    return;
}

exports.createWebhook = async (wallet_address, transaction_types = ["SWAP"]) => {
    try {
        const data = {};
        data.webhookURL = webhook_url;
        data.transactionTypes = transaction_types;
        data.accountAddresses = [wallet_address];
        data.webhookType = 'enhanced';
        data.txnStatus = 'success';
        const create_url = `https://api.helius.xyz/v0/webhooks?api-key=${global._config.HELIUS_API_KEY}`;
        let result = await axios.post(create_url, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return [true, result.data.webhookID];
    } catch (e) {
        console.log('error in webhook register.');
        console.log(e.response.data.error)
        return [false, e.response.data.error];
    }
}

exports.editWebhook = async (webhook_id, wallet_addresses, transaction_types = ["SWAP"]) => {
    try {
        const data = {};
        data.webhookURL = webhook_url;
        data.transactionTypes = transaction_types;
        data.accountAddresses = wallet_addresses;
        data.webhookType = 'enhanced';
        data.txnStatus = 'success';
        const edit_url = `https://api.helius.xyz/v0/webhooks/${webhook_id}?api-key=${global._config.HELIUS_API_KEY}`;
        let result = await axios.put(edit_url, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return [true, result.data.webhookID];
    } catch (e) {
        console.log('error in webhook update.', webhook_id);
        console.log(e.response.data.error)
        return [false, e.response.data.error];
    }
}

exports.removeWebhook = async (wallet_address, webhook_id) => {
    let webhook_data = await this.getWebhook(webhook_id);
    if (webhook_data[0] == true) {
        let wallet_addresses = webhook_data[1].accountAddresses.filter(address => address != wallet_address);
        if (wallet_addresses.length > 0) return await this.editWebhook(webhook_id, wallet_addresses);
        else return await this.deleteWebhook(webhook_id);
    } else {
        return [false, webhook_data[1]];
    }
}

exports.deleteWebhook = async (webhook_id) => {
    try {
        const delete_url = `https://api.helius.xyz/v0/webhooks/${webhook_id}?api-key=${global._config.HELIUS_API_KEY}`;
        let result = await axios.delete(delete_url, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return [true, 'Deleted webhook successfully.'];
    } catch (e) {
        console.log('error in webhook delete.', webhook_id);
        console.log(e.response.data.error)
        return [false, e.response.data.error];
    }
}

exports.getWebhook = async (webhook_id) => {
    try {
        const get_url = `https://api.helius.xyz/v0/webhooks/${webhook_id}?api-key=${global._config.HELIUS_API_KEY}`;
        let result = await axios.get(get_url, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return [true, result.data];
    } catch (e) {
        console.log('error in webhook delete.', webhook_id);
        console.log(e.response.data.error)
        return [false, e.response.data.error];
    }
}

exports.getAllWebhooks = async () => {
    try {
        const get_url = `https://api.helius.xyz/v0/webhooks?api-key=${global._config.HELIUS_API_KEY}`;
        let result = await axios.get(get_url, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return [true, result.data];
    } catch (e) {
        console.log('error in webhook delete.', webhook_id);
        console.log(e.response.data.error)
        return [false, e.response.data.error];
    }
}