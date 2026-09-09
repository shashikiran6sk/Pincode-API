# Postman Collection & Environments for India Pincode API

This folder contains pre-configured Postman resources to test and integrate the India Pincode API.

## Files

1. **`Pincode-API.postman_collection.json`**  
   The complete API collection containing 10 pre-configured requests with descriptions and expected responses.

2. **`Pincode-API.postman_environment.json`**  
   The Local Development environment pointing to `http://localhost:3000` with default development API key `pincode_dev_secret_key_12345`.

3. **`Pincode-API-Prod.postman_environment.json`**  
   Production environment template ready for your deployed domain and production API keys.

---

## How to Import into Postman

### Step 1: Import Collection & Environment
1. Open **Postman**.
2. Click the **Import** button in the top left.
3. Drag and drop both files:
   - `Pincode-API.postman_collection.json`
   - `Pincode-API.postman_environment.json`
4. Click **Import**.

### Step 2: Select Environment
1. In the top-right corner of Postman, open the environment dropdown.
2. Select **`Pincode API - Local Environment`**.

### Step 3: Run Requests
All requests in the collection automatically inherit:
- `{{baseUrl}}`
- Header `x-api-key: {{apiKey}}`

You can test:
- `1. Pincode Lookup (PostalPincode.in Format)` (e.g. 632006)
- `2. Pincode Lookup - Newly Carved District (Ranipet)` (632401)
- `3. Pincode Lookup - Newly Carved District (Tirupattur)` (635601)
- `4. Pincode Lookup - Telangana State (Hitec City)` (500081)
- `5. RESTful V1 Pincode with Delivery Filter`
- `6. Search Post Office by Name`
- `7. Cache Performance & Stats`
- `8. Health Check Probe`
- `9. Error Case - Missing API Key`
- `10. Error Case - Invalid Pincode Format`
