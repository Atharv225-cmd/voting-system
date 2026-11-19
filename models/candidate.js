const { Schema, model } = require('mongoose');

const candidateSchema = new Schema({
    fullName: {
        type: String,
        required: true,
    },
    party: {
        type: String,
        required: true,
    },
    age: {
        type: Number,
        required: true,
    },
    Votes: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        VotedAt: {
            type: Date,
            default: Date.now
        }
    }],
    voteCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Candidate = model('Candidate', candidateSchema);
module.exports = Candidate;
module.exports.Candidate = Candidate;