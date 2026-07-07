import { auth } from "./firebase.js"; import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js"; onAuthStateChanged(auth, (user) => { if (!user) { window.location.href = "login.html"; } });

// =====================================
// SERVIÇOS - PAINEL ADMINISTRATIVO
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("Página de serviços carregada com sucesso.");

    // =====================================
    // BOTÃO NOVO SERVIÇO
    // =====================================

    const btnNovo = document.querySelector(".btn-novo");

    if (btnNovo) {

        btnNovo.addEventListener("click", () => {

            alert("Em breve será possível cadastrar novos serviços.");

        });

    }

    // =====================================
    // BOTÕES EDITAR
    // =====================================

    const botoesEditar = document.querySelectorAll(".btn-editar");

    botoesEditar.forEach((botao) => {

        botao.addEventListener("click", () => {

            const nomeServico = botao
                .closest(".card-servico")
                .querySelector("h3")
                .textContent;

            alert(`Editar serviço: ${nomeServico}`);

        });

    });

    // =====================================
    // BOTÕES EXCLUIR
    // =====================================

    const botoesExcluir = document.querySelectorAll(".btn-excluir");

    botoesExcluir.forEach((botao) => {

        botao.addEventListener("click", () => {

            const card = botao.closest(".card-servico");

            const nomeServico = card.querySelector("h3").textContent;

            const confirmar = confirm(
                `Deseja realmente excluir o serviço "${nomeServico}"?`
            );

            if (confirmar) {

                card.remove();

            }

        });

    });

        // =====================================
    // PESQUISA DE SERVIÇOS
    // =====================================

    const campoBusca = document.getElementById("buscarServico");

    if (campoBusca) {

        campoBusca.addEventListener("input", () => {

            const texto = campoBusca.value.trim().toLowerCase();

            const servicos = document.querySelectorAll(".card-servico");

            servicos.forEach((servico) => {

                const nome = servico.querySelector("h3")
                    ? servico.querySelector("h3").textContent.toLowerCase()
                    : "";

                const categoria = servico.querySelectorAll("p")[0]
                    ? servico.querySelectorAll("p")[0].textContent.toLowerCase()
                    : "";

                const duracao = servico.querySelectorAll("p")[1]
                    ? servico.querySelectorAll("p")[1].textContent.toLowerCase()
                    : "";

                const valor = servico.querySelectorAll("p")[2]
                    ? servico.querySelectorAll("p")[2].textContent.toLowerCase()
                    : "";

                if (
                    nome.includes(texto) ||
                    categoria.includes(texto) ||
                    duracao.includes(texto) ||
                    valor.includes(texto)
                ) {

                    servico.style.display = "flex";

                } else {

                    servico.style.display = "none";

                }

            });

        });

    }

});