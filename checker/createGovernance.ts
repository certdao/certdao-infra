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

export async function createGovernancePoll(
  url: string,
  contractAddress: string,
  owner: string,
  transactionHash: string
) {
  let createdCorrectly = true;
  try {
    const domain = url;
    const checker = new URLContractChecker(url, contractAddress, owner);
    const result: ResponseObject = await checker.checkOwner();

    logger.info(
      `Creating governance poll for ${domain}. Info: contractAddress: ${contractAddress}, owner: ${owner}, transactionHash: ${transactionHash}}`
    );

    // 50 is the discourse external id limit
    const external_id = `${domain}_${owner}_${contractAddress}`.substring(
      0,
      50
    );

    const submitBody = {
      title: `Discuss initial verification of: ${domain}`,
      raw: `Domain: ${domain} was sent for verification by ${owner} with contract address: ${contractAddress} and transaction hash: ${transactionHash}.\nHeuristic checks: \nContract address found on site: ${result.foundContractAddressOnSite}\nContract creation address matches owner: ${result.contractCreationAddressMatchesOwner}`,
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
    console.log(await resultInfo.json());
    createdCorrectly = await resultInfo.ok;
  } catch (error) {
    logger.error(error);
    createdCorrectly = false;
  }
  return createdCorrectly;
}
