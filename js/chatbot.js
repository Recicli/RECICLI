import { CHATBOT_FAQ } from "./config.js";

export function initChatbot() {
  const toggle = document.querySelector("#chatToggle");
  const windowEl = document.querySelector("#chatWindow");
  const quick = document.querySelector("#chatQuick");
  const body = document.querySelector("#chatBody");
  if (!toggle || !windowEl || !quick || !body) return;

  quick.innerHTML = Object.keys(CHATBOT_FAQ)
    .map((q) => `<button type="button" data-question="${q}">${q}</button>`)
    .join("");

  toggle.addEventListener("click", () => windowEl.classList.toggle("open"));
  quick.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    const question = btn.dataset.question;
    body.insertAdjacentHTML("beforeend", `<div class="chat-msg"><strong>${question}</strong></div>`);
    body.insertAdjacentHTML("beforeend", `<div class="chat-msg">${CHATBOT_FAQ[question]}</div>`);
    body.scrollTop = body.scrollHeight;
  });
}
