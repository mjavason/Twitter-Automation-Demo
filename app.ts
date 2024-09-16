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

/**
 * @swagger
 * /me:
 *   get:
 *     tags: [Twitter]
 *     summary: Get my twitter profile
 *     description: Retrieve the user profile of this dev account.
 *     responses:
 *       200:
 *         description: User ID retrieved successfully
 *       401:
 *         description: Unauthorized access
 */
app.get('/me', async (req: Request, res: Response) => {
  const user = await rwClient.v2.me({ 'user.fields': 'profile_image_url' });
  res.status(200).json({ user });
});

/**
 * @swagger
 * /tweet:
 *   post:
 *     tags: [Twitter]
 *     summary: Post a tweet
 *     description: Post a tweet to the authenticated Twitter account.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: This tweet was made with the Twitter API.
 *     responses:
 *       200:
 *         description: Tweet posted successfully
 *       401:
 *         description: Unauthorized access
 */
app.post('/tweet', async (req: Request, res: Response) => {
  const { message } = req.body;
  const tweet = await rwClient.v2.tweet(message);
  res.status(200).json({ message: 'Tweet posted successfully!', tweet });
});

/**
 * @swagger
 * /tweet:
 *   delete:
 *     tags: [Twitter]
 *     summary: Delete a tweet
 *     description: Delete a tweet by its tweet ID.
 *     parameters:
 *       - in: query
 *         name: tweetId
 *         required: true
 *         schema:
 *           type: string
 *           example: 123456789
 *     responses:
 *       200:
 *         description: Tweet deleted successfully
 *       401:
 *         description: Unauthorized access
 */
app.delete('/tweet', async (req: Request, res: Response) => {
  const { tweetId } = req.query;
  await rwClient.v2.deleteTweet(tweetId as string);
  res.status(200).json({ message: 'Tweet deleted successfully!' });
});

/**
 * @swagger
 * /user-id/{username}:
 *   get:
 *     tags: [Twitter]
 *     summary: Get Twitter user ID by username
 *     description: Retrieve the user ID of a Twitter user by their username.
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *           example: michelson_java
 *     responses:
 *       200:
 *         description: User ID retrieved successfully
 *       401:
 *         description: Unauthorized access
 */
app.get('/user-id/:username', async (req: Request, res: Response) => {
  const { username } = req.params;
  const user = await rwClient.v2.userByUsername(username);
  rwClient.currentUser;
  res.status(200).json({ userId: user.data.id });
});

/**
 * @swagger
 * /tweets:
 *   get:
 *     tags: [Twitter]
 *     summary: Retrieve tweets from the user's timeline
 *     description: Fetch tweets from a user's timeline by providing their user ID.
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         description: The Twitter user ID to fetch the timeline for
 *         schema:
 *           type: string
 *           example: 123456789
 *     responses:
 *       200:
 *         description: Tweets retrieved successfully
 *       401:
 *         description: Unauthorized access
 */
app.get('/tweets', async (req: Request, res: Response) => {
  const { userId } = req.query; // Fetch the userId from the query parameters

  if (!userId) return res.status(400).json({ message: 'User ID is required.' });

  // Fetch the user's timeline by user ID
  const tweets = await rwClient.v2.userTimeline(userId as string);
  res.status(200).json({ message: 'Tweets retrieved successfully!', tweets });
});

/**
 * @swagger
 * /like:
 *   post:
 *     summary: Like a tweet
 *     description: Like a tweet by providing the user ID and the tweet ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user liking the tweet.
 *                 example: 123456789
 *               tweetId:
 *                 type: string
 *                 description: The ID of the tweet to like.
 *                 example: 987654321
 *     responses:
 *       200:
 *         description: Tweet liked successfully
 *       400:
 *         description: Bad request, missing userId or tweetId
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Failed to like the tweet
 */
app.post('/like', async (req: Request, res: Response) => {
  const { userId, tweetId } = req.body; // Get userId and tweetId from the request body

  if (!userId || !tweetId) {
    return res
      .status(400)
      .json({ message: 'User ID and Tweet ID are required.' });
  }

  try {
    // Like the tweet using Twitter API
    await rwClient.v2.like(userId as string, tweetId as string);
    res.status(200).json({ message: 'Tweet liked successfully!' });
  } catch (error) {
    console.error('Error liking tweet:', error);
    res.status(500).json({ message: 'Failed to like tweet', error });
  }
});

/**
 * @swagger
 * /retweet:
 *   post:
 *     summary: Retweet a tweet
 *     description: Retweet a tweet by providing the authenticated user ID and the tweet ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user retweeting the tweet.
 *                 example: 123456789
 *               tweetId:
 *                 type: string
 *                 description: The ID of the tweet to retweet.
 *                 example: 987654321
 *     responses:
 *       200:
 *         description: Tweet retweeted successfully
 *       400:
 *         description: Bad request, missing userId or tweetId
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Failed to retweet the tweet
 */
app.post('/retweet', async (req: Request, res: Response) => {
  const { userId, tweetId } = req.body; // Get userId and tweetId from the request body

  if (!userId || !tweetId) {
    return res
      .status(400)
      .json({ message: 'User ID and Tweet ID are required.' });
  }

  try {
    // Retweet the tweet using Twitter API
    await rwClient.v2.retweet(userId, tweetId);
    res.status(200).json({ message: 'Tweet retweeted successfully!' });
  } catch (error) {
    console.error('Error retweeting tweet:', error);
    res.status(500).json({ message: 'Failed to retweet the tweet', error });
  }
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
  console.log(`${'\x1b[31m'}`); // start color red
  console.log(`${err.message}`);
  console.log(`${'\x1b][0m]'}`); //stop color

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
