import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class AppController {
  static getStatus(req, res) {
    res.json({
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    });
  }

  static async getStats(req, res) {
    const nUsers = await dbClient.nbUsers();
    const nFiles = await dbClient.nbFiles();
    res.json({ users: nUsers, files: nFiles });
  }
}
