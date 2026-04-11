const TIERS = [
  { minQty: 5, percentage: 10.0, title: "US 5+ items: 10% off" },
  { minQty: 3, percentage: 7.5,  title: "US 3 items: 7.5% off" },
  { minQty: 2, percentage: 5.0,  title: "US 2 items: 5% off"   },
];

export function cartDeliveryOptionsDiscountsGenerateRun(input) {
  const geoAttr = input.cart.attribute;
  const geoCountry = geoAttr ? geoAttr.value : null;
  const discountClasses = input.discount?.discountClasses ?? [];

  if (geoCountry !== 'US' || !discountClasses.includes('SHIPPING')) {
    return { operations: [] };
  }

  const totalQty = input.cart.lines.reduce(
    (sum, line) => sum + line.quantity, 0
  );

  const tier = TIERS.find(t => totalQty >= t.minQty);

  if (!tier) {
    return { operations: [] };
  }

  const targets = input.cart.deliveryGroups.map((group) => ({
    deliveryGroup: { id: group.id }
  }));

  if (targets.length === 0) {
    return { operations: [] };
  }

  return {
    operations: [
      {
        deliveryDiscountsAdd: {
          candidates: [
            {
              message: tier.title,
              targets,
              value: {
                percentage: {
                  value: tier.percentage
                }
              }
            }
          ],
          selectionStrategy: 'ALL'
        }
      }
    ]
  };
}
