import HttpError from '../utils/error';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class UsersController {
  static async postNew(req, res) {
    const jReq = req.body;

    if (!jReq.email) {
      const err = HttpError.error('Missing email', 400);
      res.status(err.status).json(err.message);
      return;
    }
    if (!jReq.password) {
      const err = HttpError.error('Missing password', 400);
      res.status(err.status).json(err.message);
      return;
    }

    const userExists = await dbClient.exists('users', { email: jReq.email });
    if (userExists) {
      const err = HttpError.error('Already exist', 400);
      res.status(err.status).json(err.message);
    } else {
      const id = await dbClient.insertOne('users', { email: jReq.email, password: jReq.password });

      res.status(201).json({ email: jReq.email, id });
    }
  }

  static async getMe(req, res) {
    const token = req.get('X-Token');

    const id = await redisClient.get(`auth_${token}`);
    if (!id) {
      const err = HttpError.error('Unauthorized', 401);
      res.status(err.status).json(err.message);
      return;
    }

    const user = await dbClient.findOneByID('users', id);

    res.status(201).json({ id, email: user.email });
  }
}
