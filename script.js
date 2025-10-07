document.addEventListener('DOMContentLoaded', () => {
    // --- GERENCIAMENTO DAS ABAS ---
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove a classe 'active' de todos
            tabs.forEach(item => item.classList.remove('active'));
            tabContents.forEach(item => item.classList.remove('active'));

            // Adiciona a classe 'active' ao clicado
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // --- ABA 1: LÓGICA DE BUSCA POR CEP ---
    const cepInput = document.getElementById('cep-input');
    const cepSearchBtn = document.getElementById('cep-search-btn');
    const cepResultDiv = document.getElementById('cep-result');

    cepSearchBtn.addEventListener('click', async () => {
        const cep = cepInput.value.replace(/\D/g, '');
        if (cep.length !== 8) {
            cepResultDiv.innerHTML = `<p style="color: red;">CEP inválido. Digite 8 números.</p>`;
            return;
        }

        cepResultDiv.innerHTML = `<p>Buscando...</p>`;
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            // NOVO TRECHO (SUBSTITUA PELO ANTERIOR)
            if (data.erro) {
                cepResultDiv.innerHTML = `<p style="color: red;">CEP não encontrado.</p>`;
                addToHistory('Busca por CEP', `CEP: ${cep}`, 'Falha - CEP não encontrado');
            } else {
                // Mantemos o texto original para o log (mais compacto)
                const resultText = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;

                // Criamos um HTML com várias linhas para a exibição na tela
                const resultHTML = `
        <p><strong>CEP:</strong> ${data.cep}</p>
        <p><strong>Rua:</strong> ${data.logradouro || 'Não disponível'}</p>
        <p><strong>Bairro:</strong> ${data.bairro || 'Não disponível'}</p>
        <p><strong>Cidade:</strong> ${data.localidade || 'Não disponível'}</p>
        <p><strong>Estado:</strong> ${data.uf || 'Não disponível'}</p>
        <p><strong>IBGE:</strong> ${data.ibge || 'Não disponível'}</p>
    `;

                cepResultDiv.innerHTML = resultHTML; // Exibe o resultado formatado
                addToHistory('Busca por CEP', `CEP: ${cep}`, resultText); // Salva o resultado compacto no log
            }
        } catch (error) {
            cepResultDiv.innerHTML = `<p style="color: red;">Erro na busca. Verifique sua conexão.</p>`;
        }
    });

    // --- ABA 2: LÓGICA DE BUSCA POR ENDEREÇO ---
    const ufSelect = document.getElementById('uf-select');
    const cidadeInput = document.getElementById('cidade-input');
    const ruaInput = document.getElementById('rua-input');
    const enderecoSearchBtn = document.getElementById('endereco-search-btn');
    const enderecoResultDiv = document.getElementById('endereco-result');

    enderecoSearchBtn.addEventListener('click', async () => {
        const uf = ufSelect.value;
        const cidade = cidadeInput.value;
        const rua = ruaInput.value;

        if (!uf || !cidade || rua.length < 3) {
            enderecoResultDiv.innerHTML = `<p style="color: red;">Preencha todos os campos (rua com no mínimo 3 letras).</p>`;
            return;
        }

        enderecoResultDiv.innerHTML = `<p>Buscando...</p>`;
        try {
            const url = `https://viacep.com.br/ws/${uf}/${cidade}/${rua}/json/`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.length === 0) {
                enderecoResultDiv.innerHTML = `<p style="color: red;">Nenhum endereço encontrado.</p>`;
                addToHistory('Busca por Endereço', `${rua}, ${cidade}-${uf}`, 'Falha - Nenhum resultado');
            } else {
                let tableHTML = '<table><thead><tr><th>CEP</th><th>Logradouro</th><th>Bairro</th></tr></thead><tbody>';
                data.forEach(addr => {
                    tableHTML += `<tr><td>${addr.cep}</td><td>${addr.logradouro}</td><td>${addr.bairro}</td></tr>`;
                });
                tableHTML += '</tbody></table>';
                enderecoResultDiv.innerHTML = tableHTML;
                addToHistory('Busca por Endereço', `${rua}, ${cidade}-${uf}`, `${data.length} resultado(s) encontrado(s)`);
            }
        } catch (error) {
            enderecoResultDiv.innerHTML = `<p style="color: red;">Erro na busca. Verifique sua conexão.</p>`;
        }
    });

    // --- ABA 3: LÓGICA DO HISTÓRICO (LOGS) ---
    const logsListDiv = document.getElementById('logs-list');
    const clearLogsBtn = document.getElementById('clear-logs-btn');

    function loadHistory() {
        logsListDiv.innerHTML = '';
        const history = JSON.parse(localStorage.getItem('cepHistory')) || [];
        if (history.length === 0) {
            logsListDiv.innerHTML = '<p>Nenhuma consulta no histórico.</p>';
            return;
        }
        history.reverse().forEach(item => { // .reverse() para mostrar os mais recentes primeiro
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            logItem.innerHTML = `
                <p class="log-header">${item.type}</p>
                <p><strong>Termo:</strong> ${item.term}</p>
                <p><strong>Resultado:</strong> ${item.result}</p>
                <p class="log-time">${new Date(item.timestamp).toLocaleString('pt-BR')}</p>
            `;
            logsListDiv.appendChild(logItem);
        });
    }

    function addToHistory(type, term, result) {
        const history = JSON.parse(localStorage.getItem('cepHistory')) || [];
        const newLog = { type, term, result, timestamp: new Date() };
        history.push(newLog);
        localStorage.setItem('cepHistory', JSON.stringify(history));
        loadHistory(); // Atualiza a exibição
    }

    clearLogsBtn.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
            localStorage.removeItem('cepHistory');
            loadHistory();
        }
    });

    // Carrega o histórico ao iniciar
    loadHistory();
});