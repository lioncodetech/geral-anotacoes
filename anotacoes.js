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
  /**
   * Uma view escondida mede zero por zero.
   *
   * Colocar seja o que for ai' prende tudo no canto de cima a' esquerda, e medir ai' gravaria esse
   * canto por cima do que a pessoa escolheu — medido na banca, com o painel do navegador oculto:
   * `innerWidth` era 0 e o botao saltava para 0,0.
   *
   * Mas recusar e ficar por ai' tambem nao serve: o que nasceu enquanto a janela media zero ficava
   * parado no canto de baixo a' direita, ignorando o lugar guardado. Nem o evento `resize` nem um
   * observador do documento acordam a tempo, porque quem mede zero e' a janela, nao o documento.
   * Entao espera-se: de um quarto em quarto de segundo, ate' haver medidas.
   */
  const temMedidas = () => innerWidth > 0 && innerHeight > 0;
  let espreita = 0;
  const janelaMedida = () => {
    if (temMedidas()) return true;
    espreita =
      espreita ||
      setInterval(() => {
        if (!temMedidas()) return;
        clearInterval(espreita);
        espreita = 0;
        pedirAjuste();
      }, 250);
    return false;
  };

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
    /* O cabecalho inteiro move o quadro; a alca fica como a parte que se ve que se agarra. */
    .cabeca { cursor: move; touch-action: none; }
    .alca { color: #8b93a5; font-size: 15px; padding: 0 2px; }
    .nome {
      flex: 1; min-width: 40px; cursor: text; background: none; border: 0; outline: 0; padding: 2px 4px;
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
      /* Tambem se arrasta: sem isto o toque rolava a pagina em vez de mover o botao. */
      touch-action: none; user-select: none;
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
    };
  };

  /**
   * A posicao e' a distancia ate' a borda mais proxima, nao uma fracao da janela.
   *
   * Proporcional parecia bastar, mas `encaixar` recorta o que nao cabe — e o recorte era
   * definitivo: num quadrante pequeno o quadro era empurrado para dentro, qualquer clique no texto
   * gravava a posicao empurrada, e voltar a tela inteira ja' nao o devolvia ao canto de onde ele
   * saiu. Guardada a distancia ate' a borda, quem estava a 20px do canto de baixo a direita
   * continua a 20px dele em qualquer tamanho de janela.
   */
  const cantoDe = (el, px, py) => {
    const r = el.getBoundingClientRect();
    const direita = px + r.width / 2 > innerWidth / 2;
    const baixo = py + r.height / 2 > innerHeight / 2;
    return {
      cx: Math.round(direita ? innerWidth - (px + r.width) : px),
      cy: Math.round(baixo ? innerHeight - (py + r.height) : py),
      direita,
      baixo,
    };
  };

  /** Onde o quadro cai nesta janela, pelo canto guardado — ou pelo formato antigo, proporcional. */
  const posicaoDe = (q, largura, altura) => {
    if (typeof q.direita === 'boolean')
      return {
        x: q.direita ? innerWidth - q.cx - largura : q.cx,
        y: q.baixo ? innerHeight - q.cy - altura : q.cy,
      };
    const fx = q.janelaL ? innerWidth / q.janelaL : 1;
    const fy = q.janelaA ? innerHeight / q.janelaA : 1;
    return { x: Math.round((q.x ?? 0) * fx), y: Math.round((q.y ?? 0) * fy) };
  };

  const quadros = [];
  let escondido = false;
  let gravacao = 0;

  // O botao `anotações` tambem se muda de lugar, e pela mesma regra dos quadros: o que fica
  // guardado e a distancia ate a borda mais proxima, para ele voltar ao canto escolhido em
  // qualquer tamanho de janela. O padrao e o canto de baixo a direita, como era antes.
  const ABA_PADRAO = { cx: 14, cy: 14, direita: true, baixo: true };
  const abaCanto = { ...ABA_PADRAO, janelaL: innerWidth, janelaA: innerHeight, px: 0, py: 0 };

  const instantaneo = () => ({
    v: 2,
    aba: {
      cx: abaCanto.cx,
      cy: abaCanto.cy,
      direita: abaCanto.direita,
      baixo: abaCanto.baixo,
      janelaL: abaCanto.janelaL,
      janelaA: abaCanto.janelaA,
    },
    quadros: quadros.map((q) => ({
      id: q.id,
      nome: q.nome,
      texto: q.texto,
      aberto: q.aberto,
      x: q.x,
      y: q.y,
      cx: q.cx,
      cy: q.cy,
      direita: q.direita,
      baixo: q.baixo,
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
    // Escondido ele nao tem medidas: e ao aparecer que da para leva-lo ao canto guardado.
    if (aba.classList.contains('aberta')) aoViewportAba();
    aba.title = quadros.length
      ? `Abrir ${quadros.length === 1 ? 'a anotação' : `as ${quadros.length} anotações`} (Alt+P)`
      : 'Criar uma anotação (Alt+P)';
  };

  const aoViewportAba = () => {
    if (!janelaMedida()) return;
    const r = aba.getBoundingClientRect();
    const { x, y } = posicaoDe(abaCanto, r.width, r.height);
    encaixarEl(aba, abaCanto, x, y);
  };

  const mostrar = (q) => {
    q.el.classList.toggle('aberto', q.aberto && !escondido);
    // Escondido ele nao tem medidas; e' ao reaparecer que da' para leva-lo ao canto guardado.
    if (q.aberto && !escondido) aoViewport(q);
    pintarAba();
  };

  /**
   * Deixa o elemento inteiro dentro da janela, inclusive depois de a janela encolher.
   *
   * `caixa` e quem guarda a posicao aplicada (`px`, `py`) — um quadro, ou o botao. O mesmo codigo
   * serve aos dois porque a regra de nao deixar nada pendurado para fora da janela e a mesma.
   */
  const encaixarEl = (el, caixa, x = caixa.px, y = caixa.py) => {
    const r = el.getBoundingClientRect();
    caixa.px = preso(x, 0, Math.max(0, innerWidth - r.width));
    caixa.py = preso(y, 0, Math.max(0, innerHeight - r.height));
    el.style.left = `${caixa.px}px`;
    el.style.top = `${caixa.py}px`;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  };
  const encaixar = (q, x = q.px, y = q.py) => encaixarEl(q.el, q, x, y);

  /**
   * Arrastar por um elemento qualquer.
   *
   * `limiar` existe para o botao: sem ele, soltar o ponteiro no fim de um arrasto ainda contava
   * como clique, e mover o botao abria os quadros todos. Com quatro pixels de folga, um clique
   * continua clique e um arrasto nao abre nada.
   */
  const arrastavel = (pega, { caixa, mover, soltou, ignorar, limiar = 0 }) => {
    let dx = 0;
    let dy = 0;
    let ox = 0;
    let oy = 0;
    let puxando = false;
    let andou = false;
    pega.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || ignorar?.(e)) return;
      const r = caixa();
      dx = e.clientX - r.left;
      dy = e.clientY - r.top;
      ox = e.clientX;
      oy = e.clientY;
      puxando = true;
      andou = false;
      try {
        pega.setPointerCapture?.(e.pointerId);
      } catch (err) {
        // Ponteiro que o navegador ja' nao reconhece: o arrasto continua pelos eventos normais.
      }
      e.preventDefault();
    });
    pega.addEventListener('pointermove', (e) => {
      if (!puxando) return;
      if (!andou && Math.hypot(e.clientX - ox, e.clientY - oy) < limiar) return;
      andou = true;
      mover(e.clientX - dx, e.clientY - dy);
    });
    const soltar = (e) => {
      if (!puxando) return;
      puxando = false;
      try {
        pega.releasePointerCapture(e.pointerId);
      } catch (err) {
        /* ponteiro ja solto */
      }
      if (andou) soltou();
    };
    pega.addEventListener('pointerup', soltar);
    pega.addEventListener('pointercancel', soltar);
    // `limpar` existe porque quem pergunta e' o clique, e nem todo clique traz um `pointerdown`
    // antes: `Enter` no botao com foco manda um clique sozinho. Sem limpar, o botao ficava mudo
    // ao teclado depois do primeiro arrasto.
    return {
      moveu: () => andou,
      limpar: () => {
        andou = false;
      },
    };
  };

  /** Guarda o que a pessoa escolheu junto com a janela em que escolheu. */
  const gravarGeometria = (q) => {
    // Quadro fechado nao tem medidas: gravar ai' poria um canto medido de uma caixa de tamanho
    // zero no lugar do que a pessoa escolheu.
    if (!q.aberto || escondido || !janelaMedida()) return;
    const r = q.area.getBoundingClientRect();
    q.l = Math.round(r.width);
    q.a = Math.round(r.height);
    Object.assign(q, cantoDe(q.el, q.px, q.py));
    q.janelaL = innerWidth;
    q.janelaA = innerHeight;
    agendar();
  };

  const aoViewport = (q) => {
    if (!q.aberto || escondido || !janelaMedida()) return;
    const { l, a } = escalado(q);
    q.area.style.width = `${l}px`;
    q.area.style.height = `${a}px`;
    // O quadro so' tem largura depois do textarea dentro dele; medir antes daria o canto errado.
    const r = q.el.getBoundingClientRect();
    const { x, y } = posicaoDe(q, r.width, r.height);
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
      cx: dados.cx ?? 0,
      cy: dados.cy ?? 0,
      direita: typeof dados.direita === 'boolean' ? dados.direita : undefined,
      baixo: typeof dados.baixo === 'boolean' ? dados.baixo : undefined,
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
        <button class="fechar" title="Fechar este quadro (Alt+O)">—</button>
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

    // A marca que `teclado.js` procura. E' ela que faz a guarda de `document_start` reconhecer um
    // campo do caderno no meio do caminho do evento, e parar a tecla antes de o site a ver.
    area.__anotacoesCampo = true;
    nome.__anotacoesCampo = true;

    // A mesma defesa aqui embaixo, para quem escuta o teclado na subida. Nao basta sozinha — um
    // site que escuta na captura ja' viu a tecla antes de ela chegar ao campo, e e' para esse caso
    // que existe `teclado.js` —, mas e' o que vale se aquela guarda nao tiver entrado neste frame.
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

    // O cabecalho inteiro arrasta, nao so a alca, que tem seis pixels de largura e obrigava a
    // acertar nela. Os botoes e o campo de nome ficam de fora: senao, renomear seria mover.
    arrastavel(el.querySelector('.cabeca'), {
      caixa: () => el.getBoundingClientRect(),
      ignorar: (e) => Boolean(e.target.closest('button, input')),
      mover: (x, y) => encaixar(q, x, y),
      soltou: () => gravarGeometria(q),
    });

    sombra.appendChild(el);
    quadros.push(q);
    // Sem posicao propria, cada quadro novo entra um pouco a frente do anterior: nascendo todos
    // no mesmo canto, o segundo ficaria escondido atras do primeiro e pareceria que nada houve.
    if (novo) {
      const passo = 26 * (quadros.length - 1);
      q.direita = true;
      q.baixo = true;
      q.cx = 30 + passo;
      q.cy = 70 + passo;
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
  const puxarAba = arrastavel(aba, {
    caixa: () => aba.getBoundingClientRect(),
    limiar: 4,
    mover: (x, y) => encaixarEl(aba, abaCanto, x, y),
    soltou: () => {
      Object.assign(abaCanto, cantoDe(aba, abaCanto.px, abaCanto.py));
      abaCanto.janelaL = innerWidth;
      abaCanto.janelaA = innerHeight;
      agendar();
    },
  });
  // Arrastar o botao nao pode abrir os quadros no fim do movimento.
  aba.onclick = () => {
    const arrastou = puxarAba.moveu();
    puxarAba.limpar();
    if (!arrastou) abrirTodos();
  };

  // A janela mudou de tamanho — rearranjo das views, ou a janela do app redimensionada. Cada
  // quadro volta na proporcao da janela nova, em vez de ficar do tamanho da janela anterior.
  let ajuste = 0;
  const pedirAjuste = () => {
    clearTimeout(ajuste);
    ajuste = setTimeout(() => {
      quadros.forEach(aoViewport);
      if (aba.classList.contains('aberta')) aoViewportAba();
    }, 150);
  };
  addEventListener('resize', pedirAjuste);
  // E o observador do documento, para o rearranjo que nao dispara `resize` nenhum.
  new ResizeObserver(pedirAjuste).observe(document.documentElement);

  // Alt+O esconde e Alt+P mostra: o mesmo desenho de duas teclas vizinhas das outras extensoes,
  // uma para cada lado, sem alternar. Escondido significa nada na tela: nem os quadros, nem o botao.
  //
  // **ERAM Alt+Z e Alt+X, e deixaram de ser.** Este caderno roda em *qualquer site*, e o pacote do
  // PokePixel passou a usar esse mesmo par para esconder e mostrar as janelas dele — invertido, por
  // cima. Duas extensoes na mesma pagina disputando a mesma tecla nao da' erro nenhum: da' o pior
  // relato que existe, o de que "as vezes funciona". Quem mudou foi o caderno, que e' o mais novo
  // dos dois e tem menos memoria muscular por tras.
  addEventListener(
    'keydown',
    (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const tecla = e.code === 'KeyO' ? 'o' : e.code === 'KeyP' ? 'p' : '';
      if (!tecla) return;
      e.preventDefault();
      // O atalho e nosso e para aqui: deixar passar dispararia tambem o que o jogo tiver em Alt.
      e.stopPropagation();
      if (tecla === 'p') return abrirTodos();
      // Alt+O fecha os quadros abertos e, de novo, esconde tambem o botao.
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
    // Antes dos quadros: criar um quadro ja repinta o botao, e repintar o botao ja o coloca.
    const lugarDaAba = guardados?.aba;
    if (lugarDaAba && typeof lugarDaAba.cx === 'number')
      Object.assign(abaCanto, {
        cx: lugarDaAba.cx,
        cy: Number(lugarDaAba.cy) || 0,
        direita: lugarDaAba.direita !== false,
        baixo: lugarDaAba.baixo !== false,
        janelaL: lugarDaAba.janelaL || innerWidth,
        janelaA: lugarDaAba.janelaA || innerHeight,
      });
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
