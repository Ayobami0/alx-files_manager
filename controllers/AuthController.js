import { randomUUID } from 'crypto';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import HttpError from '../utils/error';

const TOKEN_EXPIRATION = 3600;

export default class AuthController {
  static async getConnect(req, res) {
    const authToken = req.get('Authorization');

    if (authToken === undefined) { return; }
    const token = authToken.split(' ');

    const buf = new Buffer.from(token[1], 'base64');
    const decodedToken = buf.toString().split(':');

    const email = decodedToken[0];
    const password = decodedToken[1];

    const user = await dbClient.findOne('users', { email, password });

    if (!user) {
      const err = HttpError.error('Unauthorized', 401);
      res.status(err.status).json(err.message);
      return;
    }

    const newSToken = randomUUID();
    await redisClient.set(`auth_${newSToken}`, user._id.toString(), TOKEN_EXPIRATION);

    res.status(200).json({ token: newSToken });
  }

  static async getDisconnect(req, res) {
    const sToken = req.get('X-Token');

    const key = `auth_${sToken}`;
    const exist = await redisClient.get(key);

    if (!exist) {
      const err = HttpError.error('Unauthorized', 401);
      res.status(err.status).json(err.message);
      return;
    }
    await redisClient.del(key);
    res.status(204).end();
  }
}
