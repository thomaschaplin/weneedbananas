// Sequence diagram for /how-it-works: pairing through the relays, then catch-up and live edits over the direct
// channel. Mirrors src/lib/crypto.ts and src/lib/p2p.ts; keep the message names (sv, upd, pres) in step with them.

function Derive({ x }: { x: number }) {
  return (
    <g>
      <rect x={x - 75} y="136" width="150" height="32" rx="16" class="sd-chip" />
      <text x={x} y="156.5" text-anchor="middle" class="sd-chip-t">
        lemon.fork.bulb
      </text>
      <line x1={x} y1="168" x2={x} y2="186" class="sd-step" marker-end="url(#sd-am)" />
      <rect x={x - 75} y="188" width="150" height="44" rx="10" class="sd-box" />
      <text x={x} y="206" text-anchor="middle" class="sd-t sd-b">
        PBKDF2 · SHA-256
      </text>
      <text x={x} y="224" text-anchor="middle" class="sd-m">
        600,000 rounds
      </text>
      <line x1={x} y1="232" x2={x} y2="250" class="sd-step" marker-end="url(#sd-am)" />
      <rect x={x - 75} y="252" width="72" height="28" rx="8" class="sd-key" />
      <text x={x - 39} y="270.5" text-anchor="middle" class="sd-t sd-b sd-sm">
        room id
      </text>
      <rect x={x + 3} y="252" width="72" height="28" rx="8" class="sd-key" />
      <text x={x + 39} y="270.5" text-anchor="middle" class="sd-t sd-b sd-sm">
        password
      </text>
    </g>
  )
}

function Phase({ y, n, title }: { y: number; n: number; title: string }) {
  return (
    <g>
      <rect x="10" y={y} width="740" height="30" rx="10" class="sd-band" />
      <circle cx="30" cy={y + 15} r="10" class="sd-chip" />
      <text x="30" y={y + 19.5} text-anchor="middle" class="sd-band-n">
        {n}
      </text>
      <text x="48" y={y + 20} class="sd-t sd-b">
        {title}
      </text>
    </g>
  )
}

/** A message over the direct channel, labelled with its Trystero action name. */
function Msg({ y, from, to, name, label }: { y: number; from: number; to: number; name: string; label: string }) {
  return (
    <g>
      <line x1={from} y1={y} x2={to} y2={y} class="sd-p2p" marker-end="url(#sd-ag)" />
      <text x="380" y={y - 8} text-anchor="middle" class="sd-t">
        <tspan class="sd-mono">{name}</tspan> {label}
      </text>
    </g>
  )
}

export function SyncDiagram() {
  return (
    <figure class="sync-diagram">
      <p class="sd-swipe" aria-hidden="true">
        Swipe sideways to see the whole diagram →
      </p>
      <div class="sd-scroll">
        <svg
          viewBox="0 0 760 1010"
          role="img"
          aria-label="Both phones turn the words lemon.fork.bulb into a room id and password with PBKDF2, meet through Nostr relays using only the room id and an encrypted handshake, then open a direct WebRTC channel. Over that channel they swap state vectors and missing updates, share presence, and send each new edit straight across while saving it to IndexedDB."
        >
          <defs>
            <marker
              id="sd-am"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 0L10 5L0 10z" class="sd-ah-m" />
            </marker>
            <marker
              id="sd-ag"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 0L10 5L0 10z" class="sd-ah-g" />
            </marker>
          </defs>

          {/* lane heads */}
          <rect x="30" y="16" width="180" height="56" rx="14" class="sd-head" />
          <text x="120" y="40" text-anchor="middle" class="sd-t sd-b">
            Your phone
          </text>
          <text x="120" y="58" text-anchor="middle" class="sd-m">
            full copy of the list
          </text>
          <rect x="290" y="16" width="180" height="56" rx="14" class="sd-head" />
          <text x="380" y="40" text-anchor="middle" class="sd-t sd-b">
            Nostr relays
          </text>
          <text x="380" y="58" text-anchor="middle" class="sd-m">
            public · for introductions only
          </text>
          <rect x="550" y="16" width="180" height="56" rx="14" class="sd-head" />
          <text x="640" y="40" text-anchor="middle" class="sd-t sd-b">
            Their phone
          </text>
          <text x="640" y="58" text-anchor="middle" class="sd-m">
            full copy of the list
          </text>

          {/* lifelines; the relay's ends once the phones are connected */}
          <line x1="120" y1="72" x2="120" y2="990" class="sd-life" />
          <line x1="640" y1="72" x2="640" y2="990" class="sd-life" />
          <line x1="380" y1="72" x2="380" y2="418" class="sd-life" />
          <line x1="370" y1="418" x2="390" y2="418" class="sd-endcap" />
          <text x="398" y="422" class="sd-m">
            relays drop out
          </text>

          <Phase y={90} n={1} title="Pairing: meet up without ever sending the words" />
          <Derive x={120} />
          <Derive x={640} />
          <text x="380" y="198" text-anchor="middle" class="sd-m">
            same words in,
          </text>
          <text x="380" y="214" text-anchor="middle" class="sd-m">
            same room id + password out
          </text>

          <rect x="370" y="300" width="20" height="112" rx="6" class="sd-relay" />
          <polyline points="81,280 81,316 368,316" class="sd-sig" marker-end="url(#sd-am)" />
          <text x="225" y="308" text-anchor="middle" class="sd-m sd-mono-m">
            join room 3f9a…
          </text>
          <polyline points="601,280 601,316 392,316" class="sd-sig" marker-end="url(#sd-am)" />
          <text x="496" y="308" text-anchor="middle" class="sd-m sd-mono-m">
            join room 3f9a…
          </text>

          <line x1="122" y1="360" x2="368" y2="360" class="sd-sig" marker-end="url(#sd-am)" />
          <line x1="392" y1="360" x2="638" y2="360" class="sd-sig" marker-end="url(#sd-am)" />
          <text x="245" y="352" text-anchor="middle" class="sd-t">
            connection offer
          </text>
          <text x="515" y="352" text-anchor="middle" class="sd-m">
            sealed with password
          </text>
          <line x1="638" y1="398" x2="392" y2="398" class="sd-sig" marker-end="url(#sd-am)" />
          <line x1="368" y1="398" x2="122" y2="398" class="sd-sig" marker-end="url(#sd-am)" />
          <text x="515" y="390" text-anchor="middle" class="sd-t">
            connection answer
          </text>
          <text x="245" y="390" text-anchor="middle" class="sd-m">
            sealed with password
          </text>

          <line x1="126" y1="458" x2="634" y2="458" class="sd-pipe" />
          <text x="380" y="446" text-anchor="middle" class="sd-t sd-b sd-green">
            direct WebRTC data channel
          </text>
          <text x="380" y="479" text-anchor="middle" class="sd-m">
            encrypted, phone to phone
          </text>

          <Phase y={502} n={2} title="Catch up: each phone asks for exactly what it's missing" />
          <Msg y={570} from={122} to={636} name="sv" label="here's everything I've already got" />
          <Msg y={610} from={638} to={124} name="upd" label="the changes you don't have yet" />
          <Msg y={656} from={638} to={124} name="sv" label="here's everything I've already got" />
          <Msg y={696} from={122} to={636} name="upd" label="the changes you don't have yet" />
          <line
            x1="124"
            y1="742"
            x2="636"
            y2="742"
            class="sd-p2p"
            marker-start="url(#sd-ag)"
            marker-end="url(#sd-ag)"
          />
          <text x="380" y="734" text-anchor="middle" class="sd-t">
            <tspan class="sd-mono">pres</tspan> my name, and whether I'm at the shop
          </text>
          <text x="380" y="764" text-anchor="middle" class="sd-m">
            Both directions run at once. Offline edits from either side merge; nothing is overwritten.
          </text>

          <Phase y={786} n={3} title="Live: every edit goes straight across" />
          <rect x="45" y="834" width="150" height="34" rx="17" class="sd-chip" />
          <text x="120" y="855.5" text-anchor="middle" class="sd-t sd-b sd-on-chip">
            add “bananas x6”
          </text>
          <Msg y={851} from={197} to={561} name="upd" label="just that one change" />
          <rect x="565" y="834" width="150" height="34" rx="10" class="sd-box" />
          <text x="640" y="855.5" text-anchor="middle" class="sd-t sd-b">
            shows up for them
          </text>
          <line x1="120" y1="868" x2="120" y2="884" class="sd-p2p" marker-end="url(#sd-ag)" />
          <rect x="55" y="886" width="130" height="28" rx="8" class="sd-store" />
          <text x="120" y="904.5" text-anchor="middle" class="sd-t sd-sm">
            saved in IndexedDB
          </text>
          <line x1="640" y1="868" x2="640" y2="884" class="sd-p2p" marker-end="url(#sd-ag)" />
          <rect x="575" y="886" width="130" height="28" rx="8" class="sd-store" />
          <text x="640" y="904.5" text-anchor="middle" class="sd-t sd-sm">
            saved in IndexedDB
          </text>

          <rect x="45" y="934" width="150" height="44" rx="10" class="sd-box" />
          <text x="120" y="952" text-anchor="middle" class="sd-t sd-b">
            tab reopened or
          </text>
          <text x="120" y="968" text-anchor="middle" class="sd-t sd-b">
            back online
          </text>
          <line x1="197" y1="946" x2="636" y2="946" class="sd-p2p" marker-end="url(#sd-ag)" />
          <text x="415" y="938" text-anchor="middle" class="sd-t">
            <tspan class="sd-mono">sv</tspan> anything I missed while asleep?
          </text>
          <line x1="638" y1="972" x2="199" y2="972" class="sd-p2p" marker-end="url(#sd-ag)" />
          <text x="415" y="992" text-anchor="middle" class="sd-t">
            <tspan class="sd-mono">upd</tspan> here you go
          </text>
        </svg>
      </div>
      <figcaption>
        Dashed grey lines go through the public relays and carry only the scrambled room id and a sealed handshake.
        Solid green lines travel over the direct phone-to-phone channel. Separately, each phone leaves an encrypted copy
        of the list on the relays for phones that open it later (see below).
      </figcaption>
    </figure>
  )
}
