import { db } from "./firebase.js";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ===============================
// CONFIGURAÇÕES
// ===============================
const CONFIG_PADRAO = {
    nomeSalao: "Soraya Arruda",
    whatsapp: "11974481955",
    horarioInicio: "08:00",
    horarioFim: "18:00",
    intervaloMinutos: 60,
    horarioAlmoco: "12:00",
    diasAtendimento: [1, 2, 3, 4, 5, 6]
};

let HORARIOS = gerarHorarios(CONFIG_PADRAO.horarioInicio, CONFIG_PADRAO.horarioFim, CONFIG_PADRAO.intervaloMinutos);
let HORARIOS_BLOQUEADOS = [CONFIG_PADRAO.horarioAlmoco];
let WHATSAPP_SORAYA = `55${CONFIG_PADRAO.whatsapp}`;
let diasAtendimento = CONFIG_PADRAO.diasAtendimento;

const SERVICOS_PADRAO = [
    { nome: "Mão", valor: 25, tempo: 60, categoria: "Mãos", status: "ativo" },
    { nome: "Pé", valor: 30, tempo: 60, categoria: "Pés", status: "ativo" },
    { nome: "Esmaltação", valor: 10, tempo: 40, categoria: "Finalização", status: "ativo" }
];

// ===============================
// ELEMENTOS
// ===============================
const nome = document.getElementById("nome");
const telefone = document.getElementById("telefone");
const data = document.getElementById("data");
const listaServicosCliente = document.getElementById("listaServicosCliente");
const mensagemServicos = document.getElementById("mensagemServicos");
const listaHorarios = document.getElementById("listaHorarios");
const btnAgendar = document.getElementById("btnAgendar");
const mensagemStatus = document.getElementById("mensagemStatus");

const resumoNome = document.getElementById("resumoNome");
const resumoServicos = document.getElementById("resumoServicos");
const resumoTempo = document.getElementById("resumoTempo");
const resumoValor = document.getElementById("resumoValor");
const resumoData = document.getElementById("resumoData");
const resumoHorario = document.getElementById("resumoHorario");

let servicosDisponiveis = [];
let agendamentosDoDia = [];
let bloqueiosDoDia = [];
let horarioSelecionado = "";

// ===============================
// INÍCIO
// ===============================
document.addEventListener("DOMContentLoaded", iniciarPagina);

async function iniciarPagina() {
    definirDataMinima();
    configurarEventos();
    await carregarConfiguracoes();
    renderizarHorarios();
    await carregarServicos();
    atualizarResumo();
}

function configurarEventos() {
    nome.addEventListener("input", atualizarResumo);

    telefone.addEventListener("input", () => {
        telefone.value = formatarTelefone(telefone.value);
        atualizarResumo();
    });

    data.addEventListener("change", async () => {
        horarioSelecionado = "";
        if (!diaAtendimentoPermitido(data.value)) {
            alert("Este dia não está configurado como dia de atendimento.");
        }
        await carregarHorariosOcupados();
        atualizarResumo();
    });

    btnAgendar.addEventListener("click", confirmarAgendamento);
}

function definirDataMinima() {
    data.min = formatarDataInput(new Date());
}

// ===============================
// SERVIÇOS
// ===============================
async function carregarConfiguracoes() {
    try {
        const snapshot = await getDoc(doc(db, "configuracoes", "sistema"));
        const config = snapshot.exists() ? { ...CONFIG_PADRAO, ...snapshot.data() } : CONFIG_PADRAO;

        HORARIOS = gerarHorarios(config.horarioInicio, config.horarioFim, Number(config.intervaloMinutos || 60));
        HORARIOS_BLOQUEADOS = config.horarioAlmoco ? [config.horarioAlmoco] : [];
        WHATSAPP_SORAYA = `55${somenteNumeros(config.whatsapp || CONFIG_PADRAO.whatsapp)}`;
        diasAtendimento = (config.diasAtendimento || CONFIG_PADRAO.diasAtendimento).map(Number);
    } catch (erro) {
        console.warn("Configurações não carregadas. Usando padrão.", erro);
    }
}

// ===============================
// SERVIÇOS
// ===============================
async function carregarServicos() {
    mensagemServicos.textContent = "Carregando serviços...";

    try {
        const consulta = query(collection(db, "servicos"), orderBy("nome"));
        const resultado = await getDocs(consulta);

        const servicosFirestore = resultado.docs
            .map((documento) => ({ id: documento.id, ...documento.data() }))
            .filter((servico) => (servico.status || "ativo") === "ativo");

        servicosDisponiveis = servicosFirestore.length > 0 ? servicosFirestore : SERVICOS_PADRAO;
        mensagemServicos.textContent = "";
    } catch (erro) {
        console.error("Erro ao carregar serviços:", erro);
        servicosDisponiveis = SERVICOS_PADRAO;
        mensagemServicos.textContent = "Usando serviços padrão.";
    }

    renderizarServicos();
}

function renderizarServicos() {
    listaServicosCliente.innerHTML = servicosDisponiveis.map((servico) => {
        const nomeServico = servico.nome || "Serviço";
        const valorServico = Number(servico.valor || servico.preco || 0);
        const tempoServico = Number(servico.tempo || 0);
        const icone = escolherIcone(servico.categoria, nomeServico);

        return `
            <label class="servico-card">
                <input
                    type="checkbox"
                    class="servico"
                    data-servico="${escapeHTML(nomeServico)}"
                    data-preco="${valorServico}"
                    data-tempo="${tempoServico}"
                >

                <div class="conteudo-servico">
                    <i class="fa-solid ${icone}"></i>
                    <h3>${escapeHTML(nomeServico)}</h3>
                    <p>${formatarMoeda(valorServico)}</p>
                    <span>${tempoServico} minutos</span>
                </div>
            </label>
        `;
    }).join("");

    document.querySelectorAll(".servico").forEach((servico) => {
        servico.addEventListener("change", atualizarResumo);
    });
}

function escolherIcone(categoria, nomeServico) {
    const texto = `${categoria || ""} ${nomeServico || ""}`.toLowerCase();

    if (texto.includes("pé") || texto.includes("pés")) return "fa-shoe-prints";
    if (texto.includes("esmal")) return "fa-palette";
    return "fa-hand-sparkles";
}

// ===============================
// HORÁRIOS
// ===============================
async function carregarHorariosOcupados() {
    agendamentosDoDia = [];
    bloqueiosDoDia = [];
    

    if (!data.value) {
        renderizarHorarios();
        return;
    }

    try {
        const consulta = query(
            collection(db, "agendamentos"),
            where("data", "==", data.value)
        );

        const resultado = await getDocs(consulta);

        agendamentosDoDia = resultado.docs.map((documento) => ({
            id: documento.id,
            ...documento.data()
        }));

        const consultaBloqueios = query(
            collection(db, "bloqueiosHorarios"),
            where("data", "==", data.value)
        );

        const resultadoBloqueios = await getDocs(consultaBloqueios);

        bloqueiosDoDia = resultadoBloqueios.docs.map((documento) => ({
            id: documento.id,
            ...documento.data()
        }));
    } catch (erro) {
        console.error("Erro ao carregar horários ocupados:", erro);
        alert("Não foi possível verificar os horários ocupados agora.");
    }

    renderizarHorarios();
}

function renderizarHorarios() {
    listaHorarios.innerHTML = "";

    HORARIOS.forEach((horario) => {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "horario";
        botao.textContent = horario;

        const bloqueioManual = bloqueiosDoDia.find((bloqueio) => bloqueio.horario === horario);
        const estaBloqueado = HORARIOS_BLOQUEADOS.includes(horario) || Boolean(bloqueioManual);
        const estaOcupado = agendamentosDoDia.some((agendamento) => {
            return agendamento.horario === horario && (agendamento.status || "confirmado") !== "cancelado";
        });

        if (estaBloqueado || estaOcupado) {
            botao.classList.add("bloqueado");
            botao.disabled = true;
            botao.title = estaBloqueado ? (bloqueioManual?.motivo || "Horário bloqueado") : "Horário já ocupado";
        }

        if (horario === horarioSelecionado) {
            botao.classList.add("ativo");
        }

        botao.addEventListener("click", () => {
            if (botao.disabled) return;

            horarioSelecionado = horario;
            renderizarHorarios();
            atualizarResumo();
        });

        listaHorarios.appendChild(botao);
    });
}

// ===============================
// RESUMO
// ===============================
function atualizarResumo() {
    const servicosSelecionados = obterServicosSelecionados();
    const tempoTotal = servicosSelecionados.reduce((total, servico) => total + servico.tempo, 0);
    const valorTotal = servicosSelecionados.reduce((total, servico) => total + servico.valor, 0);

    resumoNome.textContent = nome.value.trim() || "—";
    resumoServicos.textContent = servicosSelecionados.length > 0
        ? servicosSelecionados.map((servico) => servico.nome).join(", ")
        : "Nenhum";
    resumoTempo.textContent = `${tempoTotal} min`;
    resumoValor.textContent = formatarMoeda(valorTotal);
    resumoData.textContent = data.value ? formatarDataBR(data.value) : "—";
    resumoHorario.textContent = horarioSelecionado || "—";
}

function obterServicosSelecionados() {
    return Array.from(document.querySelectorAll(".servico:checked")).map((servico) => ({
        nome: servico.dataset.servico,
        valor: Number(servico.dataset.preco || 0),
        tempo: Number(servico.dataset.tempo || 0)
    }));
}

// ===============================
// SALVAR AGENDAMENTO
// ===============================
async function confirmarAgendamento() {
    const servicosSelecionados = obterServicosSelecionados();
    const telefoneLimpo = somenteNumeros(telefone.value);

    if (!nome.value.trim() || !telefoneLimpo || !data.value || !horarioSelecionado || servicosSelecionados.length === 0) {
        alert("Preencha todos os campos antes de confirmar.");
        return;
    }

    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
        alert("Digite um WhatsApp válido com DDD.");
        telefone.focus();
        return;
    }

    if (data.value < formatarDataInput(new Date())) {
        alert("Escolha uma data a partir de hoje.");
        data.focus();
        return;
    }

    if (!diaAtendimentoPermitido(data.value)) {
        alert("Este dia não está disponível para atendimento.");
        data.focus();
        return;
    }

    if (HORARIOS_BLOQUEADOS.includes(horarioSelecionado) || await verificarHorarioBloqueado(data.value, horarioSelecionado)) {
        alert("Este horário está bloqueado.");
        await carregarHorariosOcupados();
        return;
    }

    btnAgendar.disabled = true;
    btnAgendar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvando...`;
    mensagemStatus.textContent = "Verificando disponibilidade...";

    try {
        const bloqueadoAgora = await verificarHorarioBloqueado(data.value, horarioSelecionado);

        if (bloqueadoAgora) {
            alert("Este horário acabou de ser bloqueado. Escolha outro horário.");
            await carregarHorariosOcupados();
            return;
        }

        const conflito = await verificarConflitoHorario(data.value, horarioSelecionado);

        if (conflito) {
            alert("Este horário acabou de ser ocupado. Escolha outro horário.");
            await carregarHorariosOcupados();
            return;
        }

        const dadosAgendamento = montarDadosAgendamento(servicosSelecionados, telefoneLimpo);

        await addDoc(collection(db, "agendamentos"), {
            ...dadosAgendamento,
            criadoEm: serverTimestamp(),
            atualizadoEm: serverTimestamp()
        });

        await salvarClienteSeNecessario(dadosAgendamento);
        await carregarHorariosOcupados();

        mensagemStatus.textContent = "Agendamento salvo com sucesso! Abrindo WhatsApp...";
        alert("Agendamento realizado com sucesso!");

        abrirWhatsApp(dadosAgendamento);
        limparFormulario();
    } catch (erro) {
        console.error("Erro ao salvar agendamento:", erro);
        alert("Não foi possível salvar o agendamento. Tente novamente.");
        mensagemStatus.textContent = "Não foi possível salvar. Tente novamente.";
    } finally {
        btnAgendar.disabled = false;
        btnAgendar.innerHTML = `<i class="fa-brands fa-whatsapp"></i> Confirmar Agendamento`;
    }
}

function montarDadosAgendamento(servicosSelecionados, telefoneLimpo) {
    const tempoTotal = servicosSelecionados.reduce((total, servico) => total + servico.tempo, 0);
    const valorTotal = servicosSelecionados.reduce((total, servico) => total + servico.valor, 0);

    return {
        nome: nome.value.trim(),
        telefone: telefoneLimpo,
        data: data.value,
        horario: horarioSelecionado,
        servicos: servicosSelecionados.map((servico) => servico.nome),
        tempoTotal,
        valorTotal,
        status: "confirmado",
        origem: "site"
    };
}

async function verificarConflitoHorario(dataAgendamento, horarioAgendamento) {
    const consulta = query(
        collection(db, "agendamentos"),
        where("data", "==", dataAgendamento),
        where("horario", "==", horarioAgendamento)
    );

    const resultado = await getDocs(consulta);
    let conflito = false;

    resultado.forEach((documento) => {
        const dados = documento.data();
        if ((dados.status || "confirmado") !== "cancelado") {
            conflito = true;
        }
    });

    return conflito;
}

async function verificarHorarioBloqueado(dataAgendamento, horarioAgendamento) {
    if (HORARIOS_BLOQUEADOS.includes(horarioAgendamento)) {
        return true;
    }

    const consulta = query(
        collection(db, "bloqueiosHorarios"),
        where("data", "==", dataAgendamento),
        where("horario", "==", horarioAgendamento)
    );

    const resultado = await getDocs(consulta);
    return !resultado.empty;
}

async function salvarClienteSeNecessario(dados) {
    const consulta = query(collection(db, "clientes"), where("telefone", "==", dados.telefone));
    const resultado = await getDocs(consulta);

    const cliente = {
        nome: dados.nome,
        telefone: dados.telefone,
        observacoes: "Cliente cadastrado pelo agendamento público.",
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

function abrirWhatsApp(agendamento) {
    const mensagem = `Olá, Soraya! Gostaria de confirmar meu agendamento:%0A%0A` +
        `Nome: ${agendamento.nome}%0A` +
        `WhatsApp: ${formatarTelefone(agendamento.telefone)}%0A` +
        `Serviços: ${agendamento.servicos.join(", ")}%0A` +
        `Data: ${formatarDataBR(agendamento.data)}%0A` +
        `Horário: ${agendamento.horario}%0A` +
        `Tempo total: ${agendamento.tempoTotal} min%0A` +
        `Valor: ${formatarMoeda(agendamento.valorTotal)}`;

    window.open(`https://api.whatsapp.com/send?phone=${WHATSAPP_SORAYA}&text=${mensagem}`, "_blank");
}

function limparFormulario() {
    nome.value = "";
    telefone.value = "";
    data.value = "";
    horarioSelecionado = "";
    agendamentosDoDia = [];
    bloqueiosDoDia = [];

    document.querySelectorAll(".servico").forEach((servico) => {
        servico.checked = false;
    });

    renderizarHorarios();
    atualizarResumo();
    mensagemStatus.textContent = "Ao confirmar, seu agendamento será salvo e você poderá abrir o WhatsApp com a mensagem pronta.";
}

// ===============================
// FORMATADORES
// ===============================
function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
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

function gerarHorarios(inicio = "08:00", fim = "18:00", intervalo = 60) {
    const horarios = [];
    let atual = converterParaMinutos(inicio);
    const limite = converterParaMinutos(fim);
    const passo = Number(intervalo || 60);

    while (atual <= limite) {
        horarios.push(converterParaHorario(atual));
        atual += passo;
    }

    return horarios;
}

function converterParaMinutos(horario) {
    const [hora, minuto] = String(horario || "00:00").split(":").map(Number);
    return (hora * 60) + (minuto || 0);
}

function converterParaHorario(minutos) {
    const hora = String(Math.floor(minutos / 60)).padStart(2, "0");
    const minuto = String(minutos % 60).padStart(2, "0");
    return `${hora}:${minuto}`;
}

function diaAtendimentoPermitido(dataISO) {
    if (!dataISO) return true;
    const [ano, mes, dia] = dataISO.split("-").map(Number);
    const dataLocal = new Date(ano, mes - 1, dia);
    return diasAtendimento.includes(dataLocal.getDay());
}

function formatarDataInput(dataOriginal) {
    const dataLocal = new Date(dataOriginal);
    const ano = dataLocal.getFullYear();
    const mes = String(dataLocal.getMonth() + 1).padStart(2, "0");
    const dia = String(dataLocal.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function formatarDataBR(dataISO) {
    if (!dataISO) return "—";
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
}

function escapeHTML(valor) {
    return String(valor || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
