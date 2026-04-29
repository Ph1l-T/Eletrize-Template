# Checklist de Implantação

## 1) Estrutura
- [ ] Copiar `src/main-home-template.html` para a rota/página inicial.
- [ ] Importar `src/main-home.css`.
- [ ] Importar `src/main-home.js`.
- [ ] Criar bootstrap com base em `src/main-home.config.example.js`.

## 2) Assets
- [ ] Copiar pasta `assets/icons/`.
- [ ] Copiar pasta `assets/icons/weather/`.
- [ ] Copiar `assets/images/music-placeholder.png`.
- [ ] Validar paths finais no app de destino.

## 3) Adapters obrigatórios
- [ ] `getStoredState(deviceId)`
- [ ] `setStoredState(deviceId, state)`
- [ ] `sendCommand(deviceId, command, value?)`
- [ ] `pollDevice(deviceId)`
- [ ] `navigate(route)`
- [ ] `getVisibleEnvironments()`
- [ ] `getEnvironmentPhotoMap()`

## 4) Backend
- [ ] Endpoint `/polling?devices=...` operacional.
- [ ] Endpoint `/hubitat-proxy?device=...&command=...` operacional.
- [ ] CORS e autenticação corretos.

## 5) Service worker / cache
- [ ] Não cachear `/polling` (network-only).
- [ ] Garantir atualização de versão de cache quando publicar.

## 6) Testes funcionais
- [ ] Clima atualiza e muda ícone corretamente.
- [ ] Saudação muda por horário (madrugada/dia/tarde/noite).
- [ ] Now Playing mostra preview quando habilitado.
- [ ] Now Playing mostra live quando preview desabilitado.
- [ ] Botão mute muda status para `Mutado`.
- [ ] Último ambiente abre corretamente.
- [ ] Dispositivos ativos são agrupados por ambiente.
- [ ] Botão `Desligar` individual funciona.
- [ ] Botão `Desligar todos` funciona.

## 7) Testes visuais
- [ ] Cards em glassmorphism e largura total.
- [ ] Gap vertical curto e consistente.
- [ ] Card de dispositivos ocupa espaço restante e para 20px acima da navbar.
- [ ] Em muitos itens, rolagem interna no card.
- [ ] Mobile sem sobreposição de elementos.

