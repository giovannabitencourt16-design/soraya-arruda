import { db, auth } from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const listaClientes = document.querySelector(".lista-clientes");
const campoBusca = document.getElementById("buscarCliente");
const modalCliente = document.getElementById("modalNovoCliente");
const modalHistorico = document.getElementById("modalHistorico");
const formCliente = document.getElementById("formNovoCliente");
const btnAbrirModal = document.getElementById("abrirNovoCliente");
const btnFecharModal = document.getElementById("fecharNovoCliente");
const btnCancelarModal = document.getElementById("cancelarNovoCliente");
const btnFecharHistorico = document.getElementById("fecharHistorico");
const conteudoHistorico = document.getElementById("conteudoHistorico");
const nomeCliente = document.getElementById("nomeCliente");
const telefoneCliente = document.getElementById("telefoneCliente");
const observacaoCliente = document.getElementById("observacaoCliente");
const tituloModalCliente = modalCliente?.querySelector(".modal-topo h2");
const btnSalvarCliente = formCliente?.querySelector(".btn-salvar");

let clientes = [];
let clienteEditandoId = null;

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    iniciarEventos();
    carregarClientes();
});

function iniciarEventos() {
    btnAbrirModal?.addEventListener("click", abrirModalNovoCliente);
    btnFecharModal?.addEventListener("click", fecharModalCliente);
    btnCancelarModal?.addEventListener("click", fecharModalCliente);
    btnFecharHistorico?.addEventListener("click", fecharModalHistorico);
    formCliente?.addEventListener("submit", salvarCliente);

    telefoneCliente?.addEventListener("input", () => {
        telefoneCliente.value = formatarTelefone(telefoneCliente.value);
    });

    campoBusca?.addEventListener("input", renderizarClientes);

    modalCliente?.addEventListener("click", (evento) => {
        if (evento.target === modalCliente) fecharModalCliente();
    });

    modalHistorico?.addEventListener("click", (evento) => {
        if (evento.target === modalHistorico) fecharModalHistorico();
    });

    const linkSair = document.querySelector('a[href="login.html"]');

    linkSair?.addEventListener("click", async (evento) => {
        evento.preventDefault();

        try {
            await signOut(auth);
            window.location.href = "login.html";
        } catch (erro) {
            console.error("Erro ao sair:", erro);
            alert("Não foi possível sair agora. Tente novamente.");
        }
    });
}

async function carregarClientes() {
    if (!listaClientes) return;

    listaClientes.innerHTML = `<p class="mensagem-lista">Carregando clientes...</p>`;

    try {
        const clientesSnapshot = await getDocs(
            query(collection(db, "clientes"), orderBy("nome"))
        );

        clientes = clientesSnapshot.docs.map((documento) => ({
            id: documento.id,
            origem: "clientes",
            ...documento.data()
        }));

        if (clientes.length === 0) {
            await carregarClientesDosAgendamentos();
        }

        renderizarClientes();
    } catch (erro) {
        console.error("Erro ao carregar clientes:", erro);
        listaClientes.innerHTML = `
            <p class="mensagem-lista erro">
                Não foi possível carregar os clientes.
            </p>
        `;
    }
}

async function carregarClientesDosAgendamentos() {
    try {
        const agendamentosSnapshot = await getDocs(collection(db, "agendamentos"));
        const mapaClientes = new Map();

        agendamentosSnapshot.forEach((documento) => {
            const agendamento = documento.data();
            const nome = agendamento.nome || agendamento.cliente || "";
            const telefone = agendamento.telefone || "";

            if (!nome && !telefone) return;

            const chave = normalizarTelefone(telefone) || nome.toLowerCase().trim();
            const clienteExistente = mapaClientes.get(chave);

            if (!clienteExistente) {
                mapaClientes.set(chave, {
                    id: documento.id,
                    origem: "agendamentos",
                    nome,
                    telefone,
                    observacao: agendamento.observacao || agendamento.observacoes || "",
                    ultimoAtendimento: agendamento.data || ""
                });
                return;
            }

            if (agendamento.data && agendamento.data > (clienteExistente.ultimoAtendimento || "")) {
                clienteExistente.ultimoAtendimento = agendamento.data;
            }
        });

        clientes = Array.from(mapaClientes.values()).sort((a, b) => {
            return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
        });
    } catch (erro) {
        console.error("Erro ao carregar clientes dos agendamentos:", erro);
    }
}

function renderizarClientes() {
    if (!listaClientes) return;

    const textoBusca = campoBusca?.value.trim().toLowerCase() || "";

    const clientesFiltrados = clientes.filter((cliente) => {
        const nome = (cliente.nome || "").toLowerCase();
        const telefone = formatarTelefone(cliente.telefone || "").toLowerCase();
        const observacao = (cliente.observacao || "").toLowerCase();

        return (
            nome.includes(textoBusca) ||
            telefone.includes(textoBusca) ||
            observacao.includes(textoBusca)
        );
    });

    if (clientesFiltrados.length === 0) {
        listaClientes.innerHTML = `
            <p class="mensagem-lista">
                Nenhum cliente encontrado.
            </p>
        `;
        return;
    }

    listaClientes.innerHTML = clientesFiltrados.map((cliente) => {
        const observacao = cliente.observacao
            ? `<span><strong>Obs.:</strong> ${escaparHTML(cliente.observacao)}</span>`
            : `<span>Sem observações cadastradas.</span>`;

        const avisoOrigem = cliente.origem === "agendamentos"
            ? `<small class="aviso-cliente">Cliente encontrado pelos agendamentos. Edite para salvar no cadastro fixo.</small>`
            : "";

        return `
            <article class="card-cliente" data-id="${cliente.id}" data-origem="${cliente.origem}">
                <div class="cliente-info">
                    <div class="avatar">
                        <i class="fa-solid fa-user"></i>
                    </div>

                    <div class="dados-cliente">
                        <h3>${escaparHTML(cliente.nome || "Cliente sem nome")}</h3>
                        <p>${formatarTelefone(cliente.telefone || "Telefone não informado")}</p>
                        <span>Último atendimento: ${formatarData(cliente.ultimoAtendimento || cliente.data)}</span>
                        ${observacao}
                        ${avisoOrigem}
                    </div>
                </div>

                <div class="acoes-cliente">
                    <button class="btn-historico" data-acao="historico">
                        Ver Histórico
                    </button>

                    <button class="btn-editar" data-acao="editar">
                        <i class="fa-solid fa-pen"></i>
                        Editar
                    </button>

                    <button class="btn-excluir" data-acao="excluir">
                        <i class="fa-solid fa-trash"></i>
                        Excluir
                    </button>
                </div>
            </article>
        `;
    }).join("");

    document.querySelectorAll(".card-cliente button").forEach((botao) => {
        botao.addEventListener("click", tratarAcaoCliente);
    });
}

async function salvarCliente(evento) {
    evento.preventDefault();

    const nome = nomeCliente.value.trim();
    const telefone = normalizarTelefone(telefoneCliente.value);
    const observacao = observacaoCliente.value.trim();

    if (!nome) {
        alert("Digite o nome do cliente.");
        nomeCliente.focus();
        return;
    }

    if (telefone.length < 10 || telefone.length > 11) {
        alert("Digite um telefone válido com DDD.");
        telefoneCliente.focus();
        return;
    }

    const clienteDuplicado = clientes.find((cliente) => {
        const mesmoTelefone = normalizarTelefone(cliente.telefone) === telefone;
        const naoEhClienteEditando = cliente.id !== clienteEditandoId;
        return mesmoTelefone && naoEhClienteEditando && cliente.origem === "clientes";
    });

    if (clienteDuplicado) {
        alert("Já existe um cliente cadastrado com esse telefone.");
        telefoneCliente.focus();
        return;
    }

    const dadosCliente = {
        nome,
        telefone,
        observacao,
        nomeBusca: nome.toLowerCase(),
        telefoneBusca: telefone,
        atualizadoEm: serverTimestamp()
    };

    btnSalvarCliente.disabled = true;
    btnSalvarCliente.textContent = clienteEditandoId ? "Salvando..." : "Cadastrando...";

    try {
        if (clienteEditandoId) {
            const clienteAtual = clientes.find((cliente) => cliente.id === clienteEditandoId);

            if (clienteAtual?.origem === "clientes") {
                await updateDoc(doc(db, "clientes", clienteEditandoId), dadosCliente);
            } else {
                await addDoc(collection(db, "clientes"), {
                    ...dadosCliente,
                    criadoEm: serverTimestamp()
                });
            }
        } else {
            await addDoc(collection(db, "clientes"), {
                ...dadosCliente,
                criadoEm: serverTimestamp()
            });
        }

        fecharModalCliente();
        await carregarClientes();
    } catch (erro) {
        console.error("Erro ao salvar cliente:", erro);
        alert("Não foi possível salvar o cliente. Tente novamente.");
    } finally {
        btnSalvarCliente.disabled = false;
        btnSalvarCliente.textContent = clienteEditandoId ? "Salvar Alterações" : "Salvar Cliente";
    }
}

function tratarAcaoCliente(evento) {
    const botao = evento.currentTarget;
    const card = botao.closest(".card-cliente");
    const id = card?.dataset.id;
    const origem = card?.dataset.origem;
    const acao = botao.dataset.acao;
    const cliente = clientes.find((item) => item.id === id && item.origem === origem);

    if (!cliente) return;

    if (acao === "historico") abrirHistorico(cliente);
    if (acao === "editar") abrirModalEditarCliente(cliente);
    if (acao === "excluir") excluirCliente(cliente);
}

function abrirModalNovoCliente() {
    clienteEditandoId = null;
    formCliente.reset();
    tituloModalCliente.textContent = "Novo Cliente";
    btnSalvarCliente.textContent = "Salvar Cliente";
    abrirModal(modalCliente);
    nomeCliente.focus();
}

function abrirModalEditarCliente(cliente) {
    clienteEditandoId = cliente.id;
    nomeCliente.value = cliente.nome || "";
    telefoneCliente.value = formatarTelefone(cliente.telefone || "");
    observacaoCliente.value = cliente.observacao || "";
    tituloModalCliente.textContent = "Editar Cliente";
    btnSalvarCliente.textContent = "Salvar Alterações";
    abrirModal(modalCliente);
    nomeCliente.focus();
}

function fecharModalCliente() {
    clienteEditandoId = null;
    formCliente?.reset();
    tituloModalCliente.textContent = "Novo Cliente";
    btnSalvarCliente.textContent = "Salvar Cliente";
    fecharModal(modalCliente);
}

async function excluirCliente(cliente) {
    if (cliente.origem !== "clientes") {
        alert("Esse cliente veio da lista de agendamentos. Para apagar, primeiro salve ele como cliente fixo editando o cadastro.");
        return;
    }

    const confirmar = confirm(`Deseja realmente excluir ${cliente.nome}?`);

    if (!confirmar) return;

    try {
        await deleteDoc(doc(db, "clientes", cliente.id));
        await carregarClientes();
    } catch (erro) {
        console.error("Erro ao excluir cliente:", erro);
        alert("Não foi possível excluir o cliente. Tente novamente.");
    }
}

async function abrirHistorico(cliente) {
    abrirModal(modalHistorico);

    conteudoHistorico.innerHTML = `
        <p class="mensagem-lista">Carregando histórico...</p>
    `;

    try {
        const snapshot = await getDocs(collection(db, "agendamentos"));
        const telefoneClienteAtual = normalizarTelefone(cliente.telefone);
        const nomeClienteAtual = (cliente.nome || "").toLowerCase().trim();

        const historico = [];

        snapshot.forEach((documento) => {
            const agendamento = documento.data();
            const telefoneAgendamento = normalizarTelefone(agendamento.telefone);
            const nomeAgendamento = (agendamento.nome || agendamento.cliente || "").toLowerCase().trim();

            if (
                (telefoneClienteAtual && telefoneAgendamento === telefoneClienteAtual) ||
                (nomeClienteAtual && nomeAgendamento === nomeClienteAtual)
            ) {
                historico.push(agendamento);
            }
        });

        historico.sort((a, b) => (b.data || "").localeCompare(a.data || ""));

        if (historico.length === 0) {
            conteudoHistorico.innerHTML = `
                <p class="sem-historico">Nenhum atendimento encontrado.</p>
            `;
            return;
        }

        conteudoHistorico.innerHTML = historico.map((item) => {
            const servicos = Array.isArray(item.servicos)
                ? item.servicos.join(", ")
                : (item.servico || item.servicos || "Serviço não informado");

            return `
                <div class="item-historico">
                    <strong>${formatarData(item.data)} ${item.horario ? `às ${item.horario}` : ""}</strong>
                    <span>${escaparHTML(servicos)}</span>
                    <small>Status: ${escaparHTML(item.status || "Agendado")}</small>
                </div>
            `;
        }).join("");
    } catch (erro) {
        console.error("Erro ao carregar histórico:", erro);
        conteudoHistorico.innerHTML = `
            <p class="mensagem-lista erro">
                Não foi possível carregar o histórico.
            </p>
        `;
    }
}

function fecharModalHistorico() {
    fecharModal(modalHistorico);
}

function abrirModal(modal) {
    modal?.classList.add("ativo");
    document.body.classList.add("modal-aberto");
}

function fecharModal(modal) {
    modal?.classList.remove("ativo");
    document.body.classList.remove("modal-aberto");
}

function formatarTelefone(numero) {
    const somenteNumeros = normalizarTelefone(numero);

    if (somenteNumeros.length === 11) {
        return somenteNumeros.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }

    if (somenteNumeros.length === 10) {
        return somenteNumeros.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }

    return numero || "";
}

function normalizarTelefone(numero) {
    return String(numero || "").replace(/\D/g, "");
}

function formatarData(data) {
    if (!data || typeof data !== "string") return "-";

    const partes = data.split("-");

    if (partes.length !== 3) return data;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function escaparHTML(texto) {
    return String(texto || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
