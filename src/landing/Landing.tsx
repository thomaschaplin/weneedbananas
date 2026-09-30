import { FAQ } from '../content'
import { Page } from './Layout'
import { StartJoin } from './StartJoin'

const FEATURES = [
  {
    icon: '🗺️',
    title: 'Sorted in aisle order',
    text: 'Fruit & veg, bakery, dairy, frozen… Items group themselves in the order you walk the shop, so you do it in one lap. Reorder aisles to match your shop.',
  },
  {
    icon: '🧮',
    title: 'Understands quantities',
    text: '"2 pints milk", "500g mince", "bananas x6". Add 6 eggs twice and you get 12 eggs, not two lines of eggs.',
  },
  {
    icon: '🛒',
    title: 'Shop mode',
    text: 'Big one-thumb targets, the screen stays awake, and a tick sends things to the bottom of their aisle. "7 left" tells you how close you are.',
  },
  {
    icon: '🤷',
    title: '"Couldn\'t find it"',
    text: 'Out of stock? Mark it and it stays on the list for next time instead of vanishing with the things you bought.',
  },
  {
    icon: '👀',
    title: "See who's at the shop",
    text: 'When someone switches on shop mode, everyone else sees it: the perfect moment to add the thing you just remembered.',
  },
  {
    icon: '⚡',
    title: 'Your usuals, one tap',
    text: 'Things you buy often come back as quick-add chips. Paste a whole recipe list and it splits into items.',
  },
]

export function Landing() {
  return (
    <Page>
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Free · no signup · works offline</p>
          <h1>
            The shopping list you share with <span class="hl">three words</span>.
          </h1>
          <p class="lede">
            Start a list, send <code>lemon.fork.bulb</code> to whoever you shop with, and add things the moment you
            remember them. At the shop it sorts itself by aisle.
          </p>
          <StartJoin />
        </div>
        <ListPreview />
      </section>

      <section class="features" aria-labelledby="features-h">
        <h2 id="features-h">Built for the shop, not your to-do list</h2>
        <div class="feature-grid">
          {FEATURES.map((f) => (
            <article class="feature" key={f.title}>
              <span class="feature-icon" aria-hidden="true">
                {f.icon}
              </span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section class="steps" aria-labelledby="steps-h">
        <h2 id="steps-h">How it works</h2>
        <ol>
          <li>
            <strong>Start a list.</strong> You get three random words, like <code>cheese.dog.spoon</code>. That's the
            list's name and its key.
          </li>
          <li>
            <strong>Share the words.</strong> Say them out loud, text the link or show the QR code. Anyone with the
            words is on the list. No accounts.
          </li>
          <li>
            <strong>Add from anywhere, tick off in the shop.</strong> Every phone keeps its own copy, and copies sync
            directly with each other whenever they're open at the same time.
          </li>
        </ol>
        <p>
          <a href="/how-it-works">More on how sync works with no server →</a>
        </p>
      </section>

      <section class="faq" aria-labelledby="faq-h">
        <h2 id="faq-h">Questions</h2>
        {FAQ.map((f) => (
          <details key={f.q}>
            <summary>
              <h3>{f.q}</h3>
            </summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>
    </Page>
  )
}

function ListPreview() {
  const rows: [string, string, [string, string, boolean][]][] = [
    [
      '🥦',
      'Fruit & veg',
      [
        ['Bananas', '6', true],
        ['Garlic', '', false],
        ['Spinach', '1 bag', false],
      ],
    ],
    ['🥖', 'Bakery', [['Sourdough', '', false]]],
    [
      '🧀',
      'Dairy, eggs & chilled',
      [
        ['Milk', '2 pints', false],
        ['Eggs', 'free range', false],
      ],
    ],
  ]
  return (
    <figure class="preview" aria-label="Example list sorted by aisle">
      <div class="preview-bar">
        <span class="slug">lemon.fork.bulb</span>
        <span class="live">● Live with 1</span>
      </div>
      <div class="preview-shopping">🛒 Sam is at the shop</div>
      {rows.map(([icon, label, items]) => (
        <div class="preview-aisle" key={label}>
          <div class="preview-aisle-h">
            <span aria-hidden="true">{icon}</span> {label}
          </div>
          {items.map(([name, qty, done]) => (
            <div class={`preview-item${done ? ' done' : ''}`} key={name}>
              <span class="tick" aria-hidden="true">
                {done ? '✓' : ''}
              </span>
              <span class="name">{name}</span>
              {qty && <span class="qty">{qty}</span>}
            </div>
          ))}
        </div>
      ))}
      <figcaption class="sr-only">A shared list sorted into aisles, with someone currently at the shop.</figcaption>
    </figure>
  )
}
