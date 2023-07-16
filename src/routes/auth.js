const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Router = express.Router();
const saltRounds = 10;

const UserModel = require('../models/user');

const { generateAccessToken, generateRefreshToken } = require('../tools');

// Register route
Router.post('/register', async (req, res) => {
    const { email, email_cfg, password, password_cfg, username, active } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new UserModel({
            email,
            password: hashedPassword,
            username,
            active
        });

        await newUser.save();

        return res.status(200).json({
            "user": newUser
        });
    } catch (error) {
        return res.status(500).json({
            "error": error.message
        });
    }
});

// Login route
Router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await UserModel.findOne({ email, active: true });

        if (!user) {
            return res.status(401).json({ error: 'User not authenticated!' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'User not authenticated!' });
        }

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000 
        });

        return res.status(200).json({
            "accessToken": accessToken,
            "user": user
        });
    } catch (error) {
        return res.status(500).json({
            "error": error.message
        });
    }
});

