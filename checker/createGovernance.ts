import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

import URLContractChecker, { ResponseObject } from './checker';
import logger from './tslog-config';

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const API_USERNAME: string = process.env.DISCOURSE_API_USERNAME as string;
const API_KEY: string = process.env.DISCOURSE_API_KEY as string;
const CATEGORY_KEY = 5;
const EXTERNAL_ID_LIMIT_PER_ENTRY = Math.floor(48 / 3);

function generateExternalId(
  url: string,
  owner: string,
  contractAddress: string
) {
  // Remove all dots from url
  let re = /\./gi;
  url = url.replace(re, "").substring(0, EXTERNAL_ID_LIMIT_PER_ENTRY);

  const external_id = `${url}${owner.substring(
    0,
    EXTERNAL_ID_LIMIT_PER_ENTRY
  )}${contractAddress.substring(0, EXTERNAL_ID_LIMIT_PER_ENTRY)}`;

  logger.debug(
    `Created external id: ${external_id} from inputs: ${url}, ${owner}, ${contractAddress}`
  );
  return external_id;
}

function getRandomIntForTitle(both = true) {
  if (both) {
    return Math.floor(Math.random() * 100) * 2;
  } else {
    return Math.floor(Math.random() * 100) * 2 + 1;
  }
}

export async function createGovernancePoll(
  url: string,
  contractAddress: string,
  owner: string,
  transactionHash: string
) {
  let createdCorrectly = true;
  try {
    const checker = new URLContractChecker(url, contractAddress, owner);
    const result: ResponseObject = await checker.checkOwner();

    // sanitize url from the protocol and www
    url = url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split("/")[0];

    logger.info(
      `Creating governance poll for ${url}. Info: contractAddress: ${contractAddress}, owner: ${owner}, transactionHash: ${transactionHash}}`
    );

    const external_id = generateExternalId(url, owner, contractAddress);

    logger.info(`External id: ${external_id}`);

    // Generate a random number for the title to ensure title is unique (multiple submissions from the same site)
    // Contract address cannot be included in discourse titles.
    let randomInt = 0;
    if (
      result.foundContractAddressOnSite &&
      result.contractCreationAddressMatchesOwner
    ) {
      randomInt = getRandomIntForTitle(true);
    } else {
      randomInt = getRandomIntForTitle(false);
    }

    const submitBody = {
      title: `Discuss initial contract verification for url: ${url} - [${randomInt}]`,
      raw: `Domain: ${url} was sent for verification by: ${owner}\n with contract address:\n ${contractAddress}\n and transaction hash:\n ${transactionHash}.\n\nHeuristic checks: \nContract address found on site: ${result.foundContractAddressOnSite}\nContract creation address matches owner: ${result.contractCreationAddressMatchesOwner}`,
      category: CATEGORY_KEY,
      created_at: Date.now().toString(),
      external_id: external_id,
    };

    const resultInfo: any = await fetch(
      `${process.env.DISCOURSE_URL}/posts.json`,
      {
        method: "POST",
        body: JSON.stringify(submitBody),
        headers: {
          "Content-Type": "application/json",
          "Api-Key": API_KEY,
          "Api-Username": API_USERNAME,
        },
      }
    );
    logger.debug(await resultInfo.json());
    createdCorrectly = await resultInfo.ok;
  } catch (error) {
    logger.error(error);
    createdCorrectly = false;
  }
  return createdCorrectly;
}

export async function getGovernancePollFromExternalId(
  url: string,
  contractAddress: string,
  owner: string
) {
  // sanitize url from the protocol and www
  url = url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split("/")[0];

  logger.info(
    `Geting governance poll for ${url}. Info: contractAddress: ${contractAddress}, owner: ${owner}}`
  );
  const external_id = generateExternalId(url, owner, contractAddress);

  const result: any = await fetch(
    `${process.env.DISCOURSE_URL}/t/external_id/${external_id}.json`,
    {
      method: "GET",
    }
  );

  if (await result.ok) {
    const jsonResult = await result.json();
    logger.debug(`Result is okay. Returning ${jsonResult?.slug}`);
    return `${process.env.DISCOURSE_URL}/t/${jsonResult?.slug}`;
  } else {
    logger.debug("Result is not okay. Returning standard discourse url.");
    return `${process.env.DISCOURSE_URL}`;
  }
}
