-- SPEC 08: SERPENTINA pasa a juego real con motor en lib/games/serpentina/ y entra en el ranking.

update public.games
set ranked = true,
    controls = 'TECLADO',
    long = 'Una serpiente de luz recorre una rejilla de 32×24 casillas comiendo frutas de neón. Cada fruta la alarga una casilla y vale 10 puntos por nivel. Cada 5 frutas sube de nivel y acelera, hasta el nivel 10. Chocar con un muro o con tu propia cola termina la partida.'
where id = 'serpentina';
