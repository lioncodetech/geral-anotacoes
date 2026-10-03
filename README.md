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
  fechar a janela. O cabeçalho diz `salvando…` / `salvo`.
- **⠿** — arraste para mover. O canto de baixo à direita do campo redimensiona.

As teclas digitadas **não chegam ao jogo**. Sem isso, escrever uma anotação dispararia os atalhos
da página a cada letra. Alt+X e Alt+Z também param aqui, pelo mesmo motivo.

## Acompanha o tamanho da janela

O que fica guardado não é o tamanho em pixels, é a escolha **junto com a janela onde ela foi
feita**. Rearranjar as views do LionMultInstance muda o tamanho da janela, e os quadros voltam na
mesma proporção, presos ao mínimo legível e ao que cabe — em vez de continuarem do tamanho da
janela anterior, pendurados metade para fora.

## Os quadros são por site e por janela

Os quadros são guardados por site: os que você escreve em `pokepixel.nietore.com` não aparecem em
outro site. Enquanto um quadro não tem nome, o cabeçalho mostra o site, para não haver dúvida.

Cada janela do LionMultInstance tem a sua própria sessão, então também tem os seus próprios quadros —
anotação escrita na janela da conta A não aparece na janela da conta B, mesmo sendo o mesmo site.
É de propósito: numa grade de nove contas, a anotação costuma ser *sobre* aquela conta.

## O que ela acessa

Guarda, de cada quadro, cinco coisas: o texto, o nome, a posição, o tamanho (junto com o tamanho
da janela em que foi escolhido) e se estava aberto. Quando o navegador oferece armazenamento
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
