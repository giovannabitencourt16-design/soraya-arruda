import { db, auth } from "./firebase.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// =====================================
// PROTEÇÃO DA PÁGINA
// =====================================

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    }
});

// =====================================
// ELEMENTOS
// =====================================

const listaServicos = document.getElementById("listaServicos");
const buscarServico = document.getElementById("buscarServico");
const modalServico = document.getElementById("modalServico");
const abrirModalServico = document.getElementById("abrirModalServico");
const fecharModalServico = document.getElementById("fecharModalServico");
const cancelarServico = document.getElementById("cancelarServico");
const formServico = document.getElementById("formServico");
const tituloModal = document.getElementById("tituloModal");
const btnSalvarServico = document.getElementById("btnSalvarServico");
const btnSair = document.getElementById("btnSair");

const servicoId = document.getElementById("servicoId");
const nomeServico = document.getElementById("nomeServico");
const categoriaServico = document.getElementById("categoriaServico");
const tempoServico = document.getElementById("tempoServico");
const valorServico = document.getElementById("valorServico");
const statusServico = document.getElementById("statusServico");
const descricaoServico = document.getElementById("descricaoServico");

let servicos = [];
let filtroAtual = "";

const servicosPadrao = [
    {
        nome: "Mão",
        categoria: "Mãos",
        tempo: 60,
        valor: 25,
        status: "ativo",
        descricao: "Serviço de manicure simples."
    },
    {
        nome: "Pé",
        categoria: "Pés",
        tempo: 60,
        valor: 30,
        status: "ativo",
        descricao: "Serviço de pedicure simples."
    },
    {
        nome: "Esmaltação",
        categoria: "Finalização",
        tempo: 40,
        valor: 10,
        status: "ativo",
        descricao: "Esmaltação simples."
    }
];

// =====================================
// FUNÇÕES AUXILIARES
// =====================================

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function escaparTexto(texto) {
    return String(texto || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escolherIcone(categoria, nome) {
    const texto = `${categoria || ""} ${nome || ""}`.toLowerCase();

    if (texto.includes("pé") || texto.includes("pés")) {
        return "fa-shoe-prints";
    }

    if (texto.includes("esmal")) {
        return "fa-palette";
    }

    return "fa-hand-sparkles";
}

function abrirModal(servico = null) {
    formServico.reset();

    if (servico) {
        tituloModal.textContent = "Editar Serviço";
        btnSalvarServico.textContent = "Salvar Alterações";

        servicoId.value = servico.id;
        nomeServico.value = servico.nome || "";
        categoriaServico.value = servico.categoria || "";
        tempoServico.value = servico.tempo || "";
        valorServico.value = servico.valor || "";
        statusServico.value = servico.status || "ativo";
        descricaoServico.value = servico.descricao || "";
    } else {
        tituloModal.textContent = "Novo Serviço";
        btnSalvarServico.textContent = "Salvar Serviço";
        servicoId.value = "";
        statusServico.value = "ativo";
    }

    modalServico.classList.add("ativo");
    modalServico.setAttribute("aria-hidden", "false");
    nomeServico.focus();
}

function fecharModal() {
    modalServico.classList.remove("ativo");
    modalServico.setAttribute("aria-hidden", "true");
    formServico.reset();
    servicoId.value = "";
}

function renderizarServicos() {
    const textoBusca = filtroAtual.trim().toLowerCase();

    const servicosFiltrados = servicos.filter((servico) => {
        const texto = `${servico.nome || ""} ${servico.categoria || ""} ${servico.tempo || ""} ${servico.valor || ""} ${servico.status || ""}`.toLowerCase();
        return texto.includes(textoBusca);
    });

    if (servicosFiltrados.length === 0) {
        listaServicos.innerHTML = `<div class="mensagem-lista">Nenhum serviço encontrado.</div>`;
        return;
    }

    listaServicos.innerHTML = servicosFiltrados.map((servico) => {
        const status = servico.status || "ativo";
        const textoStatus = status === "ativo" ? "Ativo" : "Inativo";
        const textoBotaoStatus = status === "ativo" ? "Inativar" : "Ativar";
        const icone = escolherIcone(servico.categoria, servico.nome);

        return `
            <div class="card-servico" data-id="${servico.id}">
                <div class="icone">
                    <i class="fa-solid ${icone}"></i>
                </div>

                <div class="info">
                    <h3>${escaparTexto(servico.nome)}</h3>
                    <p><strong>Categoria:</strong> ${escaparTexto(servico.categoria)}</p>
                    <p><strong>Duração:</strong> ${Number(servico.tempo || 0)} minutos</p>
                    <p><strong>Valor:</strong> ${formatarMoeda(servico.valor)}</p>
                    ${servico.descricao ? `<p><strong>Obs:</strong> ${escaparTexto(servico.descricao)}</p>` : ""}
                    <span class="status ${status}">${textoStatus}</span>
                </div>

                <div class="acoes">
                    <button class="btn-editar" data-id="${servico.id}">
                        <i class="fa-solid fa-pen"></i>
                        Editar
                    </button>

                    <button class="btn-status" data-id="${servico.id}">
                        <i class="fa-solid fa-toggle-on"></i>
                        ${textoBotaoStatus}
                    </button>

                    <button class="btn-excluir" data-id="${servico.id}">
                        <i class="fa-solid fa-trash"></i>
                        Excluir
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

async function criarServicosPadraoSeNecessario() {
    const resultado = await getDocs(collection(db, "servicos"));

    if (!resultado.empty) {
        return;
    }

    for (const servico of servicosPadrao) {
        await addDoc(collection(db, "servicos"), {
            ...servico,
            criadoEm: serverTimestamp(),
            atualizadoEm: serverTimestamp()
        });
    }
}

async function carregarServicos() {
    listaServicos.innerHTML = `<div class="mensagem-lista">Carregando serviços...</div>`;

    try {
        await criarServicosPadraoSeNecessario();

        const consulta = query(collection(db, "servicos"), orderBy("nome"));
        const resultado = await getDocs(consulta);

        servicos = resultado.docs.map((documento) => ({
            id: documento.id,
            ...documento.data()
        }));

        renderizarServicos();
    } catch (erro) {
        console.error("Erro ao carregar serviços:", erro);
        listaServicos.innerHTML = `<div class="mensagem-lista">Erro ao carregar serviços. Verifique o console.</div>`;
    }
}

function validarServico() {
    const nome = nomeServico.value.trim();
    const categoria = categoriaServico.value.trim();
    const tempo = Number(tempoServico.value);
    const valor = Number(valorServico.value);

    if (!nome || !categoria || !tempoServico.value || !valorServico.value) {
        alert("Preencha todos os campos obrigatórios.");
        return false;
    }

    if (tempo <= 0) {
        alert("A duração precisa ser maior que zero.");
        return false;
    }

    if (valor < 0) {
        alert("O valor não pode ser negativo.");
        return false;
    }

    const nomeDuplicado = servicos.some((servico) => {
        return servico.nome.toLowerCase() === nome.toLowerCase() && servico.id !== servicoId.value;
    });

    if (nomeDuplicado) {
        alert("Já existe um serviço com esse nome.");
        return false;
    }

    return true;
}

async function salvarServico(evento) {
    evento.preventDefault();

    if (!validarServico()) {
        return;
    }

    const id = servicoId.value;

    const dadosServico = {
        nome: nomeServico.value.trim(),
        categoria: categoriaServico.value.trim(),
        tempo: Number(tempoServico.value),
        valor: Number(valorServico.value),
        status: statusServico.value,
        descricao: descricaoServico.value.trim(),
        atualizadoEm: serverTimestamp()
    };

    try {
        btnSalvarServico.disabled = true;
        btnSalvarServico.textContent = "Salvando...";

        if (id) {
            await updateDoc(doc(db, "servicos", id), dadosServico);
            alert("Serviço atualizado com sucesso!");
        } else {
            await addDoc(collection(db, "servicos"), {
                ...dadosServico,
                criadoEm: serverTimestamp()
            });
            alert("Serviço cadastrado com sucesso!");
        }

        fecharModal();
        await carregarServicos();
    } catch (erro) {
        console.error("Erro ao salvar serviço:", erro);
        alert("Não foi possível salvar o serviço.");
    } finally {
        btnSalvarServico.disabled = false;
        btnSalvarServico.textContent = servicoId.value ? "Salvar Alterações" : "Salvar Serviço";
    }
}

async function alternarStatus(id) {
    const servico = servicos.find((item) => item.id === id);

    if (!servico) {
        return;
    }

    const novoStatus = servico.status === "ativo" ? "inativo" : "ativo";

    try {
        await updateDoc(doc(db, "servicos", id), {
            status: novoStatus,
            atualizadoEm: serverTimestamp()
        });

        await carregarServicos();
    } catch (erro) {
        console.error("Erro ao alterar status:", erro);
        alert("Não foi possível alterar o status do serviço.");
    }
}

async function excluirServico(id) {
    const servico = servicos.find((item) => item.id === id);

    if (!servico) {
        return;
    }

    const confirmar = confirm(`Deseja realmente excluir o serviço "${servico.nome}"?`);

    if (!confirmar) {
        return;
    }

    try {
        await deleteDoc(doc(db, "servicos", id));
        alert("Serviço excluído com sucesso!");
        await carregarServicos();
    } catch (erro) {
        console.error("Erro ao excluir serviço:", erro);
        alert("Não foi possível excluir o serviço.");
    }
}

// =====================================
// EVENTOS
// =====================================

abrirModalServico.addEventListener("click", () => abrirModal());
fecharModalServico.addEventListener("click", fecharModal);
cancelarServico.addEventListener("click", fecharModal);
formServico.addEventListener("submit", salvarServico);

modalServico.addEventListener("click", (evento) => {
    if (evento.target === modalServico) {
        fecharModal();
    }
});

buscarServico.addEventListener("input", () => {
    filtroAtual = buscarServico.value;
    renderizarServicos();
});

listaServicos.addEventListener("click", (evento) => {
    const botaoEditar = evento.target.closest(".btn-editar");
    const botaoStatus = evento.target.closest(".btn-status");
    const botaoExcluir = evento.target.closest(".btn-excluir");

    if (botaoEditar) {
        const servico = servicos.find((item) => item.id === botaoEditar.dataset.id);
        abrirModal(servico);
        return;
    }

    if (botaoStatus) {
        alternarStatus(botaoStatus.dataset.id);
        return;
    }

    if (botaoExcluir) {
        excluirServico(botaoExcluir.dataset.id);
    }
});

btnSair.addEventListener("click", async (evento) => {
    evento.preventDefault();

    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch (erro) {
        console.error("Erro ao sair:", erro);
        alert("Não foi possível sair agora.");
    }
});

carregarServicos();
