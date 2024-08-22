require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { OpenAI } = require('openai');


const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Set up the database and create a table if it doesn't exist
const db = new sqlite3.Database('./emails.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL
        )`, (err) => {
            if (err) {
                console.error('Error creating table:', err.message);
            }
        });
    }
});

// Serve login.html on the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html', 'index.html'));
});


// Route to handle email submission (POST method)
app.post('/submit-email', (req, res) => {
    const email = req.body.email;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    db.run('INSERT INTO emails (email) VALUES (?)', [email], function(err) {
        if (err) {
            console.error('Error inserting email:', err.message);
            return res.status(500).json({ error: 'Failed to store email' });
        }
        res.json({ message: 'Email stored successfully', id: this.lastID });
    });
});

// Serve index.html after successful login (e.g., via a redirect or by navigating to /index)
app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const mentors = [
    {
        name: "John Doe",
        expertise: "affiliateMarketing",
        discordcontact: "johnny"
    },
    {
        name: "Jane Smith",
        expertise: "contentCreation",
        discordcontact: "jansmit"
    },
    {
        name: "Michael Johnson",
        expertise: "stockInvesting",
        discordcontact: "michaelangelo"
    },
    {
        name: "Emily Davis",
        expertise: "realEstate",
        discordcontact: "emdave"
    },
    {
        name: "Sarah Wilson",
        expertise: "onlineCourses",
        discordcontact: "sarahswill"
    }
];

// Route to get recommendations (POST method)
app.post('/get-recommendations', async (req, res) => {
    console.log('POST /get-recommendations called');
    const { university, studentLoan, country, federalGrantsInterest, major, passiveIncomeInterest, incomeOptions } = req.body;

    console.log('Received data:', { university, studentLoan, country, federalGrantsInterest, major, passiveIncomeInterest, incomeOptions });

    if (!university || !studentLoan || !country || !major || !passiveIncomeInterest) {
        console.error('Missing required fields');
        return res.status(500).json({ error: 'Missing required fields' });
    }

    const messages = [
        {
            role: 'system',
            content: 'Provide personalized recommendations based on the following details:'
        },
        {
            role: 'user',
            content: `University: ${university}\nStudent Loan: $${studentLoan}\nCountry: ${country}\nInterested in Federal Grants: ${federalGrantsInterest ? 'Yes' : 'No'}\nMajor: ${major}\nPassive Income Interest: ${passiveIncomeInterest}\nIncome Options: ${incomeOptions.join(', ')}`
        }
    ];

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: messages,
            max_tokens: 500
        });

        console.log('OpenAI response:', response);

        if (response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.content) {
            // Find matching mentors based on selected income options
            const matchedMentors = mentors.filter(mentor => incomeOptions.includes(mentor.expertise));
            res.json({ recommendations: response.choices[0].message.content.trim(), mentors: matchedMentors });
        } else {
            console.error('No content found in the response:', response);
            res.status(500).json({ error: 'No content found in the response' });
        }
    } catch (error) {
        console.error('Error getting recommendations:', error);
        res.status(500).json({ error: 'Failed to get recommendations', details: error.message });
    }
});

// Route to submit feedback (POST method)
app.post('/submit-feedback', (req, res) => {
    const { rating, comments } = req.body;
    console.log('Feedback received:', rating, comments);
    res.json({ message: 'Feedback submitted successfully' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
