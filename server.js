const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// Initialize the app
const app = express();
const PORT = 5000; // Set default port for MongoDB-based server
const FILE_PORT = 3000; // Set alternative port for file-based server
const reviewsFile = path.join(__dirname, 'reviews.json'); // Path to the reviews file

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// MongoDB Configuration
const useMongoDB = true; // Change this to `false` if you want to use file-based storage
let isMongoDBConnected = false;

// MongoDB Schema and Model
let Review;
if (useMongoDB) {
    mongoose.connect('mongodb://localhost:27017/reviewsDB', { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => {
            console.log('Connected to MongoDB');
            isMongoDBConnected = true;

            // Define MongoDB Schema and Model
            const reviewSchema = new mongoose.Schema({
                name: String,
                email: String,
                response: String,
                date: { type: Date, default: Date.now },
            });
            Review = mongoose.model('Review', reviewSchema);
        })
        .catch((err) => {
            console.error('MongoDB connection error:', err);
        });
}

// Initialize reviews file if it doesn't exist
if (!fs.existsSync(reviewsFile)) {
    fs.writeFileSync(reviewsFile, JSON.stringify([]));
}

// Routes
app.get('/', (req, res) => {
    res.send('Welcome to the Reviews API');
});

// Get all reviews - MongoDB and File-based
app.get('/get-reviews', async (req, res) => {
    if (isMongoDBConnected && useMongoDB) {
        try {
            const reviews = await Review.find();
            res.json(reviews);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    } else {
        try {
            const reviews = JSON.parse(fs.readFileSync(reviewsFile));
            res.json(reviews);
        } catch (error) {
            res.status(500).json({ message: 'Error reading reviews from file.' });
        }
    }
});

// Submit a new review - MongoDB and File-based
app.post('/submit-review', async (req, res) => {
    const { name, email, response } = req.body;

    if (isMongoDBConnected && useMongoDB) {
        // Use MongoDB for storage
        const review = new Review({
            name,
            email,
            response,
        });

        try {
            const newReview = await review.save();
            res.status(201).json(newReview);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    } else {
        // Use file-based storage
        try {
            const reviews = JSON.parse(fs.readFileSync(reviewsFile));
            reviews.push({ name, email, response, date: new Date().toISOString() });
            fs.writeFileSync(reviewsFile, JSON.stringify(reviews, null, 2));
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ message: 'Error saving review to file.' });
        }
    }
});

// Start the server on different ports based on storage type
app.listen(useMongoDB ? PORT : FILE_PORT, () => {
    console.log(`Server running at http://localhost:${useMongoDB ? PORT : FILE_PORT}`);
});
