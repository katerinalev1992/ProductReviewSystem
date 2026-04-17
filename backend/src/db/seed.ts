import { db, initializeDatabase } from './client.js';

initializeDatabase();

db.exec('DELETE FROM reviews; DELETE FROM products;');

const insertProduct = db.prepare(`
  INSERT INTO products (name, description, price, image_url)
  VALUES (@name, @description, @price, @image_url)
`);

const insertReview = db.prepare(`
  INSERT INTO reviews (product_id, author_name, title, content, rating, helpful_count, created_at)
  VALUES (@product_id, @author_name, @title, @content, @rating, @helpful_count, @created_at)
`);

const products = [
  {
    name: 'Mechanical Keyboard Pro 87',
    description: 'Compact mechanical keyboard with tactile switches, hot-swap support and white backlight.',
    price: 119.99,
    image_url: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'Noise-Cancelling Headphones X2',
    description: 'Wireless over-ear headphones with active noise cancellation and 35-hour battery life.',
    price: 249.0,
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: '4K Monitor 27 UltraView',
    description: '27-inch 4K IPS monitor ideal for productivity and content creation.',
    price: 389.5,
    image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80'
  }
];

const productIds = products.map((product) => Number(insertProduct.run(product).lastInsertRowid));

const now = new Date();
const isoMinusDays = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();

const reviews = [
  {
    product_id: productIds[0],
    author_name: 'Alice',
    title: 'Perfect for coding sessions',
    content: 'The typing feel is excellent and the compact layout saves desk space.',
    rating: 5,
    helpful_count: 8,
    created_at: isoMinusDays(2)
  },
  {
    product_id: productIds[0],
    author_name: 'Martin',
    title: 'Great value, slightly loud',
    content: 'Build quality is strong. I would not use it in a very quiet shared office though.',
    rating: 4,
    helpful_count: 3,
    created_at: isoMinusDays(10)
  },
  {
    product_id: productIds[1],
    author_name: 'Sofia',
    title: 'Noise cancelling works really well',
    content: 'Battery lasts long and the fit is comfortable even on long flights.',
    rating: 5,
    helpful_count: 11,
    created_at: isoMinusDays(1)
  },
  {
    product_id: productIds[1],
    author_name: 'Tom',
    title: 'Good sound, average microphone',
    content: 'Music playback is excellent but the call microphone could be better.',
    rating: 4,
    helpful_count: 2,
    created_at: isoMinusDays(7)
  },
  {
    product_id: productIds[2],
    author_name: 'Eva',
    title: 'Sharp image and nice colors',
    content: 'Very good display for spreadsheets and light photo editing. Stand could be more flexible.',
    rating: 4,
    helpful_count: 4,
    created_at: isoMinusDays(4)
  }
];

for (const review of reviews) {
  insertReview.run(review);
}

console.log('Database seeded successfully.');
