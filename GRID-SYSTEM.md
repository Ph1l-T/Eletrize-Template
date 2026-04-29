# Sistema de Grid Responsivo - Dashboard Eletrize

## 📐 REGRA PRIMORDIAL DO PROJETO

Este documento define o **sistema de grid responsivo** que deve ser aplicado em **TODAS as páginas** do dashboard. Esta é uma regra fundamental que deve ser considerada em **TODOS os ajustes de layout**.

---

## 🎯 Breakpoints Padrão

| Categoria | Resolução | Descrição |
|-----------|-----------|-----------|
| **Mobile** | < 600px | Smartphones e dispositivos pequenos |
| **Tablet** | ≥ 600px | Tablets e telas médias |
| **Desktop** | ≥ 1300px | Desktops e telas grandes |

---

## 📄 Configurações por Página

### 1. Página de Cortinas (Navbar)

**Classe CSS:** `.curtain-layout`

**Comportamento:** Como cada ambiente possui apenas **uma cortina**, o grid é aplicado nas **seções de ambiente** (não nas cortinas individuais). Isso faz com que os ambientes apareçam lado a lado conforme a resolução aumenta.

| Resolução | Layout | Media Query |
|-----------|---------|-------------|
| < 600px | 1 ambiente por linha | (padrão) |
| ≥ 600px | 2 ambientes por linha | `@media (min-width: 600px)` |
| ≥ 1300px | 3 ambientes por linha | `@media (min-width: 1300px)` |

**Exemplo de CSS:**
```css
.curtain-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 600px) {
  .curtain-layout {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1300px) {
  .curtain-layout {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

**Estrutura HTML:**
```
.curtain-layout (container com grid)
  └─ .curtain-section (ambiente 1)
  └─ .curtain-section (ambiente 2)
  └─ .curtain-section (ambiente 3)
  ...
```

---

## 🔄 Configurações Implementadas

### 2. Páginas de Ambientes (1-6)

**Classe CSS:** `.ambienteN-controls-wrapper.ambiente-grid` (onde N = 1 a 6)

**Comportamento:** Grid responsivo que organiza os controles do ambiente. **Ar condicionado e cortinas sempre ocupam a linha completa**, independente do número de colunas.

| Resolução | Layout | Media Query |
|-----------|---------|-------------|
| < 600px | 1 coluna | (padrão) |
| ≥ 600px | 2 colunas | `@media (min-width: 600px)` |

**Regras especiais:**
- `.control-card--full-width`: Ar condicionado ocupa linha completa (`grid-column: 1 / -1`)
- `.curtain-tile--full-width`: Cortinas ocupam linha completa (`grid-column: 1 / -1`)
- `.curtain-tile__header--minimal`: Header com linha minimalista para cortinas em páginas de ambiente
- `.curtain-tile__line`: Linha gradiente decorativa ao lado do título da cortina

**Exemplo de CSS:**
```css
.ambienteN-page .ambienteN-controls-wrapper.ambiente-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
  grid-auto-rows: 131px;
  top: 103px; /* 10px abaixo da linha branca */
  bottom: 80px; /* Colado à navbar */
}

@media (min-width: 600px) {
  .ambienteN-page .ambienteN-controls-wrapper.ambiente-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Elementos que ocupam linha completa */
.ambienteN-page .control-card--full-width,
.ambienteN-page .curtain-tile--full-width {
  grid-column: 1 / -1;
}
```

**Estrutura HTML:**
```html
<div class="page-header">
  <button class="back-btn" onclick="spaNavigate('home')">←</button>
  <h1 class="page-title">Ambiente N</h1>
</div>

<div class="ambienteN-controls-wrapper ambiente-grid">
  <!-- Controles normais (luzes, etc) -->
  <div class="control-card">Luz 1</div>
  <div class="control-card">Luz 2</div>
  
  <!-- Ar condicionado (linha completa) -->
  <div class="control-card control-card--full-width">AR</div>
  
  <!-- Cortina (linha completa) com header minimalista -->
  <article class="curtain-tile curtain-tile--full-width">
    <header class="curtain-tile__header curtain-tile__header--minimal">
      <h3 class="curtain-tile__title">Cortina 1</h3>
      <div class="curtain-tile__line"></div>
    </header>
    <div class="curtain-tile__actions">
      <!-- Botões de ação -->
    </div>
  </article>
</div>
```

**Status:** ✅ Implementado em todos os 6 ambientes

---

## 🔄 Futuras Configurações

### 3. Página de Cenários
_Configuração a ser definida_

### 4. Home (Cards de Ambientes)
_Configuração a ser definida_

---

## ✅ Checklist para Novos Layouts

Ao criar ou ajustar um layout com grid, sempre:

- [ ] Definir o grid base (mobile < 600px)
- [ ] Implementar media query para tablet (≥ 600px)
- [ ] Implementar media query para desktop (≥ 1300px)
- [ ] Testar em todas as resoluções
- [ ] Documentar neste arquivo
- [ ] Adicionar comentários descritivos no CSS

---

## 📝 Notas Importantes

1. **Sempre mobile-first**: O design base deve ser para mobile, com media queries adicionando complexidade conforme a tela aumenta.

2. **Gap consistente**: Manter o `gap` consistente entre diferentes resoluções (pode variar entre páginas, mas deve ser consistente dentro da mesma página).

3. **Teste em dispositivos reais**: Sempre que possível, testar em dispositivos reais além do DevTools.

4. **Documentação obrigatória**: Toda nova configuração de grid deve ser documentada aqui.

---

## 🛠️ Manutenção

**Última atualização:** 09/10/2025  
**Responsável:** Sistema de Design do Dashboard Eletrize
