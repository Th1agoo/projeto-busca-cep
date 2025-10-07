/*
 * Este é o coração da minha aplicação de busca de CEP.
 * Toda a interatividade da página é controlada por este arquivo.
 */
document.addEventListener('DOMContentLoaded', () => {

    // Garanto que meu script só vai rodar depois que a página HTML inteira for carregada.
    // Faço isso para evitar erros de tentar manipular elementos que ainda não existem.
    console.log("Página carregada. Meu script está começando a rodar!");


    // --- PARTE 1: MINHA LÓGICA PARA AS ABAS ---

    // Primeiro, eu pego todos os botões de aba e os painéis de conteúdo que vou manipular.
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Para cada botão, eu adiciono um "escutador" de cliques.
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Quando um botão de aba for clicado, minha lógica é primeiro "resetar" a interface:
            // Eu removo a classe 'active' de todos os botões e escondo todos os conteúdos.
            tabs.forEach(item => item.classList.remove('active'));
            tabContents.forEach(item => item.classList.remove('active'));

            // Depois do reset, eu adiciono a classe 'active' só no botão que cliquei
            // e mostro apenas o conteúdo correspondente a ele.
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });


    // --- PARTE 2: LÓGICA DA ABA "BUSCA POR CEP" ---

    // Separo os elementos da primeira aba com os quais vou interagir.
    const cepInput = document.getElementById('cep-input');
    const cepSearchBtn = document.getElementById('cep-search-btn');
    const cepResultDiv = document.getElementById('cep-result');

    // Defino o que acontece quando o botão de buscar CEP é acionado.
    cepSearchBtn.addEventListener('click', async () => {
        // Eu limpo o valor do CEP para ter certeza que só tenho os números.
        const cep = cepInput.value.replace(/\D/g, '');

        // Faço uma validação simples do tamanho do CEP.
        if (cep.length !== 8) {
            cepResultDiv.innerHTML = `<p style="color: red;">CEP inválido. Digite 8 números.</p>`;
            return; // Se for inválido, eu paro a função aqui.
        }

        // Coloco uma mensagem de "Buscando..." para o usuário saber que algo está acontecendo.
        cepResultDiv.innerHTML = `<p>Buscando...</p>`;

        // Usei um `try...catch` como uma rede de segurança. Se a busca online falhar
        // (por exemplo, por falta de internet), o `catch` exibe um erro amigável.
        try {
            // É aqui que eu chamo a API do ViaCEP para buscar o endereço.
            // O `async/await` me ajuda a esperar a resposta sem travar a página.
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            // Verifico se a API me retornou um erro (CEP não existente).
            if (data.erro) {
                cepResultDiv.innerHTML = `<p style="color: red;">CEP não encontrado.</p>`;
                addToHistory('Busca por CEP', { cep }, 'Falha - CEP não encontrado');
            } else {
                // Se deu certo, crio um resumo para o log...
                const resultText = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;

                // ...e também crio um bloco HTML mais detalhado e organizado para a tela.
                const resultHTML = `
                    <p><strong>CEP:</strong> ${data.cep}</p>
                    <p><strong>Rua:</strong> ${data.logradouro || 'Não disponível'}</p>
                    <p><strong>Bairro:</strong> ${data.bairro || 'Não disponível'}</p>
                    <p><strong>Cidade:</strong> ${data.localidade || 'Não disponível'}</p>
                    <p><strong>Estado:</strong> ${data.uf || 'Não disponível'}</p>
                    <p><strong>IBGE:</strong> ${data.ibge || 'Não disponível'}</p>
                `;

                // Finalmente, insiro o resultado dentro do "card" de exibição.
                cepResultDiv.innerHTML = `<div class="result-card">${resultHTML}</div>`;
                // E também salvo essa busca no meu histórico.
                addToHistory('Busca por CEP', { cep }, data);
            }
        } catch (error) {
            cepResultDiv.innerHTML = `<p style="color: red;">Erro na busca. Verifique sua conexão.</p>`;
        }
    });


    // --- PARTE 3: LÓGICA DA ABA "BUSCA POR ENDEREÇO" ---

    const ufSelect = document.getElementById('uf-select');
    const cidadeInput = document.getElementById('cidade-input');
    const ruaInput = document.getElementById('rua-input');
    const enderecoSearchBtn = document.getElementById('endereco-search-btn');
    const enderecoResultDiv = document.getElementById('endereco-result');

    // Defino a ação para o botão de busca por endereço.
    enderecoSearchBtn.addEventListener('click', async () => {
        const uf = ufSelect.value;
        const cidade = cidadeInput.value;
        const rua = ruaInput.value;

        // Valido se os campos essenciais foram preenchidos.
        if (!uf || !cidade || rua.length < 3) {
            enderecoResultDiv.innerHTML = `<p style="color: red;">Preencha todos os campos (rua com no mínimo 3 letras).</p>`;
            return;
        }

        enderecoResultDiv.innerHTML = `<p>Buscando...</p>`;
        try {
            // Monto a URL da API com os dados que o usuário inseriu.
            const url = `https://viacep.com.br/ws/${uf}/${cidade}/${rua}/json/`;
            const response = await fetch(url);
            const data = await response.json();

            // A resposta aqui é uma lista (array). Se a lista veio vazia, não encontrei nada.
            if (data.length === 0) {
                enderecoResultDiv.innerHTML = `<p style="color: red;">Nenhum endereço encontrado.</p>`;
                addToHistory('Busca por Endereço', { uf, cidade, rua }, 'Falha - Nenhum resultado');
            } else {
                // Para mostrar a lista de resultados, decidi criar uma tabela dinamicamente.
                let tableHTML = '<table><thead><tr><th>CEP</th><th>Logradouro</th><th>Bairro</th></tr></thead><tbody>';
                // Para cada resultado na lista, eu crio uma nova linha na tabela.
                data.forEach(addr => {
                    tableHTML += `<tr><td>${addr.cep}</td><td>${addr.logradouro}</td><td>${addr.bairro}</td></tr>`;
                });
                tableHTML += '</tbody></table>';

                enderecoResultDiv.innerHTML = tableHTML;
                addToHistory('Busca por Endereço', { uf, cidade, rua }, `${data.length} resultado(s)`);
            }
        } catch (error) {
            enderecoResultDiv.innerHTML = `<p style="color: red;">Erro na busca. Verifique sua conexão.</p>`;
        }
    });


    // --- PARTE 4: MINHA LÓGICA PARA O HISTÓRICO E O MODAL ---
    // Aqui eu controlo a aba de logs e o popup de detalhes.

    const logsListDiv = document.getElementById('logs-list');
    const clearLogsBtn = document.getElementById('clear-logs-btn');
    const logModal = document.getElementById('log-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalBody = document.getElementById('modal-body');

    // Criei esta função para carregar o histórico salvo na memória do navegador.
    function loadHistory() {
        logsListDiv.innerHTML = '';
        // Eu pego o histórico do `localStorage`. Se não houver nada, começo com uma lista vazia.
        const history = JSON.parse(localStorage.getItem('cepHistory')) || [];
        if (history.length === 0) {
            logsListDiv.innerHTML = '<p>Nenhuma consulta no histórico.</p>';
            return;
        }

        // Eu uso `.slice().reverse()` para inverter a ordem e mostrar os logs mais recentes primeiro.
        history.slice().reverse().forEach((item, index) => {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';

            // Crio o HTML de cada item do log, já incluindo o botão de visualização.
            logItem.innerHTML = `
                <p><strong>${item.type}</strong></p>
                <p>Termo: ${formatTerm(item.term)}</p>
                <p style="font-size: 0.8rem; color: #666;">${new Date(item.timestamp).toLocaleString('pt-BR')}</p>
                <button class="view-log-btn" data-log-index="${history.length - 1 - index}">
                    <i class="fa-solid fa-eye"></i>
                </button>
            `;
            logsListDiv.appendChild(logItem);
        });
    }

    // Uma função auxiliar para formatar os termos de busca para exibição.
    function formatTerm(term) {
        if (typeof term.cep !== 'undefined') return `CEP: ${term.cep}`;
        if (typeof term.rua !== 'undefined') return `${term.rua}, ${term.cidade}-${term.uf}`;
        return 'N/A';
    }

    // Esta função adiciona um novo registro ao histórico.
    function addToHistory(type, term, result) {
        const history = JSON.parse(localStorage.getItem('cepHistory')) || [];
        const newLog = { type, term, result, timestamp: new Date() };
        history.push(newLog);
        // Eu salvo a lista atualizada de volta no `localStorage`.
        localStorage.setItem('cepHistory', JSON.stringify(history));
        loadHistory(); // E atualizo a exibição na tela.
    }

    // Ação do botão de limpar o histórico.
    clearLogsBtn.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
            localStorage.removeItem('cepHistory');
            loadHistory();
        }
    });

    // Função para abrir o modal e preenchê-lo com os detalhes do log clicado.
    function openLogModal(logIndex) {
        const history = JSON.parse(localStorage.getItem('cepHistory')) || [];
        const logData = history[logIndex];
        if (!logData) return;

        let detailsHTML = `
            <p><strong>Tipo de Consulta:</strong> ${logData.type}</p>
            <p><strong>Termo da Busca:</strong> ${formatTerm(logData.term)}</p>
            <p><strong>Data:</strong> ${new Date(logData.timestamp).toLocaleString('pt-BR')}</p>
            <hr style="margin: 15px 0; border: 0; border-top: 1px solid #eee;">
            <h4>Resultado:</h4>
        `;

        // Verifico o tipo de resultado para exibi-lo corretamente.
        if (typeof logData.result === 'string') {
            detailsHTML += `<p>${logData.result}</p>`;
        } else if (typeof logData.result === 'object') {
            detailsHTML += `
                <p><strong>CEP:</strong> ${logData.result.cep || 'N/A'}</p>
                <p><strong>Rua:</strong> ${logData.result.logradouro || 'N/A'}</p>
                <p><strong>Bairro:</strong> ${logData.result.bairro || 'N/A'}</p>
                <p><strong>Cidade:</strong> ${logData.result.localidade || 'N/A'}</p>
                <p><strong>Estado:</strong> ${logData.result.uf || 'N/A'}</p>
            `;
        }

        modalBody.innerHTML = detailsHTML;
        logModal.classList.remove('hidden'); // Mostra o modal.
    }

    // Função que apenas fecha o modal.
    function closeLogModal() {
        logModal.classList.add('hidden');
    }

    // Defino os eventos que fecham o modal.
    modalCloseBtn.addEventListener('click', closeLogModal);
    logModal.addEventListener('click', (e) => {
        // Se o clique foi no fundo escuro, e não no conteúdo do modal, eu fecho.
        if (e.target === logModal) {
            closeLogModal();
        }
    });

    // Um truque que usei aqui: em vez de adicionar um evento a cada botão de olho,
    // eu "escuto" os cliques na lista inteira (`logsListDiv`). Se o clique foi em um
    // botão com a classe `view-log-btn`, eu pego o índice e abro o modal. É mais eficiente.
    logsListDiv.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-log-btn');
        if (viewBtn) {
            const logIndex = viewBtn.dataset.logIndex;
            openLogModal(logIndex);
        }
    });

    // Chamo `loadHistory()` uma vez no início para popular a aba de logs.
    loadHistory();
});