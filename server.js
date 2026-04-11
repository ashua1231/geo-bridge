import express from "express";
import crypto from "crypto";
import fetch from "node-fetch";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_SCOPES, APP_URL, PORT = 3000 } = process.env;

app.get("/", (req, res) => {
  const shop = req.query.shop;
  if (shop) return res.redirect(`/auth?shop=${shop}`);
  res.send(`<html><head><title>Geo Bridge</title></head><body><h1>Geo Bridge</h1><p>Geo Volume Discount app for 9shines label.</p></body></html>`);
});

app.get("/auth", (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).send("Missing shop parameter");
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${APP_URL}/auth/callback`;
  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SHOPIFY_SCOPES}&state=${state}&redirect_uri=${redirectUri}`;
  res.redirect(installUrl);
});

app.get("/auth/callback", async (req, res) => {
  const { shop, code, hmac } = req.query;
  const params = Object.entries(req.query).filter(([k]) => k !== "hmac").sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("&");
  const digest = crypto.createHmac("sha256", SHOPIFY_API_SECRET).update(params).digest("hex");
  if (digest !== hmac) return res.status(401).send("HMAC verification failed");

  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: SHOPIFY_API_KEY, client_secret: SHOPIFY_API_SECRET, code }),
  });
  const { access_token } = await tokenRes.json();
  if (!access_token) return res.status(500).send("Failed to obtain access token");

  console.log(`Installed on ${shop}`);
  await createGeoDiscount(shop, access_token);
  res.redirect(`https://${shop}/admin/apps`);
});

async function createGeoDiscount(shop, accessToken) {
  const fnRes = await fetch(`https://${shop}/admin/api/2026-04/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
    body: JSON.stringify({ query: `{ shopifyFunctions(first: 10) { nodes { id title } } }` }),
  });
  const fnData = await fnRes.json();
  const fn = (fnData?.data?.shopifyFunctions?.nodes || []).find(f => f.title === "geo-volume-discount");
  if (!fn) { console.error("Function not found"); return; }

  const discRes = await fetch(`https://${shop}/admin/api/2026-04/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
    body: JSON.stringify({
      query: `mutation CreateGeoDiscount($input: DiscountAutomaticAppInput!) {
        discountAutomaticAppCreate(automaticAppDiscount: $input) {
          automaticAppDiscount { discountId title status }
          userErrors { field message }
        }
      }`,
      variables: { input: { title: "Geo Volume Discount", functionId: fn.id, startsAt: new Date().toISOString(), combinesWith: { orderDiscounts: false, productDiscounts: false, shippingDiscounts: false } } },
    }),
  });
  const discData = await discRes.json();
  console.log("Discount result:", JSON.stringify(discData?.data?.discountAutomaticAppCreate));
}

app.listen(PORT, () => console.log(`Geo Bridge running on port ${PORT}`));
