const Redux = require('redux');
const prompts = require('prompts');

// Função para calcular a diferença em meses entre duas datas
const calcularDiferencaMeses = (dataInicial, dataFinal) => {
  const anoInicial = dataInicial.getFullYear();
  const anoFinal = dataFinal.getFullYear();
  const mesInicial = dataInicial.getMonth();
  const mesFinal = dataFinal.getMonth();

  return (anoFinal - anoInicial) * 12 + (mesFinal - mesInicial);
};

// Criadoras de ação
const criarContrato = (data, nome, taxa) => ({
  type: "CRIAR_CONTRATO",
  payload: { data, nome, taxa }
});

const cancelarContrato = (nome, multa) => ({
  type: 'CANCELAR_CONTRATO',
  payload: { nome, multa }
});

const solicitarCashback = (nome, valor) => ({
  type: "PEDIR_CASHBACK",
  payload: { nome, valor }
});

const comprarProduto = (nomeComprador, nomeProduto, valor) => ({
  type: "COMPRAR_PRODUTO",
  payload: { nomeComprador, nomeProduto, valor }
});

// Reducers
const contratos = (listaDeContratosAtual = [], acao) => {
  switch (acao.type) {
    case "CRIAR_CONTRATO":
      return [...listaDeContratosAtual, acao.payload];
    case "CANCELAR_CONTRATO":
      return listaDeContratosAtual.filter(c => c.nome !== acao.payload.nome);
    default:
      return listaDeContratosAtual;
  }
};

const caixa = (saldo = 0, acao) => {
  switch (acao.type) {
    case 'CRIAR_CONTRATO':
      return saldo + acao.payload.taxa;
    case 'CANCELAR_CONTRATO':
      return saldo + acao.payload.multa;
    case 'COMPRAR_PRODUTO':
      return saldo + acao.payload.valor * 0.9; // Adiciona 90% do valor ao caixa
    default:
      return saldo;
  }
};

const saldoCashback = (saldoCashbackClientes = {}, acao) => {
  switch (acao.type) {
    case "PEDIR_CASHBACK":
      if ((saldoCashbackClientes[acao.payload.nome] || 0) >= acao.payload.valor) {
        saldoCashbackClientes[acao.payload.nome] -= acao.payload.valor;
      }
      return saldoCashbackClientes;
    case "COMPRAR_PRODUTO":
      saldoCashbackClientes[acao.payload.nomeComprador] = 
        (saldoCashbackClientes[acao.payload.nomeComprador] || 0) + acao.payload.valor * 0.1;
      return saldoCashbackClientes;
    default:
      return saldoCashbackClientes;
  }
};

const historicoDePedidosDeCashback = (pedidosCashback = {}, acao) => {
  switch (acao.type) {
    case "PEDIR_CASHBACK": {
      const saldoAtual = store.getState().saldoCashback[acao.payload.nome] || 0;
      const status = acao.payload.valor <= saldoAtual ? "ATENDIDO" : "NÃO_ATENDIDO";
      return {
        ...pedidosCashback,
        [acao.payload.nome]: [
          ...(pedidosCashback[acao.payload.nome] || []),
          { valor: acao.payload.valor, status }
        ]
      };
    }
    default:
      return pedidosCashback;
  }
};

const todosOsReducers = Redux.combineReducers({
  contratos,
  caixa,
  saldoCashback,
  historicoDePedidosDeCashback
});

const store = Redux.createStore(todosOsReducers);

// Função para exibir o menu
async function exibirMenu() {
  while (true) {
    const { opcao } = await prompts({
      type: 'select',
      name: 'opcao',
      message: 'Selecione uma opção:',
      choices: [
        { title: '1. Realizar novo contrato', value: 1 },
        { title: '2. Cancelar contrato existente', value: 2 },
        { title: '3. Consultar saldo de cashback', value: 3 },
        { title: '4. Fazer pedido de cashback', value: 4 },
        { title: '5. Exibir saldo em caixa', value: 5 },
        { title: '6. Comprar produto', value: 6 },
        { title: '0. Sair', value: 0 }
      ]
    });

    if (opcao === 0) {
      console.log('Saindo...');
      break;
    }

    await processarOpcao(opcao);
  }
}

// Função para processar cada opção do menu
async function processarOpcao(opcao) {
  switch (opcao) {
    case 1: {
      const { nome, taxa } = await prompts([
        { type: 'text', name: 'nome', message: 'Digite o nome do cliente:' },
        { type: 'number', name: 'taxa', message: 'Digite a taxa do contrato:' }
      ]);
      store.dispatch(criarContrato(new Date(), nome, taxa));
      console.log('Contrato criado com sucesso.');
      break;
    }
    case 2: {
      const { nome } = await prompts({
        type: 'text',
        name: 'nome',
        message: 'Digite o nome do cliente a ser removido:'
      });

      const contratos = store.getState().contratos;
      const contrato = contratos.find(c => c.nome === nome);

      if (contrato) {
        const duracaoMeses = calcularDiferencaMeses(new Date(contrato.data), new Date());
        const multa = duracaoMeses < 3 ? 100 : 0; // Multa se for cancelado antes de 3 meses
        store.dispatch(cancelarContrato(nome, multa));
        console.log('Contrato cancelado com sucesso.');
      } else {
        console.log('Contrato não encontrado.');
      }
      break;
    }
    case 3: {
      const { nome } = await prompts({
        type: 'text',
        name: 'nome',
        message: 'Digite o nome do cliente para consultar o saldo:'
      });
      const saldo = store.getState().saldoCashback[nome] || 0;
      console.log(`Saldo de cashback do cliente ${nome}: ${saldo}`);
      break;
    }
    case 4: {
      const { nome, valor } = await prompts([
        { type: 'text', name: 'nome', message: 'Digite o nome do cliente:' },
        { type: 'number', name: 'valor', message: 'Digite o valor do cashback:' }
      ]);
      store.dispatch(solicitarCashback(nome, valor));
      console.log('Pedido de cashback realizado.');
      break;
    }
    case 5: {
      const saldoEmCaixa = store.getState().caixa;
      console.log(`Saldo atual em caixa: ${saldoEmCaixa}`);
      break;
    }
    case 6: {
      const { nomeComprador, nomeProduto, valor } = await prompts([
        { type: 'text', name: 'nomeComprador', message: 'Digite o nome do comprador:' },
        { type: 'text', name: 'nomeProduto', message: 'Digite o nome do produto:' },
        { type: 'number', name: 'valor', message: 'Digite o valor do produto:' }
      ]);
      store.dispatch(comprarProduto(nomeComprador, nomeProduto, valor));
      console.log('Produto comprado com sucesso.');
      break;
    }
    default:
      console.log('Opção inválida.');
      break;
  }
}

// Executar o menu
exibirMenu();