// Definição dinâmica das chaves privadas por e-mail logado
const obterChaveMetas = () => obterChaveUsuario("metas");
const obterChaveTransacoesMetas = () => obterChaveUsuario("transacoes");

let metasReal = [];

document.addEventListener("DOMContentLoaded", () => {
  metasReal = JSON.parse(localStorage.getItem(obterChaveMetas())) || [];

  renderizarPageMetasReal();
  configurarModaisMeta();
  configurarModalAporteManual();
  configurarModalDeletar();
  interceptarInsercaoRapidaParaMeta();
});

function renderizarPageMetasReal() {
  const container = document.getElementById("metas-page-container");
  if (!container) return;

  if (metasReal.length === 0) {
    container.innerHTML = `
            <div class="empty-state" style="padding: 40px;">
                <p>Não tens nenhuma meta financeira criada.</p>
                <p style="font-size:12px; margin-top:8px; color:#828f99;">Clica em "+ Nova Meta" no topo para começares a poupar!</p>
            </div>`;
    return;
  }

  container.innerHTML = metasReal
    .map((meta) => {
      const pct = Math.min(100, (meta.acumulado / meta.alvo) * 100);
      const estaConcluida = pct >= 100;

      return `
            <div class="card fade-up-3 ${estaConcluida ? "meta-concluida-card" : ""}" style="margin-bottom: 20px; padding: 24px; position: relative; overflow: hidden;">
                ${estaConcluida ? '<div class="ribbon-celebracao">🎉 CONCLUÍDA</div>' : ""}
                
                <div class="meta-card-header">
                    <div>
                        <h4 class="meta-card-title">🎯 ${meta.nome}</h4>
                        <span class="meta-card-sub">Alvo Final: ${fmtBRL(meta.alvo)}</span>
                    </div>
                    <div style="text-align: right;">
                        <span class="meta-pct-text" style="${estaConcluida ? "color: #10B981;" : ""}">${pct.toFixed(1)}%</span>
                        <div class="meta-acc-text">Guardado: ${fmtBRL(meta.acumulado)}</div>
                    </div>
                </div>
                
                <div class="alloc-bar-bg" style="height: 8px; background: #192230; border-radius: 4px; overflow:hidden; margin-bottom: 16px;">
                    <div class="alloc-bar-fill" style="width: ${pct}%; background: ${estaConcluida ? "#10B981" : "#ffcd00"}; height:100%;"></div>
                </div>

                <div class="meta-card-actions">
                    <button class="btn-deposit-action" onclick="abrirModalAporte(${meta.id}, '${meta.nome}')" ${estaConcluida ? 'style="opacity: 0.3; pointer-events: none;"' : ""}>💰 Adicionar Dinheiro</button>
                    <button class="btn-delete-meta" onclick="deletarMeta(${meta.id}, '${meta.nome}')">Remover Meta</button>
                </div>
            </div>
        `;
    })
    .join("");
}

function abrirModalAporte(id, nomeMeta) {
  const overlay = document.getElementById("modal-aporte-overlay");
  const inputId = document.getElementById("aporte-meta-id");
  const titulo = document.getElementById("aporte-modal-titulo");

  if (!overlay || !inputId) return;

  titulo.innerHTML = `💰 Aporte: ${nomeMeta}`;
  inputId.value = id;
  overlay.style.display = "flex";

  setTimeout(() => {
    document.getElementById("aporte-valor").focus();
  }, 50);
}

function configurarModalAporteManual() {
  const overlay = document.getElementById("modal-aporte-overlay");
  const btnCancelar = document.getElementById("btn-cancelar-aporte");
  const form = document.getElementById("form-novo-aporte");

  if (!overlay) return;

  const fechar = () => {
    overlay.style.display = "none";
    if (form) form.reset();
  };

  if (btnCancelar) btnCancelar.onclick = fechar;
  overlay.onclick = (e) => {
    if (e.target === overlay) fechar();
  };

  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const id = parseInt(document.getElementById("aporte-meta-id").value);
      const valor = parseFloat(document.getElementById("aporte-valor").value);

      if (isNaN(valor) || valor <= 0) {
        if (typeof mostrarNotificacaoErro === "function")
          mostrarNotificacaoErro("Insira um valor válido de aporte!");
        return;
      }

      let metaAlvo = metasReal.find((m) => m.id === id);
      if (!metaAlvo) return;

      const concluidaAntes = metaAlvo.acumulado >= metaAlvo.alvo;

      metasReal = metasReal.map((m) => {
        if (m.id === id) return { ...m, acumulado: m.acumulado + valor };
        return m;
      });

      // Grava dinamicamente no banco do usuário logado
      let transacoes =
        JSON.parse(localStorage.getItem(obterChaveTransacoesMetas())) || [];
      transacoes.push({
        id: Date.now(),
        descricao: `Aporte Meta: ${metaAlvo.nome}`,
        valor: valor,
        categoria: "Metas",
        data: new Date().toISOString().split("T")[0],
        tipo: "gasto",
      });

      localStorage.setItem(
        obterChaveTransacoesMetas(),
        JSON.stringify(transacoes),
      );
      salvarMetasNoStorage();
      renderizarPageMetasReal();
      fechar();

      const metaAtualizada = metasReal.find((m) => m.id === id);
      if (!concluidaAntes && metaAtualizada.acumulado >= metaAtualizada.alvo) {
        dispararCelebracao(metaAtualizada.nome);
      } else {
        window.location.reload();
      }
    };
  }
}

function deletarMeta(id, nome) {
  const overlay = document.getElementById("modal-deletar-overlay");
  const labelNome = document.getElementById("deletar-meta-nome");
  const inputId = document.getElementById("deletar-meta-id");

  if (!overlay || !labelNome || !inputId) return;

  labelNome.innerText = `"${nome}"`;
  inputId.value = id;
  overlay.style.display = "flex";
}

function configurarModalDeletar() {
  const overlay = document.getElementById("modal-deletar-overlay");
  const btnConfirmar = document.getElementById("btn-confirmar-deletar");
  const btnCancelar = document.getElementById("btn-cancelar-deletar");

  if (!overlay) return;

  const fechar = () => {
    overlay.style.display = "none";
  };

  if (btnCancelar) btnCancelar.onclick = fechar;
  overlay.onclick = (e) => {
    if (e.target === overlay) fechar();
  };

  if (btnConfirmar) {
    btnConfirmar.onclick = () => {
      const id = parseInt(document.getElementById("deletar-meta-id").value);
      if (isNaN(id)) return;

      metasReal = metasReal.filter((m) => m.id !== id);
      salvarMetasNoStorage();
      renderizarPageMetasReal();
      fechar();
    };
  }
}

function interceptarInsercaoRapidaParaMeta() {
  const btnInput = document.getElementById("quick-add-btn");
  const inputTexto = document.getElementById("quick-input");
  if (!btnInput || !inputTexto) return;

  const novoBtn = btnInput.cloneNode(true);
  btnInput.parentNode.replaceChild(novoBtn, btnInput);

  const executarInsercao = () => {
    const texto = inputTexto.value.trim();
    if (!texto) return;

    if (texto.toLowerCase().includes("meta")) {
      const matchValor = texto.match(/^([+-]?)\s*([0-9]+(?:[\.,][0-9]{1,2})?)/);
      if (!matchValor) {
        mostrarNotificacaoErro(
          "Formato de meta incorreto!<br>Use: <strong>'+500 meta reserva'</strong>",
        );
        inputTexto.value = "";
        return;
      }

      const sinal = matchValor[1] === "-" ? "-" : "+";
      const valor = parseFloat(matchValor[2].replace(",", "."));
      let nomeFiltro = texto
        .toLowerCase()
        .replace(/^([+-]?)\s*([0-9]+(?:[\.,][0-9]{1,2})?)/, "")
        .replace("meta", "")
        .trim();

      if (!nomeFiltro) {
        mostrarNotificacaoErro(
          "Comando incompleto! Indique o nome do objective após o valor.",
        );
        inputTexto.value = "";
        return;
      }

      const metaAlvo = metasReal.find((m) =>
        m.nome.toLowerCase().includes(nomeFiltro),
      );
      if (!metaAlvo) {
        mostrarNotificacaoErro(
          `Objetivo não encontrado: <strong>"${nomeFiltro}"</strong>`,
        );
        inputTexto.value = "";
        return;
      }

      const concluidaAntes = metaAlvo.acumulado >= metaAlvo.alvo;
      const modificador = sinal === "+" ? valor : -valor;

      metasReal = metasReal.map((m) => {
        if (m.id === metaAlvo.id)
          return { ...m, acumulado: Math.max(0, m.acumulado + modificador) };
        return m;
      });

      let transacoes =
        JSON.parse(localStorage.getItem(obterChaveTransacoesMetas())) || [];
      transacoes.push({
        id: Date.now(),
        descricao: `Aporte Meta: ${metaAlvo.nome}`,
        valor: valor,
        categoria: "Metas",
        data: new Date().toISOString().split("T")[0],
        tipo: sinal === "+" ? "gasto" : "ganho",
      });

      localStorage.setItem(
        obterChaveTransacoesMetas(),
        JSON.stringify(transacoes),
      );
      salvarMetasNoStorage();
      inputTexto.value = "";

      if (
        !concluidaAntes &&
        metaAlvo.acumulado + modificador >= metaAlvo.alvo &&
        sinal === "+"
      ) {
        renderizarPageMetasReal();
        dispararCelebracao(metaAlvo.nome);
      } else {
        window.location.reload();
      }
      return;
    }
    if (typeof processarInputRapidoGlobal === "function")
      processarInputRapidoGlobal();
  };

  novoBtn.onclick = executarInsercao;
  inputTexto.onkeypress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executarInsercao();
    }
  };
}

function configurarModaisMeta() {
  const modal = document.getElementById("modal-meta-overlay");
  const btnOpen = document.getElementById("btn-nova-meta");
  const form = document.getElementById("form-nova-meta");
  const btnCancel = document.getElementById("btn-cancelar-meta");

  if (!modal || !btnOpen) return;

  btnOpen.onclick = (e) => {
    e.preventDefault();
    modal.style.display = "flex";
  };
  const fechar = () => {
    modal.style.display = "none";
    form.reset();
  };

  if (btnCancel) btnCancel.onclick = fechar;
  modal.onclick = (e) => {
    if (e.target === modal) fechar();
  };

  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const nome = document.getElementById("meta-nome").value.trim();
      const alvo = parseFloat(document.getElementById("meta-alvo").value);

      metasReal.push({ id: Date.now(), nome, alvo, acumulado: 0 });
      salvarMetasNoStorage();
      renderizarPageMetasReal();
      fechar();
    };
  }
}

function dispararCelebracao(nomeMeta) {
  const banner = document.createElement("div");
  banner.className = "notificacao-aviso-overlay";
  banner.innerHTML = `
        <div class="notificacao-aviso-card" style="border-color: #10B981; max-width: 420px;">
            <div style="font-size: 40px; margin-bottom: 12px;">🏆</div>
            <h2 style="color: #ffffff !important; margin-bottom: 8px;">Meta Alcançada!</h2>
            <p style="color: var(--text-main); font-size: 13px; line-height: 1.6;">Sensacional! Conseguiste juntar o montante necessário e concluíste o teu objetivo:<br><strong style="color: #ffcd00; border: none;">${nomeMeta}</strong></p>
            <button class="btn btn-primary" style="margin-top: 16px; width: 100%;" onclick="this.parentElement.parentElement.remove()">Excelente!</button>
        </div>
    `;
  document.body.appendChild(banner);
}

function salvarMetasNoStorage() {
  localStorage.setItem(obterChaveMetas(), JSON.stringify(metasReal));
}
