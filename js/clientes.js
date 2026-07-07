import { db, auth } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

function formatarTelefone(numero) {

    if (!numero) return "";

    numero = numero.replace(/\D/g, "");

    if (numero.length === 11) {

        return numero.replace(
            /(\d{2})(\d{5})(\d{4})/,
            "($1) $2-$3"
        );

    }

    if (numero.length === 10) {

        return numero.replace(
            /(\d{2})(\d{4})(\d{4})/,
            "($1) $2-$3"
        );

    }

    return numero;

}

onAuthStateChanged(auth, (user) => {

    if (!user) {

        window.location.href = "login.html";
        return;

    }

    carregarClientes();

});

async function carregarClientes() {

    const lista = document.querySelector(".lista-clientes");

    lista.innerHTML = "";

    try {

        const q = query(
            collection(db, "agendamentos"),
            orderBy("nome")
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {

            lista.innerHTML = `
                <p style="text-align:center;padding:30px;">
                    Nenhum cliente encontrado.
                </p>
            `;

            return;

        }

        snapshot.forEach((doc) => {

            const cliente = doc.data();

            console.log(cliente);

            const card = document.createElement("div");

            card.className = "card-cliente";

            card.innerHTML = `
                <div class="cliente-info">

                    <div class="avatar">
                        <i class="fa-solid fa-user"></i>
                    </div>

                    <div class="dados-cliente">

                        <h3>${cliente.nome}</h3>

                                       <p>${formatarTelefone(cliente.telefone)}</p>

                        <span>
                            Último atendimento: ${formatarData(cliente.data)}
                        </span>

                    </div>

                </div>

                <button class="btn-historico">
                    Ver Histórico
                </button>
            `;

            lista.appendChild(card);

        });

        iniciarPesquisa();

    } catch (erro) {

        console.error("Erro ao carregar clientes:", erro);

    }

}

function formatarData(data) {

    if (!data) return "-";

    const partes = data.split("-");

    return `${partes[2]}/${partes[1]}/${partes[0]}`;

}

function iniciarPesquisa() {

    const campoBusca = document.getElementById("buscarCliente");

    if (!campoBusca) return;

    campoBusca.addEventListener("input", () => {

        const texto = campoBusca.value.toLowerCase();

        const clientes = document.querySelectorAll(".card-cliente");

        clientes.forEach((cliente) => {

            const nome = cliente.querySelector("h3").textContent.toLowerCase();

            const telefone = cliente.querySelector("p").textContent.toLowerCase();

            if (
                nome.includes(texto) ||
                telefone.includes(texto)
            ) {

                cliente.style.display = "flex";

            } else {

                cliente.style.display = "none";

            }

        });

    });

    const botoesHistorico = document.querySelectorAll(".btn-historico");

    botoesHistorico.forEach((botao) => {

        botao.addEventListener("click", () => {

            alert("Em breve será exibido o histórico deste cliente.");

        });

    });

}