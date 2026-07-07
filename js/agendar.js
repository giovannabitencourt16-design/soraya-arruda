

//===============================
// BOTÃO AGENDAR
//===============================

console.log("Cheguei no botão");

const btnAgendar = document.getElementById("btnAgendar");

console.log(btnAgendar);

btnAgendar.addEventListener("click", async () => {

    let listaServicos = [];

    servicos.forEach(servico => {

        if (servico.checked) {

            listaServicos.push(servico.dataset.servico);

        }

    });

    if (
        nome.value.trim() === "" ||
        telefone.value.trim() === "" ||
        data.value === "" ||
        horarioSelecionado === "" ||
        listaServicos.length === 0
    ) {

        alert("Preencha todos os campos antes de confirmar.");
        return;

    }

    const agendamento = {

        nome: nome.value.trim(),
        telefone: telefone.value.trim(),
        data: data.value,
        horario: horarioSelecionado,
        servicos: listaServicos,
        criadoEm: new Date()

    };

    console.log("Salvando:", agendamento);

    try {

    // Verifica se o horário já está ocupado
    const consulta = query(
        collection(db, "agendamentos"),
        where("data", "==", data.value),
        where("horario", "==", horarioSelecionado)
    );

    const resultado = await getDocs(consulta);

    if (!resultado.empty) {

        alert("Este horário já está ocupado. Escolha outro horário.");

        await carregarHorariosOcupados(data.value);

        return;

    }

    // Salva o agendamento
    const docRef = await addDoc(
        collection(db, "agendamentos"),
        agendamento
    );

    console.log("Documento salvo:", docRef.id);

    alert("Agendamento realizado com sucesso!");

    // Atualiza os horários ocupados
    await carregarHorariosOcupados(data.value);

} catch (erro) {

    console.error("Erro ao salvar:", erro);

    alert("Não foi possível salvar o agendamento.");

}

    let listaServicos = [];

    servicos.forEach(servico => {

        if (servico.checked) {

            listaServicos.push(servico.dataset.servico);

        }

    });

    if (
        nome.value.trim() === "" ||
        telefone.value.trim() === "" ||
        data.value === "" ||
        horarioSelecionado === "" ||
        listaServicos.length === 0
    ) {

        alert("Preencha todos os campos antes de confirmar.");
        return;

    }

    const agendamento = {

        nome: nome.value.trim(),
        telefone: telefone.value.trim(),
        data: data.value,
        horario: horarioSelecionado,
        servicos: listaServicos,
        criadoEm: new Date()

    };

    try {

        // Verifica se o horário já existe
        const consulta = query(
            collection(db, "agendamentos"),
            where("data", "==", data.value),
            where("horario", "==", horarioSelecionado)
        );

        const resultado = await getDocs(consulta);

        if (!resultado.empty) {

            alert("Este horário já está ocupado.");

            await carregarHorariosOcupados(data.value);

            return;

        }

        // Salva no Firestore
        await addDoc(
            collection(db, "agendamentos"),
            agendamento
        );

        alert("Agendamento realizado com sucesso!");

        // Atualiza horários ocupados
        await carregarHorariosOcupados(data.value);

        // Limpa formulário
        nome.value = "";
        telefone.value = "";
        data.value = "";

        servicos.forEach(servico => {

            servico.checked = false;

        });

        horarios.forEach(botao => {

            botao.classList.remove("ativo");

        });

        horarioSelecionado = "";

        resumoNome.textContent = "—";
        resumoServicos.textContent = "Nenhum";
        resumoTempo.textContent = "0min";
        resumoValor.textContent = "R$ 0,00";
        resumoData.textContent = "—";
        resumoHorario.textContent = "—";

    } catch (erro) {

        console.error(erro);

        alert("Erro ao salvar o agendamento.");

    }

});

// Atualiza o resumo ao abrir a página
atualizarResumo();