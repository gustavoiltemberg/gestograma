const inputData = document.getElementById('dataDum');
const rodaVerde = document.getElementById('rodaVerde');
const resultadoTexto = document.getElementById('resultadoTexto');
const rodaContainer = document.getElementById('rodaContainer');

// ============================================================
// CALIBRAÇÃO
// ============================================================
const GRAUS_POR_DIA = 360 / 365;
const OFFSET_JANEIRO_GRAUS = 0;

// Variáveis de estado
let dataAtualRoda = new Date(); // Guarda a data real selecionada
dataAtualRoda.setHours(0, 0, 0, 0); 

let anguloAtual = 0; // O ângulo visual da roda
let anguloInicialArraste = 0; // Onde o mouse começou a girar
let estaArrastando = false;

// ============================================================
// 1. INICIALIZAR O CALENDÁRIO
// ============================================================
const fp = flatpickr(inputData, {
    locale: "pt",
    dateFormat: "d/m/Y",
    allowInput: true,
    defaultDate: dataAtualRoda,
    onChange: function(selectedDates) {
        if (selectedDates.length > 0) {
            const dataSel = new Date(selectedDates[0]);
            dataSel.setHours(0, 0, 0, 0);
            dataAtualRoda = dataSel;
            
            // Gira a roda para a data escolhida
            sincronizarRodaComData();
            atualizarTextos();
        }
    }
});

// ============================================================
// 2. CALCULAR A ROTAÇÃO (DATA -> SETA)
// ============================================================
function sincronizarRodaComData() {
    const inicioAno = new Date(dataAtualRoda.getFullYear(), 0, 0);
    const diff = dataAtualRoda - inicioAno;
    const umDia = 1000 * 60 * 60 * 24;
    const diaDoAno = Math.floor(diff / umDia);

    // Calcula o ângulo para essa data
    const posicao = OFFSET_JANEIRO_GRAUS + (diaDoAno * GRAUS_POR_DIA);
    
    // Calcula quantas voltas completas a roda já deu (para manter o visual contínuo)
    const voltas = Math.floor(anguloAtual / 360);
    anguloAtual = (voltas * 360) + posicao;

    rodaVerde.style.transition = 'transform 0.5s ease-out';
    rodaVerde.style.transform = `rotate(${anguloAtual}deg)`;
}

// ============================================================
// 3. ATUALIZAR TEXTOS
// ============================================================
function atualizarTextos() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const diffTempo = hoje.getTime() - dataAtualRoda.getTime();
    const diasPassados = Math.floor(diffTempo / (1000 * 3600 * 24));

    if (diasPassados < 0) {
        resultadoTexto.innerHTML = "<strong>Atenção:</strong> A data da DUM está no futuro.";
        return;
    }

    const semanas = Math.floor(diasPassados / 7);
    const diasRestantes = diasPassados % 7;

    const dataParto = new Date(dataAtualRoda);
    dataParto.setDate(dataParto.getDate() + 280);
    const dppFormatada = dataParto.toLocaleDateString('pt-BR');

    resultadoTexto.innerHTML = `
        <strong>Idade Gestacional:</strong> ${semanas} semanas e ${diasRestantes} dias<br>
        <strong>Data Provável do Parto:</strong> ${dppFormatada}
    `;
}

// ============================================================
// 4. LÓGICA DE ARRASTAR (RODA -> DATA)
// ============================================================
function obterAnguloMouse(event) {
    const rect = rodaContainer.getBoundingClientRect();
    const centroX = rect.left + rect.width / 2;
    const centroY = rect.top + rect.height / 2;

    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    const radianos = Math.atan2(clientY - centroY, clientX - centroX);
    let graus = (radianos * 180) / Math.PI;

    graus += 90;
    if (graus < 0) graus += 360;
    return graus;
}

rodaVerde.addEventListener('mousedown', iniciarArraste);
rodaVerde.addEventListener('touchstart', iniciarArraste, { passive: true });

function iniciarArraste(e) {
    estaArrastando = true;
    rodaVerde.style.transition = 'none';
    
    anguloInicialArraste = obterAnguloMouse(e);
    e.preventDefault();
}

window.addEventListener('mouseup', finalizarArraste);
window.addEventListener('touchend', finalizarArraste);

function finalizarArraste() {
    if (!estaArrastando) return;
    estaArrastando = false;
    rodaVerde.style.transition = 'transform 0.2s ease-out';
}

window.addEventListener('mousemove', moverArraste);
window.addEventListener('touchmove', moverArraste, { passive: false });

function moverArraste(e) {
    if (!estaArrastando) return;
    e.preventDefault();

    const anguloMouseAtual = obterAnguloMouse(e);
    
    // Calcula a diferença entre o que o mouse está e onde começou
    let diferenca = anguloMouseAtual - anguloInicialArraste;
    
    // Normaliza a diferença para o caminho mais curto (evita saltos de 360 graus)
    if (diferenca > 180) diferenca -= 360;
    if (diferenca < -180) diferenca += 360;

    // Atualiza o ângulo e o ponto de partida
    anguloAtual += diferenca;
    anguloInicialArraste = anguloMouseAtual;

    // Gira a roda visualmente
    rodaVerde.style.transform = `rotate(${anguloAtual}deg)`;

    // --------------------------------------------------------
    // CONVERSÃO: Graus girados -> Dias de diferença
    // --------------------------------------------------------
    // A cada 0,986 graus (GRAUS_POR_DIA), avançamos ou voltamos 1 dia
    const diasDiferenca = Math.round(diferenca / GRAUS_POR_DIA);

    if (diasDiferenca !== 0) {
        // Cria uma nova data baseada na data atual e soma/subtrai os dias
        const novaData = new Date(dataAtualRoda);
        novaData.setDate(novaData.getDate() + diasDiferenca);
        
        // O JavaScript nativo do Date já resolve a virada de ano automaticamente!
        dataAtualRoda = novaData;

        // Atualiza os campos visuais
        const diaStr = String(dataAtualRoda.getDate()).padStart(2, '0');
        const mesStr = String(dataAtualRoda.getMonth() + 1).padStart(2, '0');
        const anoStr = dataAtualRoda.getFullYear();
        
        inputData.value = `${diaStr}/${mesStr}/${anoStr}`;
        fp.setDate(dataAtualRoda, false);

        atualizarTextos();
    }
}

// ============================================================
// 5. INICIALIZAÇÃO
// ============================================================
resultadoTexto.innerHTML = "Aguardando a data...";
sincronizarRodaComData();
atualizarTextos();