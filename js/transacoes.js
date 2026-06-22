// Utilitário para puxar a chave correta da sessão logada
const obterChaveTransacoesTabela = () => obterChaveUsuario("transacoes");

// Elementos da DOM
const tbody = document.getElementById("table-transactions-body");
const selectMes = document.getElementById("filter-mes-tabela");
const selectAno = document.getElementById("filter-ano-tabela");
const selectTipo = document.getElementById("filter-tipo");

document.addEventListener("DOMContentLoaded", () => {
    const dataHoje = new Date();
    const mesAtual = String(dataHoje.getMonth() + 1).padStart(2, "0");
    const anoAtual = String(dataHoje.getFullYear());

    // 1. Popula o select de Anos dinamicamente
    if (selectAno) {
        let opcoesAno = `<option value="todos">Todos os Anos</option>`;
        const anoBase = parseInt(anoAtual);
        for (let i = 0; i <= 5; i++) {
            opcoesAno += `<option value="${anoBase - i}">${anoBase - i}</option>`;
        }
        selectAno.innerHTML = opcoesAno;
        selectAno.value = anoAtual;
    }

    // 2. Define o mês atual como padrão
    if (selectMes) {
        selectMes.value = mesAtual;
    }

    // 3. Adiciona ouvintes nos filtros para re-renderizar a tabela ao mudar
    if (selectMes) selectMes.addEventListener("change", renderizarTabela);
    if (selectAno) selectAno.addEventListener("change", renderizarTabela);
    if (selectTipo) selectTipo.addEventListener("change", renderizarTabela);

    // Renderiza a tabela pela primeira vez
    renderizarTabela();
});

// ==========================================
// RENDERIZAÇÃO E FILTROS
// ==========================================
function renderizarTabela() {
    if (!tbody) return;

    const filtroMes = selectMes ? selectMes.value : "todos";
    const filtroAno = selectAno ? selectAno.value : "todos";
    const filtroTipo = selectTipo ? selectTipo.value : "todos";

    let bancoLocal = JSON.parse(localStorage.getItem(obterChaveTransacoesTabela())) || [];

    // Aplicação dos Filtros
    if (filtroAno !== "todos") {
        bancoLocal = bancoLocal.filter((t) => t.data.split("-")[0] === filtroAno);
    }
    if (filtroMes !== "todos") {
        bancoLocal = bancoLocal.filter((t) => t.data.split("-")[1] === filtroMes);
    }
    if (filtroTipo !== "todos") {
        bancoLocal = bancoLocal.filter((t) => t.tipo === filtroTipo);
    }

    // Ordena da mais recente para a mais antiga
    bancoLocal.sort((a, b) => new Date(b.data) - new Date(a.data));

    // Tratamento para tabela vazia
    if (bancoLocal.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px;">Nenhuma movimentação encontrada para o período e filtros selecionados.</td></tr>`;
        return;
    }

    // Montagem das Linhas HTML
    tbody.innerHTML = bancoLocal.map((t) => {
        const isGanho = t.tipo === "ganho";
        const badgeClass = isGanho ? "badge-ganho" : "badge-gasto";
        const textTipo = isGanho ? "Ganho" : "Gasto";
        const signal = isGanho ? "+" : "-";
        const valClass = isGanho ? "pos" : "neg";

        return `
        <tr id="tr-${t.id}">
            <td><strong>${t.descricao}</strong></td>
            <td><span class="badge badge-categoria">${t.categoria}</span></td>
            <td>${formatarDataBR(t.data)}</td>
            <td><span class="badge ${badgeClass}">${textTipo}</span></td>
            <td style="text-align: right;" class="${valClass} privacy-blur">${signal} ${fmtBRL(t.valor)}</td>
            <td>
                <div class="action-buttons-wrap">
                    <button class="btn-edit-action" onclick="iniciarEdicao(${t.id})">Editar</button>
                    <button class="btn-danger-action" onclick="confirmarExclusao(${t.id})">Excluir</button>
                </div>
            </td>
        </tr>
        `;
    }).join("");
    
    // Re-aplica o blur se o modo anônimo estiver ativo (função importada do global.js)
    const btnBlur = document.getElementById("btn-blur");
    if (btnBlur && btnBlur.classList.contains("btn-active")) {
        document.querySelectorAll(".privacy-blur").forEach((el) => el.classList.add("blurred"));
    }
}

function formatarDataBR(dataIso) {
    const partes = dataIso.split("-");
    if (partes.length !== 3) return dataIso;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// ==========================================
// EXCLUSÃO (MODAL DE CONFIRMAÇÃO)
// ==========================================
function confirmarExclusao(id) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay-comum";
    
    const card = document.createElement("div");
    card.className = "modal-card-comum";
    
    card.innerHTML = `
        <h3 style="margin-bottom: 12px; color: var(--text-highlight);">Excluir Registro?</h3>
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 24px;">Esta ação não pode ser desfeita. O seu fluxo de caixa será atualizado imediatamente.</p>
        <div style="display: flex; flex-direction: column-reverse; gap: 12px;">
            <button id="cancel-delete-btn">Cancelar</button>
            <button id="confirm-delete-btn">Sim, Excluir</button>
        </div>
    `;
    
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    
    const fechar = () => overlay.remove();
    
    card.querySelector("#cancel-delete-btn").onclick = fechar;
    overlay.onclick = (e) => { if (e.target === overlay) fechar(); };
    
    card.querySelector("#confirm-delete-btn").onclick = () => {
        let banco = JSON.parse(localStorage.getItem(obterChaveTransacoesTabela())) || [];
        banco = banco.filter((t) => t.id !== id);
        localStorage.setItem(obterChaveTransacoesTabela(), JSON.stringify(banco));
        fechar();
        renderizarTabela();
        
        // Atualiza a barra lateral direita de "Atividade Recente" (via global.js)
        if (typeof renderizarListaAtividadeRecente === "function") {
            renderizarListaAtividadeRecente();
        }
    };
}

// ==========================================
// EDIÇÃO (MODO INLINE - NA PRÓPRIA LINHA)
// ==========================================
function iniciarEdicao(id) {
    const banco = JSON.parse(localStorage.getItem(obterChaveTransacoesTabela())) || [];
    const transacao = banco.find((t) => t.id === id);
    if (!transacao) return;

    const tr = document.getElementById(`tr-${id}`);
    if (!tr) return;

    tr.classList.add("row-editing");

    const categorias = ["Alimentação", "Transporte", "Lazer", "Trabalho", "Metas", "Outros"];
    const optionsCategoria = categorias.map(c => `<option value="${c}" ${transacao.categoria === c ? 'selected' : ''}>${c}</option>`).join('');

    tr.innerHTML = `
        <td><input type="text" id="edit-desc-${id}" class="form-input-inline" value="${transacao.descricao}"></td>
        <td><select id="edit-cat-${id}" class="form-select-inline">${optionsCategoria}</select></td>
        <td><input type="date" id="edit-data-${id}" class="form-input-inline" value="${transacao.data}"></td>
        <td>
            <select id="edit-tipo-${id}" class="form-select-inline">
                <option value="ganho" ${transacao.tipo === 'ganho' ? 'selected' : ''}>Ganho</option>
                <option value="gasto" ${transacao.tipo === 'gasto' ? 'selected' : ''}>Gasto</option>
            </select>
        </td>
        <td><input type="number" step="0.01" id="edit-valor-${id}" class="form-input-inline" value="${transacao.valor}"></td>
        <td>
            <div class="action-buttons-wrap">
                <button class="btn-cancel-action" onclick="renderizarTabela()">Cancelar</button>
                <button class="btn-save-action" onclick="salvarEdicao(${id})">Salvar</button>
            </div>
        </td>
    `;
}

function salvarEdicao(id) {
    const desc = document.getElementById(`edit-desc-${id}`).value.trim();
    const cat = document.getElementById(`edit-cat-${id}`).value;
    const data = document.getElementById(`edit-data-${id}`).value;
    const tipo = document.getElementById(`edit-tipo-${id}`).value;
    const valor = parseFloat(document.getElementById(`edit-valor-${id}`).value);

    if (!desc || isNaN(valor) || !data) {
        if (typeof mostrarNotificacaoErro === "function") {
            mostrarNotificacaoErro("Preencha todos os campos corretamente para salvar.");
        } else {
            alert("Preencha todos os campos corretamente para salvar.");
        }
        return;
    }

    let banco = JSON.parse(localStorage.getItem(obterChaveTransacoesTabela())) || [];
    const idx = banco.findIndex((t) => t.id === id);
    
    if (idx !== -1) {
        banco[idx] = { ...banco[idx], descricao: desc, categoria: cat, data, tipo, valor };
        localStorage.setItem(obterChaveTransacoesTabela(), JSON.stringify(banco));
    }

    // Re-renderiza a tabela para fechar a edição e recarrega widget lateral
    renderizarTabela();
    if (typeof renderizarListaAtividadeRecente === "function") {
        renderizarListaAtividadeRecente();
    }
}