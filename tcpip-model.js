const LAYERS = {
    app: {
        name: "Application Layer",
        num: "Layer 4",
        color: "var(--app)",
        badge: "USER-FACING",
        desc: `The Application Layer is where user-facing protocols live. When you open a browser and type a URL, your browser uses HTTP (or HTTPS) to request a webpage. This layer deals with <em>what</em> data is exchanged and its meaning — not how it travels.`,
        desc2: `It abstracts all lower-level complexity. Applications don't care whether data travels over Wi-Fi or fiber — they just make requests and receive responses.`,
        protocols: [
            {
                name: "HTTP",
                title: "Hypertext Transfer Protocol | on port 80",
            },
            {
                name: "HTTPS",
                title: "Hypertext Transfer Protocol Secure | on port 443",
            },
            {
                name: "DNS",
                title: "Domain Name System | on port 53",
            },
            {
                name: "FTP",
                title: "File Transfer Protocol | on port 21",
            },
            {
                name: "SMTP",
                title: "Simple Mail Transfer Protocol | on port 25",
            },
            {
                name: "SSH",
                title: "Secure Shell | on port 22",
            },
            {
                name: "DHCP",
                title: "Dynamic Host Configuration Protocol | on port 67",
            },
        ],
        pdu: "PDU: <strong>Message / Data</strong>",
    },
    trans: {
        name: "Transport Layer",
        num: "Layer 3",
        color: "var(--trans)",
        badge: "END-TO-END",
        desc: `The Transport Layer is responsible for end-to-end communication between applications. It takes the message from the Application layer and splits it into <strong>segments</strong>. Each segment gets a source and destination <em>port number</em>.`,
        desc2: `TCP (Transmission Control Protocol) provides <strong>reliable, ordered</strong> delivery with error correction. UDP (User Datagram Protocol) is faster but unreliable — perfect for streaming or games.`,
        protocols: ["TCP", "UDP", "TLS", "QUIC"],
        pdu: "PDU: <strong>Segment (TCP) / Datagram (UDP)</strong>",
    },
    inet: {
        name: "Internet Layer",
        num: "Layer 2",
        color: "var(--inet)",
        badge: "ROUTING",
        desc: `The Internet Layer handles <strong>logical addressing and routing</strong>. It wraps segments into <em>packets</em> and adds source and destination IP addresses. Routers operate at this layer, reading IP headers to forward packets toward their destination.`,
        desc2: `IP (Internet Protocol) is the core protocol here. IPv4 uses 32-bit addresses (like 192.168.1.1) while IPv6 uses 128-bit addresses for a vastly larger address space.`,
        protocols: ["IPv4", "IPv6", "ICMP", "ARP", "BGP", "OSPF"],
        pdu: "PDU: <strong>Packet</strong>",
    },
    link: {
        name: "Link Layer",
        num: "Layer 1",
        color: "var(--link)",
        badge: "PHYSICAL",
        desc: `The Link Layer (also called Network Access or Network Interface Layer) handles communication on the <strong>local network segment</strong>. It wraps packets into <em>frames</em> with MAC addresses for device-to-device delivery on the same network.`,
        desc2: `This layer deals with the actual physical transmission — whether over Ethernet cables, Wi-Fi signals, or fiber optics. It also handles error detection via checksums (FCS).`,
        protocols: ["Ethernet", "Wi-Fi (802.11)", "PPP", "ARP", "MAC"],
        pdu: "PDU: <strong>Frame / Bit</strong>",
    },
};

function showLayer(key) {
    document
        .querySelectorAll(".layer-card")
        .forEach((c) => c.classList.remove("active"));
    document
        .querySelector(`.layer-card[data-layer="${key}"]`)
        .classList.add("active");
    const l = LAYERS[key];
    const box = document.getElementById("layer-detail-box");
    box.innerHTML = `
    <h2 style="color:${l.color}">${l.name}</h2>
    <span class="badge" style="background:${l.color}22;color:${l.color};border:1px solid ${l.color}44">${l.num} — ${l.badge}</span>
    <p>${l.desc}</p>
    <p>${l.desc2}</p>
    <div class="protocols-list">
      ${l.protocols.map((p) => `<span title="${p.title}" class="proto-tag" style="color:${l.color};border-color:${l.color}55">${p.name}</span>`).join("")}
    </div>
    <div class="pdu-info" style="border-color:${l.color};color:#a0b4cc">${l.pdu}</div>
  `;
}
showLayer("app");

const JOURNEY_STEPS = [
    {
        layer: "Application",
        color: "var(--app)",
        encRow: "enc-app",
        log: 'Application Layer creates an HTTP request message — "GET /index.html". Adds HTTP headers.',
    },
    {
        layer: "Transport",
        color: "var(--trans)",
        encRow: "enc-trans",
        log: "Transport Layer (TCP) wraps the message into a segment. Adds source port: 52413, destination port: 80.",
    },
    {
        layer: "Internet",
        color: "var(--inet)",
        encRow: "enc-inet",
        log: "Internet Layer wraps segment into a packet. Adds source IP: 192.168.1.10 → dest IP: 93.184.216.34.",
    },
    {
        layer: "Link",
        color: "var(--link)",
        encRow: "enc-link",
        log: "Link Layer wraps packet into a frame. Adds MAC addresses for local delivery to router.",
    },
    {
        layer: "In Transit",
        color: "var(--packet)",
        encRow: null,
        log: "🔀 Router receives frame, strips Link header, reads IP header, forwards packet toward destination.",
    },
    {
        layer: "Decapsulate",
        color: "var(--link)",
        encRow: null,
        log: "🖥 Receiver decapsulates: Link → Internet → Transport → Application. HTTP response sent back.",
    },
];

let journeyRunning = false;
let journeyPaused = false;
let journeyResumeResolve = null;

function getDelay() {
    const speed = parseInt(document.getElementById("speedRange").value);
    return Math.round(1200 / speed);
}

document.getElementById("speedRange").addEventListener("input", function () {
    document.getElementById("speedLabel").textContent = this.value + "×";
});

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function journeySleep(ms) {
    return new Promise(async (resolve) => {
        await sleep(ms);
        if (journeyPaused) {
            await new Promise((r) => {
                journeyResumeResolve = r;
            });
        }
        resolve();
    });
}

function toggleJourneyPause() {
    if (!journeyRunning) return;
    journeyPaused = !journeyPaused;
    const btn = document.getElementById("journey-pause-btn");
    btn.textContent = journeyPaused ? "▶ Resume" : "⏸ Pause";
    if (!journeyPaused && journeyResumeResolve) {
        journeyResumeResolve();
        journeyResumeResolve = null;
    }
}

async function startJourney() {
    if (journeyRunning) return;
    resetJourney();
    journeyRunning = true;
    const pauseBtn = document.getElementById("journey-pause-btn");
    pauseBtn.disabled = false;

    const rows = document.querySelectorAll(".encap-row");
    const log = document.getElementById("step-log");
    const dot = document.getElementById("packet-dot");
    const delay = getDelay();

    for (let i = 0; i < 4; i++) {
        await journeySleep(delay);
        rows[i].classList.add("lit");
        log.innerHTML = `<div class="log-line"><span class="log-layer" style="color:${JOURNEY_STEPS[i].color}">${JOURNEY_STEPS[i].layer}</span><span>${JOURNEY_STEPS[i].log}</span></div>`;
    }

    await journeySleep(delay);
    log.innerHTML = `<div class="log-line"><span class="log-layer" style="color:var(--packet)">Transit</span><span>${JOURNEY_STEPS[4].log}</span></div>`;

    dot.style.display = "block";
    dot.style.left = "80px";
    dot.style.setProperty("--packet-duration", (delay * 1.5) / 1000 + "s");

    await sleep(50);
    const scene = document.querySelector(".network-scene");
    const w = scene.offsetWidth;
    const routerX = Math.round(w / 2) - 8;
    dot.style.left = routerX + "px";
    await journeySleep(delay * 1.5 + 100);

    await journeySleep(delay / 2);
    dot.style.left = w - 96 + "px";
    await journeySleep(delay * 1.5 + 100);

    await journeySleep(delay / 2);
    log.innerHTML = `<div class="log-line"><span class="log-layer" style="color:var(--link)">Decap</span><span>${JOURNEY_STEPS[5].log}</span></div>`;
    for (let i = 3; i >= 0; i--) {
        await journeySleep(delay * 0.6);
        rows[i].classList.remove("lit");
    }
    dot.style.display = "none";
    journeyRunning = false;
    journeyPaused = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = "⏸ Pause";
}

function resetJourney() {
    journeyRunning = false;
    journeyPaused = false;
    if (journeyResumeResolve) {
        journeyResumeResolve();
        journeyResumeResolve = null;
    }
    document
        .querySelectorAll(".encap-row")
        .forEach((r) => r.classList.remove("lit"));
    const dot = document.getElementById("packet-dot");
    dot.style.display = "none";
    dot.style.left = "80px";
    document.getElementById("step-log").innerHTML =
        '<span style="color:var(--muted)">// Press "Send Packet" to begin the simulation</span>';
    const pauseBtn = document.getElementById("journey-pause-btn");
    pauseBtn.disabled = true;
    pauseBtn.textContent = "⏸ Pause";
}

const HS_STEPS = [
    {
        dir: "right",
        label: "SYN",
        color: "var(--app)",
        note: "Client wants to connect",
        desc: 'Client sends a SYN (synchronize) segment. It picks a random sequence number, e.g. seq=100. This says "I want to establish a connection."',
    },
    {
        dir: "left",
        label: "SYN-ACK",
        color: "var(--trans)",
        note: "Server acknowledges + syncs",
        desc: "Server responds with SYN-ACK. It acknowledges client's seq (ack=101) and sends its own sequence number (seq=300). Says \"Acknowledged, I'm ready too.\"",
    },
    {
        dir: "right",
        label: "ACK",
        color: "var(--link)",
        note: "Connection established!",
        desc: "Client sends final ACK (ack=301) confirming it received server's sequence. Both sides are now synchronized — data transfer can begin.",
    },
    {
        dir: "right",
        label: "DATA →",
        color: "var(--packet)",
        note: "HTTP request sent",
        desc: "Connection established. Client sends the actual HTTP GET request. Server processes it and sends back the response.",
    },
];

let hsStep = 0;
let hsRunning = false;
let hsPaused = false;
let hsResumeResolve = null;

function hsSleep(ms) {
    return new Promise(async (resolve) => {
        await sleep(ms);
        if (hsPaused) {
            await new Promise((r) => {
                hsResumeResolve = r;
            });
        }
        resolve();
    });
}

function toggleHsPause() {
    if (!hsRunning) return;
    hsPaused = !hsPaused;
    const btn = document.getElementById("hs-pause-btn");
    btn.textContent = hsPaused ? "▶ Resume" : "⏸ Pause";
    if (!hsPaused && hsResumeResolve) {
        hsResumeResolve();
        hsResumeResolve = null;
    }
}

async function startHandshake() {
    if (hsRunning) return;
    resetHandshake();
    hsRunning = true;
    const pauseBtn = document.getElementById("hs-pause-btn");
    pauseBtn.disabled = false;

    const container = document.getElementById("hs-messages");
    const log = document.getElementById("hs-log");
    const delay = 900;

    for (let i = 0; i < HS_STEPS.length; i++) {
        await hsSleep(delay);
        const s = HS_STEPS[i];
        const div = document.createElement("div");
        div.className = `hs-msg ${s.dir === "left" ? "right" : ""}`;
        div.style.color = s.color;
        div.innerHTML = `
      <div class="hs-label" style="border-color:${s.color}66;color:${s.color}">${s.label}</div>
      <div class="hs-arrow-wrap">
        <div style="position:relative">
          <div class="hs-note">${s.note}</div>
        </div>
        <div class="hs-arrow-line"></div>
        <div class="hs-arrowhead"></div>
      </div>
    `;
        container.appendChild(div);
        await sleep(50);
        div.classList.add("visible");
        log.innerHTML = `<div class="log-line"><span class="log-layer" style="color:${s.color}">${s.label}</span><span>${s.desc}</span></div>`;
    }

    hsRunning = false;
    hsPaused = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = "⏸ Pause";
}

function resetHandshake() {
    hsRunning = false;
    hsPaused = false;
    if (hsResumeResolve) {
        hsResumeResolve();
        hsResumeResolve = null;
    }
    document.getElementById("hs-messages").innerHTML = "";
    document.getElementById("hs-log").innerHTML =
        '<span style="color:var(--muted)">// The 3-way handshake establishes a reliable TCP connection before any data is sent.</span>';
    const pauseBtn = document.getElementById("hs-pause-btn");
    pauseBtn.disabled = true;
    pauseBtn.textContent = "⏸ Pause";
}

const QUESTIONS = [
    {
        q: "Which layer of the TCP/IP model is responsible for assigning IP addresses to packets?",
        opts: ["Application", "Transport", "Internet", "Link"],
        ans: 2,
        explain:
            "The Internet Layer adds source and destination IP addresses, enabling routing across networks.",
    },
    {
        q: "What is the PDU (Protocol Data Unit) at the Transport Layer called?",
        opts: ["Frame", "Packet", "Segment", "Bit"],
        ans: 2,
        explain:
            "At the Transport Layer, TCP wraps data into Segments (with port numbers). Frames are Link layer, Packets are Internet layer.",
    },
    {
        q: "Which protocol provides RELIABLE, ordered data delivery?",
        opts: ["UDP", "IP", "TCP", "HTTP"],
        ans: 2,
        explain:
            "TCP (Transmission Control Protocol) includes acknowledgments, sequencing, and retransmission to guarantee reliable delivery.",
    },
    {
        q: 'What does the "SYN-ACK" message in a TCP handshake mean?',
        opts: [
            "Data was corrupted",
            "Server acknowledges client and synchronizes",
            "Connection is terminated",
            "Routing failed",
        ],
        ans: 1,
        explain:
            "SYN-ACK is the server's response: it acknowledges the client's SYN with an ACK and sends its own SYN to synchronize sequence numbers.",
    },
    {
        q: "Which layer deals with MAC addresses and physical transmission?",
        opts: ["Application", "Internet", "Transport", "Link"],
        ans: 3,
        explain:
            "The Link Layer (Network Access Layer) operates with MAC addresses for local network delivery and handles physical medium specifics like Ethernet and Wi-Fi.",
    },
    {
        q: "Which protocol would you use for fast video streaming where occasional packet loss is acceptable?",
        opts: ["TCP", "UDP", "FTP", "HTTPS"],
        ans: 1,
        explain:
            "UDP is connectionless and fast, with no retransmission overhead. For live video/audio, a slightly dropped packet is better than the delay caused by TCP's retransmission.",
    },
];

let quizIdx = 0;
let quizScore = 0;
let quizAnswered = false;

function renderQuiz() {
    const c = document.getElementById("quiz-container");
    if (quizIdx >= QUESTIONS.length) {
        c.innerHTML = `
      <div class="quiz-card quiz-score">
        <div class="big">${quizScore}/${QUESTIONS.length}</div>
        <p>${quizScore >= 5 ? "🎉 Excellent! You understand TCP/IP well." : quizScore >= 3 ? "👍 Good effort! Review the layers for improvement." : "📚 Keep studying — revisit the Layers and Journey tabs."}</p>
        <button class="btn btn-primary" style="margin-top:24px" onclick="restartQuiz()">↺ Try Again</button>
      </div>`;
        return;
    }
    const q = QUESTIONS[quizIdx];
    quizAnswered = false;
    c.innerHTML = `
    <div class="quiz-card">
      <div class="quiz-progress">Question ${quizIdx + 1} of ${QUESTIONS.length} &nbsp;·&nbsp; Score: ${quizScore}</div>
      <div class="quiz-q">${q.q}</div>
      <div class="quiz-options">
        ${q.opts.map((o, i) => `<button class="quiz-opt" onclick="answerQuiz(${i})">${o}</button>`).join("")}
      </div>
      <div class="quiz-feedback" id="qfeedback"></div>
    </div>`;
}

function answerQuiz(idx) {
    if (quizAnswered) return;
    quizAnswered = true;
    const q = QUESTIONS[quizIdx];
    const btns = document.querySelectorAll(".quiz-opt");
    btns.forEach((b) => (b.disabled = true));
    btns[q.ans].classList.add("correct");
    if (idx !== q.ans) btns[idx].classList.add("wrong");
    else quizScore++;
    document.getElementById("qfeedback").innerHTML = `
    ${idx === q.ans ? "✅" : "❌"} ${q.explain}
    <br><button class="btn btn-primary quiz-next" onclick="nextQuestion()">Next →</button>
  `;
}

function nextQuestion() {
    quizIdx++;
    renderQuiz();
}
function restartQuiz() {
    quizIdx = 0;
    quizScore = 0;
    renderQuiz();
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        document
            .querySelectorAll(".tab-btn")
            .forEach((b) => b.classList.remove("active"));
        document
            .querySelectorAll(".panel")
            .forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        const id = "tab-" + btn.dataset.tab;
        document.getElementById(id).classList.add("active");
        if (btn.dataset.tab === "quiz") renderQuiz();
    });
});

// Init quiz
renderQuiz();
