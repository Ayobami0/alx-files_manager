import { readFileSync, writeFileSync } from 'fs';
import { ObjectID } from 'mongodb';
import dbClient from './utils/db';

const Bull = require('bull');
const imageThumbnail = require('image-thumbnail');

const fileQueue = new Bull('image-thumbnailer');

fileQueue.process(async (job) => {
  if (job.data.fileId === undefined) {
    return Promise.reject(
      new Error('Missing fileId'),
    );
  }
  if (job.data.userId === undefined) {
    return Promise.reject(
      new Error('Missing userId'),
    );
  }

  const file = await dbClient.findOne('files', { _id: ObjectID(job.data.fileId), userId: job.data.userId });

  if (!file) {
    return Promise.reject(
      new Error('File not found'),
    );
  }
  const imageBuffer = readFileSync(file.localPath);
  for await (const width of [500, 250, 100]) {
    const thumbnail = await imageThumbnail(imageBuffer, { width });
    writeFileSync(`${file.localPath}_${width}`, thumbnail);
  }

  return Promise.resolve();
});

export default fileQueue;
