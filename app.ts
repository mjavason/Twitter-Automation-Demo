import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import { setupSwagger } from './swagger.config';
import { TwitterApi } from 'twitter-api-v2';
import 'express-async-errors';

//#region App Setup
const app = express();

dotenv.config({ path: './.env' });
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const appKey = process.env.TWITTER_API_KEY || 'xxxx';
const appSecret = process.env.TWITTER_API_SECRET || 'xxxx';
const accessToken = process.env.TWITTER_ACCESS_TOKEN || 'xxxx';
const accessSecret = process.env.TWITTER_TOKEN_SECRET || 'xxxx';

// Initialize Twitter API with credentials
const client = new TwitterApi({
  appKey,
  appSecret,
  accessToken,
  accessSecret,
});

const rwClient = client.readWrite;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));
setupSwagger(app, BASE_URL);

//#endregion App Setup

//#region Code here

// Route to post a tweet
app.post('/tweet', async (req, res) => {
  // Posting the tweet
  const tweet = await rwClient.v2.tweet(
    'This tweet was made with the Twitter API.'
  );
  res.status(200).json({ message: 'Tweet posted successfully!', tweet });
});

app.delete('/tweet', async (req, res) => {
  // Deleting the tweet
  const tweetId = 'your-tweet-id';
  await rwClient.v2.deleteTweet(tweetId);

  res.status(200).json({ message: 'Tweet deleted successfully!' });
});


//#endregion

//#region Server Setup

/**
 * @swagger
 * /api:
 *   get:
 *     summary: Call a demo external API (httpbin.org)
 *     description: Returns an object containing demo content
 *     tags: [Default]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '400':
 *         description: Bad request.
 */
app.get('/api', async (req: Request, res: Response) => {
  try {
    const result = await axios.get('https://httpbin.org');
    return res.send({
      message: 'Demo API called (httpbin.org)',
      data: result.status,
    });
  } catch (error: any) {
    console.error('Error calling external API:', error.message);
    return res.status(500).send({ error: 'Failed to call external API' });
  }
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: API Health check
 *     description: Returns an object containing demo content
 *     tags: [Default]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '400':
 *         description: Bad request.
 */
app.get('/', (req: Request, res: Response) => {
  return res.send({ message: 'API is Live!' });
});

/**
 * @swagger
 * /obviously/this/route/cant/exist:
 *   get:
 *     summary: API 404 Response
 *     description: Returns a non-crashing result when you try to run a route that doesn't exist
 *     tags: [Default]
 *     responses:
 *       '404':
 *         description: Route not found
 */
app.use((req: Request, res: Response) => {
  return res
    .status(404)
    .json({ success: false, message: 'API route does not exist' });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // throw Error('This is a sample error');

  console.log(`${'\x1b[31m'}${err.message}${'\x1b][0m]'} `);
  return res
    .status(500)
    .send({ success: false, status: 500, message: err.message });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});

// (for render services) Keep the API awake by pinging it periodically
// setInterval(pingSelf(BASE_URL), 600000);

//#endregion
