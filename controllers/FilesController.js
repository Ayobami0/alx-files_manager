import { env } from 'process';
import {
  readFile, writeFile, stat, mkdir,
} from 'fs';
import { randomUUID } from 'crypto';
import { promisify } from 'util';
import redisClient from '../utils/redis';
import HttpError from '../utils/error';
import dbClient from '../utils/db';

const FOLDER_PATH = env.FOLDER_PATH || '/tmp/files_manager';

const asyncWriteFile = promisify(writeFile);
const asyncReadFile = promisify(readFile);
const asyncStat = promisify(stat);
const asyncMkdir = promisify(mkdir);

export default class FilesController {
  static async postUpload(req, res) {
    const sToken = req.get('X-Token');

    const key = `auth_${sToken}`;
    const exist = await redisClient.get(key);

    if (!exist) {
      const err = HttpError.error('Unauthorized', 401);
      res.status(err.status).json(err.message);
      return;
    }

    const fReq = req.body;

    if (fReq.name === undefined) {
      const err = HttpError.error('Missing name', 400);
      res.status(err.status).json(err.message);
      return;
    }

    if (fReq.type === undefined || !fReq.type.match('folder|file|image')) {
      const err = HttpError.error('Missing name', 400);
      res.status(err.status).json(err.message);
      return;
    }

    if (fReq.data === undefined && fReq.type !== 'folder') {
      const err = HttpError.error('Missing data', 400);
      res.status(err.status).json(err.message);
      return;
    }
    if (fReq.parentId !== undefined) {
      const parent = await dbClient.findOneByID('files', fReq.parentId);

      if (!parent) {
        const err = HttpError.error('Parent not found', 400);
        res.status(err.status).json(err.message);
        return;
      }
      if (parent.type !== 'folder') {
        const err = HttpError.error('Parent is not a folder', 400);
        res.status(err.status).json(err.message);
        return;
      }
    }

    const file = {};

    switch (fReq.type) {
      case 'folder':
        file.type = 'folder';
        file.name = fReq.name;
        file.userId = exist;
        file.parentId = fReq.parentId || 0;
        file.isPublic = fReq.isPublic || false;
        break;
      default:
        file.name = fReq.name;
        file.type = fReq.type;
        file.userId = exist;
        file.parentId = fReq.parentId || 0;
        file.isPublic = fReq.isPublic || false;
        file.localPath = `${FOLDER_PATH}/${randomUUID()}`;

        try {
          await asyncStat(FOLDER_PATH);
        } catch (e) {
          await asyncMkdir(FOLDER_PATH);
        }

        const data = Buffer.from(fReq.data, 'base64');

        asyncWriteFile(file.localPath, data, { flag: 'w+' });
        break;
    }

    await dbClient.insertOne('files', file);

    if (file.type !== 'folder') { delete file.localPath; }
    const id = file._id;
    delete file._id;
    file.id = id;

    res.status(201).json(file);
  }

  static async getShow(req, res) {
    const sToken = req.get('X-Token');
    const { id } = req.params;

    const key = `auth_${sToken}`;
    const exist = await redisClient.get(key);

    if (!exist) {
      const err = HttpError.error('Unauthorized', 401);
      res.status(err.status).json(err.message);
      return;
    }
    const file = await dbClient.findOneByID('files', id);

    if (!file) {
      const err = HttpError.error('Not found', 404);
      res.status(err.status).json(err.message);
      return;
    }
    delete file._id;
    if (file.type !== 'folder') { delete file.localPath; }
    file.id = id;

    res.json(file);
  }

  static async getIndex(req, res) {
    const sToken = req.get('X-Token');
    const { parentId, page } = req.query;

    const key = `auth_${sToken}`;
    const exist = await redisClient.get(key);

    if (!exist) {
      const err = HttpError.error('Unauthorized', 401);
      res.status(err.status).json(err.message);
      return;
    }
    const files = await dbClient.findAll(
      'files',
      parentId === undefined || parentId === 0 ? {} : { parentId },
      page || 0,
    );

    files.forEach((e) => {
      if (e.type !== 'folder') { delete e.localPath; }
      const id = e._id;
      delete e._id;
      e.id = id.toString();
    });

    res.json(files);
  }

  static async putPublish(req, res) {
    const sToken = req.get('X-Token');
    const { id } = req.params;

    const key = `auth_${sToken}`;
    const exist = await redisClient.get(key);

    if (!exist) {
      const err = HttpError.error('Unauthorized', 401);
      res.status(err.status).json(err.message);
      return;
    }
    const file = await dbClient.findOneByID('files', id);

    if (!file) {
      const err = HttpError.error('Not found', 404);
      res.status(err.status).json(err.message);
      return;
    }

    await dbClient.updateOne('files', id, { isPublic: true });

    delete file._id;
    delete file.localPath;

    file.id = id;
    file.isPublic = true;

    res.json(file);
  }

  static async putUnpublish(req, res) {
    const sToken = req.get('X-Token');
    const { id } = req.params;

    const key = `auth_${sToken}`;
    const exist = await redisClient.get(key);

    if (!exist) {
      const err = HttpError.error('Unauthorized', 401);
      res.status(err.status).json(err.message);
      return;
    }
    const file = await dbClient.findOneByID('files', id);

    if (!file) {
      const err = HttpError.error('Not found', 404);
      res.status(err.status).json(err.message);
      return;
    }

    await dbClient.updateOne('files', id, { isPublic: false });

    delete file._id;
    delete file.localPath;

    file.id = id;
    file.isPublic = false;

    res.json(file);
  }

  static async getFile(req, res) {
    const sToken = req.get('X-Token');
    const { id } = req.params;

    const key = `auth_${sToken}`;
    const exist = await redisClient.get(key);

    const file = await dbClient.findOneByID('files', id);

    if (!file) {
      const err = HttpError.error('Not found', 404);
      res.status(err.status).json(err.message);
      return;
    }

    if (!file.isPublic && file.userId !== exist) {
      const err = HttpError.error('Not found', 404);
      res.status(err.status).json(err.message);
      return;
    }

    if (file.type === 'folder') {
      const err = HttpError.error('A folder doesn\'t have content', 400);
      res.status(err.status).json(err.message);
      return;
    }

    asyncReadFile(file.localPath)
      .catch(() => {
        const err = HttpError.error('Not found', 404);
        res.status(err.status).json(err.message);
      })
      .then((data) => {
        res.append('Content-Type', file.name.split('.')[1]);
        res.send(data);
      });
  }
}
