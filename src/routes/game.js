const express = require('express');
const WordModel = require('../models/word');
const GameModel = require("../models/game");
const TryModel = require('../models/try');
const session = require('express-session');

const Router = express.Router();

const isLogged = (request, response, next) => {
    if (request.session.user) {
        console.log('test');
        next();
    } else {
        return response.status(401).json({ 'msg': 'You are not logged in!' });
    }
};

function guessWord(guess, target) {
    if (guess.length !== target.length) {
        throw new Error("Guessed word and target word must have the same length.");
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

function setDifficulty(request) {
    const difficulty = request.body.difficulty;

    if (difficulty === 'difficult') {
        request.session.difficulty = 3;
    } else if (difficulty === 'medium') {
        request.session.difficulty = 5;
    } else if (difficulty === 'easy') {
        request.session.difficulty = 8;
    } else {
        return false;
    }

    return true;
}

Router.post('/', isLogged, async (request, response) => {
    if (!setDifficulty(request)) {
        return response.status(400).json({
            "msg": "Set the game difficulty before playing."
        });
    }

    try {
        const word = await WordModel.aggregate([{ $sample: { size: 1 } }]);

        const game = new GameModel({
            word: word[0]._id,
            tries: [],
            user: request.session.user._id
        });

        await game.save();

        request.session.word = word[0].name;
        request.session.gameId = game._id;

        return response.status(200).json({
            "msg": "The secret word has a length of " + word[0].name.length
        });
    } catch (error) {
        return response.status(500).json({
            "error": error.message
        });
    }
});

Router.get('/:id', async (request, response) => {
    const { id } = request.params;

    try {
        const game = await GameModel.findOne({ _id: id });

        if (!game) {
            return response.status(404).json({
                "error": "Game not found."
            });
        }

        return response.status(200).json({
            "msg": game
        });
    } catch (error) {
        return response.status(500).json({
            "error": error.message
        });
    }
});

Router.post('/verif', isLogged, async (request, response) => {
    if (typeof request.session.word === 'undefined') {
        return response.status(400).json({
            "msg": "You must create a game before playing."
        });
    }

    if (request.session.difficulty === 0) {
        return response.status(500).json({
            "result": "You Lost!",
            "tries": request.session.tries
        });
    }

    const search = request.session.word;
    const guess = request.body.word;

    if (!guess) {
        return response.status(400).json({
            "msg": "You have to send the 'word' value."
        });
    }

    if (search.length !== guess.length) {
        return response.status(400).json({
            "msg": "Your 'word' value must have a length of " + search.length,
            "attemptsLeft": request.session.difficulty
        });
    }

    request.session.difficulty--;

    const result = guessWord(guess, search);

    try {
        const newTry = new TryModel({
            word: guess,
            result: result
        });

        const savedTry = await newTry.save();

        const gamePlay = await GameModel.findById(request.session.gameId);
        gamePlay.tries.push(savedTry._id);
        await gamePlay.save();

        if (guess === search) {
            return response.status(200).json({
                "result": "You Won!",
                "attemptsLeft": request.session.difficulty,
                "guess": guess,
                "accuracy": result,
                "game": await GameModel.findById(request.session.gameId).populate('tries')
            });
        }

        return response.status(500).json({
            "result": "Wrong guess. Try again!",
            "attemptsLeft": request.session.difficulty,
            "guess": guess,
            "accuracy": result,
            "game": await GameModel.findById(request.session.gameId).populate('tries')
        });
    } catch (error) {
        return response.status(500).json({
            "error": error.message
        });
    }
});

module.exports = Router;
