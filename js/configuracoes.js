import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const CONFIG_REF = doc(db, "configuracoes", "sistema");

const CONFIG_PADRAO = {
    nomeSalao: "Soraya Arruda",
    whatsapp: "11974481955",
    endereco: "Atendimento em local próprio",
    horarioInicio: "08:00",
    horarioFim: "18:00",
    intervaloMinutos: 60,
    horarioAlmoco: "12:00",
    diasAtendimento: [1, 2, 3, 4, 5, 6]
};

const form = document.getElementById("formConfiguracoes");
const nomeSalao = document.getElementById("nomeSalao");
const whatsapp = document.getElementById("whatsapp");
const endereco = document.getElementById("endereco");
const horarioInicio = document.getElementById("horarioInicio");
const horarioFim = document.getElementById("horarioFim");
const intervaloMinutos = document.getElementById("intervaloMinutos");
const horarioAlmoco = document.getElementById("horarioAlmoco");
const mensagemStatus = document.getElementById("mensagemStatus");
const btnSair = document.getElementById("btnSair");

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    configurarEventos();
    await carregarConfiguracoes();
});

function configurarEventos() {
    form.addEventListener("submit", salvarConfiguracoes);

    whatsapp.addEventListener("input", () => {
        whatsapp.value = formatarTelefone(whatsapp.value);
    });

    btnSair.addEventListener("click", async (event) => {
        event.preventDefault();
        await signOut(auth);
        window.location.href = "login.html";
    });
}

async function carregarConfiguracoes() {
    try {
        const snapshot = await getDoc(CONFIG_REF);
        const dados = snapshot.exists() ? { ...CONFIG_PADRAO, ...snapshot.data() } : CONFIG_PADRAO;
        preencherFormulario(dados);
        definirMensagem(snapshot.exists() ? "Configurações carregadas." : "Usando configurações padrão. Clique em salvar para gravar.", "sucesso");
    } catch (erro) {
        console.error("Erro ao carregar configurações:", erro);
        preencherFormulario(CONFIG_PADRAO);
        definirMensagem("Não foi possível carregar. Usando padrão.", "erro");
    }
}

function preencherFormulario(dados) {
    nomeSalao.value = dados.nomeSalao || CONFIG_PADRAO.nomeSalao;
    whatsapp.value = formatarTelefone(dados.whatsapp || CONFIG_PADRAO.whatsapp);
    endereco.value = dados.endereco || "";
    horarioInicio.value = dados.horarioInicio || CONFIG_PADRAO.horarioInicio;
    horarioFim.value = dados.horarioFim || CONFIG_PADRAO.horarioFim;
    intervaloMinutos.value = String(dados.intervaloMinutos || CONFIG_PADRAO.intervaloMinutos);
    horarioAlmoco.value = dados.horarioAlmoco || "";

    const dias = (dados.diasAtendimento || CONFIG_PADRAO.diasAtendimento).map(Number);
    document.querySelectorAll('input[name="diasAtendimento"]').forEach((checkbox) => {
        checkbox.checked = dias.includes(Number(checkbox.value));
    });
}

async function salvarConfiguracoes(event) {
    event.preventDefault();

    const telefoneLimpo = somenteNumeros(whatsapp.value);
    const diasAtendimento = Array.from(document.querySelectorAll('input[name="diasAtendimento"]:checked')).map((item) => Number(item.value));

    if (!nomeSalao.value.trim() || !telefoneLimpo || !horarioInicio.value || !horarioFim.value) {
        definirMensagem("Preencha nome, WhatsApp e horários.", "erro");
        return;
    }

    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
        definirMensagem("Digite um WhatsApp válido com DDD.", "erro");
        whatsapp.focus();
        return;
    }

    if (horarioInicio.value >= horarioFim.value) {
        definirMensagem("O horário inicial precisa ser menor que o horário final.", "erro");
        return;
    }

    if (diasAtendimento.length === 0) {
        definirMensagem("Selecione pelo menos um dia de atendimento.", "erro");
        return;
    }

    const botao = form.querySelector("button[type='submit']");
    botao.disabled = true;
    botao.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvando...`;

    try {
        await setDoc(CONFIG_REF, {
            nomeSalao: nomeSalao.value.trim(),
            whatsapp: telefoneLimpo,
            endereco: endereco.value.trim(),
            horarioInicio: horarioInicio.value,
            horarioFim: horarioFim.value,
            intervaloMinutos: Number(intervaloMinutos.value),
            horarioAlmoco: horarioAlmoco.value || "",
            diasAtendimento,
            atualizadoEm: serverTimestamp()
        }, { merge: true });

        definirMensagem("Configurações salvas com sucesso!", "sucesso");
    } catch (erro) {
        console.error("Erro ao salvar configurações:", erro);
        definirMensagem("Não foi possível salvar as configurações.", "erro");
    } finally {
        botao.disabled = false;
        botao.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Salvar Configurações`;
    }
}

function definirMensagem(texto, tipo = "") {
    mensagemStatus.textContent = texto;
    mensagemStatus.className = `mensagem-status ${tipo}`.trim();
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
