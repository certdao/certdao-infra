import express from 'express';

import urlContractChecker from './checker';

const app = express();
const port = 3000;

app.use(express.json());

app.put("/validateContract", async (req, res) => {
  console.log(req.body);
  const { url, contractAddress, owner } = req.body;
  if (!url || !contractAddress || !owner) {
    res.status(400).send("Missing required parameters");
  } else {
    const checker = new urlContractChecker(url, contractAddress, owner);
    const result: boolean = await checker.checkOwner();
    res.status(200).send(result);
  }
});

app.get("/", async (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`certdao infra listening on localhost:${port}`);
});
