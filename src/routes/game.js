const express = require('express');
const WordModel = require('../models/word');
const GameModel = require("../models/game");
const TryModel = require('../models/try');
const session = require('express-session');

const Router = express.Router();

const isLogged = (req, res, next) => {
    if (req.session.user) {
        console.log('User is logged in');
        next();
    } else {
        return res.status(401).json({ 'msg': "Not logged in!" });
    }
};

function guessWord(guess, target) {
    if (guess.length !== target.length) {
        throw new Error("Guess and target word must have the same length.");
    }

    let result = "";

    for (let i = 0; i < guess.length; i++) {
        if (guess[i] === target[i]) {
            result += "1";
        } else if (target.includes(guess[i])) {
            result += "0";
        } else {
            result += "X";
        }
    }

    return result;
}

function setDifficulty(req) {
    let result = true;

    if (req.body.difficulty === 'difficult') {
        req.session.difficulty = 3;
    } else if (req.body.difficulty === 'medium') {
        req.session.difficulty = 5;
    } else if (req.body.difficulty === 'easy') {
        req.session.difficulty = 8;
    } else {
        return false;
    }

    return result;
}

Router.post('/', isLogged, async (req, res) => {
    if (!setDifficulty(req)) {
        return res.status(400).json({
            "msg": "You must set game difficulty before playing"
        });
    }

    const word = await WordModel.aggregate([{ $sample: { size: 1 } }]);

    let game = new GameModel({
        word: word[0]._id,
        tries: [],
        user: req.session.user._id
    });

    req.session.word = word[0].name;

    try {
        await game.save();
        req.session.gameId = game._id;

        game = await GameModel.findById(game._id).populate('user').populate('word');

        return res.status(200).json({
            "msg": "The secret word has a length of " + word[0].name.length
        });
    } catch (error) {
        return res.status(500).json({
            "error": error.message
        });
    }
});

Router.get('/:id', isLogged, async (req, res) => {
    const { id } = req.params;

    try {
        const game = await GameModel.findOne({ _id: id, user: req.session.user._id });

        if (!game) {
            return res.status(404).json({
                "error": "Game not found or not authorized"
            });
        }

        return res.status(200).json({
            "msg": game
        });
    } catch (error) {
        return res.status(500).json({
            "error": error.message
        });
    }
});

Router.post('/verif', isLogged, async (req, res) => {
    if (typeof req.session.word === 'undefined') {
        return res.status(403).json({
            "msg": "You must create a game before playing"
        });
    }

    if (req.session.difficulty === 0) {
        return res.status(500).json({
            "result": "You Lost !",
            "tries": req.session.tries
        });
    }

    let search = req.session.word;
    let guess = req.body.word;

    if (search.length !== guess.length) {
        return res.status(500).json({
            "msg": "Your 'word' value must be " + search.length,
            "attempts left": req.session.difficulty,
        });
    }

    if (typeof guess === 'undefined') {
        return res.status(500).json({
            "msg": "You have to send 'word' value"
        });
    }

    req.session.difficulty -= 1;

    let result = guessWord(guess, search);

    const newTry = new TryModel({
        word: req.body.word,
        result: result
    });

    const savedTry = await newTry.save();

    let gamePlay = await GameModel.findById(req.session.gameId);

    gamePlay.tries.push(savedTry._id);
    await gamePlay.save();

    if (guess === search) {
        return res.status(200).json({
            "result": "You Won !",
            "attempts left": req.session.difficulty,
            "guess": guess,
            "accuracy": result,
            "game": await GameModel.findById(req.session.gameId).populate('tries')
        });
    }

    return res.status(500).json({
        "result": "Wrong guess. Try again !",
        "attempts left": req.session.difficulty,
        "guess": guess,
        "accuracy": result,
        "game": await GameModel.findById(req.session.gameId).populate('tries')
    });
});

module.exports = Router;
