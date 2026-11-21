-- SPEC JAM ranaria 01: RANARIA pasa a juego real con motor en lib/games/ranaria/ y entra en el ranking.
-- Numerada 0006 (la spec decía 0005, ya tomada por 0005_controles_tactiles).

update public.games
set ranked = true,
    controls = 'TECLADO',
    long = 'Guía a una rana de neón casilla a casilla: cruza cuatro carriles de tráfico, salta sobre troncos y boyas a la deriva y alcanza uno de los cinco nenúfares antes de que se agoten sus 30 segundos. Cada fila nueva suma puntos, cada nenúfar más, y el tiempo sobrante es bonus. Llena los cinco para subir de nivel y acelerar el río y la carretera. Tienes 3 vidas.'
where id = 'ranaria';
