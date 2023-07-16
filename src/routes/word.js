const express = require('express');
const Router = express.Router();

const WordModel = require('../models/word');

// Create a new Word
Router.post('/', async (request, response) => {
    const { name } = request.body;

    try {
        const word = new WordModel({ name });
        const savedWord = await word.save();

        return response.status(201).json(savedWord);
    } catch (error) {
        return response.status(500).json({
            "error": error.message
        });
    }
});

// Read all Words
Router.get('/', async (request, response) => {
    try {
        const words = await WordModel.find();
        return response.status(200).json(words);
    } catch (error) {
        return response.status(500).json({
            "error": error.message
        });
    }
});

// Read a single Word by ID
Router.get('/:id', async (request, response) => {
    const { id } = request.params;

    try {
        const word = await WordModel.findById(id);
        if (!word) {
            return response.status(404).json({
                "error": "Word not found"
            });
        }
        return response.status(200).json(word);
    } catch (error) {
        return response.status(500).json({
            "error": error.message
        });
    }
});

// Update a Word by ID
Router.put('/:id', async (request, response) => {
    const { id } = request.params;
    const { name } = request.body;

    try {
        const updatedWord = await WordModel.findByIdAndUpdate(
            id,
            { name },
            { new: true }
        );
        if (!updatedWord) {
            return response.status(404).json({
                "error": "Word not found"
            });
        }
        return response.status(200).json(updatedWord);
    } catch (error) {
        return response.status(500).json({
            "error": error.message
        });
    }
});

// Delete a Word by ID
Router.delete('/:id', async (request, response) => {
    const { id } = request.params;

    try {
        const deletedWord = await WordModel.findByIdAndDelete(id);
        if (!deletedWord) {
            return response.status(404).json({
                "error": "Word not found"
            });
        }
        return response.status(200).json({
            "msg": "Word deleted successfully"
        });
    } catch (error) {
        return response.status(500).json({
            "error": error.message
        });
    }
});

module.exports = Router;
