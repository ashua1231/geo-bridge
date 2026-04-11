import { OrderDiscountSelectionStrategy } from "../generated/api";

const TIERS = [
  { minQty: 5, percentage: 10, title: "US 5+ items: 10% off" },
  { minQty: 3, percentage: 7.5, title: "US 3 items: 7.5% off" },
  { minQty: 2, percentage: 5, title: "US 2 items: 5% off" },
];

export function cartLinesDiscountsGenerateRun(input) {
  const geoAttr = input.cart.attribute;
  const geoCountry = geoAttr ? geoAttr.value : null;
  const discountClasses = input.discount?.discountClasses ?? [];

  if (geoCountry !== "US" || !discountClasses.includes("ORDER")) {
    return { operations: [] };
  }

  const totalQty = input.cart.lines.reduce(
    (sum, line) => sum + line.quantity, 0
  );

  const tier = TIERS.find(t => totalQty >= t.minQty);

  if (!tier) {
    return { operations: [] };
  }

  return {
    operations: [{
      orderDiscountsAdd: {
        candidates: [{
          message: tier.title,
          targets: [{ orderSubtotal: { excludedCartLineIds: [] } }],
          value: { percentage: { value: tier.percentage } },
        }],
        selectionStrategy: OrderDiscountSelectionStrategy.First,
      },
    }],
  };
}
