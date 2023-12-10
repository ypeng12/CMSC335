const express = require('express');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const ejs = require('ejs');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// MongoDB connection URL and Database Name
const dbURL = 'YOUR_MONGODB_URL';
const dbName = 'YOUR_DB_NAME';

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/market', (req, res) => {
    // Fetch shoes data from MongoDB and render market.ejs
    MongoClient.connect(dbURL, (err, client) => {
        if (err) return console.error(err);
        const db = client.db(dbName);
        db.collection('shoes').find().toArray((err, result) => {
            if (err) return console.error(err);
            res.render('market', { shoes: result });
        });
    });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
