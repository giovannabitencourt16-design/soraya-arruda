import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ===============================
// CONFIGURAÇÕES DA AGENDA
// ===============================
const HORARIOS = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00"
];

const HORARIOS_BLOQUEADOS = ["12:00"];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro"
];

// ===============================
// ELEMENTOS
// ===============================
const diasSemana = document.getElementById("diasSemana");
const listaAgenda = document.getElementById("listaAgenda");
const dataSelecionadaTexto = document.getElementById("dataSelecionadaTexto");
const totalAgendamentos = document.getElementById("totalAgendamentos");
const totalLivres = document.getElementById("totalLivres");
const semanaAnterior = document.getElementById("semanaAnterior");
const proximaSemana = document.getElementById("proximaSemana");
const abrirNovoAgendamento = document.getElementById("abrirNovoAgendamento");
const btnSair = document.getElementById("btnSair");

const modalAgendamento = document.getElementById("modalAgendamento");
const fecharModal = document.getElementById("fecharModal");
const cancelarModal = document.getElementById("cancelarModal");
const formAgendamento = document.getElementById("formAgendamento");
const tituloModal = document.getElementById("tituloModal");
const agendamentoId = document.getElementById("agendamentoId");
const nomeCliente = document.getElementById("nomeCliente");
const telefoneCliente = document.getElementById("telefoneCliente");
const dataAgendamento = document.getElementById("dataAgendamento");
const horarioAgendamento = document.getElementById("horarioAgendamento");
const observacoes = document.getElementById("observacoes");
const statusAgendamento = document.getElementById("statusAgendamento");

let dataSelecionada = formatarDataInput(new Date());
let inicioSemana = obterInicioSemana(new Date());
let agendamentosDoDia = [];

// ===============================
// AUTENTICAÇÃO
// ===============================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    iniciarAgenda();
});

// ===============================
// INICIALIZAÇÃO
// ===============================
function iniciarAgenda() {
    preencherSelectHorarios();
    definirDataMinima();
    renderizarSemana();
    carregarAgendaDoDia();
    configurarEventos();
}

function configurarEventos() {
    semanaAnterior.addEventListener("click", () => {
        inicioSemana.setDate(inicioSemana.getDate() - 7);
        renderizarSemana();
    });

    proximaSemana.addEventListener("click", () => {
        inicioSemana.setDate(inicioSemana.getDate() + 7);
        renderizarSemana();
    });

    abrirNovoAgendamento.addEventListener("click", () => {
        abrirModalNovo(dataSelecionada);
    });

    fecharModal.addEventListener("click", fecharModalAgendamento);
    cancelarModal.addEventListener("click", fecharModalAgendamento);

    modalAgendamento.addEventListener("click", (event) => {
        if (event.target === modalAgendamento) {
            fecharModalAgendamento();
        }
    });

    formAgendamento.addEventListener("submit", salvarAgendamento);

    telefoneCliente.addEventListener("input", () => {
        telefoneCliente.value = formatarTelefone(telefoneCliente.value);
    });

    dataAgendamento.addEventListener("change", preencherSelectHorarios);

    btnSair.addEventListener("click", async (event) => {
        event.preventDefault();
        await signOut(auth);
        window.location.href = "login.html";
    });
}

// ===============================
// SEMANA
// ===============================
function renderizarSemana() {
    diasSemana.innerHTML = "";

    for (let i = 0; i < 7; i++) {
        const data = new Date(inicioSemana);
        data.setDate(inicioSemana.getDate() + i);

        const dataFormatada = formatarDataInput(data);
        const botaoDia = document.createElement("button");
        botaoDia.className = dataFormatada === dataSelecionada ? "dia ativo" : "dia";
        botaoDia.type = "button";
        botaoDia.innerHTML = `
            <span>${DIAS_SEMANA[data.getDay()]}</span>
            <strong>${String(data.getDate()).padStart(2, "0")}</strong>
        `;

        botaoDia.addEventListener("click", () => {
            dataSelecionada = dataFormatada;
            renderizarSemana();
            carregarAgendaDoDia();
        });

        diasSemana.appendChild(botaoDia);
    }
}

// ===============================
// CARREGAR AGENDA
// ===============================
async function carregarAgendaDoDia() {
    listaAgenda.innerHTML = `<p class="mensagem">Carregando agenda...</p>`;
    dataSelecionadaTexto.textContent = formatarDataBRCompleta(dataSelecionada);

    try {
        const consulta = query(
            collection(db, "agendamentos"),
            where("data", "==", dataSelecionada),
            orderBy("horario")
        );

        const resultado = await getDocs(consulta);
        agendamentosDoDia = [];

        resultado.forEach((documento) => {
            agendamentosDoDia.push({
                id: documento.id,
                ...documento.data()
            });
        });

        renderizarLinhasAgenda();
    } catch (erro) {
        console.error("Erro ao carregar agenda:", erro);
        listaAgenda.innerHTML = `<p class="mensagem">Erro ao carregar a agenda.</p>`;
    }
}

function renderizarLinhasAgenda() {
    listaAgenda.innerHTML = "";

    const totalOcupados = agendamentosDoDia.filter((item) => item.status !== "cancelado").length;
    const livres = HORARIOS.filter((horario) => {
        const ocupado = agendamentosDoDia.some((item) => item.horario === horario && item.status !== "cancelado");
        return !HORARIOS_BLOQUEADOS.includes(horario) && !ocupado;
    }).length;

    totalAgendamentos.textContent = totalOcupados;
    totalLivres.textContent = livres;

    HORARIOS.forEach((horario) => {
        const agendamento = agendamentosDoDia.find((item) => item.horario === horario && item.status !== "cancelado");

        if (HORARIOS_BLOQUEADOS.includes(horario)) {
            listaAgenda.appendChild(criarLinhaBloqueada(horario));
            return;
        }

        if (agendamento) {
            listaAgenda.appendChild(criarLinhaOcupada(horario, agendamento));
            return;
        }

        listaAgenda.appendChild(criarLinhaLivre(horario));
    });
}

function criarLinhaLivre(horario) {
    const linha = document.createElement("div");
    linha.className = "linha livre";
    linha.innerHTML = `
        <div class="hora">${horario}</div>
        <div class="info">
            <strong>Livre</strong>
            <span>Nenhum atendimento.</span>
        </div>
        <div class="acoes-linha">
            <button class="btn-agendar" type="button">Agendar</button>
        </div>
    `;

    linha.querySelector(".btn-agendar").addEventListener("click", () => {
        abrirModalNovo(dataSelecionada, horario);
    });

    return linha;
}

function criarLinhaBloqueada(horario) {
    const linha = document.createElement("div");
    linha.className = "linha bloqueado";
    linha.innerHTML = `
        <div class="hora">${horario}</div>
        <div class="info">
            <strong>Almoço</strong>
            <span>Horário bloqueado.</span>
        </div>
        <div class="acoes-linha">
            <button class="btn-bloqueado" type="button">Bloqueado</button>
        </div>
    `;
    return linha;
}

function criarLinhaOcupada(horario, agendamento) {
    const linha = document.createElement("div");
    const status = agendamento.status || "confirmado";
    const classeStatus = status === "concluido" ? "concluido" : status === "cancelado" ? "cancelado" : "ocupado";

    linha.className = `linha ${classeStatus}`;
    linha.innerHTML = `
        <div class="hora">${horario}</div>
        <div class="info">
            <strong>${escapeHTML(agendamento.nome || "Cliente sem nome")}</strong>
            <span>${escapeHTML((agendamento.servicos || []).join(", ") || "Serviço não informado")}</span>
            <small>${escapeHTML(agendamento.telefone || "Telefone não informado")}</small>
            ${agendamento.observacoes ? `<small>Obs.: ${escapeHTML(agendamento.observacoes)}</small>` : ""}
            <span class="tag-status">${formatarStatus(status)}</span>
        </div>
        <div class="acoes-linha">
            <button class="btn-status" type="button" data-acao="concluido">Concluir</button>
            <button class="btn-editar" type="button" data-acao="editar">Editar</button>
            <button class="btn-excluir" type="button" data-acao="cancelar">Cancelar</button>
            <button class="btn-excluir" type="button" data-acao="excluir">Excluir</button>
        </div>
    `;

    linha.querySelector('[data-acao="concluido"]').addEventListener("click", () => alterarStatus(agendamento.id, "concluido"));
    linha.querySelector('[data-acao="editar"]').addEventListener("click", () => abrirModalEditar(agendamento));
    linha.querySelector('[data-acao="cancelar"]').addEventListener("click", () => alterarStatus(agendamento.id, "cancelado"));
    linha.querySelector('[data-acao="excluir"]').addEventListener("click", () => excluirAgendamento(agendamento.id));

    return linha;
}

// ===============================
// MODAL
// ===============================
function abrirModalNovo(data = dataSelecionada, horario = "") {
    formAgendamento.reset();
    tituloModal.textContent = "Novo Agendamento";
    agendamentoId.value = "";
    dataAgendamento.value = data;
    statusAgendamento.value = "confirmado";
    preencherSelectHorarios(horario);
    abrirModal();
}

function abrirModalEditar(agendamento) {
    formAgendamento.reset();
    tituloModal.textContent = "Editar Agendamento";
    agendamentoId.value = agendamento.id;
    nomeCliente.value = agendamento.nome || "";
    telefoneCliente.value = formatarTelefone(agendamento.telefone || "");
    dataAgendamento.value = agendamento.data || dataSelecionada;
    observacoes.value = agendamento.observacoes || "";
    statusAgendamento.value = agendamento.status || "confirmado";

    preencherSelectHorarios(agendamento.horario || "");

    const servicosSelecionados = agendamento.servicos || [];
    document.querySelectorAll('input[name="servicos"]').forEach((checkbox) => {
        checkbox.checked = servicosSelecionados.includes(checkbox.value);
    });

    abrirModal();
}

function abrirModal() {
    modalAgendamento.classList.add("ativo");
    modalAgendamento.setAttribute("aria-hidden", "false");
    nomeCliente.focus();
}

function fecharModalAgendamento() {
    modalAgendamento.classList.remove("ativo");
    modalAgendamento.setAttribute("aria-hidden", "true");
    formAgendamento.reset();
    agendamentoId.value = "";
}

function preencherSelectHorarios(horarioSelecionado = "") {
    if (!horarioAgendamento) return;

    horarioAgendamento.innerHTML = `<option value="">Selecione</option>`;

    HORARIOS.forEach((horario) => {
        if (HORARIOS_BLOQUEADOS.includes(horario)) return;

        const option = document.createElement("option");
        option.value = horario;
        option.textContent = horario;

        if (horario === horarioSelecionado) {
            option.selected = true;
        }

        horarioAgendamento.appendChild(option);
    });
}

function definirDataMinima() {
    const hoje = formatarDataInput(new Date());
    dataAgendamento.min = hoje;
}

// ===============================
// SALVAR / EDITAR
// ===============================
async function salvarAgendamento(event) {
    event.preventDefault();

    const id = agendamentoId.value;
    const servicosSelecionados = Array.from(document.querySelectorAll('input[name="servicos"]:checked')).map((item) => item.value);

    if (!nomeCliente.value.trim() || !telefoneCliente.value.trim() || !dataAgendamento.value || !horarioAgendamento.value || servicosSelecionados.length === 0) {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }

    if (HORARIOS_BLOQUEADOS.includes(horarioAgendamento.value)) {
        alert("Este horário está bloqueado.");
        return;
    }

    const existeConflito = await verificarConflitoHorario(dataAgendamento.value, horarioAgendamento.value, id);

    if (existeConflito) {
        alert("Este horário já está ocupado. Escolha outro horário.");
        return;
    }

    const dados = {
        nome: nomeCliente.value.trim(),
        telefone: somenteNumeros(telefoneCliente.value),
        data: dataAgendamento.value,
        horario: horarioAgendamento.value,
        servicos: servicosSelecionados,
        observacoes: observacoes.value.trim(),
        status: statusAgendamento.value,
        atualizadoEm: serverTimestamp()
    };

    try {
        if (id) {
            await updateDoc(doc(db, "agendamentos", id), dados);
        } else {
            await addDoc(collection(db, "agendamentos"), {
                ...dados,
                criadoEm: serverTimestamp()
            });
        }

        await salvarClienteSeNecessario(dados);

        dataSelecionada = dataAgendamento.value;
        inicioSemana = obterInicioSemana(criarDataLocal(dataSelecionada));
        renderizarSemana();
        fecharModalAgendamento();
        await carregarAgendaDoDia();

        alert(id ? "Agendamento atualizado com sucesso!" : "Agendamento criado com sucesso!");
    } catch (erro) {
        console.error("Erro ao salvar agendamento:", erro);
        alert("Não foi possível salvar o agendamento.");
    }
}

async function verificarConflitoHorario(data, horario, idAtual = "") {
    const consulta = query(
        collection(db, "agendamentos"),
        where("data", "==", data),
        where("horario", "==", horario)
    );

    const resultado = await getDocs(consulta);
    let conflito = false;

    resultado.forEach((documento) => {
        const dados = documento.data();
        if (documento.id !== idAtual && dados.status !== "cancelado") {
            conflito = true;
        }
    });

    return conflito;
}

async function salvarClienteSeNecessario(dados) {
    const telefone = somenteNumeros(dados.telefone);

    if (!telefone) return;

    const consulta = query(collection(db, "clientes"), where("telefone", "==", telefone));
    const resultado = await getDocs(consulta);

    const cliente = {
        nome: dados.nome,
        telefone,
        observacoes: dados.observacoes || "",
        ultimoAtendimento: dados.data,
        atualizadoEm: serverTimestamp()
    };

    if (resultado.empty) {
        await addDoc(collection(db, "clientes"), {
            ...cliente,
            criadoEm: serverTimestamp()
        });
        return;
    }

    const primeiroCliente = resultado.docs[0];
    await updateDoc(doc(db, "clientes", primeiroCliente.id), cliente);
}

// ===============================
// STATUS / EXCLUIR
// ===============================
async function alterarStatus(id, status) {
    const mensagem = status === "cancelado" ? "Cancelar este agendamento?" : "Marcar este agendamento como concluído?";

    if (!confirm(mensagem)) return;

    try {
        await updateDoc(doc(db, "agendamentos", id), {
            status,
            atualizadoEm: serverTimestamp()
        });

        await carregarAgendaDoDia();
    } catch (erro) {
        console.error("Erro ao alterar status:", erro);
        alert("Não foi possível alterar o status.");
    }
}

async function excluirAgendamento(id) {
    if (!confirm("Excluir este agendamento definitivamente?")) return;

    try {
        await deleteDoc(doc(db, "agendamentos", id));
        await carregarAgendaDoDia();
    } catch (erro) {
        console.error("Erro ao excluir agendamento:", erro);
        alert("Não foi possível excluir o agendamento.");
    }
}

// ===============================
// HELPERS
// ===============================
function obterInicioSemana(data) {
    const copia = new Date(data);
    const dia = copia.getDay();
    copia.setDate(copia.getDate() - dia);
    copia.setHours(0, 0, 0, 0);
    return copia;
}

function formatarDataInput(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function criarDataLocal(dataString) {
    const [ano, mes, dia] = dataString.split("-").map(Number);
    return new Date(ano, mes - 1, dia);
}

function formatarDataBRCompleta(dataString) {
    const data = criarDataLocal(dataString);
    return `${String(data.getDate()).padStart(2, "0")} de ${MESES[data.getMonth()]} de ${data.getFullYear()}`;
}

function somenteNumeros(valor) {
    return String(valor || "").replace(/\D/g, "");
}

function formatarTelefone(valor) {
    const numeros = somenteNumeros(valor).slice(0, 11);

    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    if (numeros.length <= 10) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;

    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function formatarStatus(status) {
    const statusMap = {
        confirmado: "Confirmado",
        pendente: "Pendente",
        concluido: "Concluído",
        cancelado: "Cancelado"
    };

    return statusMap[status] || "Confirmado";
}

function escapeHTML(valor) {
    return String(valor || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
