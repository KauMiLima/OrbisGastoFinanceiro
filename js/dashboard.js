let meuGrafico = null;

const obterChaveTransacoesDash = () => obterChaveUsuario("transacoes");

document.addEventListener("DOMContentLoaded", () => {
  const dataHoje = new Date();
  const mesAtual = String(dataHoje.getMonth() + 1).padStart(2, "0");
  const anoAtual = String(dataHoje.getFullYear());

  const selectMes = document.getElementById("filter-mes-global");
  const selectAno = document.getElementById("filter-ano-global");

  if (selectAno) {
    gerarOpcoesDeAno(selectAno, anoAtual);
    selectAno.addEventListener("change", executarRecalculoDashboard);
  }

  if (selectMes) {
    selectMes.value = mesAtual;
    selectMes.addEventListener("change", executarRecalculoDashboard);
  }

  inicializarGrafico();
  executarRecalculoDashboard();
});

function gerarOpcoesDeAno(elementoSelect, anoAtual) {
  let opcoesHtml = `<option value="todos">Todos os Anos</option>`;
  const anoBaseSurgimento = parseInt(anoAtual);

  for (let i = 0; i <= 5; i++) {
    const anoLoop = anoBaseSurgimento - i;
    opcoesHtml += `<option value="${anoLoop}">${anoLoop}</option>`;
  }

  elementoSelect.innerHTML = opcoesHtml;
  elementoSelect.value = anoAtual;
}

function executarRecalculoDashboard() {
  const filtroMes = document.getElementById("filter-mes-global").value;
  const filtroAno = document.getElementById("filter-ano-global").value;

  // Leitura estritamente segura atrelada ao e-mail do usuário ativo
  let bancoLocalTransacoes =
    JSON.parse(localStorage.getItem(obterChaveTransacoesDash())) || [];
  let transacoesFiltradas = [...bancoLocalTransacoes];

  if (filtroAno !== "todos") {
    transacoesFiltradas = transacoesFiltradas.filter(
      (t) => t.data.split("-")[0] === filtroAno,
    );
  }
  if (filtroMes !== "todos") {
    transacoesFiltradas = transacoesFiltradas.filter(
      (t) => t.data.split("-")[1] === filtroMes,
    );
  }

  const ganhos = transacoesFiltradas
    .filter((t) => t.tipo === "ganho")
    .reduce((sum, t) => sum + t.valor, 0);
  const gastos = transacoesFiltradas
    .filter((t) => t.tipo === "gasto")
    .reduce((sum, t) => sum + t.valor, 0);
  const balancoTotal = ganhos - gastos;

  document.getElementById("total-balance").innerText = fmtBRL(balancoTotal);
  document.getElementById("total-income").innerText = fmtBRL(ganhos);
  document.getElementById("total-expense").innerText = fmtBRL(gastos);

  const cardBalanco = document.getElementById("total-balance");
  cardBalanco.className = `metric-value privacy-blur ${balancoTotal >= 0 ? "pos" : "neg"}`;

  atualizarCurvasGrafico(transacoesFiltradas, balancoTotal);
}

function inicializarGrafico() {
  const canvas = document.getElementById("mainFinanceChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, "rgba(255, 205, 0, 0.15)");
  gradient.addColorStop(1, "rgba(25, 34, 48, 0.0)");

  meuGrafico = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Ponto 1", "Ponto 2", "Ponto 3", "Ponto 4", "Ponto 5"],
      datasets: [
        {
          data: [0, 0, 0, 0, 0],
          borderColor: "#ffcd00",
          borderWidth: 2,
          fill: true,
          backgroundColor: gradient,
          tension: 0.4,
          pointRadius: 2,
          pointBackgroundColor: "#ffcd00",
          pointBorderColor: "#192230",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#828f99" }, grid: { display: false } },
        y: {
          grid: {
            color: "rgba(61, 71, 78, 0.2)",
            borderDash: [5, 5],
          },
          ticks: { color: "#828f99" },
        },
      },
    },
  });
}

function atualizarCurvasGrafico(dadosFiltrados, saldoFinalPeriodo) {
  if (!meuGrafico) return;

  let acum = 0;
  const pts = [0];

  [...dadosFiltrados]
    .sort((a, b) => new Date(a.data) - new Date(b.data))
    .forEach((t) => {
      if (t.tipo === "ganho") acum += t.valor;
      else acum -= t.valor;
      pts.push(acum);
    });

  while (pts.length < 5) pts.push(saldoFinalPeriodo);

  meuGrafico.data.datasets[0].data = pts.slice(-5);
  document.getElementById("chart-status").innerText =
    `Balanço do Período Filtrado: ${fmtBRL(saldoFinalPeriodo)}`;
  meuGrafico.update();
}
