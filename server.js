import { env } from 'process';
import router from './routes';

const express = require('express');

const PORT = env.PORT || 5000;

const app = express();

app.use(express.json());

app.use(router);

app.listen(PORT);
