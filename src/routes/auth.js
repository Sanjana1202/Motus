const express = require('express');
const bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');

const Router = express.Router();
const saltRounds = 10;

const UserModel = require('../models/user');

const { generateAccessToken, generateRefreshToken } = require('../tools');

Router.post('/register', async (request, response) => {
    const { email, password, username, active } = request.body;

    try {

        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return response.status(409).json({ error: 'Email is already registered' });
        }

        const hash = await bcrypt.hash(password, saltRounds);

        const user = new UserModel({
            email,
            password: hash,
            username,
            active
        });

        await user.save();

        return response.status(201).json({
            message: 'User registered successfully!!',
            user: user
        });

    } catch (error) {
        return response.status(500).json({
            error: error.message
        });
    }
});

Router.post('/login', async (request, response) => {
    const { email, password } = request.body;

    try {
        const user = await UserModel.findOne({ email, active: true });

        if (!user) {
            return response.status(401).json({
                error: 'Invalid credentials'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return response.status(401).json({
                error: 'Invalid credentials'
            });
        }

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        response.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000 
        });

        return response.status(200).json({
            accessToken: accessToken,
            user: {
                _id: user._id,
                email: user.email,
                username: user.username
            }
        });

    } catch (error) {
        return response.status(500).json({
            error: error.message
        });
    }
});

module.exports = Router;
