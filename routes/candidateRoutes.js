const express = require('express');
const router = express.Router();
const Candidate = require('../models/candidate');
const User = require('../models/user');
const Election = require('../models/election');
const { jwtAuthMiddleware, checkAdminRole } = require('../jwt');

// GET /candidates or /candidate - List of Electors/Candidates (Public)
router.get(['/candidates', '/candidate', '/'], async (req, res) => {
    try {
        const candidates = await Candidate.find({}, 'fullName party age voteCount _id');
        res.status(200).json(candidates);
    } catch (err) {
        console.error('Error fetching candidates:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /vote/count or /candidate/vote/count - Vote count tally leaderboard (Public)
router.get(['/vote/count', '/candidate/vote/count'], async (req, res) => {
    try {
        // Sort candidates by voteCount in descending order
        const candidates = await Candidate.find().sort({ voteCount: 'desc' });
        
        const voteRecord = candidates.map((data) => ({
            id: data._id,
            party: data.party,
            count: data.voteCount,
            name: data.fullName
        }));

        res.status(200).json(voteRecord);
    } catch (err) {
        console.error('Error fetching vote count:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /vote/:candidateId or /candidate/vote/:candidateId - Cast vote (Role = "voter")
router.post(['/vote/:candidateId', '/candidate/vote/:candidateId', '/:candidateId/vote'], jwtAuthMiddleware, async (req, res) => {
    const candidateID = req.params.candidateId;
    const userId = req.user.id;

    try {
        const candidate = await Candidate.findById(candidateID);
        if (!candidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.role !== 'voter') {
            return res.status(403).json({ message: 'Only registered voters can cast a vote. Admins are not allowed to vote.' });
        }

        if (user.isVoted) {
            return res.status(400).json({ message: 'You have already voted' });
        }

        // Record vote
        candidate.Votes.push({ user: userId });
        candidate.voteCount += 1;
        await candidate.save();

        // Update user voting status
        user.isVoted = true;
        await user.save();

        res.status(200).json({ message: 'Vote recorded successfully', candidate: candidate.fullName, party: candidate.party });
    } catch (err) {
        console.error('Voting error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Admin routes for candidate management (Role = "admin")

// POST /candidates or /candidate - Create new candidate
router.post(['/candidates', '/candidate', '/'], jwtAuthMiddleware, checkAdminRole, async (req, res) => {
    try {
        const { fullName, party, age } = req.body;

        if (!fullName || !party || !age) {
            return res.status(400).json({ error: 'FullName, party, and age are required' });
        }

        const newCandidate = new Candidate({
            fullName,
            party,
            age: Number(age)
        });

        const savedCandidate = await newCandidate.save();
        res.status(201).json({ message: 'Candidate created successfully', candidate: savedCandidate });
    } catch (err) {
        console.error('Candidate creation error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /candidates/:candidateId or /candidate/:candidateId - Update existing candidate
router.put(['/candidates/:candidateId', '/candidate/:candidateId', '/:candidateId'], jwtAuthMiddleware, checkAdminRole, async (req, res) => {
    try {
        const candidateID = req.params.candidateId;
        const updatedCandidateData = req.body;

        const response = await Candidate.findByIdAndUpdate(candidateID, updatedCandidateData, {
            returnDocument: 'after', // Return updated document
            runValidators: true // Run Mongoose validation
        });

        if (!response) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        res.status(200).json({ message: 'Candidate updated successfully', candidate: response });
    } catch (err) {
        console.error('Candidate update error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /candidates/:candidateId or /candidate/:candidateId - Delete a candidate
router.delete(['/candidates/:candidateId', '/candidate/:candidateId', '/:candidateId'], jwtAuthMiddleware, checkAdminRole, async (req, res) => {
    try {
        const candidateID = req.params.candidateId;

        const response = await Candidate.findByIdAndDelete(candidateID);

        if (!response) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        res.status(200).json({ message: 'Candidate deleted successfully' });
    } catch (err) {
        console.error('Candidate deletion error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /election/status - Public: check if result has been declared
router.get('/election/status', async (req, res) => {
    try {
        const election = await Election.getStatus();
        res.status(200).json({
            resultDeclared: election.resultDeclared,
            declaredAt: election.declaredAt
        });
    } catch (err) {
        console.error('Election status error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /declare-result - Admin only: toggle result declaration
router.post('/declare-result', jwtAuthMiddleware, checkAdminRole, async (req, res) => {
    try {
        const election = await Election.getStatus();
        election.resultDeclared = !election.resultDeclared;
        election.declaredAt = election.resultDeclared ? new Date() : null;
        election.declaredBy = req.user.id;
        await election.save();

        res.status(200).json({
            message: election.resultDeclared
                ? 'Result has been declared successfully!'
                : 'Result declaration has been revoked.',
            resultDeclared: election.resultDeclared,
            declaredAt: election.declaredAt
        });
    } catch (err) {
        console.error('Declare result error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
