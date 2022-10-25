import * as dotenv from 'dotenv';
import express from 'express';

import URLContractChecker from './checker';
import logger from './tslog-config';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());

app.put("/validateContract", async (req, res) => {
  logger.info(req.body);
  const { url, contractAddress, owner } = req.body;
  if (!url || !contractAddress || !owner) {
    res.status(400).send("Missing required parameters");
  } else {
    const checker = new URLContractChecker(url, contractAddress, owner);
    const result: boolean = await checker.checkOwner();
    res.status(200).send(result);
  }
});

app.listen(port, () => {
  logger.info(`certdao infra listening on localhost:${port}`);
});
