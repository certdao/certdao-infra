import cors from 'cors';
import * as dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';

import URLContractChecker, { ResponseObject } from './checker';
import { createGovernancePoll } from './createGovernance';
import logger from './tslog-config';


if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const ORIGIN = process.env.ORIGIN || "http://localhost:3000";

const app = express();
const port = 4300;

app.use(express.json());
app.use(helmet());

app.use(
  cors({
    origin: ORIGIN,
  })
);

app.get("/", (req, res) => {
  res.send(`certdao infra: ${Date.now().toLocaleString()}`);
});

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
    res.status(400).send(error);
  }
});

/**
 * After validation is complete, take in transaction hash, address, contract address.
 * Check that the transaction hash is valid, and that the address is the owner of the contract (rerun validation).
 *
 * Submit either just a discourse post or a discourse post + snap vote.
 *
 * If passes both checks, submit a snapshot vote.
 */
app.post("/createGovernancePoll", async (req, res) => {
  logger.info(req.body);
  try {
    const { transactionHash, url, contractAddress, owner } = req.body;

    if (!transactionHash || !owner || !contractAddress || !url) {
      console.log("missing params");
      res.status(400).send("Missing required parameters");
    } else {
      const success = await createGovernancePoll(
        url,
        contractAddress,
        owner,
        transactionHash
      );

      if (success) {
        res.status(200).send("Success");
      } else {
        throw new Error(
          "Failed to create governance poll with input: " +
            JSON.stringify(req.body)
        );
      }
    }
  } catch (error) {
    logger.error(error);
    res.status(400).send(error);
  }
});

app.listen(port, () => {
  logger.info(`certdao infra listening on localhost:${port}`);
});
