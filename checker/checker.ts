import * as dotenv from 'dotenv';
import fs from 'fs';
import glob from 'glob';
import fetch from 'node-fetch';
import os from 'os';
import path from 'path';
import utils from 'web3-utils';
import scrape from 'website-scraper';

import logger from './tslog-config';

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

// Get proper ETHERSCAN API KEY
const ETHERSCAN_URI = "https://api.etherscan.io/api?";

export interface ResponseObject {
  foundContractAddressOnSite: boolean;
  contractCreationAddressMatchesOwner: boolean;
}

export default class UrlContractChecker {
  public url: URL;
  public contractAddress: string;
  public owner: string;
  public tmpDir: any;

  constructor(url: string, contractAddress: string, owner: string) {
    if (!utils.isAddress(contractAddress)) {
      throw new Error(`Invalid contract address: ${contractAddress}`);
    } else if (!utils.isAddress(owner)) {
      throw new Error(`Invalid owner address: ${owner}`);
    }

    if (!url.startsWith(`http`)) {
      this.url = new URL(`https://${url}`);
    } else {
      this.url = new URL(url);
    }
    this.contractAddress = contractAddress;
    this.owner = owner;
  }

  public async checkOwner(): Promise<ResponseObject> {
    try {
      const foundContractAddressOnSite: boolean =
        await this.checkContractOnSite();
      logger.debug(`foundContractAddressOnSite: ${foundContractAddressOnSite}`);

      const contractCreationAddressMatchesOwner: boolean =
        await this.checkContractCreation();

      logger.debug(
        `contractCreateAddressMatchesOwner: ${contractCreationAddressMatchesOwner}`
      );

      const returnObject: ResponseObject = {
        foundContractAddressOnSite,
        contractCreationAddressMatchesOwner,
      };

      return returnObject;
    } catch (error) {
      logger.error(error);
      return {
        foundContractAddressOnSite: false,
        contractCreationAddressMatchesOwner: false,
      };
    }
  }

  public async checkContractCreation() {
    const etherscanApiUrl = `${ETHERSCAN_URI}module=contract&action=getcontractcreation&contractaddresses=${this.contractAddress}&apikey=${process.env.ETHERSCAN_API_KEY}`;

    logger.debug(etherscanApiUrl);

    const response = await fetch(etherscanApiUrl);
    const json: any = await response.json();

    logger.debug(`json: ${JSON.stringify(json)}`);

    if (!json?.result || json.result.length === 0) {
      return false;
    }

    const contractCreation = json.result[0];
    const contractCreationAddress = contractCreation.contractCreator;

    logger.debug(`contractCreationAddress: ${contractCreationAddress}`);
    logger.debug(`contractCreationAddressOwner: ${this.owner}`);
    return contractCreationAddress === this.owner;
  }

  public async checkContractOnSite(): Promise<boolean> {
    try {
      this.tmpDir = await path.join(os.tmpdir(), "scrape-eth");
      if (fs.existsSync(this.tmpDir)) {
        fs.rmdirSync(this.tmpDir, { recursive: true });
      }

      await this.runScraper();

      let filesToCheck = glob.sync(path.join(this.tmpDir, `**/*.js`));
      filesToCheck = filesToCheck.concat(
        glob.sync(path.join(this.tmpDir, `**/*.html`))
      );

      // 40 hex chars enclosed by non word characters
      let addresses: string[] = [];
      for (const file of filesToCheck) {
        const content = fs.readFileSync(file, `utf8`);
        const regex = /\W(0x[a-fA-F0-9]{40})\W/g;
        const matches = content.match(regex) || [];
        addresses.push(...matches.map((m) => m.slice(1, -1)));
      }

      addresses = Array.from(new Set(addresses).values());
      addresses = addresses.sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
      );

      return addresses.includes(this.contractAddress);
    } catch (error) {
      logger.error(error);
      return false;
    } finally {
      if (this.tmpDir) {
        fs.rmSync(this.tmpDir, { recursive: true });
      }
    }
  }

  private async runScraper() {
    // some of the logic taken from: https://github.com/MrToph/scrape-eth
    await scrape({
      urls: [this.url.toString()],
      maxRecursiveDepth: 1, // for html resources
      maxDepth: 3, // important to set otherwise badly coded sides with errors keep linking to broken SPA paths
      directory: this.tmpDir,
      // skip 3rd party websites
      urlFilter: (url: string) => {
        return url.includes(this.url.hostname);
      },
      ignoreErrors: true, // in case some file cannot be downloaded, go through the others
      recursive: true,
    });
  }
}
