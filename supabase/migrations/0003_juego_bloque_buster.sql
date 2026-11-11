-- SPEC 07: BLOQUE BUSTER pasa a juego real con motor en lib/games/bloque-buster/ y entra en el ranking.

update public.games
set ranked = true,
    controls = 'TECLADO / RATÓN',
    long = 'Pilota una paleta de neón y rebota la pelota para pulverizar muros de bloques. Cinco niveles con patrones distintos: parrilla completa, pirámide, tablero de ajedrez, filas con huecos y marco con cruz. Cada nivel acelera la pelota y tienes 3 vidas para completarlos todos.'
where id = 'bloque-buster';
