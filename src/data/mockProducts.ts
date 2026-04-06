import type { Product } from '~/db/db';

export const MOCK_CATEGORIES = ["Kopi", "Non-Kopi", "Makanan", "Cemilan"];

export const MOCK_PRODUCTS: Partial<Product>[] = [
  { 
    id: "p1", 
    name: "Americano", 
    price: 15000, 
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=400&fit=crop", 
    category: "Kopi", 
    stock: 50,
    variants: [
      {
        id: "vg1",
        name: "Level Gula",
        isRequired: true,
        type: "SINGLE",
        options: [
           { name: "Normal (100%)", priceModifier: 0 },
           { name: "Less Sugar (50%)", priceModifier: 0 },
           { name: "No Sugar", priceModifier: 0 }
        ]
      },
      {
        id: "vg2",
        name: "Ekstra Shot (Opsional)",
        isRequired: false,
        type: "SINGLE",
        options: [
           { name: "Tambah 1 Shot", priceModifier: 5000 },
           { name: "Tambah 2 Shot", priceModifier: 10000 }
        ]
      }
    ]
  },
  { 
    id: "p2", 
    name: "Cafe Latte", 
    price: 20000, 
    image: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=400&h=400&fit=crop", 
    category: "Kopi", 
    stock: 45,
    variants: [
      {
        id: "vg3",
        name: "Pilihan Susu",
        isRequired: true,
        type: "SINGLE",
        options: [
          { name: "Susu Normal (Dairy)", priceModifier: 0 },
          { name: "Oat Milk", priceModifier: 8000 },
          { name: "Almond Milk", priceModifier: 8000 }
        ]
      }
    ]
  },
  { id: "p3", name: "Es Kopi Susu", price: 18000, image: "https://images.unsplash.com/photo-1595861111075-8012bb4d0f62?w=400&h=400&fit=crop", category: "Kopi", stock: 100 },
  { 
    id: "p4", 
    name: "Teh Leci", 
    price: 16000, 
    image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop", 
    category: "Non-Kopi", 
    stock: 30,
    variants: [
      {
        id: "vg4",
        name: "Toping Tambahan",
        isRequired: false,
        type: "MULTIPLE",
        options: [
          { name: "Nata de Coco", priceModifier: 3000 },
          { name: "Boba", priceModifier: 4000 },
          { name: "Leci Segar", priceModifier: 5000 }
        ]
      }
    ]
  },
  { id: "p5", name: "Croissant", price: 22000, image: "https://images.unsplash.com/photo-1555507036-ab1e4006aaeb?w=400&h=400&fit=crop", category: "Makanan", stock: 15 },
  { id: "p6", name: "Kentang Goreng", price: 15000, image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=400&h=400&fit=crop", category: "Cemilan", stock: 25 },
];
