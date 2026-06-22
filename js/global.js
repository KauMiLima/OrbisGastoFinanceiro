// global.js - Código Completo e Corrigido para Sincronização Mobile

const sessao = JSON.parse(localStorage.getItem("fluxo_sessao_ativa"));
const paginaAtual = window.location.pathname.split("/").pop();

// Lógica de proteção de rotas
if (!sessao || Date.now() > sessao.expira) {
    localStorage.removeItem("fluxo_sessao_ativa");
    if (paginaAtual !== "index.html" && paginaAtual !== "") {
        window.location.href = "index.html";
    }
} else {
    if (paginaAtual === "index.html" || paginaAtual === "") {
        window.location.href = "dashboard.html";
    }
}

// CORREÇÃO: Função Blindada para o Mobile
// Normaliza o e-mail para minúsculas (trim/toLowerCase).
// Isso resolve o problema de "Admin" vs "admin" serem chaves diferentes.
function obterChaveUsuario(sufixo) {
    if (!sessao || !sessao.email) return sufixo;
    const emailNormalizado = sessao.email.trim().toLowerCase();
    return `user_${emailNormalizado}_${sufixo}`;
}

const fmtBRL = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

document.addEventListener("DOMContentLoaded", () => {
    // Lógica da Sidebar
    const btnToggle = document.getElementById('btn-sidebar-toggle');
    const sidebar = document.getElementById('sidebar-main');
    
    if (btnToggle && sidebar) {
        btnToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            if (sidebar.classList.contains('collapsed')) {
                localStorage.setItem('fluxo_sidebar_collapsed', 'true');
            } else {
                localStorage.removeItem('fluxo_sidebar_collapsed');
            }
        });
    }

    if (localStorage.getItem('fluxo_sidebar_collapsed') === 'true' && sidebar) {
        sidebar.classList.add('collapsed');
    }
    
    // Perfil do Usuário
    if (sessao && sessao.user) {
        const userNameSidebar = document.querySelector(".user-name");
        const avatarEl = document.querySelector(".avatar");
        
        if (userNameSidebar) userNameSidebar.innerText = sessao.user;
        if (avatarEl) avatarEl.innerText = sessao.user.charAt(0).toUpperCase();
    }
    
    // Inicialização de Componentes
    if (typeof renderizarListaAtividadeRecente === "function") renderizarListaAtividadeRecente();
    if (typeof inicializarModoAnonimato === "function") inicializarModoAnonimato();
    
    if (!window.location.pathname.includes("metas.html")) {
        if (typeof inicializarInputRapidoPadrao === "function") inicializarInputRapidoPadrao();
    }
});

document.addEventListener("click", (e) => {
    const btnLogout = e.target.closest("#btn-logout");
    if (btnLogout) {
        e.preventDefault();
        localStorage.removeItem("fluxo_sessao_ativa");
        window.location.href = "index.html"; 
    }
});

// --- FUNÇÕES DE LÓGICA DO APP ---

function renderizarListaAtividadeRecente() {
    const container = document.getElementById("transaction-container");
    if (!container) return;
    
    const chaveTransacoes = obterChaveUsuario("transacoes");
    const dadosRecentes = JSON.parse(localStorage.getItem(chaveTransacoes)) || [];
    
    if (dadosRecentes.length === 0) {
        container.innerHTML = "<p style='color: var(--text-muted); font-size: 13px;'>Nenhum registro recente.</p>";
        return;
    }
    
    const ultimas = [...dadosRecentes].sort((a, b) => b.id - a.id).slice(0, 5);
    
    container.innerHTML = ultimas.map((t) => {
        let emoji = t.tipo === "ganho" ? "💰" : "💸";
        if (t.categoria === "Alimentação") emoji = "🍕";
        if (t.categoria === "Transporte") emoji = "🚗";
        if (t.categoria === "Lazer") emoji = "🍿";
        if (t.categoria === "Metas") emoji = "🎯";
        if (t.categoria === "Trabalho") emoji = "💼";
        
        return `
        <div class="transaction-item">
            <div class="tx-icon">${emoji}</div>
            <div class="tx-info">
                <span style="font-size: 13px; font-weight: 600;">${t.descricao}</span>
                <span style="font-size: 12px; color: var(--text-muted);">${t.categoria}</span>
            </div>
            <div class="${t.tipo === 'ganho' ? 'pos' : 'neg'}" style="font-size: 13px; font-weight: 600;">
                ${t.tipo === 'ganho' ? '+' : '-'}${fmtBRL(t.valor)}
            </div>
        </div>`;
    }).join("");
}

function inicializarInputRapidoPadrao() {
    const btn = document.getElementById("quick-add-btn");
    const input = document.getElementById("quick-input");
    if (!btn || !input) return;
    
    const agir = () => {
        if (input.value.toLowerCase().includes("meta")) {
            mostrarNotificacaoErro("Para gerir metas, acesse a página de Metas no menu lateral!");
            return;
        }
        processarInputRapidoGlobal();
    };
    
    btn.onclick = agir;
    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") agir();
    });
}

function processarInputRapidoGlobal() {
    const input = document.getElementById("quick-input");
    const texto = input.value.trim();
    if (!texto) return;
    
    const regex = /^([+-]?)\s*([0-9]+(?:[.,][0-9]{1,2})?)\s+(.+)$/;
    const captura = texto.match(regex);
    
    if (!captura) {
        mostrarNotificacaoErro("Formato incorreto! Use o padrão: '-35 Lanche' ou '+120 Freela'");
        return;
    }
    
    const valor = parseFloat(captura[2].replace(",", "."));
    const descricao = captura[3];
    const tipo = captura[1] === "+" ? "ganho" : "gasto";
    
    let category = "Outros";
    const descLower = descricao.toLowerCase();
    
    if (descLower.includes("lanche") || descLower.includes("almoço") || descLower.includes("pizza")) category = "Alimentação";
    if (descLower.includes("uber") || descLower.includes("gasolina")) category = "Transporte";
    if (descLower.includes("netflix") || descLower.includes("jogo")) category = "Lazer";
    if (descLower.includes("salario") || descLower.includes("freela")) category = "Trabalho";
    
    const chaveTransacoes = obterChaveUsuario("transacoes");
    let bancoAtual = JSON.parse(localStorage.getItem(chaveTransacoes)) || [];
    
    bancoAtual.push({
        id: Date.now(),
        descricao,
        valor,
        categoria: category,
        data: new Date().toISOString().split("T")[0],
        tipo,
    });
    
    localStorage.setItem(chaveTransacoes, JSON.stringify(bancoAtual));
    input.value = "";
    window.location.reload();
}

function inicializarModoAnonimato() {
    const btn = document.getElementById("btn-blur");
    if (!btn) return;
    
    btn.onclick = function () {
        document.querySelectorAll(".privacy-blur").forEach((el) => el.classList.toggle("blurred"));
        this.classList.toggle("btn-active");
    };
}

function mostrarNotificacaoErro(mensagem) {
    const antigaNotificacao = document.querySelector(".notificacao-aviso-overlay");
    if (antigaNotificacao) antigaNotificacao.remove();
    
    const overlay = document.createElement("div");
    overlay.className = "notificacao-aviso-overlay";
    overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;";
    
    const card = document.createElement("div");
    card.className = "notificacao-aviso-card";
    card.style.cssText = "background: var(--bg-card); border: 1px solid var(--border-color); padding: 24px; border-radius: 12px; max-width: 320px; text-align: center;";
    
    card.innerHTML = `
        <p style="margin-bottom: 16px; color: var(--text-main);">${mensagem}</p>
        <button id="btn-fechar-notif" class="btn btn-secondary" style="width: 100%;">Entendido</button>
    `;
    
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    
    const btnFechar = card.querySelector("#btn-fechar-notif");
    const fecharRotina = () => overlay.remove();
    
    btnFechar.onclick = fecharRotina;
    overlay.onclick = (e) => {
        if (e.target === overlay) fecharRotina();
    };
    
    setTimeout(() => {
        if (document.body.contains(overlay)) fecharRotina();
    }, 4000);
}