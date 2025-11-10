document.addEventListener('DOMContentLoaded', () => {
    console.log("Página carregada. Script iniciado.");

    // --- ABA PRINCIPAL ---
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            tabContents.forEach(item => item.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // --- BUSCA POR CEP ---
    const cepInput = document.getElementById('cep-input');
    const cepSearchBtn = document.getElementById('cep-search-btn');
    const cepResultDiv = document.getElementById('cep-result');

    async function buscarPorCEP(cep, addHistory = true) {
        const cepLimpo = cep.replace(/\D/g, '');
        if (cepLimpo.length !== 8) {
            cepResultDiv.innerHTML = `<p style="color:red;">CEP inválido. Digite 8 números.</p>`;
            return;
        }

        cepResultDiv.innerHTML = `<p>Buscando...</p>`;
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await response.json();

            if (data.erro) {
                cepResultDiv.innerHTML = `<p style="color:red;">CEP não encontrado.</p>`;
                if (addHistory) addToHistory('Busca por CEP', { cep }, 'Falha - CEP não encontrado');
            } else {
                const resultHTML = `
                    <p><strong>CEP:</strong> ${data.cep}</p>
                    <p><strong>Rua:</strong> ${data.logradouro || 'Não disponível'}</p>
                    <p><strong>Bairro:</strong> ${data.bairro || 'Não disponível'}</p>
                    <p><strong>Cidade:</strong> ${data.localidade || 'Não disponível'}</p>
                    <p><strong>Estado:</strong> ${data.uf || 'Não disponível'}</p>
                    <p><strong>IBGE:</strong> ${data.ibge || 'Não disponível'}</p>
                `;
                cepResultDiv.innerHTML = `<div class="result-card">${resultHTML}</div>`;
                if (addHistory) addToHistory('Busca por CEP', { cep }, data);
            }
        } catch (error) {
            cepResultDiv.innerHTML = `<p style="color:red;">Erro na busca. Verifique sua conexão.</p>`;
        }
    }

    cepSearchBtn.addEventListener('click', () => buscarPorCEP(cepInput.value));

    // --- BUSCA POR ENDEREÇO ---
    const ufSelect = document.getElementById('uf-select');
    const cidadeInput = document.getElementById('cidade-input');
    const ruaInput = document.getElementById('rua-input');
    const enderecoSearchBtn = document.getElementById('endereco-search-btn');
    const enderecoResultDiv = document.getElementById('endereco-result');

    async function buscarPorEndereco(uf, cidade, rua, addHistory = true) {
        if (!uf || !cidade || rua.length < 3) {
            enderecoResultDiv.innerHTML = `<p style="color:red;">Preencha todos os campos (rua com no mínimo 3 letras).</p>`;
            return;
        }

        enderecoResultDiv.innerHTML = `<p>Buscando...</p>`;
        try {
            const response = await fetch(`https://viacep.com.br/ws/${uf}/${cidade}/${rua}/json/`);
            const data = await response.json();

            if (data.length === 0) {
                enderecoResultDiv.innerHTML = `<p style="color:red;">Nenhum endereço encontrado.</p>`;
                if (addHistory) addToHistory('Busca por Endereço', { uf, cidade, rua }, 'Falha - Nenhum resultado');
            } else {
                let tableHTML = `
                    <table>
                        <thead><tr><th>CEP</th><th>Logradouro</th><th>Bairro</th></tr></thead>
                        <tbody>
                `;
                data.forEach(addr => {
                    tableHTML += `<tr><td>${addr.cep}</td><td>${addr.logradouro}</td><td>${addr.bairro}</td></tr>`;
                });
                tableHTML += '</tbody></table>';
                enderecoResultDiv.innerHTML = tableHTML;
                if (addHistory) addToHistory('Busca por Endereço', { uf, cidade, rua }, `${data.length} resultado(s)`);
            }
        } catch (error) {
            enderecoResultDiv.innerHTML = `<p style="color:red;">Erro na busca. Verifique sua conexão.</p>`;
        }
    }

    enderecoSearchBtn.addEventListener('click', () =>
        buscarPorEndereco(ufSelect.value, cidadeInput.value, ruaInput.value)
    );

    // --- HISTÓRICO ---
    const logsListDiv = document.getElementById('logs-list');
    const clearLogsBtn = document.getElementById('clear-logs-btn');

    function formatTerm(term) {
        if (term.cep) return `CEP: ${term.cep}`;
        if (term.rua) return `${term.rua}, ${term.cidade}-${term.uf}`;
        return 'N/A';
    }

    function addToHistory(type, term, result) {
        const history = JSON.parse(localStorage.getItem('cepHistory')) || [];
        const newLog = { type, term, result, timestamp: new Date() };
        history.push(newLog);
        localStorage.setItem('cepHistory', JSON.stringify(history));
        loadHistory();
    }

    function loadHistory() {
        logsListDiv.innerHTML = '';
        const history = JSON.parse(localStorage.getItem('cepHistory')) || [];

        if (history.length === 0) {
            logsListDiv.innerHTML = '<p>Nenhuma consulta no histórico.</p>';
            return;
        }

        history.slice().reverse().forEach((item, index) => {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            logItem.innerHTML = `
                <p><strong>${item.type}</strong></p>
                <p>Termo: ${formatTerm(item.term)}</p>
                <p style="font-size:0.8rem;color:#666;">${new Date(item.timestamp).toLocaleString('pt-BR')}</p>
                <button class="view-log-btn" data-log-index="${history.length - 1 - index}">
                    <i class="fa-solid fa-eye"></i>
                </button>
            `;
            logsListDiv.appendChild(logItem);
        });
    }

    clearLogsBtn.addEventListener('click', () => {
        if (confirm('Deseja limpar o histórico?')) {
            localStorage.removeItem('cepHistory');
            loadHistory();
        }
    });

    // --- Ação do botão de olho ---
    logsListDiv.addEventListener('click', async (e) => {
        const viewBtn = e.target.closest('.view-log-btn');
        if (!viewBtn) return;

        const logIndex = viewBtn.dataset.logIndex;
        const history = JSON.parse(localStorage.getItem('cepHistory')) || [];
        const logData = history[logIndex];
        if (!logData) return;

        // Troca de aba automática e pesquisa
        tabs.forEach(tab => tab.classList.remove('active'));
        tabContents.forEach(tab => tab.classList.remove('active'));

        if (logData.type === 'Busca por CEP') {
            document.querySelector('[data-tab="tab-cep"]').classList.add('active');
            document.getElementById('tab-cep').classList.add('active');
            cepInput.value = logData.term.cep;
            await buscarPorCEP(logData.term.cep, false);
        } else if (logData.type === 'Busca por Endereço') {
            document.querySelector('[data-tab="tab-endereco"]').classList.add('active');
            document.getElementById('tab-endereco').classList.add('active');
            ufSelect.value = logData.term.uf;
            cidadeInput.value = logData.term.cidade;
            ruaInput.value = logData.term.rua;
            await buscarPorEndereco(logData.term.uf, logData.term.cidade, logData.term.rua, false);
        }
    });

    // Inicializa histórico ao carregar
    loadHistory();
});
