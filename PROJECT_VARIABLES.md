# Variaveis por Cliente

Use este arquivo como mapa de preenchimento antes de iniciar um novo dashboard. Nao coloque segredos reais aqui no template.

## Identidade

- Nome do cliente:
- Nome do projeto:
- Cidade/UF:
- Dominio final:
- Versao inicial:

## Branding

- Logo do menu rapido:
- Icones PWA:
- Instagram:
- WhatsApp/suporte:

## Hubitat

- Hubitat Maker API base URL:
- Access token configurado como secret:
- Lista total de device IDs:
- IDs extras para polling:
- Dispositivos de initialize por ambiente:

## Supabase

- Project URL:
- Anon key publica:
- Auth ativo:
- Emails permitidos:
- Dominios permitidos:
- Usuarios admin:
- Usuarios convidados:

## Ambientes

| Chave | Nome | Foto | Luzes | Cortinas | AC | TV/Midia | Musica | Visivel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ambiente1 |  |  |  |  |  |  |  | sim |
| ambiente2 |  |  |  |  |  |  |  | sim |
| ambiente3 |  |  |  |  |  |  |  | sim |
| ambiente4 |  |  |  |  |  |  |  | sim |
| ambiente5 |  |  |  |  |  |  |  | sim |
| ambiente6 |  |  |  |  |  |  |  | sim |

## Pendencias antes do deploy

- `config.js` preenchido.
- `config.example.js` mantido generico.
- Fotos adicionadas em `images/Images/`.
- Secrets configurados no Cloudflare Pages.
- Migrations Supabase executadas.
- Seed de `environment_device_registry` criado para o cliente.
- Login testado com usuario admin e usuario restrito.
- Comandos Hubitat testados em pelo menos um device por tipo.
- PWA instalado/testado em celular.
