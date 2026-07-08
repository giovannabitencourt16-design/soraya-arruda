import { auth, db } from "./firebase.js";

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const totalHoje = document.getElementById("totalHoje");
const proximoHorario = document.getElementById("proximoHorario");
const faturamentoHoje = document.getElementById("faturamentoHoje");
const totalClientes = document.getElementById("totalClientes");
const dataSelecionada = document.getElementById("dataSelecionada");
const listaAgendamentos = document.getElementById("listaAgendamentos");
const btnSair = document.getElementById("btnSair");
const abrirNovoAgendamento = document.getElementById("abrirNovoAgendamento");
const acaoNovoAgendamento = document.getElementById("acaoNovoAgendamento");
const acaoAgenda = document.getElementById("acaoAgenda");
const acaoClientes = document.getElementById("acaoClientes");
const acaoServicos = document.getElementById("acaoServicos");

let mapaValoresServicos = new Map();
let calendar = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    configurarBotoes();
    await carregarValoresServicos();
    await carregarResumoGeral();
    iniciarCalendario();

    const hoje = formatarDataInput(new Date());
    await atualizarAgenda(hoje);
});

function configurarBotoes() {
    btnSair?.addEventListener("click", async (event) => {
        event.preventDefault();
        await signOut(auth);
        window.location.href = "login.html";
    });

    abrirNovoAgendamento?.addEventListener("click", () => {
        window.location.href = "agenda.html";
    });

    acaoNovoAgendamento?.addEventListener("click", () => {
        window.location.href = "agenda.html";
    });

    acaoAgenda?.addEventListener("click", () => {
        window.location.href = "agenda.html";
    });

    acaoClientes?.addEventListener("click", () => {
        window.location.href = "clientes.html";
    });

    acaoServicos?.addEventListener("click", () => {
        window.location.href = "servicos.html";
    });
}

function iniciarCalendario() {
    const calendarEl = document.getElementById("calendar");

    if (!calendarEl || typeof FullCalendar === "undefined") return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        locale: "pt-br",
        initialView: "dayGridMonth",
        height: "auto",
        selectable: true,
        headerToolbar: {
            left: "prev,next",
            center: "title",
            right: ""
        },
        dateClick(info) {
            atualizarAgenda(info.dateStr);
        }
    });

    calendar.render();
}

async function carregarValoresServicos() {
    mapaValoresServicos = new Map();

    try {
        const resultado = await getDocs(collection(db, "servicos"));

        resultado.forEach((documento) => {
            const servico = documento.data();
            const nome = normalizarTexto(servico.nome);
            const valor = Number(servico.valor || 0);

            if (nome) {
                mapaValoresServicos.set(nome, valor);
            }
        });
    } catch (erro) {
        console.error("Erro ao carregar valores dos serviços:", erro);
    }
}

async function carregarResumoGeral() {
    try {
        const resultadoClientes = await getDocs(collection(db, "clientes"));
        if (totalClientes) totalClientes.textContent = resultadoClientes.size;
    } catch (erro) {
        console.error("Erro ao carregar total de clientes:", erro);
        if (totalClientes) totalClientes.textContent = "0";
    }
}

async function atualizarAgenda(data) {
    if (!listaAgendamentos) return;

    dataSelecionada.textContent = formatarDataBR(data);
    listaAgendamentos.innerHTML = `<p class="mensagem-vazia">Carregando agenda...</p>`;

    try {
        const consulta = query(
            collection(db, "agendamentos"),
            where("data", "==", data),
            orderBy("horario")
        );

        const resultado = await getDocs(consulta);
        const agendamentos = resultado.docs.map((documento) => ({
            id: documento.id,
            ...documento.data()
        }));

        atualizarCardsDoDia(agendamentos, data);
        renderizarLista(agendamentos);
    } catch (erro) {
        console.error("Erro ao carregar agenda:", erro);
        listaAgendamentos.innerHTML = `<p class="mensagem-vazia">Erro ao carregar agenda.</p>`;
    }
}

function atualizarCardsDoDia(agendamentos, data) {
    const agendamentosValidos = agendamentos.filter((item) => item.status !== "cancelado");

    if (totalHoje) totalHoje.textContent = agendamentosValidos.length;

    if (faturamentoHoje) {
        const total = agendamentosValidos.reduce((soma, agendamento) => soma + calcularValorAgendamento(agendamento), 0);
        faturamentoHoje.textContent = formatarMoeda(total);
    }

    if (proximoHorario) {
        const hoje = formatarDataInput(new Date());
        const horaAtual = obterHoraAtual();

        const proximos = agendamentosValidos.filter((agendamento) => {
            if (!agendamento.horario) return false;
            if (data > hoje) return true;
            if (data < hoje) return false;
            return agendamento.horario >= horaAtual;
        });

        proximoHorario.textContent = proximos[0]?.horario || "--:--";
    }
}

function renderizarLista(agendamentos) {
    if (agendamentos.length === 0) {
        listaAgendamentos.innerHTML = `<p class="mensagem-vazia">Nenhum agendamento para esta data.</p>`;
        return;
    }

    listaAgendamentos.innerHTML = agendamentos.map((agendamento) => {
        const status = agendamento.status || "confirmado";
        const servicos = Array.isArray(agendamento.servicos) && agendamento.servicos.length > 0
            ? agendamento.servicos.join(", ")
            : "Serviço não informado";

        return `
            <div class="agendamento">
                <div class="hora">${escapeHTML(agendamento.horario || "--:--")}</div>

                <div class="cliente">
                    <strong>${escapeHTML(agendamento.nome || "Cliente sem nome")}</strong>
                    <p>${escapeHTML(servicos)}</p>
                </div>

                <span class="status ${escapeHTML(status)}">${formatarStatus(status)}</span>
            </div>
        `;
    }).join("");
}

function calcularValorAgendamento(agendamento) {
    if (typeof agendamento.valor === "number") return agendamento.valor;
    if (!Array.isArray(agendamento.servicos)) return 0;

    return agendamento.servicos.reduce((total, nomeServico) => {
        const chave = normalizarTexto(nomeServico);
        return total + Number(mapaValoresServicos.get(chave) || 0);
    }, 0);
}

function formatarDataInput(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function formatarDataBR(data) {
    const partes = String(data || "").split("-");
    if (partes.length !== 3) return "";
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obterHoraAtual() {
    const agora = new Date();
    const hora = String(agora.getHours()).padStart(2, "0");
    const minuto = String(agora.getMinutes()).padStart(2, "0");
    return `${hora}:${minuto}`;
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarStatus(status) {
    const nomes = {
        confirmado: "Confirmado",
        concluido: "Concluído",
        cancelado: "Cancelado",
        pendente: "Pendente"
    };

    return nomes[status] || "Confirmado";
}

function normalizarTexto(valor) {
    return String(valor || "").trim().toLowerCase();
}

function escapeHTML(valor) {
    return String(valor || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
