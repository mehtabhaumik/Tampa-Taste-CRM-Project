import { MenuItem, Table } from './types';

export const INITIAL_MENU: MenuItem[] = [
  {
    id: '1',
    name: 'Tampa Bay Crab Cakes',
    description: 'Fresh local crab with spicy remoulade and microgreens.',
    price: 18.50,
    category: 'Appetizer',
    available: true,
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c170db76?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '2',
    name: 'Ybor City Cuban Sandwich',
    description: 'Traditional slow-roasted pork, ham, Swiss, pickles, and mustard on authentic Cuban bread.',
    price: 14.95,
    category: 'Main',
    available: true,
    image: 'https://images.unsplash.com/photo-1550507992-eb63ffee0847?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '3',
    name: 'Gulf Coast Grouper',
    description: 'Pan-seared grouper with citrus butter and seasonal vegetables.',
    price: 32.00,
    category: 'Main',
    available: true,
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '4',
    name: 'Key Lime Pie',
    description: 'Tart and creamy with a graham cracker crust and whipped cream.',
    price: 9.50,
    category: 'Dessert',
    available: true,
    image: 'https://images.unsplash.com/photo-1535927844976-703a21c2e50f?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '5',
    name: 'Sunshine State Mojito',
    description: 'Fresh mint, lime, and local rum with a splash of orange juice.',
    price: 12.00,
    category: 'Drink',
    available: true,
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '6',
    name: 'Everglades Gator Bites',
    description: 'Crispy fried alligator tail, spicy remoulade, and pickled jalapeños.',
    price: 15.50,
    category: 'Appetizer',
    available: true,
    image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '7',
    name: 'Bayshore Shrimp Tacos',
    description: 'Grilled gulf shrimp, cabbage slaw, chipotle crema, and fresh lime on corn tortillas.',
    price: 19.00,
    category: 'Main',
    available: true,
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '8',
    name: 'Citrus Glazed Salmon',
    description: 'Pan-seared salmon with an orange-honey glaze, roasted asparagus, and quinoa.',
    price: 28.00,
    category: 'Main',
    available: true,
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '9',
    name: 'St. Pete Strawberry Shortcake',
    description: 'Plant City strawberries, buttermilk biscuit, and vanilla bean whipped cream.',
    price: 10.50,
    category: 'Dessert',
    available: true,
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '10',
    name: 'Gasparilla Rum Punch',
    description: 'Dark and light rums, pineapple juice, orange juice, and a hint of nutmeg.',
    price: 14.00,
    category: 'Drink',
    available: true,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '11',
    name: 'Palma Ceia Pasta',
    description: 'Linguine with sun-dried tomatoes, artichokes, and a light lemon garlic butter sauce.',
    price: 22.00,
    category: 'Main',
    available: true,
    image: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '12',
    name: 'Hyde Park Burger',
    description: 'Wagyu beef, caramelized onions, truffle aioli, and aged cheddar on a brioche bun.',
    price: 21.00,
    category: 'Main',
    available: true,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '13',
    name: 'Channel District Ceviche',
    description: 'Scallops and shrimp marinated in lime juice with red onion, cilantro, and avocado.',
    price: 17.00,
    category: 'Appetizer',
    available: true,
    image: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '14',
    name: 'Tampa Bay Sunset Martini',
    description: 'Vodka, peach schnapps, cranberry juice, and a splash of orange juice.',
    price: 13.00,
    category: 'Drink',
    available: true,
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '15',
    name: 'Ybor Espresso Martini',
    description: 'Freshly brewed Cuban espresso, vodka, and coffee liqueur.',
    price: 15.00,
    category: 'Drink',
    available: true,
    image: 'https://images.unsplash.com/photo-1545438102-799c3991ffb2?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '16',
    name: 'Seminole Heights Salad',
    description: 'Mixed greens, roasted beets, goat cheese, and candied pecans with a citrus vinaigrette.',
    price: 16.00,
    category: 'Main',
    available: true,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '17',
    name: 'Westshore Wings',
    description: 'Crispy wings tossed in our signature honey-habanero sauce, served with blue cheese dressing.',
    price: 14.00,
    category: 'Appetizer',
    available: true,
    image: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '18',
    name: 'Davis Islands Deviled Eggs',
    description: 'Creamy yolk filling topped with crispy bacon bits and a dash of paprika.',
    price: 12.00,
    category: 'Appetizer',
    available: true,
    image: 'https://images.unsplash.com/photo-1594968973184-9140fa307723?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '19',
    name: 'Riverwalk Risotto',
    description: 'Creamy arborio rice with wild mushrooms, parmesan cheese, and a drizzle of truffle oil.',
    price: 24.00,
    category: 'Main',
    available: true,
    image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '20',
    name: 'Armature Works Apple Tart',
    description: 'Warm apple tart with a flaky crust, served with a scoop of vanilla bean ice cream.',
    price: 11.00,
    category: 'Dessert',
    available: true,
    image: 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '21',
    name: 'Curtis Hixon Cosmo',
    description: 'Vodka, triple sec, cranberry juice, and fresh lime juice, shaken and served chilled.',
    price: 13.50,
    category: 'Drink',
    available: true,
    image: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '22',
    name: 'SoHo Steak Frites',
    description: 'Grilled hanger steak with garlic herb butter, served with crispy shoestring fries.',
    price: 34.00,
    category: 'Main',
    available: true,
    image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '23',
    name: 'Bayshore Berry Blast',
    description: 'A refreshing blend of strawberries, blueberries, and raspberries with a hint of mint.',
    price: 9.00,
    category: 'Drink',
    available: true,
    image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '24',
    name: 'Florida Avenue Flatbread',
    description: 'Thin crust flatbread topped with roasted garlic, spinach, feta, and balsamic glaze.',
    price: 15.00,
    category: 'Appetizer',
    available: true,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '25',
    name: 'Lowry Park Lemonade',
    description: 'Freshly squeezed lemonade with a hint of lavender and a splash of soda water.',
    price: 7.50,
    category: 'Drink',
    available: true,
    image: 'https://images.unsplash.com/photo-1536939459926-301728717817?auto=format&fit=crop&q=80&w=800'
  }
];

export const TABLES: Table[] = [
  { number: 1, capacity: 2, status: 'Available' },
  { number: 2, capacity: 2, status: 'Available' },
  { number: 3, capacity: 4, status: 'Available' },
  { number: 4, capacity: 4, status: 'Available' },
  { number: 5, capacity: 6, status: 'Available' },
  { number: 6, capacity: 8, status: 'Available' },
  { number: 7, capacity: 4, status: 'Available' },
  { number: 8, capacity: 2, status: 'Available' },
];
