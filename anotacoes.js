(() => {
  const SITE = location.hostname || 'local';
  const CHAVE = `geral-anotacoes:${SITE}`;
  // Chaves da versao de um quadro so'. Ficam para a migracao, e nunca mais sao gravadas.
  const VELHA_POS = 'geral-anotacoes-pos';
  const VELHA_TAM = 'geral-anotacoes-tam';
  const VELHA_ABERTO = 'geral-anotacoes-aberto';
  const api = globalThis.chrome && chrome.storage && chrome.storage.local;

  // O chrome.storage do Electron responde por callback, nao por promessa. Chamar so a forma
  // moderna deixa a leitura pendurada para sempre, e o caderno abriria sempre vazio.
  const pedir = (metodo, arg) =>
    new Promise((ok, falhou) => {
      if (!api) return ok(null);
      try {
        const r = api[metodo](arg, (valor) => ok(valor));
        if (r && typeof r.then === 'function') r.then(ok, falhou);
      } catch (e) {
        falhou(e);
      }
    });

  const guardar = async (chave, valor) => {
    if (api) return pedir('set', { [chave]: valor });
    localStorage.setItem(chave, JSON.stringify(valor));
  };
  const ler = async (chave, padrao) => {
    if (api) {
      const valor = (await pedir('get', chave))?.[chave];
      return valor === undefined ? padrao : valor;
    }
    const bruto = localStorage.getItem(chave);
    if (bruto === null) return padrao;
    try {
      return JSON.parse(bruto);
    } catch (e) {
      // Chave gravada por uma versao antiga, ou a mao: o texto cru ainda serve.
      return bruto;
    }
  };

  const MARGEM = 8;
  const MIN_L = 180;
  const MIN_A = 90;
  const PADRAO_L = 260;
  const PADRAO_A = 170;
  const preso = (valor, minimo, maximo) => Math.max(minimo, Math.min(maximo, valor));

  // Shadow root: isto entra em sites que nao conhecemos, e o CSS de uma pagina qualquer podia
  // esticar, esconder ou repintar o caderno. Aqui dentro nada do site alcanca.
  const raiz = document.createElement('div');
  // O `all:initial` tem de ser `!important` no proprio elemento: a sombra protege o que esta
  // dentro dela, mas o hospedeiro continua sendo uma <div> da pagina, e uma regra qualquer do
  // site (`div { font-size: 30px !important }`) atravessava por heranca e inchava o caderno.
  // Declaracao inline com !important e a unica que ganha de !important do site.
  for (const [prop, valor] of [
    ['all', 'initial'],
    ['position', 'fixed'],
    ['z-index', '2147483647'],
    ['font', '13px system-ui, sans-serif'],
    ['color', '#e6e9ef'],
    ['visibility', 'visible'],
  ])
    raiz.style.setProperty(prop, valor, 'important');
  const sombra = raiz.attachShadow({ mode: 'open' });
  const estilo = document.createElement('style');
  estilo.textContent = `
    :host { font: 13px system-ui, sans-serif; }
    * { box-sizing: border-box; }
    .quadro, .aba {
      position: fixed; right: 14px; bottom: 14px;
      background: #1d2433; color: #e6e9ef; border: 1px solid #3a4152; border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    }
    /* Transparente em repouso, nitido com o mouse ou o cursor dentro: o caderno vive por cima
       da pagina, e opaco o tempo todo tapa o que esta' atras sem precisar. */
    .quadro, .aba { opacity: .82; transition: opacity .15s; }
    .quadro:hover, .quadro:focus-within, .aba:hover, .aba:focus { opacity: 1; }
    .quadro { display: none; flex-direction: column; overflow: hidden; }
    .quadro.aberto { display: flex; }
    .cabeca {
      display: flex; align-items: center; gap: 4px;
      padding: 5px 6px; border-bottom: 1px solid #3a4152; user-select: none;
    }
    .alca { color: #8b93a5; font-size: 15px; cursor: move; touch-action: none; padding: 0 2px; }
    .nome {
      flex: 1; min-width: 40px; background: none; border: 0; outline: 0; padding: 2px 4px;
      color: #c3c9d6; font: inherit; border-radius: 5px;
    }
    .nome:focus { background: #11151d; color: #e6e9ef; }
    .nome::placeholder { color: #6f7789; }
    /* So' aparece quando a gravacao falhou, entao e cor de aviso e nao de legenda. */
    .estado { color: #e8a0a0; font-size: 11px; }
    .cabeca button {
      background: none; border: 0; color: #8b93a5; cursor: pointer; font: inherit;
      padding: 1px 5px; border-radius: 6px; line-height: 1.2;
    }
    .cabeca button:hover { color: #e6e9ef; background: #2a3243; }
    .cabeca .apagar.confirmando { color: #f0cfcf; background: #4a2626; }
    textarea {
      /* Sem flex: dentro de uma coluna flexivel o item com base 0 ignora a altura declarada e
         encolhe, e o quadro reabria sempre mais baixo do que foi deixado. Aqui a altura do campo
         e' que manda, e o quadro cresce com ela. */
      flex: none; display: block; resize: both;
      background: #11151d; color: #e6e9ef; border: 0; outline: 0;
      padding: 8px 10px; font: 13px/1.45 system-ui, sans-serif;
    }
    .aba {
      display: none; align-items: center; gap: 6px; padding: 7px 11px;
      border: 1px solid #3a4152; cursor: pointer; font: inherit; color: #e6e9ef;
    }
    .aba.aberta { display: inline-flex; }
    .aba:hover { background: #2a3243; }
    .aba .ponto { width: 6px; height: 6px; border-radius: 50%; background: #d7a43a; }
    .aba .conta { color: #8b93a5; }
  `;

  const aba = document.createElement('button');
  aba.className = 'aba';
  const ponto = document.createElement('span');
  ponto.className = 'ponto';
  const conta = document.createElement('span');
  conta.className = 'conta';
  aba.append(ponto, document.createTextNode('anotações'), conta);
  sombra.append(estilo, aba);
  document.body.appendChild(raiz);

  /**
   * Tamanho e posicao proporcionais a janela, nao fixos em pixels.
   *
   * O quadro vive dentro de uma janela do LionMultInstance, que muda de tamanho quando as views
   * sao rearranjadas. Um tamanho escolhido na tela inteira transborda num quadrante — por isso o
   * que fica guardado e' a escolha junto com a janela onde foi feita, e em qualquer outra janela
   * ela volta na mesma proporcao, presa ao minimo e ao que cabe.
   */
  const escalado = (q) => {
    const fx = q.janelaL ? innerWidth / q.janelaL : 1;
    const fy = q.janelaA ? innerHeight / q.janelaA : 1;
    return {
      l: preso(Math.round(q.l * fx), Math.min(MIN_L, innerWidth - MARGEM), innerWidth - MARGEM),
      a: preso(Math.round(q.a * fy), Math.min(MIN_A, innerHeight - MARGEM), innerHeight - MARGEM),
      x: Math.round((q.x ?? 0) * fx),
      y: Math.round((q.y ?? 0) * fy),
    };
  };

  const quadros = [];
  let escondido = false;
  let gravacao = 0;

  const instantaneo = () => ({
    v: 2,
    quadros: quadros.map((q) => ({
      id: q.id,
      nome: q.nome,
      texto: q.texto,
      aberto: q.aberto,
      x: q.x,
      y: q.y,
      l: q.l,
      a: q.a,
      janelaL: q.janelaL,
      janelaA: q.janelaA,
    })),
  });

  const dizer = (texto) => {
    for (const q of quadros) q.el.querySelector('.estado').textContent = texto;
  };

  /**
   * O cabecalho so' fala quando nao salvou. Anunciar cada gravacao bem-sucedida enchia a tela de
   * "salvando…/salvo" a cada pausa de digitacao, e "salvou" e o que ja se espera de um caderno que
   * promete salvar sozinho - a informacao util e o contrario disso.
   */
  const salvar = async () => {
    try {
      await guardar(CHAVE, instantaneo());
      dizer('');
    } catch (e) {
      // Falha silenciosa aqui seria perda de texto sem aviso nenhum.
      dizer('não salvou');
    }
  };
  // Salvar a cada tecla gravaria dezenas de vezes por frase; esperar demais perderia o fim do
  // texto se a janela fechasse. Meio segundo depois da ultima tecla, e tambem ao sair do campo.
  const agendar = () => {
    clearTimeout(gravacao);
    gravacao = setTimeout(() => {
      gravacao = 0;
      void salvar();
    }, 500);
  };
  const agora = () => {
    clearTimeout(gravacao);
    gravacao = 0;
    void salvar();
  };
  // Fechar a janela no meio de uma frase nao pode engolir o que ainda estava no relogio.
  addEventListener('pagehide', () => gravacao && agora());

  const pintarAba = () => {
    const abertos = quadros.filter((q) => q.aberto).length;
    // O botao e' a porta de entrada: aparece quando nao ha nenhum quadro aberto na tela.
    aba.classList.toggle('aberta', !escondido && abertos === 0);
    conta.textContent = quadros.length > 1 ? `(${quadros.length})` : '';
    ponto.style.visibility = quadros.some((q) => q.texto.trim()) ? 'visible' : 'hidden';
    aba.title = quadros.length
      ? `Abrir ${quadros.length === 1 ? 'a anotação' : `as ${quadros.length} anotações`} (Alt+X)`
      : 'Criar uma anotação (Alt+X)';
  };

  const mostrar = (q) => {
    q.el.classList.toggle('aberto', q.aberto && !escondido);
    pintarAba();
  };

  /** Deixa o quadro inteiro dentro da janela, inclusive depois de a janela encolher. */
  const encaixar = (q, x = q.px, y = q.py) => {
    const r = q.el.getBoundingClientRect();
    q.px = preso(x, 0, Math.max(0, innerWidth - r.width));
    q.py = preso(y, 0, Math.max(0, innerHeight - r.height));
    q.el.style.left = `${q.px}px`;
    q.el.style.top = `${q.py}px`;
    q.el.style.right = 'auto';
    q.el.style.bottom = 'auto';
  };

  /** Guarda o que a pessoa escolheu junto com a janela em que escolheu. */
  const gravarGeometria = (q) => {
    const r = q.area.getBoundingClientRect();
    q.l = Math.round(r.width);
    q.a = Math.round(r.height);
    q.x = q.px;
    q.y = q.py;
    q.janelaL = innerWidth;
    q.janelaA = innerHeight;
    agendar();
  };

  const aoViewport = (q) => {
    const { l, a, x, y } = escalado(q);
    q.area.style.width = `${l}px`;
    q.area.style.height = `${a}px`;
    encaixar(q, x, y);
  };

  function criarQuadro(dados, novo = false) {
    const q = {
      id: dados.id || `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      nome: typeof dados.nome === 'string' ? dados.nome : '',
      texto: typeof dados.texto === 'string' ? dados.texto : '',
      aberto: dados.aberto !== false,
      x: dados.x ?? 0,
      y: dados.y ?? 0,
      l: dados.l || PADRAO_L,
      a: dados.a || PADRAO_A,
      janelaL: dados.janelaL || innerWidth,
      janelaA: dados.janelaA || innerHeight,
      px: 0,
      py: 0,
    };

    const el = document.createElement('div');
    el.className = 'quadro';
    el.innerHTML = `
      <div class="cabeca">
        <span class="alca" title="Arraste daqui para mover">⠿</span>
        <input class="nome" placeholder="${SITE}" spellcheck="false">
        <span class="estado"></span>
        <button class="novo" title="Outro quadro de anotações">+</button>
        <button class="apagar" title="Apagar este quadro">×</button>
        <button class="fechar" title="Fechar este quadro (Alt+Z)">—</button>
      </div>`;
    const area = document.createElement('textarea');
    area.placeholder = 'Escreva aqui. Salva sozinho.';
    area.spellcheck = false;
    area.value = q.texto;
    el.appendChild(area);
    q.el = el;
    q.area = area;
    const nome = el.querySelector('.nome');
    nome.value = q.nome;

    area.addEventListener('input', () => {
      q.texto = area.value;
      pintarAba();
      agendar();
    });
    area.addEventListener('blur', agora);
    nome.addEventListener('input', () => {
      q.nome = nome.value;
      agendar();
    });
    nome.addEventListener('blur', agora);

    // O jogo escuta o teclado da pagina inteira: sem parar o evento aqui, escrever uma anotacao
    // dispararia os atalhos do jogo a cada letra.
    for (const evento of ['keydown', 'keypress', 'keyup'])
      for (const campo of [area, nome])
        campo.addEventListener(evento, (e) => {
          if (!e.altKey) e.stopPropagation();
        });

    // O tamanho e' do proprio textarea (resize nativo); so' o guardamos ao terminar de arrastar.
    area.addEventListener('pointerup', () => gravarGeometria(q));

    el.querySelector('.fechar').onclick = () => {
      q.aberto = false;
      mostrar(q);
      agendar();
    };
    el.querySelector('.novo').onclick = () => novoQuadro();

    // Apagar leva o texto junto, e nao ha desfazer: com algo escrito, o botao pede confirmacao.
    const apagar = el.querySelector('.apagar');
    let confirmando = 0;
    apagar.onclick = () => {
      if (q.texto.trim() && !confirmando) {
        apagar.textContent = 'apagar?';
        apagar.classList.add('confirmando');
        confirmando = setTimeout(() => {
          confirmando = 0;
          apagar.textContent = '×';
          apagar.classList.remove('confirmando');
        }, 3000);
        return;
      }
      clearTimeout(confirmando);
      quadros.splice(quadros.indexOf(q), 1);
      el.remove();
      pintarAba();
      agora();
    };

    let dx = 0;
    let dy = 0;
    let arrastando = false;
    const alca = el.querySelector('.alca');
    alca.addEventListener('pointerdown', (e) => {
      const r = el.getBoundingClientRect();
      dx = e.clientX - r.left;
      dy = e.clientY - r.top;
      arrastando = true;
      alca.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    alca.addEventListener('pointermove', (e) => {
      if (arrastando) encaixar(q, e.clientX - dx, e.clientY - dy);
    });
    const soltar = (e) => {
      if (!arrastando) return;
      arrastando = false;
      try {
        alca.releasePointerCapture(e.pointerId);
      } catch (err) {
        /* ponteiro ja solto */
      }
      gravarGeometria(q);
    };
    alca.addEventListener('pointerup', soltar);
    alca.addEventListener('pointercancel', soltar);

    sombra.appendChild(el);
    quadros.push(q);
    // Sem posicao propria, cada quadro novo entra um pouco a frente do anterior: nascendo todos
    // no mesmo canto, o segundo ficaria escondido atras do primeiro e pareceria que nada houve.
    if (novo) {
      const passo = 26 * (quadros.length - 1);
      q.x = Math.max(0, innerWidth - q.l - 30 - passo);
      q.y = Math.max(0, innerHeight - q.a - 70 - passo);
      q.janelaL = innerWidth;
      q.janelaA = innerHeight;
    }
    mostrar(q);
    aoViewport(q);
    return q;
  }

  function novoQuadro() {
    escondido = false;
    const q = criarQuadro({ aberto: true }, true);
    q.area.focus();
    agendar();
    return q;
  }

  const abrirTodos = () => {
    escondido = false;
    if (!quadros.length) return novoQuadro();
    for (const q of quadros) {
      q.aberto = true;
      mostrar(q);
      aoViewport(q);
    }
    quadros[quadros.length - 1].area.focus();
    agendar();
  };
  aba.onclick = abrirTodos;

  // A janela mudou de tamanho — rearranjo das views, ou a janela do app redimensionada. Cada
  // quadro volta na proporcao da janela nova, em vez de ficar do tamanho da janela anterior.
  let ajuste = 0;
  addEventListener('resize', () => {
    clearTimeout(ajuste);
    ajuste = setTimeout(() => quadros.forEach(aoViewport), 150);
  });

  // Alt+Z e Alt+X, o mesmo par de esconder e mostrar das outras extensoes. Escondido significa
  // nada na tela: nem os quadros, nem o botao.
  addEventListener(
    'keydown',
    (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const tecla = e.code === 'KeyZ' ? 'z' : e.code === 'KeyX' ? 'x' : '';
      if (!tecla) return;
      e.preventDefault();
      // O atalho e nosso e para aqui: deixar passar dispararia tambem o que o jogo tiver em Alt.
      e.stopPropagation();
      if (tecla === 'x') return abrirTodos();
      // Alt+Z fecha os quadros abertos e, de novo, esconde tambem o botao.
      if (quadros.some((q) => q.aberto)) {
        for (const q of quadros) {
          q.aberto = false;
          mostrar(q);
        }
        agendar();
        return;
      }
      escondido = true;
      pintarAba();
    },
    true,
  );

  void (async () => {
    const guardados = await ler(CHAVE, null);
    if (guardados && Array.isArray(guardados.quadros)) {
      for (const dados of guardados.quadros) criarQuadro(dados);
    } else {
      // Quem vinha da versao de um quadro so encontra a sua anotacao onde a deixou, com o mesmo
      // tamanho e a mesma posicao. As chaves velhas ficam onde estao; nao as gravamos mais.
      const [pos, tam, abertoAntes] = await Promise.all([
        ler(VELHA_POS, null),
        ler(VELHA_TAM, null),
        ler(VELHA_ABERTO, false),
      ]);
      const texto = typeof guardados === 'string' ? guardados : '';
      if (texto || pos || tam)
        criarQuadro({
          texto,
          aberto: abertoAntes === true,
          x: pos?.x ?? 0,
          y: pos?.y ?? 0,
          l: tam?.w || PADRAO_L,
          a: tam?.h || PADRAO_A,
        });
    }
    pintarAba();
  })();
})();
