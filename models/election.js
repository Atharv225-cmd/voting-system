const { Schema, model } = require('mongoose');

// Singleton document to track election state
const electionSchema = new Schema({
    resultDeclared: {
        type: Boolean,
        default: false,
    },
    declaredAt: {
        type: Date,
        default: null,
    },
    declaredBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    }
}, { timestamps: true });

const Election = model('Election', electionSchema);

// Helper to get or create the singleton election document
Election.getStatus = async function () {
    let election = await Election.findOne();
    if (!election) {
        election = await Election.create({ resultDeclared: false });
    }
    return election;
};

module.exports = Election;
