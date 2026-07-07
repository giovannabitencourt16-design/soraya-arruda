import { auth, db } from "./firebase.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// ===============================
// Dashboard
// ===============================

document.addEventListener("DOMContentLoaded", () => {

    onAuthStateChanged(auth, (user) => {

        if (!user) {
            window.location.href = "login.html";
            return;
        }

        const calendarEl = document.getElementById("calendar");

        if (!calendarEl) return;

        const calendar = new FullCalendar.Calendar(calendarEl, {

            locale: "pt-br",

            initialView: "dayGridMonth",

            height: "auto",

            selectable: true,

            headerToolbar: {
                left: "prev,next",
                center: "title",
                right: ""
            },

            buttonText: {
                today: "Hoje"
            },

            dateClick(info) {

                atualizarAgenda(info.dateStr);

            }

        });

        calendar.render();

        const hoje = new Date().toISOString().split("T")[0];

        atualizarAgenda(hoje);

    });

});

// =====================================
// Buscar agendamentos
// =====================================

async function atualizarAgenda(data) {

    const titulo = document.getElementById("dataSelecionada");

    const lista = document.getElementById("listaAgendamentos");

    const partes = data.split("-");

    titulo.textContent = `${partes[2]}/${partes[1]}/${partes[0]}`;

    lista.innerHTML = "<p>Carregando...</p>";

    try {

        const q = query(
            collection(db, "agendamentos"),
            where("data", "==", data),
            orderBy("horario")
        );

        const snapshot = await getDocs(q);

        lista.innerHTML = "";

        if (snapshot.empty) {

            lista.innerHTML = "<p>Nenhum agendamento para esta data.</p>";

            return;

        }

        snapshot.forEach(doc => {

            const agendamento = doc.data();

            lista.innerHTML += `

                <div class="agendamento">

                    <div class="hora">
                        ${agendamento.horario}
                    </div>

                    <div class="cliente">

                        <strong>${agendamento.nome}</strong>

                        <p>${agendamento.servicos.join(", ")}</p>

                    </div>

                    <span class="status confirmado">
                        Confirmado
                    </span>

                </div>

            `;

        });

    } catch (erro) {

        console.error(erro);

        lista.innerHTML = "<p>Erro ao carregar agenda.</p>";

    }

}