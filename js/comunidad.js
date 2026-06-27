import { hojas } from "./script.js";
import { getSupabaseUser } from "./supabaseClient.js";
import { createCommunityPost, fetchCommunityPosts } from "./supabaseData.js";

let posts = [];

export async function initComunidad() {
  const list = document.querySelector("#communityPosts");
  const form = document.querySelector("#postForm");
  const modal = document.querySelector("#postModal");
  const openModal = document.querySelector("#openPostModal");
  const closeModal = document.querySelector("#closePostModal");

  try {
    posts = mapRemotePosts(await fetchCommunityPosts());
  } catch (error) {
    posts = [];
    console.error("No se pudo cargar comunidad", error.message);
  }
  if (list) renderPosts(list);

  openModal?.addEventListener("click", () => modal?.showModal());
  closeModal?.addEventListener("click", () => modal?.close());
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const texto = form.post.value;
    const user = await getSupabaseUser();
    if (user) {
      try {
        await createCommunityPost(user.id, texto);
      } catch (error) {
        console.warn("No se pudo insertar post remoto", error.message);
      }
    }
    posts.unshift({ autor: "Tu perfil", tipo: form.tipo.value, texto, destacado: false, hojas: 5, likes: 0 });
    renderPosts(list);
    form.reset();
    modal?.close();
  });

  list?.addEventListener("click", (event) => {
    const like = event.target.closest("[data-like]");
    if (!like) return;
    const index = Number(like.dataset.like);
    posts[index].likes += 1;
    renderPosts(list);
  });
}

function mapRemotePosts(rows) {
  return rows.map((row) => ({
    autor: row.profiles ? `${row.profiles.nombre || "Usuario"} ${row.profiles.apellido || ""}`.trim() : "Usuario EcoRed",
    tipo: row.profiles?.rol || "General",
    texto: row.contenido || "",
    destacado: ["empresa", "municipalidad", "universidad", "ong", "admin"].includes(row.profiles?.rol),
    hojas: row.profiles?.hojas || 4,
    likes: row.likes || 0
  }));
}

function initials(name) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function renderPosts(list) {
  if (!list) return;
  if (!posts.length) {
    list.innerHTML = `<article class="community-post"><h3>Sin publicaciones</h3><p>Aun no hay publicaciones en comunidad.</p></article>`;
    return;
  }
  list.innerHTML = posts.map((p, index) => `
    <article class="community-post ${p.destacado ? "verified-post" : ""}">
      <div class="post-head">
        <div class="avatar">${initials(p.autor)}</div>
        <div>
          <h3>${p.autor}</h3>
          <span>${p.tipo}${p.destacado ? " - Verificado" : ""}</span>
        </div>
      </div>
      <p>${p.texto}</p>
      <div class="post-meta">
        <span>${hojas(p.hojas)} EcoScore visible</span>
        <span>👍 ${p.likes}</span>
      </div>
      <div class="post-actions">
        <button class="post-action icon-post-action" data-like="${index}" aria-label="Reaccionar"><span>👍</span></button>
        <button class="post-action icon-post-action" aria-label="Comentar"><span>💬</span><small>Comentar</small></button>
        <button class="post-action icon-post-action" aria-label="Compartir"><span>↗</span><small>Compartir</small></button>
      </div>
    </article>`).join("");
}
