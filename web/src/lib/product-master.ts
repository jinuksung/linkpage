export type ProductMaster = {
  id: string;
  name: string;
  seedKeyword: string;
  priceAnchor: string;
  thumbAnchor: string;
  brand: string;
  modelNo: string;
  status: "active" | "inactive";
  updatedAt: string;
};

export const emptyProduct = (id: string): ProductMaster => ({
  id,
  name: "",
  seedKeyword: "",
  priceAnchor: "",
  thumbAnchor: "",
  brand: "",
  modelNo: "",
  status: "active",
  updatedAt: new Date().toISOString(),
});
