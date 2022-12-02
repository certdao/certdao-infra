import cors from 'cors';
import * as dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';

import URLContractChecker, { ResponseObject } from './checker';
import logger from './tslog-config';

dotenv.config();

const app = express();
const port = 4300;

app.use(express.json());
app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

app.post("/validateContract", async (req, res) => {
  logger.info(req.body);
  try {
    const { url, contractAddress, owner } = req.body;
    if (!url || !contractAddress || !owner) {
      console.log("missing params");
      res.status(400).send("Missing required parameters");
    } else {
      const checker = new URLContractChecker(url, contractAddress, owner);
      const result: ResponseObject = await checker.checkOwner();
      res.status(200).send(JSON.stringify(result));
    }
  } catch (error) {
    logger.error(error);
    res.status(500).send(error);
  }
});

app.listen(port, () => {
  logger.info(`certdao infra listening on localhost:${port}`);
});
