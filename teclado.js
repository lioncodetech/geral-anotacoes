// Geral - anotacoes: a guarda de teclado, instalada antes de o site existir.
//
// Este arquivo existe por causa de uma ordem que nao da' para mudar de outro jeito. O caderno e'
// montado em `document_idle`, depois de a pagina carregar — e tem de ser, porque precisa do
// `document.body`. So' que um jogo que escuta o teclado **na captura**, em `window` ou `document`,
// registrou o listener dele antes disso. Na captura o evento desce de cima para baixo, entao o
// jogo ve' a tecla antes do campo onde se esta' escrevendo, e o `stopPropagation` que o campo faz
// chega tarde: o atalho ja' disparou. Era isso que abria inventario, mapa e companhia a cada letra
// de uma anotacao.
//
// A unica forma de ganhar essa corrida e' chegar antes do site. Por isso esta guarda entra em
// `document_start`, no topo de `window` e na captura, e so' faz uma coisa: se a tecla nasceu num
// campo do caderno, ela para aqui.
//
// Parar a propagacao nao impede a letra de ser escrita: quem escreve e' a acao padrao do navegador,
// e dela nao se mexe. O caderno tambem nao perde nada — ele salva por `input`, nao por tecla.
//
// Os dois arquivos sao do mesmo content script, entao partilham o mesmo mundo isolado: o caderno
// marca cada campo seu com a propriedade abaixo e esta guarda a enxerga.
(() => {
  const MARCA = '__anotacoesCampo';

  const doCaderno = (evento) => {
    // `composedPath` porque os campos vivem dentro de um shadow root: visto de `window`, o alvo do
    // evento e' o `div` que hospeda o shadow, nunca o `textarea` de dentro.
    const caminho = typeof evento.composedPath === 'function' ? evento.composedPath() : [];
    for (const alvo of caminho) if (alvo && alvo[MARCA]) return true;
    return false;
  };

  for (const tipo of ['keydown', 'keypress', 'keyup'])
    addEventListener(
      tipo,
      (evento) => {
        // Alt passa: Alt+X e Alt+Z sao atalhos do proprio caderno, tratados mais adiante. Parar
        // tudo aqui calaria a extensao para ela mesma.
        if (!evento.isTrusted || evento.altKey || !doCaderno(evento)) return;
        evento.stopImmediatePropagation();
      },
      true,
    );
})();
