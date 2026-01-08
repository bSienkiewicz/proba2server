## How to run

Install NodeJS and all app dependencies:
```
npm install
node index.js
```
The server will start on port 3030.

---

### Example Request

POST `http://localhost:3030/barcodes/v1/ranges/1234567890`
```
{
  "requestId": "b73cfc80-0cb2-46bc-80ab-60aa9a79f1bf",
  "accessCode": "M1030",
  "product": "TPS",
  "serviceOccurrence": 1,
  "signatureFlag": false,
  "postingLocation": "9000581221"
}
```

### Notes:
- The account number in the URL must be exactly 10 digits.
- Everything that happens is logged in the console
- Each error case is logged under status 400.
