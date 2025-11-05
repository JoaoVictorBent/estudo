/*
 * ----------------------------------------------------
 * JAVASCRIPT - LÓGICA DO SCROLL INFINITO (Corrigido)
 * Versão com Pulo Relativo
 * ----------------------------------------------------
 */

// Objeto global para armazenar as referências
window.carouselRefs = {};

/**
 * Obtém a largura do item e a largura total (com margens).
 */
function getItemMetrics(container) {
    const item = container.querySelector('.carousel-item');
    if (!item) return { itemWidth: 0, itemFullWidth: 0 };

    const style = getComputedStyle(item);
    const itemWidth = item.offsetWidth;
    const margin = parseFloat(style.marginLeft) + parseFloat(style.marginRight);
    const itemFullWidth = itemWidth + margin;

    return { itemWidth, itemFullWidth };
}

/**
 * Gerencia o 'salto' imperceptível APÓS o debounce.
 * Esta versão usa lógica de pulo relativo.
 */
function handleInfiniteJump(containerId) {
    const ref = window.carouselRefs[containerId];
    if (!ref || ref.isJumping) return;

    const {
        container,
        triggerPointForward,
        triggerPointBackward,
        jumpDistance // Nova variável
    } = ref;

    const scrollLeft = container.scrollLeft;
    let jumped = false;

    // 1. Salto do Fim para o Início (Pulo Relativo)
    // Se a posição for MAIOR que o gatilho (entrou na área de clones do fim)
    if (scrollLeft > triggerPointForward) {
        ref.isJumping = true;
        container.style.scrollBehavior = 'auto';
        // Subtrai a distância exata dos itens reais
        container.scrollLeft -= jumpDistance;
        jumped = true;
        console.log(`[CAROUSEL DEBUG] SALTO RELATIVO: Fim -> Início. Pulou ${jumpDistance.toFixed(0)}px`);
    }

    // 2. Salto do Início para o Fim (Pulo Relativo)
    // Se a posição for MENOR que o gatilho (entrou na área de clones do início)
    else if (scrollLeft < triggerPointBackward) {
        ref.isJumping = true;
        container.style.scrollBehavior = 'auto';
        // Adiciona a distância exata dos itens reais
        container.scrollLeft += jumpDistance;
        jumped = true;
        console.log(`[CAROUSEL DEBUG] SALTO RELATIVO: Início -> Fim. Pulou ${jumpDistance.toFixed(0)}px`);
    }

    // Reabilita o smooth scroll
    if (jumped) {
        setTimeout(() => {
            container.style.scrollBehavior = 'smooth';
            ref.isJumping = false;
        }, 50); // 50ms é o suficiente
    }
}

/**
 * Inicializa a lógica de scroll infinito (Exposta globalmente).
 * Esta função é chamada pelo Carousel.razor
 */
window.initInfiniteScroll = function (carouselRef, realItemsCount) {
    const container = carouselRef;
    if (!container || realItemsCount < 3) return; // Precisa de pelo menos 3 itens

    console.log("[CAROUSEL DEBUG] Início de initInfiniteScroll.");

    const containerId = container.id || `carousel-${Math.random().toString(36).substr(2, 9)}`;
    container.id = containerId;

    if (window.carouselRefs[containerId] && window.carouselRefs[containerId].scrollHandler) {
        container.removeEventListener('scroll', window.carouselRefs[containerId].scrollHandler);
    }

    const { itemWidth, itemFullWidth } = getItemMetrics(container);
    if (itemFullWidth === 0) {
        console.error("[CAROUSEL DEBUG] Largura do item é zero. Falha no cálculo.");
        return;
    }

    const containerWidth = container.clientWidth;

    // --- CÁLCULOS (Revisados para Pulo Relativo) ---

    // Offset para centralizar o item na tela
    const itemCenterOffset = (itemWidth / 2) - (containerWidth / 2);

    // Índices: [C-2, C-1, R-1, R-2, ..., R-N, C+1, C+2]
    // Índices: [ 0,   1,   2,   3, ..., N+1, N+2, N+3]

    // Posição inicial: Centro do PRIMEIRO item real (ÍNDICE 2)
    const initialPosition = (2 * itemFullWidth) + itemCenterOffset;

    // Distância do Pulo: O comprimento exato de todos os itens reais.
    const jumpDistance = realItemsCount * itemFullWidth;

    // Gatilho FORWARD: Metade do caminho entre o último real (R-N) e o primeiro clone (C+1).
    // R-N está no índice (N+1). C+1 está no índice (N+2).
    // O gatilho fica no índice (N+1.5).
    const triggerPointForward = ((realItemsCount + 1.5) * itemFullWidth) + itemCenterOffset;

    // Gatilho BACKWARD: Metade do caminho entre o último clone (C-1) e o primeiro real (R-1).
    // C-1 está no índice (1). R-1 está no índice (2).
    // O gatilho fica no índice (1.5).
    const triggerPointBackward = (1.5 * itemFullWidth) + itemCenterOffset;

    console.log(`[CAROUSEL DEBUG] ID: ${containerId}`);
    console.log(`[CAROUSEL DEBUG] Itens Reais (N): ${realItemsCount}`);
    console.log(`[CAROUSEL DEBUG] Largura Item: ${itemFullWidth.toFixed(2)}`);
    console.log(`[CAROUSEL DEBUG] Posição Inicial (R-1): ${initialPosition.toFixed(2)}`);
    console.log(`[CAROUSEL DEBUG] Distância do Pulo: ${jumpDistance.toFixed(2)}`);
    console.log(`[CAROUSEL DEBUG] Gatilho Fim (entre R-N e C+1): ${triggerPointForward.toFixed(2)}`);
    console.log(`[CAROUSEL DEBUG] Gatilho Início (entre C-1 e R-1): ${triggerPointBackward.toFixed(2)}`);

    window.carouselRefs[containerId] = {
        container,
        // Removemos startJumpPoint e endJumpPoint
        triggerPointForward,
        triggerPointBackward,
        jumpDistance, // Adicionamos a distância
        realItemsCount,
        itemFullWidth,
        isJumping: false,
        scrollTimer: null,
        scrollHandler: null
    };

    // POSICIONAMENTO INICIAL INSTANTÂNEO
    container.style.scrollBehavior = 'auto';
    container.scrollLeft = initialPosition;
    console.log(`[CAROUSEL DEBUG] Posição Inicial Definida: ${initialPosition.toFixed(2)}`);

    setTimeout(() => {
        container.style.scrollBehavior = 'smooth';
    }, 50);

    // LÓGICA DE DEBOUNCE
    const scrollHandler = () => {
        const ref = window.carouselRefs[containerId];
        if (ref.isJumping) return; // Não faz nada se estiver pulando

        clearTimeout(ref.scrollTimer);
        ref.scrollTimer = setTimeout(() => {
            handleInfiniteJump(containerId);
        }, 50); // 150ms é um bom valor para esperar o 'scroll-snap'
    };

    container.addEventListener('scroll', scrollHandler);
    window.carouselRefs[containerId].scrollHandler = scrollHandler;
    console.log("[CAROUSEL DEBUG] Listener 'scroll' ativado.");
};