require('dotenv').config();

const express = require('express');
const app = express();
app.use(express.json());
const port = 3030;

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const timestamp = new Date().toISOString();
    const status = 400;
    const response = "Malformed JSON: Please provide a valid JSON body.";
    console.log(`${timestamp} [${status}] Request received. Response:`, response);
    return res.status(status).send(response);
  }
  next();
});

function isGuid(str) {
  const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  return guidRegex.test(str);
}

function getRandomPrefix() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters[Math.floor(Math.random() * 26)] + letters[Math.floor(Math.random() * 26)];
}

function getRandomRange() {
  const startMiddle = Math.floor(Math.random() * 1e6).toString().padStart(6, '0');
  const start = startMiddle + '01';
  let startInt = parseInt(start, 10);
  let endInt = startInt + Math.floor(Math.random() * 5000 + 100);
  endInt = Math.floor(endInt / 100) * 100;
  let end = endInt.toString().padStart(8, '0');
  return { start, end };
}

function isValidAccountNumber(accountNumber) {
  return /^[0-9]{10}$/.test(accountNumber);
}

function isNull(value) {
  return value === null || value === undefined || value === "" || (typeof value === 'object' && Object.keys(value).length === 0);
}

function responseSendAndLog(req, res, status, response) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${status}] Request:\n` + JSON.stringify(req.body, null, 2) + "\n\nResponse:\n", JSON.stringify(response, null, 2));
  console.log("===========================================================")
  return res.status(status).send(response);
}

function getValidCredentialPairs() {
  const pairs = [];
  let index = 1;
  
  // Load all CLIENT_ID_X and CLIENT_SECRET_X pairs from .env
  while (process.env[`CLIENT_ID_${index}`] && process.env[`CLIENT_SECRET_${index}`]) {
    pairs.push({
      id: process.env[`CLIENT_ID_${index}`],
      secret: process.env[`CLIENT_SECRET_${index}`]
    });
    index++;
  }
  
  return pairs;
}

function validateHeaders(req, res) {
  const headers = req.headers;
  
  // Check if headers exist and are strings
  if (
    isNull(headers['x-ibm-client-id']) ||
    isNull(headers['x-ibm-client-secret']) ||
    typeof headers['x-ibm-client-id'] !== "string" ||
    typeof headers['x-ibm-client-secret'] !== "string"
  ) {
    responseSendAndLog(req, res, 400, "Invalid credentials. Incorrect client id or client secret.");
    return false;
  }
  
  // Get all valid credential pairs from .env
  const validPairs = getValidCredentialPairs();
  
  if (validPairs.length === 0) {
    console.error("ERROR: No valid credential pairs found in .env file");
    responseSendAndLog(req, res, 500, "Server configuration error.");
    return false;
  }
  
  // Check if provided credentials match any valid pair
  const isValidCredentials = validPairs.some(pair => 
    headers['x-ibm-client-id'] === pair.id && 
    headers['x-ibm-client-secret'] === pair.secret
  );
  
  if (!isValidCredentials) {
    console.log("Invalid credentials attempt:");
    console.log("Provided client-id:", headers['x-ibm-client-id']);
    console.log("Provided client-secret:", headers['x-ibm-client-secret']);
    responseSendAndLog(req, res, 400, "Invalid credentials. Incorrect client id or client secret.");
    return false;
  }
  
  if (isNull(headers['content-type']) || typeof headers['content-type'] !== "string" || headers['content-type'] !== "application/json") {
    responseSendAndLog(req, res, 400, "Invalid content type. Must be 'application/json'.");
    return false;
  }
  return true;
}

function validateBody(req, res) {
  const body = req.body;
  if (isNull(body)) {
    responseSendAndLog(req, res, 400, "Request body cannot be empty. Please provide all required fields.");
    return false;
  }
  return true;
}

// Route
app.post('/barcodes/v1/ranges/:accountNumber', (req, res) => {
  const accountNumber = req.params.accountNumber;

  const body = req.body;
  
  if (!validateHeaders(req, res)) {
    return;
  }

  if (!validateBody(req, res)) {
    return;
  }
  
  if (!isValidAccountNumber(accountNumber)) {
    return responseSendAndLog(req, res, 400, `Invalid account number "${accountNumber}". Must be exactly 10 digits (0-9).`);
  }


  if (isNull(body.requestId) || !isGuid(body.requestId)) {
    return responseSendAndLog(req, res, 400, `Invalid requestId "${body.requestId}". Must be a valid GUID (UUID v4 format).`);
  }

  if (isNull(body.accessCode) || typeof body.accessCode !== "string" || !body.accessCode.startsWith("M")) {
    return responseSendAndLog(req, res, 400, `Invalid accessCode "${body.accessCode}". Must be a string starting with 'M'.`);
  }

  if (isNull(body.product) || typeof body.product !== "string" || body.product.length !== 3) {
    return responseSendAndLog(req, res, 400, `Invalid product "${body.product}". Must be a non-empty string of exactly 3 letters.`);
  }

  if (isNull(body.serviceOccurrence) || typeof body.serviceOccurrence !== "number") {
    return responseSendAndLog(req, res, 400, `Invalid serviceOccurrence "${body.serviceOccurrence}". Must be a number.`);
  }

  if (isNull(body.signatureFlag) || typeof body.signatureFlag !== "boolean") {
    return responseSendAndLog(req, res, 400, `Invalid signatureFlag "${body.signatureFlag}". Must be a boolean value (true or false).`);
  }

  if (isNull(body.postingLocation) || isNaN(Number(body.postingLocation))) {
    return responseSendAndLog(req, res, 400, `Invalid postingLocation "${body.postingLocation}". Must be a number (digits only).`);
  }

  // All validations passed, generate response
  const resjson = {
    requestId: body.requestId,
    barcodeRanges: [
      {
        prefix: getRandomPrefix(),
        ranges: getRandomRange()
      }
    ]
  };

  return responseSendAndLog(req, res, 200, resjson);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
