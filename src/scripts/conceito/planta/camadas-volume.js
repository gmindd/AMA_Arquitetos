// Camadas com volume: sombras projetadas no terreno, laje, pavimento,
// água, manchas de sol, estaleiro (implantação, andaimes, escoras, grua),
// e os sólidos da casa (paredes, vidros, coberturas, escada, piso 1,
// móveis, árvores, pérgula), pintados de trás para a frente.

import { clamp, seg, lerp, emOut, BRANCO, mistura, rgba, fecho } from './util.js';

export function criarVolume(g) {
  const { ctx, tr, cam, M, R, solidos: S } = g;
  const P = cam.projetar;
  const linha = tr.linha;
  const { ALTURA, PROFUNDIDADE, LARGURA } = M;
  const cantos = ([x0, y0, x1, y1]) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const ret = (r, z = 0) => cantos(r).map(([x, y]) => P(x, y, z));

  // Cada volume é casa existente (paredes exteriores a manter) ou novo
  const existente = M.pegadas.map(([x0, y0, x1, y1]) => {
    let velhas = 0;
    let novas = 0;
    M.cheias.forEach((p) => {
      if (!p.ext) return;
      const cx = (p.r[0] + p.r[2]) / 2;
      const cy = (p.r[1] + p.r[3]) / 2;
      if (cx < x0 - 0.3 || cx > x1 + 0.3 || cy < y0 - 0.3 || cy > y1 + 0.3) return;
      if (p.estado === 'manter') velhas++;
      else novas++;
    });
    return velhas > novas;
  });

  // Lados de andaime: o perímetro de cada volume, sem os troços que
  // ficariam dentro de outro volume
  const FOLGA = 0.6;
  const ladosAndaime = [];
  M.pegadas.forEach((r, i) => {
    const [x0, y0, x1, y1] = [r[0] - FOLGA, r[1] - FOLGA, r[2] + FOLGA, r[3] + FOLGA];
    const lados = [
      { fixo: y0, de: x0, ate: x1, h: true, n: [0, -1] },
      { fixo: x1, de: y0, ate: y1, h: false, n: [1, 0] },
      { fixo: y1, de: x0, ate: x1, h: true, n: [0, 1] },
      { fixo: x0, de: y0, ate: y1, h: false, n: [-1, 0] },
    ];
    lados.forEach((ld) => {
      let trocos = [[ld.de, ld.ate]];
      M.pegadas.forEach((o, j) => {
        if (j === i) return;
        const [a0, b0, a1, b1] = [o[0] - FOLGA, o[1] - FOLGA, o[2] + FOLGA, o[3] + FOLGA];
        const dentro = ld.h ? ld.fixo > b0 + 0.01 && ld.fixo < b1 - 0.01 : ld.fixo > a0 + 0.01 && ld.fixo < a1 - 0.01;
        if (!dentro) return;
        const [c0, c1] = ld.h ? [a0, a1] : [b0, b1];
        trocos = trocos.flatMap(([p, q]) => [[p, Math.min(q, c0)], [Math.max(p, c1), q]].filter(([u, v]) => v - u > 0.5));
      });
      trocos.forEach(([p, q]) =>
        ladosAndaime.push({ a: ld.h ? [p, ld.fixo] : [ld.fixo, p], b: ld.h ? [q, ld.fixo] : [ld.fixo, q], n: ld.n }),
      );
    });
  });

  // ---------- Pintura de uma face ----------
  function pintarFace(fc, st) {
    const f = g.f;
    const alfa = st.alfa ?? 1;
    // sombra própria: 0 = virada ao sol, 1 = de costas para o sol
    const sombra = fc.lado ? clamp(0.5 - 0.5 * (fc.n[0] * f.sol[0] + fc.n[1] * f.sol[1])) : 0;
    let fundo;
    let risco = f.cor(0.9 * alfa);
    let lw = f.px * 0.7;
    if (st.tipo === 'vidro') {
      fundo = rgba(mistura(f.papel, BRANCO, lerp(0.8, 0.22, f.inv)), 0.55 * alfa);
      risco = f.cor(0.75 * alfa);
      lw = f.px * 0.55;
    } else if (st.tipo === 'movel') {
      fundo = rgba(mistura(mistura(f.papel, BRANCO, 0.7), f.tinta, fc.lado ? 0.03 + 0.1 * sombra : 0), alfa);
      risco = f.cor(0.85 * alfa);
    } else if (fc.lado) {
      fundo = rgba(mistura(f.papel, f.tinta, (st.manter ? 0.1 : 0.035) + 0.15 * sombra), alfa);
    } else if (st.tipo === 'parede') {
      if (st.recorte) {
        // topo cortado: poché (em planta e em axonometria seccionada)
        const preenche = f.camP > 0 ? 1 : st.preenche ?? f.poche;
        fundo = rgba(st.manter ? mistura(f.papel, f.tinta, 0.4) : f.tinta, preenche * alfa);
      } else {
        fundo = rgba(mistura(f.papel, f.tinta, 0.07), alfa);
      }
      risco = f.cor(alfa);
      lw = f.px * 0.9;
    } else if (st.tipo === 'laje') {
      fundo = rgba(mistura(f.papel, f.tinta, 0.08), alfa);
    } else {
      fundo = rgba(f.papel, alfa);
    }
    tr.poligono(fc.pts);
    ctx.fillStyle = fundo;
    ctx.fill();
    ctx.strokeStyle = risco;
    ctx.lineWidth = lw;
    ctx.stroke();

    if (fc.lado && fc.a && (st.tipo === 'parede' || st.tipo === 'cobertura' || st.tipo === 'laje')) {
      const obra = st.obra || 0;
      // fiadas de tijolo enquanto a parede está em tosco
      if (obra > 0.02 && fc.z1 - fc.z0 > 0.3) {
        ctx.strokeStyle = f.cor(0.3 * obra * alfa);
        ctx.lineWidth = f.px * 0.4;
        ctx.beginPath();
        for (let z = Math.ceil((fc.z0 + 0.02) / 0.25) * 0.25; z < fc.z1 - 0.02; z += 0.25) {
          const p = P(fc.a[0], fc.a[1], z);
          const q = P(fc.b[0], fc.b[1], z);
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(q[0], q[1]);
        }
        ctx.stroke();
      }
      // faces em sombra: trama vertical fina, alinhada entre troços
      const h = ((sombra - 0.55) / 0.45) * (1 - obra);
      if (h > 0.03 && fc.z1 - fc.z0 > 0.15) {
        const esp = clamp(4.6 / cam.c.s, 0.1, 0.4);
        const emX = fc.a[1] === fc.b[1];
        const u0 = emX ? Math.min(fc.a[0], fc.b[0]) : Math.min(fc.a[1], fc.b[1]);
        const u1 = emX ? Math.max(fc.a[0], fc.b[0]) : Math.max(fc.a[1], fc.b[1]);
        ctx.strokeStyle = f.cor(0.3 * h * alfa);
        ctx.lineWidth = f.px * 0.4;
        ctx.beginPath();
        for (let u = Math.ceil((u0 + 0.01) / esp) * esp; u < u1 - 0.01; u += esp) {
          const p = emX ? P(u, fc.a[1], fc.z0) : P(fc.a[0], u, fc.z0);
          const q = emX ? P(u, fc.a[1], fc.z1) : P(fc.a[0], u, fc.z1);
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(q[0], q[1]);
        }
        ctx.stroke();
      }
    }
    if (fc.linhas?.length) {
      ctx.strokeStyle = f.cor(0.9 * alfa);
      ctx.lineWidth = f.px * 0.4;
      fc.linhas.forEach(([a, b]) => linha(a, b));
    }
    // vidro: prumos do caixilho
    if (st.tipo === 'vidro' && fc.lado) {
      const comp = Math.hypot(fc.b[0] - fc.a[0], fc.b[1] - fc.a[1]);
      if (comp > 0.9) {
        const folhas = Math.max(2, Math.round(comp / 1.3));
        ctx.beginPath();
        for (let k = 1; k < folhas; k++) {
          const x = lerp(fc.a[0], fc.b[0], k / folhas);
          const y = lerp(fc.a[1], fc.b[1], k / folhas);
          const p = P(x, y, fc.z0);
          const q = P(x, y, fc.z1);
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(q[0], q[1]);
        }
        ctx.stroke();
      }
    }
    // cobertura plana: remate da platibanda
    if (st.tipo === 'cobertura' && !fc.lado && fc.r) {
      const [x0, y0, x1, y1] = fc.r;
      if (x1 - x0 > 1.2 && y1 - y0 > 1.2) {
        ctx.lineWidth = f.px * 0.45;
        tr.poligono(ret([x0 + 0.35, y0 + 0.35, x1 - 0.35, y1 - 0.35], fc.z));
        ctx.stroke();
      }
    }
  }

  function pintarItens(itens) {
    for (const it of S.ordenar(itens)) {
      if (it.desenhar) it.desenhar();
      else for (const fc of it.faces ? it.faces() : S.facesCaixa(it)) pintarFace(fc, it.estilo);
    }
  }

  // ---------- Sombras projetadas no terreno ----------
  function sombras() {
    const f = g.f;
    const e = cam.c.e;
    const a = seg(f.camP, 0.35, 1);
    if (a <= 0) return;
    const d = f.luzD;
    const polis = [];
    const desloca = (pts, h) => pts.map(([x, y]) => [x + d[0] * h, y + d[1] * h]);
    const junta = (pts) => polis.push(fecho(pts).map(([x, y]) => P(x, y, 0)));
    M.pegadas.forEach((r, i) => {
      const cresce = existente[i] || f.m <= 0 ? 1 : lerp(1, seg(f.bp, 0.2, 0.56), f.m);
      const h = Math.min(ALTURA * cresce, f.corte) * e;
      if (h < 0.05) return;
      const c = cantos(r);
      junta([...c, ...desloca(c, h)]);
    });
    // a cobertura alonga a sombra quando assenta
    const k = seg(f.aCob, 0.6, 1);
    if (k > 0) {
      M.coberturas.forEach((c) => {
        if (c.tipo === 'duas-aguas') {
          const ym = c.cumeeira ?? (c.y0 + c.y1) / 2;
          const base = cantos([c.x0, c.y0, c.x1, c.y1]);
          const ht = (ALTURA + c.subida * k) * e;
          junta([...base, ...desloca(base, ALTURA * e), ...desloca([[c.x0, ym], [c.x1, ym]], ht)]);
        } else {
          const base = cantos(c.r);
          junta([...base, ...desloca(base, (ALTURA + 0.3 * k) * e)]);
        }
      });
    }
    // copas das árvores
    if (f.aExt > 0.5) {
      M.arvores.forEach((av) => {
        const pts = [];
        for (let q = 0; q < 14; q++) {
          const ang = (q / 14) * Math.PI * 2;
          pts.push([av.x + d[0] * av.h * e + Math.cos(ang) * av.r, av.y + d[1] * av.h * e + Math.sin(ang) * av.r]);
        }
        polis.push(pts.map(([x, y]) => P(x, y, 0)));
      });
    }
    if (!polis.length) return;
    const caminho = () =>
      polis.forEach((pl) => {
        pl.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
      });
    ctx.save();
    ctx.beginPath();
    caminho();
    ctx.fillStyle = rgba(mistura(f.papel, f.tinta, 0.07), a);
    ctx.fill();
    ctx.strokeStyle = f.cor(0.3 * a);
    ctx.lineWidth = f.px * 0.5;
    tr.trama(caminho, { ang: cam.c.a + Math.PI / 4, esp: 5, ancora: P(0, 0) });
    // sombra das ripas da pérgula no pavimento
    if (M.pergola && f.aExt > 0.5 && e > 0.5) {
      const [x0, y0, x1, y1] = M.pergola.r;
      const h = M.pergola.z * e;
      ctx.strokeStyle = f.cor(0.2 * a * f.aExt);
      ctx.lineWidth = f.px * 1.2;
      ctx.beginPath();
      for (let x = x0 + 0.4; x < x1 - 0.1; x += 0.4) {
        const p = P(x + d[0] * h, y0 + d[1] * h);
        const q = P(x + d[0] * h, y1 + d[1] * h);
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- Fundações e laje: ficam sempre por baixo de tudo ----------
  function laje() {
    const f = g.f;
    if (f.camP <= 0) return;
    // abertura de fundações: as sapatas corridas, a tracejado
    const aFund = f.m * seg(f.bp, 0.03, 0.07) * (1 - seg(f.bp, 0.1, 0.16));
    if (aFund > 0) {
      ctx.strokeStyle = f.cor(0.6 * aFund);
      ctx.lineWidth = f.px * 0.6;
      ctx.setLineDash([3, 3]);
      M.cheias.forEach((p) => {
        if (p.estado === 'manter') return;
        const [x0, y0, x1, y1] = p.r;
        tr.poligono(ret([x0 - 0.12, y0 - 0.12, x1 + 0.12, y1 + 0.12], -0.4));
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }
    const sobe = lerp(1, emOut(seg(f.bp, 0.04, 0.16)), f.m);
    if (sobe <= 0) return;
    pintarItens(
      M.pegadas.map(([x0, y0, x1, y1]) =>
        S.caixa([x0 - 0.2, y0 - 0.2, x1 + 0.2, y1 + 0.2], -0.4, -0.4 + 0.4 * sobe, { tipo: 'laje' }),
      ),
    );
  }

  // ---------- Pavimento, exteriores, água, cursor e sol ----------
  function pavimento() {
    const f = g.f;
    const aPav = Math.max(f.poche, f.camP);
    if (aPav > 0) {
      ctx.fillStyle = rgba(f.papel, aPav);
      M.pegadas.forEach((r) => {
        tr.poligono(ret(r));
        ctx.fill();
      });
      // espaços a céu aberto: deck (réguas) ou jardim (trama)
      ctx.strokeStyle = f.cor(0.2 * aPav);
      ctx.lineWidth = f.px * 0.5;
      M.divisoes
        .filter((dv) => dv.exterior)
        .forEach(({ r, piso }) => {
          const [x0, y0, x1, y1] = r;
          ctx.beginPath();
          if (piso === 'deck') {
            for (let y = y0 + 0.3; y < y1 - 0.05; y += 0.3) {
              const p = P(x0, y);
              const q = P(x1, y);
              ctx.moveTo(p[0], p[1]);
              ctx.lineTo(q[0], q[1]);
            }
            ctx.stroke();
          } else {
            ctx.save();
            tr.poligono(ret(r));
            ctx.clip();
            ctx.beginPath();
            for (let c = x0 + y0 - (y1 - y0); c < x1 + y1; c += 0.35) {
              const p = P(c - y0, y0);
              const q = P(c - y1, y1);
              ctx.moveTo(p[0], p[1]);
              ctx.lineTo(q[0], q[1]);
            }
            ctx.stroke();
            ctx.restore();
          }
        });
      // espelho de água
      if (M.agua && f.aExt > 0) {
        const [x0, y0, x1, y1] = M.agua;
        const t = g.reduz ? 0 : f.tempo / 1000;
        ctx.save();
        ctx.globalAlpha = f.aExt;
        tr.poligono(ret(M.agua));
        ctx.fillStyle = rgba(mistura(f.papel, f.tinta, 0.1));
        ctx.fill();
        ctx.strokeStyle = f.cor(0.9);
        ctx.lineWidth = f.px * 0.8;
        ctx.stroke();
        ctx.clip();
        ctx.strokeStyle = f.cor(0.4);
        ctx.lineWidth = f.px * 0.5;
        ctx.setLineDash([9, 13]);
        let k = 0;
        for (let y = y0 + 0.4; y < y1 - 0.1; y += 0.55) {
          ctx.lineDashOffset = -t * 5 * (k % 2 ? 1 : -0.7) + k * 7;
          ctx.beginPath();
          for (let x = x0; x <= x1 + 0.01; x += 0.25) {
            const p = P(x, y + Math.sin(x * 2.1 + t * 1.3 + k * 1.7) * 0.05);
            if (x === x0) ctx.moveTo(p[0], p[1]);
            else ctx.lineTo(p[0], p[1]);
          }
          ctx.stroke();
          k++;
        }
        ctx.restore();
      }
    }
    // divisão sob o cursor
    const hv = g.hover;
    hv.a += ((hv.sala >= 0 ? 1 : 0) - hv.a) * 0.2;
    if (hv.sala >= 0 && hv.a > 0.01) {
      ctx.fillStyle = rgba(f.inv > 0.5 ? mistura(f.papel, BRANCO, 0.12) : BRANCO, 0.9 * hv.a);
      tr.poligono(ret(M.divisoes[hv.sala].r));
      ctx.fill();
    }
    // manchas de sol: cada vão virado ao sol projeta a sua no pavimento
    if (f.luz > 0) {
      const d = f.luzD;
      ctx.fillStyle = rgba(mistura(f.papel, BRANCO, lerp(1, 0.2, f.inv)), 0.95);
      M.janelas.forEach((j) => {
        const frente = j.n[0] * f.sol[0] + j.n[1] * f.sol[1];
        if (frente < 0.1 || j.sala < 0) return;
        const { a, b, z0, z1 } = j;
        ctx.save();
        ctx.globalAlpha = f.luz * clamp(frente * 2.5);
        tr.poligono(ret(M.divisoes[j.sala].r));
        ctx.clip();
        tr.poligono([
          P(a[0] + d[0] * z0, a[1] + d[1] * z0),
          P(b[0] + d[0] * z0, b[1] + d[1] * z0),
          P(b[0] + d[0] * z1, b[1] + d[1] * z1),
          P(a[0] + d[0] * z1, a[1] + d[1] * z1),
        ]);
        ctx.fill();
        ctx.restore();
      });
    }
  }

  // ---------- Estaleiro ----------
  function andaimes(frente) {
    const f = g.f;
    const a = f.m * seg(f.bp, 0.14, 0.24) * (1 - seg(f.bp, 0.84, 0.94));
    if (a <= 0) return;
    const h = 0.8 + (ALTURA + 0.6) * seg(f.bp, 0.14, 0.62);
    ctx.strokeStyle = f.cor(0.55 * a);
    ctx.lineWidth = f.px * 0.6;
    ladosAndaime.forEach((ld) => {
      if (cam.ladoVisivel(ld.n[0], ld.n[1]) !== frente) return;
      const comp = Math.hypot(ld.b[0] - ld.a[0], ld.b[1] - ld.a[1]);
      const nP = Math.max(1, Math.round(comp / 2));
      const ponto = (t) => [lerp(ld.a[0], ld.b[0], t), lerp(ld.a[1], ld.b[1], t)];
      for (let k = 0; k <= nP; k++) {
        const [x, y] = ponto(k / nP);
        linha(P(x, y, 0), P(x, y, h));
        if (k < nP && k % 2 === 0) {
          const [x2, y2] = ponto((k + 1) / nP);
          linha(P(x, y, 0), P(x2, y2, Math.min(h, 1.6)));
        }
      }
      for (let z = 1; z <= h; z += 1.2) linha(P(ld.a[0], ld.a[1], z), P(ld.b[0], ld.b[1], z));
    });
  }

  function obraAtras() {
    const f = g.f;
    if (f.m <= 0) return;
    const { bp, m } = f;
    // implantação: estacas e cordéis a marcar a casa no terreno
    const aImp = m * seg(bp, 0, 0.03) * (1 - seg(bp, 0.12, 0.2));
    if (aImp > 0) {
      ctx.strokeStyle = f.cor(0.7 * aImp);
      ctx.lineWidth = f.px * 0.6;
      M.pegadas.forEach(([x0, y0, x1, y1], i) => {
        if (existente[i]) return;
        const o = 1;
        const z = 0.45;
        [[x0 - o, y0, x1 + o, y0], [x0 - o, y1, x1 + o, y1], [x0, y0 - o, x0, y1 + o], [x1, y0 - o, x1, y1 + o]].forEach(([ax, ay, bx, by]) => {
          ctx.setLineDash([2, 3]);
          linha(P(ax, ay, z), P(bx, by, z));
          ctx.setLineDash([]);
          linha(P(ax, ay, 0), P(ax, ay, z + 0.2));
          linha(P(bx, by, 0), P(bx, by, z + 0.2));
        });
      });
    }

    andaimes(false);

    // escoramento: escoras inclinadas contra as fachadas a manter
    if (f.escora > 0) {
      ctx.strokeStyle = f.cor(0.6 * f.escora);
      ctx.lineWidth = f.px * 0.7;
      M.cheias
        .filter((p) => p.estado === 'manter' && p.ext)
        .forEach((p) => {
          const [x0, y0, x1, y1] = p.r;
          const h = x1 - x0 > y1 - y0;
          const comp = h ? x1 - x0 : y1 - y0;
          const nx = h ? 0 : x0 > LARGURA / 2 ? 1 : -1;
          const ny = h ? (y0 > PROFUNDIDADE / 2 ? 1 : -1) : 0;
          for (let t = 0.6; t < comp - 0.3; t += 1.6) {
            const bx = h ? x0 + t : nx > 0 ? x1 : x0;
            const by = h ? (ny > 0 ? y1 : y0) : y0 + t;
            linha(P(bx + nx * 1.6, by + ny * 1.6, 0), P(bx, by, 2.4));
            linha(P(bx + nx * 1.6, by + ny * 1.6, 0), P(bx + nx * 0.2, by + ny * 0.2, 0));
          }
        });
    }

    // grua-torre: mastro treliçado, lança a rodar e carga suspensa
    if (f.grua > 0) {
      const { x: bx, y: by, altura: H, lanca } = M.grua;
      ctx.strokeStyle = f.cor(0.7 * f.grua);
      ctx.lineWidth = f.px * 0.7;
      for (const dx of [-0.25, 0.25]) linha(P(bx + dx, by, 0), P(bx + dx, by, H * f.grua));
      for (let z = 0; z < H * f.grua - 0.6; z += 0.6) linha(P(bx - 0.25, by, z), P(bx + 0.25, by, z + 0.6));
      if (f.grua > 0.6) {
        const ang = -0.9 + bp * 2.6;
        const dir = [Math.cos(ang), Math.sin(ang)];
        const ponta = [bx + dir[0] * lanca, by + dir[1] * lanca];
        const contra = [bx - dir[0] * 3.5, by - dir[1] * 3.5];
        linha(P(contra[0], contra[1], H), P(ponta[0], ponta[1], H));
        linha(P(bx, by, H + 1.6), P(ponta[0], ponta[1], H));
        linha(P(bx, by, H + 1.6), P(contra[0], contra[1], H));
        linha(P(bx, by, H), P(bx, by, H + 1.6));
        const car = 4 + 5 * (0.5 + 0.5 * Math.sin(bp * 9));
        const cpos = [bx + dir[0] * car, by + dir[1] * car];
        const zc = 3.4 + Math.sin(bp * 14) * 0.8;
        linha(P(cpos[0], cpos[1], H), P(cpos[0], cpos[1], zc));
        ctx.fillStyle = f.cor(0.7 * f.grua);
        const pc = P(cpos[0], cpos[1], zc);
        ctx.fillRect(pc[0] - 4, pc[1], 8, 6);
        const pb = P(contra[0], contra[1], H);
        ctx.fillRect(pb[0] - 5, pb[1], 10, 8);
      }
    }

    // projeto fantasma: a obra cresce dentro do desenho
    const aFant = m * (1 - f.fimObra);
    if (aFant > 0 && f.camP > 0.5) {
      ctx.strokeStyle = f.cor(0.4 * aFant);
      ctx.lineWidth = f.px * 0.6;
      ctx.setLineDash([3, 4]);
      M.cheias.forEach((p) => {
        tr.poligono(ret(p.r, ALTURA));
        ctx.stroke();
      });
      M.cantos.forEach(([x, y]) => linha(P(x, y, 0), P(x, y, ALTURA)));
      ctx.setLineDash([]);
    }
  }

  function obraFrente() {
    if (g.f.m > 0) andaimes(true);
  }

  // ---------- Árvores e pérgula ----------
  function arvore(av, k, alfa) {
    const f = g.f;
    const e = cam.c.e;
    const base = P(av.x, av.y, 0);
    const c = P(av.x, av.y, av.h * e);
    if (!g.reduz) c[0] += Math.sin(f.tempo / 1700 + k * 2.1) * 1.6 * e;
    const r = av.r * cam.c.s;
    const volta = (cx, cy, raio, voltas) => {
      const pts = [];
      const n = Math.round(22 * voltas);
      for (let i = 0; i <= n; i++) {
        const ang = 0.6 + k + (i / 22) * Math.PI * 2;
        pts.push([cx + Math.cos(ang) * raio, cy + Math.sin(ang) * raio]);
      }
      return pts;
    };
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.strokeStyle = f.T;
    ctx.lineWidth = f.px * 0.8;
    if (e > 0.05) linha(base, [c[0], c[1] + r * 0.3]);
    ctx.fillStyle = rgba(mistura(f.papel, BRANCO, lerp(0.4, 0.05, f.inv)), lerp(0.9, 0.7, e));
    ctx.beginPath();
    ctx.arc(c[0], c[1], r, 0, Math.PI * 2);
    ctx.fill();
    tr.mao(volta(c[0], c[1], r, 1.06), { s: 600 + k, tremor: 1.7, sobra: 0, suave: true, passo: 7, lapis: false });
    ctx.lineWidth = f.px * 0.5;
    ctx.strokeStyle = f.cor(0.55);
    tr.mao(volta(c[0] - r * 0.12, c[1] + r * 0.08, r * 0.58, 0.8), { s: 620 + k, tremor: 1.4, sobra: 0, suave: true, passo: 6, lapis: false });
    // em planta, os ramos a partir do tronco
    if (e < 0.9) {
      ctx.globalAlpha = alfa * (1 - e) * 0.7;
      for (let q = 0; q < 7; q++) {
        const ang = k + (q / 7) * Math.PI * 2;
        const l = r * (0.45 + 0.4 * ((q * 37) % 10) / 10);
        linha(c, [c[0] + Math.cos(ang) * l, c[1] + Math.sin(ang) * l]);
      }
    }
    ctx.restore();
  }

  function pergola(alfa) {
    const f = g.f;
    const { r, z } = M.pergola;
    const [x0, y0, x1, y1] = r;
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.strokeStyle = f.cor(0.9);
    ctx.lineWidth = f.px * 0.9;
    if (cam.c.e > 0.05) cantos(r).forEach(([x, y]) => linha(P(x, y, 0), P(x, y, z)));
    tr.poligono(ret(r, z));
    ctx.stroke();
    ctx.lineWidth = f.px * 0.5;
    ctx.beginPath();
    for (let x = x0 + 0.4; x < x1 - 0.1; x += 0.4) {
      const p = P(x, y0, z);
      const q = P(x, y1, z);
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ---------- Sólidos, de trás para a frente ----------
  function volumes() {
    const f = g.f;
    const { camP, m, bp, poche, levant, tramaExist, corte, levanta, moveis, afasta } = f;
    const itens = [];
    const caixa = (r, z0, z1, estilo) => itens.push(S.caixa(r, z0, z1, estilo));
    // tosco (tijolo à vista) até aos acabamentos
    const tosco = m * (1 - seg(bp, 0.86, 0.97));

    if (poche > 0 || camP > 0 || levant > 0) {
      M.paredes.forEach((p) => {
        const cheia = p.z0 === 0 && p.z1 >= 2;
        const manter = p.estado === 'manter';
        if (!cheia && camP <= 0) return;
        // em planta: existentes com a trama do levantamento, novas com o poché
        if (camP <= 0 && (manter ? tramaExist <= 0 : poche <= 0)) return;
        const topoMax = Math.min(ALTURA * f.altObra(p), corte);
        if (topoMax <= p.z0 + 0.001) return;
        const z1 = Math.min(p.z1, topoMax);
        // topo negro só onde a parede é cortada (o topo pleno ou o plano de corte)
        const recorte = z1 >= ALTURA - 0.001 || (corte < p.z1 && z1 >= corte - 0.001);
        caixa(p.r, p.z0, z1, {
          tipo: 'parede',
          alfa: cheia ? 1 : seg(camP, 0, 0.35),
          recorte,
          manter,
          preenche: manter ? tramaExist : poche,
          obra: manter ? 0 : tosco,
        });
      });
    }

    // vidros: uma lâmina fina dentro de cada vão de janela
    const aVidro = camP > 0.3 ? lerp(seg(camP, 0.3, 1), seg(bp, 0.74, 0.86), m) : 0;
    if (aVidro > 0.01) {
      M.vaos.forEach((v) => {
        if (v.tipo !== 'janela') return;
        const z1 = Math.min(v.z1, corte);
        if (z1 <= v.z0 + 0.02) return;
        const [x0, y0, x1, y1] = v.r;
        const t = (v.h ? y1 - y0 : x1 - x0) * 0.36;
        caixa(v.h ? [x0, y0 + t, x1, y1 - t] : [x0 + t, y0, x1 - t, y1], v.z0, z1, { tipo: 'vidro', alfa: aVidro });
      });
    }

    // reabilitação: a construção anexa existe no início da obra e é demolida
    if (R && m > 0 && f.demolir < 1) {
      M.demolicoes.forEach(([x0, y0, x1, y1, h]) => {
        const z1 = Math.min(h * (1 - f.demolir), corte);
        if (z1 > 0.02) {
          caixa([x0, y0, x1, y1], 0, z1, { tipo: 'parede', alfa: m * (1 - f.demolir * 0.6), recorte: true, manter: true, preenche: 1 });
        }
      });
    }

    // cobertura: desce sobre as paredes na obra; na entrega volta a subir
    if (f.aCob > 0.01) {
      const zc = ALTURA + (1 - f.desce) * 6 + levanta * 7;
      M.coberturas.forEach((c) => {
        const estilo = { tipo: 'cobertura', alfa: f.aCob };
        if (c.tipo === 'duas-aguas') itens.push(S.duasAguas(c, zc, estilo));
        else caixa(c.r, zc, zc + 0.3, estilo);
      });
    }

    // escada: os degraus sobem com a obra
    if (camP > 0 && M.escada.length) {
      const sobe = lerp(1, emOut(seg(bp, 0.45, 0.6)), m);
      M.escada.forEach(([x0, y0, x1, y1, z]) => {
        if (z * sobe > 0.01) caixa([x0, y0, x1, y1], 0, Math.min(z * sobe, corte), { tipo: 'movel', alfa: seg(camP, 0, 0.4) });
      });
    }

    // piso 1: laje, meias-paredes e móveis, afastado na axonometria explodida
    const piso1 = M.piso1;
    if (piso1 && camP > 0) {
      const zP = piso1.z + afasta;
      const fLaje = lerp(1, emOut(seg(bp, 0.62, 0.68)), m);
      const fPar = lerp(1, emOut(seg(bp, 0.66, 0.76)), m);
      const aP = seg(camP, 0.3, 0.8);
      const corteP = lerp(piso1.altura, 1.2, levanta);
      if (fLaje > 0.01) caixa(piso1.laje, zP - 0.22 * fLaje, zP, { tipo: 'laje', alfa: aP * fLaje });
      piso1.paredes.forEach((p) => {
        const z1 = Math.min(p.z1, piso1.altura * fPar, corteP);
        if (z1 <= p.z0 + 0.001) return;
        const recorte = z1 >= p.z1 - 0.001 || corteP < p.z1;
        caixa(p.r, zP + p.z0, zP + z1, { tipo: 'parede', alfa: aP, recorte, obra: tosco });
      });
      if (moveis > 0) {
        const n = piso1.mobiliario.length;
        piso1.mobiliario.forEach((mv, i) => {
          const v = emOut(seg(moveis, 0.3 + (i / n) * 0.4, 0.7 + (i / n) * 0.3));
          if (v > 0) caixa(mv, zP, zP + Math.min(mv[4], corteP) * v, { tipo: 'movel', alfa: v });
        });
      }
    }

    // móveis: entram um a um na entrega
    if (moveis > 0) {
      const n = M.mobiliario.length;
      M.mobiliario.forEach((mv, i) => {
        const v = emOut(seg(moveis, (i / n) * 0.6, (i / n) * 0.6 + 0.4));
        if (v > 0) caixa(mv, 0, Math.min(mv[4], corte) * v, { tipo: 'movel', alfa: v });
      });
    }

    // árvores e pérgula entram na mesma ordenação (podem ficar atrás da casa)
    if (f.aExt > 0) {
      M.arvores.forEach((av, k) => {
        itens.push({
          x0: av.x - av.r * 0.5,
          y0: av.y - av.r * 0.5,
          x1: av.x + av.r * 0.5,
          y1: av.y + av.r * 0.5,
          z0: 0,
          z1: av.h + av.r,
          desenhar: () => arvore(av, k, f.aExt),
        });
      });
      if (M.pergola) {
        const [x0, y0, x1, y1] = M.pergola.r;
        itens.push({ x0, y0, x1, y1, z0: 0, z1: M.pergola.z, desenhar: () => pergola(f.aExt * lerp(0.45, 1, camP)) });
      }
    }

    pintarItens(itens);
  }

  return { sombras, laje, pavimento, obraAtras, volumes, obraFrente };
}
