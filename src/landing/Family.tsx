import { FAMILY } from '../guides'
import { GuidePage } from './Guide'

export function Family() {
  return (
    <GuidePage
      guide={FAMILY}
      lede="For families, flatmates and couples: one list everyone adds to, sorted by aisle, with no accounts to set up."
    >
      <h2>One list for the whole house</h2>
      <p>
        Start a list and share its three words with everyone you live with. Whoever runs out of something adds it, from
        any phone, whenever they notice. No more "we need bananas" shouted up the stairs, or three people buying milk.
      </p>
      <p>
        Every phone keeps its own copy, so the list opens instantly and works with no signal. Edits from different
        people merge automatically, even if someone was offline when they made them.
      </p>

      <h2>See when someone's at the shop</h2>
      <p>
        When someone switches on shop mode, everyone else with the list open sees who's shopping. That's the moment to
        add the thing you just remembered. Set your name in the list so the others know it's you.
      </p>
      <p>
        Shop mode keeps the screen awake, gives you big one-thumb tick targets and shows how many things are left. Tap
        "Couldn't find it" for anything out of stock and it stays on the list for next time.
      </p>

      <h2>Sorted by aisle</h2>
      <p>
        Items group themselves into aisles as they're added: fruit & veg, bakery, dairy, frozen and so on. Put the
        aisles in the order you walk round your usual shop and that order is shared with everyone on the list, so
        whoever goes does it in one lap.
      </p>

      <h2>Your usuals, one tap</h2>
      <p>
        Things the house buys often come back as quick-add chips, shared by everyone on the list. Quantities are
        understood too: "2 pints milk", "500g mince", "bananas x6". Add eggs twice and you get one line with the total,
        not two.
      </p>

      <h2>Good to know</h2>
      <ul>
        <li>There are no notifications. Open the list to see what's new.</li>
        <li>Anyone with the three words can open the list, so treat them like a door code.</li>
        <li>You can have as many lists as you like, for example one for the big shop and one for the corner shop.</li>
      </ul>
      <p>
        Curious how it syncs without a server? <a href="/how-it-works">Here's how it works</a>.
      </p>
    </GuidePage>
  )
}
