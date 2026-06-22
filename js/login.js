document.addEventListener("DOMContentLoaded", () => {
  inicializarAbasLogin();
  configurarFormularioAutenticacao();
  configurarPainelDevControles();
});

let modoAtual = "entrar";

function inicializarAbasLogin() {
  const btnEntrar = document.getElementById("tab-entrar");
  const btnCadastrar = document.getElementById("tab-cadastrar");
  const grupoNome = document.getElementById("grupo-nome");
  const btnSubmit = document.getElementById("btn-submit-auth");

  if (!btnEntrar || !btnCadastrar) return;

  btnEntrar.onclick = () => {
    modoAtual = "entrar";
    btnEntrar.classList.add("active");
    btnCadastrar.classList.remove("active");
    grupoNome.style.display = "none";
    document.getElementById("login-nome").removeAttribute("required");
    btnSubmit.textContent = "Acessar Painel";
  };

  btnCadastrar.onclick = () => {
    modoAtual = "cadastrar";
    btnCadastrar.classList.add("active");
    btnEntrar.classList.remove("active");
    grupoNome.style.display = "flex";
    document.getElementById("login-nome").setAttribute("required", "true");
    btnSubmit.textContent = "Criar Conta Premium";
  };
}

function configurarFormularioAutenticacao() {
  const form = document.getElementById("form-autenticar");
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const senha = document.getElementById("login-senha").value.trim();

    if (email === "admin@fluxo.com" && senha === "admin123") {
      form.reset();
      mostrarPainelDesenvolvedor();
      return;
    }

    const msgBuffer = new TextEncoder().encode(senha);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const senhaHash = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    let usuarios =
      JSON.parse(localStorage.getItem("usuarios_registrados")) || [];

    if (modoAtual === "cadastrar") {
      const nome = document.getElementById("login-nome").value.trim();

      if (usuarios.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        mostrarNotificacaoErro("Este e-mail já está cadastrado no sistema.");
        return;
      }

      usuarios.push({ user: nome, email: email, senha: senhaHash });
      localStorage.setItem("usuarios_registrados", JSON.stringify(usuarios));

      efetuarLoginSessao(nome, email);
    } else {
      const usuarioValido = usuarios.find(
        (u) =>
          u.email.toLowerCase() === email.toLowerCase() &&
          u.senha === senhaHash,
      );

      if (!usuarioValido) {
        mostrarNotificacaoErro(
          "Credenciais incorretas! Verifique o e-mail e a senha.",
        );
        return;
      }

      efetuarLoginSessao(usuarioValido.user, usuarioValido.email);
    }
  };
}

function efetuarLoginSessao(nome, email) {
  const tokenSessao = {
    user: nome,
    email: email,
    expira: Date.now() + 1000 * 60 * 60 * 3,
  };
  localStorage.setItem("fluxo_sessao_ativa", JSON.stringify(tokenSessao));
  window.location.href = "index.html";
}

function mostrarPainelDesenvolvedor() {
  document.getElementById("card-autenticacao").style.display = "none";
  document.getElementById("card-developer").style.display = "block";
  renderizarListaUsuariosDev();
}

function configurarPainelDevControles() {
  const btnFechar = document.getElementById("btn-fechar-dev");
  if (btnFechar) {
    btnFechar.onclick = () => {
      document.getElementById("card-developer").style.display = "none";
      document.getElementById("card-autenticacao").style.display = "block";
    };
  }
}

function renderizarListaUsuariosDev() {
  const container = document.getElementById("dev-lista-usuarios");
  if (!container) return;

  const usuarios =
    JSON.parse(localStorage.getItem("usuarios_registrados")) || [];

  if (usuarios.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px 0;">Nenhum usuário cadastrado neste navegador.</p>`;
    return;
  }

  container.innerHTML = usuarios
    .map((u, index) => {
      return `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 14px; border-radius: 8px; display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
                    <div style="flex: 1; min-width: 0;">
                        <strong style="color: #fff; font-size: 13px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${u.user}</strong>
                        <div style="color: var(--text-muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${u.email}</div>
                    </div>
                    <div style="display: flex; gap: 6px; flex-shrink: 0;">
                        <button class="btn btn-primary" onclick="devForcarLogin('${u.user}', '${u.email}')" style="padding: 6px 12px; font-size: 11px; height: auto;">Inspecionar</button>
                        <button class="btn" onclick="devExcluirUsuario('${u.email}')" style="padding: 6px 12px; font-size: 11px; height: auto; background-color: var(--color-neg); color: #fff;">Excluir</button>
                    </div>
                </div>
                <div style="display: flex; gap: 6px; border-top: 1px solid rgba(255,255,255,0.02); padding-top: 8px;">
                    <input type="text" id="dev-nova-senha-${index}" placeholder="Alterar senha da conta" style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px; padding: 6px 10px; color: #fff; font-size: 11px; flex: 1; outline: none;">
                    <button type="button" onclick="devAlterarSenhaUsuario(${index}, '${u.email}')" style="background: #3d474e; color: #fff; border: none; padding: 6px 12px; font-size: 11px; border-radius: 4px; cursor: pointer; font-weight: 600;">Definir</button>
                </div>
            </div>
        `;
    })
    .join("");
}

function devForcarLogin(nome, email) {
  efetuarLoginSessao(nome, email);
}

function devExcluirUsuario(email) {
  if (!confirm(`Excluir permanentemente a conta [ ${email} ]?`)) return;

  let usuarios = JSON.parse(localStorage.getItem("usuarios_registrados")) || [];
  usuarios = usuarios.filter((u) => u.email !== email);
  localStorage.setItem("usuarios_registrados", JSON.stringify(usuarios));

  renderizarListaUsuariosDev();
}

async function devAlterarSenhaUsuario(index, email) {
  const input = document.getElementById(`dev-nova-senha-${index}`);
  const novaSenhaTexto = input.value.trim();

  if (novaSenhaTexto.length < 6) {
    alert("A nova senha precisa ter ao menos 6 dígitos.");
    return;
  }

  const msgBuffer = new TextEncoder().encode(novaSenhaTexto);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const novoHashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  let usuarios = JSON.parse(localStorage.getItem("usuarios_registrados")) || [];
  const idx = usuarios.findIndex((u) => u.email === email);

  if (idx !== -1) {
    usuarios[idx].senha = novoHashHex;
    localStorage.setItem("usuarios_registrados", JSON.stringify(usuarios));
    input.value = "";
    alert("Senha modificada com sucesso.");
    renderizarListaUsuariosDev();
  }
}
