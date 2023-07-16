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
Router.get('/me', (request, response) => {
    return response.status(200).json({
        "user": request.session.user
    });
})
Router.get('/refreshToken', async (request, response) => {
    try {
        const rf_token = request.cookies.refreshtoken

        if (!rf_token) return response.status(503).json({ msg: " User not authenticated !" });

        const decoded = jwt.verify(rf_token, `secret`)

        if (!decoded) return response.status(503).json({ msg: "User not Authenticated !" })

        const user = await UserModel.findById(decoded.id)

        if (!user) return response.status(503).json({ msg: "User not authenticated !" })

        const token = generateAccessToken(user._id)

        return response.status(200).json({
            token,
            user
        })
    } catch (error) {
        return response.status(503).json({"msg": "User not authenticated !"});
    }
});

module.exports = Router;

