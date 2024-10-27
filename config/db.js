const { Client } = require('pg');

const dbClient = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});

dbClient.connect()
  .then(() => console.log('Connected to the database'))
  .catch(err => console.error('Database connection error:', err));

module.exports = dbClient;
