# Hippo's Store — Atividade Final

Projeto acadêmico de e-commerce desenvolvido com HTML semântico, CSS responsivo e JavaScript puro.

Projeto acadêmico de e-commerce desenvolvido com HTML, CSS e JavaScript puro.

## Funcionalidades JavaScript
- Adição e gerenciamento do carrinho.
- Pesquisa dinâmica de produtos.
- Favoritos e filtros.
- Alternância entre modo claro e escuro com `localStorage`.
- Data e hora atualizadas no rodapé.
- Mensagens dinâmicas de confirmação.

## Estrutura
- `index.html` — estrutura da página.
- `style.css` — estilos e responsividade.
- `script.js` — funcionalidades JavaScript.
- `assets/` — logos e imagens dos produtos.


### Atualização — ofertas e cupons
- Contador regressivo real de 02:45:18, persistente no navegador.
- Cupom HIPPO10: R$ 10 de desconto em compras a partir de R$ 80.
- Cupom HIPPO20: R$ 20 de desconto em compras a partir de R$ 150.
- Cupom HIPPO30: R$ 30 de desconto em compras a partir de R$ 250.
- O desconto é calculado automaticamente no carrinho e o cupom pode ser removido.


### Correção da versão
- Carrinho passou a usar IDs estáveis dos produtos.
- Dados antigos/corrompidos do carrinho não são mais reaproveitados.
- Cupom é removido automaticamente quando o carrinho fica vazio.
- Linha de desconto fica realmente oculta quando não há cupom válido.
- Imagem do carrinho possui fallback local para evitar imagem quebrada.


### Atualização — Destaques e finalização
- Seção de produtos em destaque com detalhes ao clicar.
- Compra do destaque com 5% OFF exclusivo.
- Cupom DESTAQUE5 aplicado somente ao produto em destaque.
- Descontos não acumulam: apenas um cupom regular OU o cupom do destaque.
- Ao remover o produto que originou o desconto de destaque, o desconto é removido.
- Finalização apresenta página de confirmação com número do pedido, itens, subtotal, desconto e total.


### Atualização — regra dos cupons
- Produtos em destaque recebem 5% OFF automaticamente.
- Produtos em destaque não entram na base de cálculo dos cupons por valor.
- O valor mínimo dos cupons é calculado somente sobre produtos que não estão em destaque.
- A mensagem "Cupons disponíveis" aparece no carrinho quando o valor elegível atinge um mínimo.
- Apenas um cupom regular pode ser usado por compra; cupons regulares não acumulam.
- O desconto de 5% dos destaques é independente do cupom por valor e nunca é aplicado duas vezes ao mesmo produto.


### Imagens dos produtos

Nesta versão, as fotos dos produtos são carregadas por URLs externas da internet para facilitar o protótipo acadêmico. No futuro, quando a loja tiver suas próprias fotos, basta substituir o atributo `src` das imagens dos produtos no `index.html` pelas imagens da pasta `assets/produtos/` (ou pelas URLs do seu servidor/CDN).

> **Importante para a loja real:** antes de publicar comercialmente, substitua as imagens demonstrativas por fotos próprias ou imagens com licença/autorização de uso.


## Atividade final — API pública e Clean Code
- Usa `fetch()` para consultar `https://fakestoreapi.com/products?limit=8`.
- Os produtos retornados são adicionados dinamicamente ao catálogo. Se a API estiver indisponível, os produtos principais continuam acessíveis e uma mensagem informa a falha.
- A API fornece produtos fictícios. Os valores exibidos são uma conversão estimada para reais apenas para demonstração, não são preços comerciais.
- As categorias do menu e os cartões de categoria filtram o catálogo. O botão **Ver todos os produtos** retorna à listagem completa.
- A seção **Ofertas do dia** leva diretamente à área de ofertas.
- O layout foi revisado para celular: cabeçalho compacto, navegação horizontal, cartões em duas colunas, botões maiores e modal adaptável.
- O final de `script.js` contém a reflexão solicitada sobre Clean Code e melhorias futuras.

## Como testar
1. Extraia o ZIP.
2. Abra a pasta no VS Code e inicie o **Live Server** (ou sirva os arquivos por um servidor local).
3. Mantenha a conexão com a internet ativa para carregar os produtos da Fake Store API e as imagens externas.
4. Teste as categorias, o botão de voltar para todos os produtos, a busca, o carrinho, os cupons e o layout em modo celular.

> Este é um protótipo acadêmico. A Fake Store API é uma fonte de demonstração; checkout, preços e pedidos não representam transações reais.
