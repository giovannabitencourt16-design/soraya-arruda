import { auth } from "./firebase.js"; import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js"; onAuthStateChanged(auth, (user) => { if (!user) { window.location.href = "login.html"; } });

// ===============================
// AGENDA DA PROFISSIONAL
// ===============================

// ===============================
// BOTÕES AGENDAR
// ===============================

const botoesAgendar = document.querySelectorAll(".btn-agendar");

botoesAgendar.forEach((botao) => {

    botao.addEventListener("click", () => {

        alert("Em breve será possível cadastrar um agendamento por aqui.");

    });

});

// ===============================
// CARREGAMENTO
// ===============================

document.addEventListener("DOMContentLoaded", () => {

    console.log("Agenda carregada com sucesso.");

});