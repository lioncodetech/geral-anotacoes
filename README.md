# Geral — anotações

Um caderno flutuante para escrever qualquer coisa por cima da página: o que falta comprar, o nível
de corte, a conta que está em qual janela. Funciona em qualquer site, não só em jogo.

Não é extensão de um jogo — daí o prefixo **Geral**, que na loja do LionMultInstance abre uma aba
só para este tipo de extensão.

## Como usar

- **Alt+X** — mostra. Sem nenhuma anotação ainda, cria o primeiro quadro já aberto.
- **Alt+Z** — fecha os quadros abertos e deixa só o botão `anotações` no canto. Apertado de novo,
  esconde também o botão: a tela fica limpa.
- **+** no cabeçalho — mais um quadro. Dá para ter quantos quiser na mesma janela, cada um com o
  seu texto, o seu nome, o seu tamanho e o seu lugar na tela. Cada novo nasce um pouco à frente do
  anterior, para não cair escondido em cima dele.
- **—** fecha aquele quadro (o texto continua guardado; o botão `anotações` traz todos de volta).
- **×** apaga aquele quadro. Com texto escrito ele pergunta antes, porque não há desfazer.
- O espaço ao lado do ⠿ é o **nome** do quadro: "compras", "contas", o que ajudar a achar.
- O texto **salva sozinho**, meio segundo depois da última tecla, e também ao sair do campo e ao
  fechar a janela. O cabeçalho fica calado enquanto dá certo: avisar "salvo" a cada pausa da
  digitação só enchia a tela com o que já era esperado. Se a gravação falhar, aí sim aparece
  `não salvou`, e fica até gravar.
- **Arraste pelo cabeçalho** para mover o quadro — em qualquer parte dele, não só no ⠿. O campo de
  nome e os botões ficam de fora, senão renomear seria mover. O canto de baixo à direita do campo
  de texto redimensiona.
- **O botão `anotações` também se move.** Arraste-o para onde não atrapalhe; o lugar fica guardado.
  Arrastar não abre os quadros: só um clique parado conta como clique.

As teclas digitadas **não chegam ao jogo**. Sem isso, escrever uma anotação dispararia os atalhos
da página a cada letra. Alt+X e Alt+Z também param aqui, pelo mesmo motivo.

## Acompanha o tamanho da janela

O que fica guardado não é o tamanho em pixels, é a escolha **junto com a janela onde ela foi
feita**. Rearranjar as views do LionMultInstance muda o tamanho da janela, e os quadros voltam na
mesma proporção, presos ao mínimo legível e ao que cabe — em vez de continuarem do tamanho da
janela anterior, pendurados metade para fora.

O **lugar** segue outra regra, e de propósito: o que fica guardado é a distância até a borda mais
próxima — "20px da direita, 24px de baixo". Proporcional parecia bastar, mas um quadro que não cabe
é empurrado para dentro da tela, e esse empurrão era definitivo: num quadrante pequeno qualquer
clique no texto gravava a posição empurrada, e voltar à tela inteira já não devolvia o quadro ao
canto de onde ele saiu. Pela distância até a borda, quem estava no canto de baixo à direita continua
lá, em qualquer tamanho de janela, e crescer de novo devolve tudo ao lugar exato.

Quadro fechado não tem medidas, então a posição só é lida e gravada com ele à vista. Pela mesma
razão, **nada é colocado nem medido enquanto a janela mede zero por zero** — o que acontece com uma
view escondida. Sem essa guarda, tudo era preso no canto de cima à esquerda; com ela sozinha, o que
nascesse nesse estado ficava parado no canto errado, porque nem sempre chega um `resize` quando a
view reaparece. Por isso há também um observador do tamanho do documento: quando a janela volta a
ter medidas, os quadros e o botão vão para o lugar guardado.

O botão `anotações` segue a mesma regra de lugar dos quadros — distância até a borda mais próxima,
guardada junto com a janela em que foi escolhida.

## Escrever não dispara os atalhos do site

Um jogo costuma escutar o teclado da página inteira: cada letra é um comando. Escrevendo uma
anotação, isso abria inventário, mapa e companhia a cada tecla.

A defesa óbvia — o campo parar o evento — **não basta**, e vale saber por quê. Quem escuta **na
captura** vê a tecla antes dela chegar ao campo, porque na captura o evento desce de cima para
baixo. E o caderno é montado depois que a página carrega, então o site registrou o listener dele
primeiro.

Por isso a guarda vive num arquivo próprio, `teclado.js`, que entra em `document_start` — antes dos
scripts do site — no topo da janela e na captura. Se a tecla nasceu num campo do caderno, ela para
ali. A letra continua sendo escrita: quem escreve é a ação padrão do navegador, e dela não se mexe.

`Alt` passa de propósito: `Alt+X` e `Alt+Z` são atalhos do próprio caderno.

## Os quadros são por site e por janela

Os quadros são guardados por site: os que você escreve em `pokepixel.nietore.com` não aparecem em
outro site. Enquanto um quadro não tem nome, o cabeçalho mostra o site, para não haver dúvida.

Cada janela do LionMultInstance tem a sua própria sessão, então também tem os seus próprios quadros —
anotação escrita na janela da conta A não aparece na janela da conta B, mesmo sendo o mesmo site.
É de propósito: numa grade de nove contas, a anotação costuma ser *sobre* aquela conta.

## O que ela acessa

Guarda, de cada quadro, cinco coisas: o texto, o nome, a posição, o tamanho (junto com o tamanho
da janela em que foi escolhido) e se estava aberto. Guarda também o lugar do botão `anotações`. Quando o navegador oferece armazenamento
próprio de extensão, é lá que ficam — fora do alcance da página.
Quando não oferece, cai para o armazenamento da própria página, que **a página consegue ler**.

Não lê nada da página. Não faz nenhuma chamada de rede: o que você escreve não sai do seu
computador — não existe servidor, conta nem sincronização aqui.

Os quadros ficam dentro de um *shadow root*, separado do resto da página: o CSS do site não o
alcança, e o site não esbarra nele sem querer.

## Onde funciona

Em qualquer endereço `http` ou `https`. Numa janela do LionMultInstance, só onde você escolher
carregá-la — extensão é escolha por janela.

**O texto é guardado em texto puro**, como qualquer bloco de notas. Serve para lembrete, não para
segredo: senha, chave ou recuperação de conta, não.

## Instalação

Pela loja de extensões do LionMultInstance, ou à mão: baixe o `.zip` da
[última release](../../releases/latest), descompacte numa pasta e aponte a extensão da janela para
ela.

Ao lado do `.zip` há um arquivo `.sha256`, para conferir que o pacote baixado é exatamente o que
foi publicado aqui.
