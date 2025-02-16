import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import mongoose from 'mongoose';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const app = express();
const port = 3000;
app.use(cors());

// Serve static files
app.use(express.static('public'));

mongoose.connect('mongodb://127.0.0.1:27017/nftify_music');

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
});
const User = mongoose.model('User', userSchema);

// Определение схемы музыки
const musicSchema = new mongoose.Schema({
    title: String,
    artist: String,
    price: Number,
    fileHash: String,
    owner: String,
});
const Music = mongoose.model('Music', musicSchema);

// Function to get music list from directory
async function getMusicFromDirectory() {
    const musicDir = path.join(__dirname, 'public', 'music');
    const files = await fs.readdir(musicDir);
    return files.map(file => ({
        title: path.parse(file).name,
        artist: 'Unknown Artist', // You can update this to fetch artist info if available
        file: file
    }));
}

// Endpoint to get music files
app.get('/music', async (req, res) => {
    try {
        const musicList = await getMusicFromDirectory();
        res.status(200).json(musicList);
    } catch (error) {
        console.error('Error fetching music:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Регистрация
app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword });
        await user.save();
        res.json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Авторизация
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Загрузка музыки в контракт
app.post('/upload', async (req, res) => {
    const { title, artist, price, fileHash, owner } = req.body;
    try {
        const tx = await contract.methods.createMusic(title, artist, price, fileHash)
            .send({ from: owner, gas: 500000 });
        const music = new Music({ title, artist, price, fileHash, owner });
        await music.save();
        res.json({ message: 'Music uploaded successfully', tx });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});