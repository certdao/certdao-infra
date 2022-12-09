import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const API_USERNAME: string = process.env.DISCOURSE_API_USERNAME as string;
const API_KEY: string = process.env.DISCOURSE_API_KEY as string;
const CATEGORY_KEY = 5;

async function main() {
  const test_body = {
    title: "test domain verification2",
    raw: "test domain verification automated post",
    category: CATEGORY_KEY,
    created_at: Date.now().toString(),
    external_id: "test3",
  };

  const result: any = await fetch(`${process.env.DISCOURSE_URL}/posts.json`, {
    method: "POST",
    body: JSON.stringify(test_body),
    headers: {
      "Content-Type": "application/json",
      "Api-Key": API_KEY,
      "Api-Username": API_USERNAME,
    },
  });

  const jsonResult = await result.json();
  console.log(jsonResult);
}

async function getFromExternalId() {
  const result: any = await fetch(
    `${process.env.DISCOURSE_URL}/t/external_id/test3.json`,
    {
      method: "GET",
    }
  );

  const jsonResult = await result.json();
  console.log(jsonResult);
  console.log(jsonResult?.slug);
}

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });

getFromExternalId()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
