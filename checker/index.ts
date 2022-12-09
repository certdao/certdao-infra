import cors from 'cors';
import * as dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';

import URLContractChecker, { ResponseObject } from './checker';
import { createGovernancePoll, getGovernancePollFromExternalId } from './createGovernance';
import logger from './tslog-config';


if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const app = express();
const port = 4300;

app.use(express.json());
app.use(helmet());

let allowedOrigins = ["http://localhost:3000", process.env?.ORIGIN];
logger.debug(`ORIGIN: ${process.env.ORIGIN}`);

app.use(
  cors({
    origin: function (origin, callback) {
      if (allowedOrigins.indexOf(origin) === -1) {
        var msg =
          "The CORS policy for this site does not " +
          "allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  })
);

app.get("/", (req, res) => {
  res.send(`certdao infra: ${Date.now().toLocaleString()}`);
});

app.post("/validateContract", cors(), async (req, res) => {
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
app.post("/createGovernancePoll", cors(), async (req, res) => {
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

/**
 * Generate and return the discourse slug corresponding to the input.
 */
app.post("/getGovernancePoll", cors(), async (req, res) => {
  logger.info(req.body);
  try {
    const { url, contractAddress, owner } = req.body;

    if (!owner || !contractAddress || !url) {
      logger.info("missing params");
      res.status(400).send("Missing required parameters");
    } else {
      const link = await getGovernancePollFromExternalId(
        url,
        contractAddress,
        owner
      );

      if (link) {
        res.status(200).send(JSON.stringify({ link }));
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
