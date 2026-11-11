-- SPEC 06: CAÍDA pasa a juego real con motor en lib/games/caida/ y entra en el ranking.

update public.games
set ranked = true,
    controls = 'TECLADO',
    long = 'Piezas geométricas descienden desde la oscuridad, incluida una tuerca hueca de 3×3. Muévelas, rótalas y encástralas para limpiar líneas. La pieza fantasma marca dónde caerán y el panel anticipa la siguiente. La velocidad aumenta cada 10 líneas.'
where id = 'caida';
