import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const formLogin = document.getElementById("formLogin");

formLogin.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    try {

        await signInWithEmailAndPassword(auth, email, senha);

        alert("Login realizado com sucesso!");

        window.location.href = "dashboard.html";

    } catch (erro) {

        alert("E-mail ou senha incorretos.");

        console.error(erro);

    }

});