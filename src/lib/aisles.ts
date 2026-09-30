import { itemKey } from './parse'

export interface Aisle {
  id: string
  label: string
  icon: string
}

/** Default walking order through a typical supermarket. Each list can reorder these. */
export const AISLES: readonly Aisle[] = [
  { id: 'produce', label: 'Fruit & veg', icon: '🥦' },
  { id: 'bakery', label: 'Bakery', icon: '🥖' },
  { id: 'meat', label: 'Meat & fish', icon: '🥩' },
  { id: 'dairy', label: 'Dairy, eggs & chilled', icon: '🧀' },
  { id: 'cupboard', label: 'Food cupboard', icon: '🥫' },
  { id: 'world', label: 'World foods & spices', icon: '🌶️' },
  { id: 'snacks', label: 'Snacks & sweets', icon: '🍫' },
  { id: 'drinks', label: 'Drinks', icon: '🧃' },
  { id: 'frozen', label: 'Frozen', icon: '🧊' },
  { id: 'household', label: 'Household', icon: '🧽' },
  { id: 'health', label: 'Health & beauty', icon: '🧴' },
  { id: 'baby', label: 'Baby & pet', icon: '🐾' },
  { id: 'other', label: 'Everything else', icon: '🛒' },
]

export const AISLE_BY_ID: Record<string, Aisle> = Object.fromEntries(AISLES.map((a) => [a.id, a]))
export const DEFAULT_ORDER = AISLES.map((a) => a.id)

// Comma-separated entries; multi-word entries are phrases. Earlier aisles win ties,
// and PHRASE_WINS below settles the ambiguous ones explicitly.
const DICTIONARY: Record<string, string> = {
  produce: `apple, apricot, artichoke, asparagus, aubergine, avocado, banana, basil, beansprout,
    bean sprout, beetroot, beet, blackberry, blueberry, broccoli, brussels sprout, butternut squash,
    cabbage, cantaloupe, carrot, cauliflower, celeriac, celery, chard, cherry, cherry tomato, chilli,
    chili, chive, clementine, coriander, cilantro, corn on the cob, courgette, cranberry, cucumber,
    date, dill, edamame, eggplant, fennel, fig, garlic, ginger, grape, grapefruit, green bean, herb,
    kale, kiwi, leek, lemon, lemongrass, lettuce, lime, lychee, mandarin, mango, melon, mint,
    mushroom, nectarine, okra, onion, orange, pak choi, bok choy, papaya, parsley, parsnip,
    passion fruit, pea, pepper, bell pepper, pineapple, plum, pomegranate, potato, pumpkin, radish,
    raspberry, rhubarb, rocket, romaine, rosemary, salad, salad bag, satsuma, shallot, spinach,
    spring onion, scallion, squash, strawberry, sugar snap, swede, sweet potato, sweetcorn,
    tangerine, thyme, tomato, turnip, watercress, watermelon, yam, zucchini, jalapeno, berry,
    fruit, veg, vegetable, stir fry veg, pear, peach, blood orange, butternut, coriander, cress,
    beansprouts, runner bean, broad bean, mangetout, baby corn, new potato, baking potato,
    red onion, garlic bulb, ginger root, fresh herbs, flowers, bouquet`,
  bakery: `bagel, baguette, bap, bloomer, bread, brioche, bun, cake, ciabatta, crumpet, croissant,
    danish, doughnut, donut, english muffin, flatbread, focaccia, hot cross bun, loaf, muffin,
    naan, pain au chocolat, pastry, pitta, pita, roll, bread roll, scone, sourdough, teacake,
    tortilla, wrap, wholemeal, granary, cupcake, brownie, tart, pie, pork pie, sausage roll`,
  meat: `bacon, beef, brisket, burger, chicken, chicken breast, chicken thigh, chorizo, cod, duck,
    fish, gammon, haddock, ham, hake, lamb, lamb chop, mackerel, meatball, mince, minced beef,
    pork, pork chop, prawn, salmon, sausage, scampi, seabass, sea bass, shrimp, steak, turkey,
    veal, venison, salami, pepperoni, prosciutto, pancetta, pate, trout, crab, lobster, mussel,
    squid, clam, oyster, fillet, chicken wing, drumstick, rib, joint, kebab, smoked salmon, kipper`,
  dairy: `butter, buttermilk, cheddar, cheese, cottage cheese, cream, cream cheese, creme fraiche,
    custard, egg, feta, fromage frais, ghee, greek yogurt, halloumi, kefir, margarine, mascarpone,
    milk, mozzarella, oat milk, almond milk, soy milk, soya milk, parmesan, quark, ricotta, skyr,
    sour cream, spread, yogurt, yoghurt, brie, camembert, gouda, stilton, double cream,
    single cream, whipping cream, dip, hummus, houmous, guacamole, tzatziki, fresh pasta, gnocchi,
    ready meal, quiche, coleslaw, potato salad, pasta salad, scotch egg, sausage roll, tofu, tempeh, fresh soup, orange juice, smoothie, pesto, lunch`,
  cupboard: `baked bean, bean, black bean, chickpea, kidney bean, lentil, rice, pasta, spaghetti,
    penne, fusilli, lasagne, noodle, couscous, quinoa, bulgur, oat, porridge, cereal, granola,
    muesli, cornflake, weetabix, flour, plain flour, self raising flour, sugar, icing sugar,
    brown sugar, caster sugar, baking powder, bicarbonate of soda, yeast, cocoa, vanilla extract,
    honey, jam, marmalade, peanut butter, nutella, chocolate spread, syrup, golden syrup,
    maple syrup, ketchup, mayonnaise, mayo, mustard, vinegar, balsamic, oil, olive oil,
    vegetable oil, sunflower oil, stock, stock cube, gravy, salt, black pepper, tinned tomato,
    chopped tomato, passata, tomato puree, tuna, soup, coconut milk, sauce, pasta sauce,
    curry paste, soy sauce, worcestershire sauce, hot sauce, sriracha, pickle, olive, caper,
    chutney, relish, crispbread, cracker, oatcake, rice cake, stuffing, jelly, gelatine, nut,
    almond, walnut, cashew, peanut, pistachio, seed, raisin, sultana, dried fruit, breadcrumb,
    tea, tea bag, coffee, instant coffee, coffee bean, decaf, hot chocolate, herbal tea,
    peppermint tea, green tea, tin, tinned, sardine, anchovy, marmite, vegemite, bovril, spam,
    corned beef, gravy granule, crouton`,
  world: `cumin, paprika, turmeric, cinnamon, nutmeg, chilli powder, chilli flake, oregano,
    curry powder, garam masala, mixed herb, bay leaf, clove, cardamom, spice, harissa, tahini,
    miso, fish sauce, oyster sauce, hoisin, teriyaki, sweet chilli sauce, taco shell, taco kit,
    fajita kit, salsa, refried bean, rice noodle, udon, ramen, poppadom, mango chutney,
    tikka masala, korma, sushi rice, nori, wasabi, kimchi, coconut cream, jerk seasoning, taco,
    burrito, fajita, enchilada, tortilla wrap`,
  snacks: `biscuit, chocolate, crisp, chips, sweet, sweets, candy, popcorn, pretzel, snack,
    cereal bar, protein bar, flapjack, gum, chewing gum, haribo, jelly bean, tortilla chip, nachos,
    doritos, pringles, digestive, rich tea, hobnob, shortbread, wafer, marshmallow, cookie,
    dark chocolate, milk chocolate`,
  drinks: `water, sparkling water, still water, squash, cordial, cola, coke, diet coke, pepsi,
    lemonade, soda, tonic, tonic water, ginger beer, energy drink, lucozade, beer, lager, ale,
    cider, wine, red wine, white wine, rose, prosecco, champagne, gin, vodka, whisky, whiskey,
    rum, tequila, kombucha, iced tea, fizzy drink, juice, apple juice`,
  frozen: `ice cream, frozen pea, frozen chip, oven chip, chip, fish finger, chicken nugget,
    nugget, frozen pizza, pizza, frozen berry, frozen fruit, frozen veg, ice lolly, lolly, ice,
    ice cube, frozen prawn, waffle, hash brown, yorkshire pudding, sorbet, gelato, frozen spinach,
    potato wedge, garlic bread`,
  household: `bin bag, bin liner, bleach, dishwasher tablet, dishwasher salt, rinse aid,
    washing up liquid, fairy liquid, sponge, scourer, cloth, kitchen roll, kitchen towel,
    paper towel, toilet roll, toilet paper, loo roll, foil, tin foil, cling film, clingfilm,
    baking paper, freezer bag, sandwich bag, laundry detergent, washing powder, washing liquid,
    washing pod, fabric conditioner, softener, stain remover, surface spray, cleaner,
    disinfectant, glass cleaner, polish, air freshener, candle, battery, light bulb, bulb, match,
    lighter, charcoal, firelighter, rubber glove, glove, bucket, duster, hoover bag, vacuum bag,
    tape, string, napkin, straw, cocktail stick, toothpick`,
  health: `shampoo, conditioner, soap, hand soap, hand wash, body wash, shower gel, toothpaste,
    toothbrush, floss, mouthwash, deodorant, razor, shaving foam, shaving gel, moisturiser,
    moisturizer, lotion, sun cream, suncream, sunscreen, lip balm, makeup, mascara, nail varnish,
    cotton wool, cotton bud, tampon, sanitary pad, panty liner, paracetamol, ibuprofen, aspirin,
    painkiller, vitamin, plaster, antihistamine, cough syrup, lemsip, hair dye, hair gel,
    hairspray, tissue, contact lens solution, condom, face wash, cleanser`,
  baby: `nappy, nappies, diaper, baby wipe, wipe, baby food, formula, baby milk, rusk, dog food,
    cat food, cat litter, litter, pet food, dog treat, cat treat, dog biscuit, bird seed,
    fish food, poo bag, flea treatment`,
}

// keyword -> aisle, keyed by the same normalisation as items.
const KEYWORDS: Map<string, string> = new Map()
for (const [aisle, list] of Object.entries(DICTIONARY)) {
  for (const entry of list.split(',')) {
    const key = itemKey(entry)
    if (key && !KEYWORDS.has(key)) KEYWORDS.set(key, aisle)
  }
}

/** Entries that appear in more than one aisle above; the right answer is set here. */
const PHRASE_WINS: Record<string, string> = {
  chip: 'frozen',
  pepper: 'produce',
  'orange juice': 'dairy',
  juice: 'drinks',
  squash: 'produce',
  'rice cake': 'cupboard',
  'coconut milk': 'cupboard',
  'garlic bread': 'frozen',
  plaster: 'health',
  tortilla: 'bakery',
  cookie: 'snacks',
  syrup: 'cupboard',
  'cough syrup': 'health',
}
for (const [k, v] of Object.entries(PHRASE_WINS)) KEYWORDS.set(itemKey(k), v)

/**
 * Guess the aisle for an item name. The longest known phrase wins ("ice cream" →
 * frozen, not dairy); among equal lengths the later one wins, because the last
 * word is usually the head noun ("chocolate milk" → milk → dairy).
 */
export function categorise(name: string): string {
  const words = itemKey(name).split(' ').filter(Boolean)
  if (words.length === 0) return 'other'
  // Longest phrase wins; among equal lengths prefer the one ending later (head noun).
  for (let len = Math.min(4, words.length); len >= 1; len--) {
    for (let start = words.length - len; start >= 0; start--) {
      const hit = KEYWORDS.get(words.slice(start, start + len).join(' '))
      if (hit) return hit
    }
  }
  return 'other'
}
