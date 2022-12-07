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
  domain: string,
  owner: string,
  contractAddress: string
) {
  // Remove all dots from domain
  let re = /\./gi;
  domain = domain.replace(re, "").substring(0, EXTERNAL_ID_LIMIT_PER_ENTRY);

  const external_id = `${domain}${owner.substring(
    0,
    EXTERNAL_ID_LIMIT_PER_ENTRY
  )}${contractAddress.substring(0, EXTERNAL_ID_LIMIT_PER_ENTRY)}`;

  return external_id;
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

    logger.info(
      `Creating governance poll for ${url}. Info: contractAddress: ${contractAddress}, owner: ${owner}, transactionHash: ${transactionHash}}`
    );

    const external_id = generateExternalId(url, owner, contractAddress);

    logger.info(`External id: ${external_id}`);

    const submitBody = {
      title: `Discuss initial contract verification for domain: ${url}`,
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
  domain: string,
  owner: string,
  contractAddress: string
) {
  const external_id = generateExternalId(domain, owner, contractAddress);

  console.log(`${process.env.DISCOURSE_URL}/t/external_id/${external_id}.json`);
  const result: any = await fetch(
    `${process.env.DISCOURSE_URL}/t/external_id/${external_id}.json`,
    {
      method: "GET",
    }
  );

  console.log(result);
  if (result.ok) {
    const jsonResult = await result.json();
    return `${process.env.DISCOURSE_URL}/t/${jsonResult?.slug}`;
  } else {
    return `${process.env.DISCOURSE_URL}`;
  }
}
