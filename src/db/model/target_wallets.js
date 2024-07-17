const mongoose = require('mongoose');
const uuid = require('uuid');
const Schema = mongoose.Schema;

let model = new Schema({
    _id: { type: String, default: uuid.v4 },
    public_key: { type: String },
    index: { type: Number },
    tag: { type: String },
    chat_id: { type: String },
    is_active: { type: Boolean, default: true },
    createdAt: { type: Number, default: Date.now }
});

module.exports = mongoose.model('target_wallets', model);