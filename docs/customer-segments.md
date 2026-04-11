# Customer Segments Plan

This project already applies real-time geo discounts in checkout using the cart
attribute `geo_type`. Customer segments solve a different problem: they let
Shopify group known customers in Admin for marketing, saved searches, and
segment-targeted discounts.

## What Phase 8 should do

Use Shopify customer segments for persistent audience grouping such as:

- international customers
- domestic customers
- international repeat buyers

## Important constraint

The current app is extension-only. It has no backend service that writes
persistent customer data yet.

That means:

- the checkout discount function can use `cart.attribute(key: "geo_type")`
- customer segments cannot use cart attributes directly
- customer segments must be based on customer data that Shopify already stores,
  such as `customer_countries`, `number_of_orders`, and `customer_tags`

## Recommended rollout

### Option A: Native country-based segments

Use this first if "international" means "customer country is not our home
market". This requires no extra backend.

Replace `HOME_COUNTRY_CODE` with your domestic country code, for example `IN`,
`US`, or `GB`.

- Domestic customers:
  `customer_countries CONTAINS 'HOME_COUNTRY_CODE'`
- International customers:
  `customer_countries NOT CONTAINS 'HOME_COUNTRY_CODE'`
- International repeat customers:
  `customer_countries NOT CONTAINS 'HOME_COUNTRY_CODE' AND number_of_orders >= 1`

### Option B: App-managed tag-based segments

Use this if your geo rules are more specific than a saved customer country,
or if you want your segment definitions to mirror the same logic as the
geo-detection pipeline.

Suggested tags:

- `geo_domestic`
- `geo_international`

Suggested segment queries:

- Domestic customers:
  `customer_tags CONTAINS 'geo_domestic'`
- International customers:
  `customer_tags CONTAINS 'geo_international'`
- International repeat customers:
  `customer_tags CONTAINS 'geo_international' AND number_of_orders >= 1`

## Recommendation for this project

Start with Option A if your domestic market is one country and you want to move
fast in Shopify Admin.

Move to Option B only if:

- your visitor-geo logic is more complex than customer country
- you want segments to follow app-defined classification exactly
- you later add a webhook or backend job that tags customers after checkout or
  login

## How this connects to Phase 7

Phase 7:

- applies checkout discounts in real time
- works for anonymous visitors
- reads `geo_type` from the cart

Phase 8:

- groups known customers in Shopify Admin
- works for marketing and segment-based discount targeting
- should not replace the checkout function

## Next implementation choices

If we keep this repo extension-only, the next practical step is:

1. create the customer segments in Shopify Admin using the GraphQL templates in
   `graphql/customer-segments.graphql`
2. validate the returned segment IDs
3. decide whether those segment IDs should be used in a separate segment-based
   Shopify discount

If you want app-managed tag-based segments later, the next build step after this
repo would be a small backend or webhook worker that updates customer tags.
