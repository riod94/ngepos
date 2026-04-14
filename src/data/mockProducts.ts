import type { Product } from '~/db/db';

export const MOCK_CATEGORIES = ["Kopi", "Non-Kopi", "Makanan", "Cemilan"];

// Catatan: image dikosongkan agar ProductImage component render gradient
// placeholder lokal — menghindari request ke internet saat first load.
export const MOCK_PRODUCTS: Partial<Product>[] = [
  {
    id: "p1",
    name: "Americano",
    price: 15000,
    image: "",
    category: "Kopi",
    stock: 50,
    variants: [
      {
        id: "vg1",
        name: "Level Gula",
        isRequired: true,
        type: "SINGLE",
        options: [
          { name: "Normal (100%)", priceModifier: 0, cogsModifier: 0 },
          { name: "Less Sugar (50%)", priceModifier: 0, cogsModifier: 0 },
          { name: "No Sugar", priceModifier: 0, cogsModifier: 0 }
        ]
      },
      {
        id: "vg2",
        name: "Ekstra Shot (Opsional)",
        isRequired: false,
        type: "SINGLE",
        options: [
          { name: "Tambah 1 Shot", priceModifier: 5000, cogsModifier: 0 },
          { name: "Tambah 2 Shot", priceModifier: 10000, cogsModifier: 0 }
        ]
      }
    ]
  },
  {
    id: "p2",
    name: "Cafe Latte",
    price: 20000,
    image: "",
    category: "Kopi",
    stock: 45,
    variants: [
      {
        id: "vg3",
        name: "Pilihan Susu",
        isRequired: true,
        type: "SINGLE",
        options: [
          { name: "Susu Normal (Dairy)", priceModifier: 0, cogsModifier: 0 },
          { name: "Oat Milk", priceModifier: 8000, cogsModifier: 0 },
          { name: "Almond Milk", priceModifier: 8000, cogsModifier: 0 }
        ]
      }
    ]
  },
  { id: "p3", name: "Es Kopi Susu", price: 18000, image: "", category: "Kopi", stock: 100 },
  {
    id: "p4",
    name: "Teh Leci",
    price: 16000,
    image: "",
    category: "Non-Kopi",
    stock: 30,
    variants: [
      {
        id: "vg4",
        name: "Toping Tambahan",
        isRequired: false,
        type: "MULTIPLE",
        options: [
          { name: "Nata de Coco", priceModifier: 3000, cogsModifier: 0 },
          { name: "Boba", priceModifier: 4000, cogsModifier: 0 },
          { name: "Leci Segar", priceModifier: 5000, cogsModifier: 0 }
        ]
      }
    ]
  },
  { id: "p5", name: "Croissant", price: 22000, image: "", category: "Makanan", stock: 15 },
  { id: "p6", name: "Kentang Goreng", price: 15000, image: "", category: "Cemilan", stock: 25 },
];
