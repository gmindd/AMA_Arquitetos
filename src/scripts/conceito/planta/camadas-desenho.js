// Camadas desenhadas "no papel": título, notas de programa, diagrama de
// bolhas, linhas de construção, esboço à mão das paredes, levantamento,
// cotas, rótulos, símbolos de planta, escala, norte, lápis e o visitante.
// Cada função lê o estado do quadro em g.f (fases, cores, câmara).

import { clamp, seg, lerp, emInOut, num, mistura, rgba } from './util.js';

export function criarDesenho(g) {
  const { ctx, tr, cam, M, R } = g;
  const P = cam.projetar;
  const linha = tr.linha;
  const { LARGURA, PROFUNDIDADE, divisoes, cotas } = M;
  const ret = ([x0, y0, x1, y1], z = 0) => [P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)];
  const fechar = (q) => [...q, q[0]];

  function circulo(c, r, voltas = 1, n = 26) {
    const pts = [];
    const m = Math.round(n * voltas);
    for (let i = 0; i <= m; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]);
    }
    return pts;
  }

  // Contorno de um retângulo de cantos redondos (raio = metade → círculo),
  // amostrado a partir do meio do lado de cima, em sentido horário
  function arredondado(cx, cy, w, h, r, voltas = 1, n = 44) {
    const hw = Math.max(0, w / 2 - r);
    const hh = Math.max(0, h / 2 - r);
    const q = (Math.PI * r) / 2;
    const perim = 4 * hw + 4 * hh + 4 * q;
    const arco = (ox, oy, a0, t) => {
      const a = a0 + (t / q) * (Math.PI / 2);
      return [ox + Math.cos(a) * r, oy + Math.sin(a) * r];
    };
    const pos = (u) => {
      let t = u;
      if (t < hw) return [cx + t, cy - h / 2];
      t -= hw;
      if (t < q) return arco(cx + hw, cy - hh, -Math.PI / 2, t);
      t -= q;
      if (t < 2 * hh) return [cx + w / 2, cy - hh + t];
      t -= 2 * hh;
      if (t < q) return arco(cx + hw, cy + hh, 0, t);
      t -= q;
      if (t < 2 * hw) return [cx + hw - t, cy + h / 2];
      t -= 2 * hw;
      if (t < q) return arco(cx - hw, cy + hh, Math.PI / 2, t);
      t -= q;
      if (t < 2 * hh) return [cx - w / 2, cy + hh - t];
      t -= 2 * hh;
      if (t < q) return arco(cx - hw, cy - hh, Math.PI, t);
      t -= q;
      return [cx - hw + t, cy - h / 2];
    };
    const pts = [];
    const m = Math.round(n * voltas);
    for (let i = 0; i <= m; i++) pts.push(pos(((i / n) * perim) % perim));
    return pts;
  }

  // ---------- Título do desenho ----------
  function titulo() {
    const f = g.f;
    const { s, r0, area } = f;
    let t = 'Diagrama de espaços';
    if (s > 0.5) t = 'Esboço · estudo prévio';
    if (s > 1.5) t = R ? 'Planta de alterações · esc. 1:100' : 'Planta do piso 0 · esc. 1:100';
    if (R && r0 < 0.45) t = 'Levantamento do existente';
    if (s > 2.6) t = 'Axonometria';
    if (s > 3.5) t = `Obra · ${Math.round(f.bp * 100)}%`;
    if (s > 4.55) t = 'Entrega';
    const a = R ? seg(r0, -0.6, -0.2) : seg(s, -0.6, -0.2);
    if (a <= 0) return;
    const dono = R ? 'Caso real · reabilitação e ampliação' : f.nome ? `Casa ${f.nome}` : 'A sua casa';
    // como numa folha de projeto, a legenda fica por baixo do desenho
    // (em cima ficaria escondida pelo cabeçalho da página)
    const largo = g.med.L > 900;
    const y = largo ? area.y1 + 26 : area.y0 - 38;
    ctx.globalAlpha = a;
    ctx.fillStyle = f.T;
    if (largo) ctx.fillRect(area.x0, y - 12, 28, 1);
    tr.texto(`${dono} · ${t}`.toUpperCase(), area.x0, y, { tam: 10, alinha: 'left', mono: true, cor: f.T });
    ctx.globalAlpha = 1;
  }

  // ---------- Notas de programa (primeiro passo) ----------
  function notas() {
    const f = g.f;
    const a = f.notasP;
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = f.cor(0.8);
    ctx.lineWidth = f.px;
    M.notas.forEach((nt, i) => {
      const op = { f: a, s: 40 + i, lapis: false };
      if (nt.tipo === 'sol') {
        const c = P(nt.x, nt.y);
        const r = 0.42 * cam.c.s;
        tr.mao(circulo(c, r, 1.08), { ...op, sobra: 0, tremor: 1.2, suave: true, passo: 6 });
        for (let k = 0; k < 8; k++) {
          const ang = (k / 8) * Math.PI * 2 + 0.2;
          const dx = Math.cos(ang) * r;
          const dy = Math.sin(ang) * r;
          tr.mao([[c[0] + dx * 1.4, c[1] + dy * 1.4], [c[0] + dx * 1.95, c[1] + dy * 1.95]], { ...op, s: 60 + k, sobra: 0, tremor: 0.5 });
        }
      } else if (nt.tipo === 'texto') {
        const c = P(nt.x, nt.y);
        tr.texto(nt.t, c[0], c[1], { tam: 13, italico: true, alinha: nt.alinha || 'center', cor: f.cor(0.85) });
      } else if (nt.tipo === 'linha') {
        if (nt.tracejado) ctx.setLineDash([6, 6]);
        tr.mao(nt.pts.map(([x, y]) => P(x, y)), { ...op, sobra: 3, tremor: 0.8 });
        ctx.setLineDash([]);
      } else if (nt.tipo === 'seta') {
        const p = P(nt.de[0], nt.de[1]);
        const q = P(nt.para[0], nt.para[1]);
        tr.mao([p, q], { ...op, sobra: 0, tremor: 0.8 });
        if (a > 0.6) {
          const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
          for (const dl of [-0.45, 0.45]) {
            tr.mao([q, [q[0] - Math.cos(ang + dl) * 9, q[1] - Math.sin(ang + dl) * 9]], { s: 80 + i, sobra: 0, tremor: 0.3, lapis: false });
          }
        }
      } else if (nt.tipo === 'ondas') {
        for (let k = 0; k < 3; k++) {
          const pts = [];
          for (let j = 0; j <= 16; j++) pts.push(P(nt.x - k * 0.45 + Math.sin(j * 0.9 + k) * 0.12, nt.y + j * 0.22));
          tr.mao(pts, { ...op, s: 90 + k, sobra: 0, tremor: 0.4, suave: true });
        }
      }
    });
    ctx.restore();
  }

  // ---------- Reabilitação: levantamento do existente ----------
  function levantamento() {
    const f = g.f;
    if (!R || f.camP !== 0) return;
    const tremor = (1 - f.tramaExist) * 0.6;
    const contornar = (r, fr, s) => tr.mao(fechar(ret(r)), { f: fr, s, tremor, sobra: tremor * 5, passo: 12 });
    // paredes a demolir: cinzento no levantamento, depois tracejado e somem
    const aDem = f.levant * (1 - f.someDem);
    if (aDem > 0) {
      M.demolicoes.forEach((dm, i) => {
        const r = dm.slice(0, 4);
        ctx.fillStyle = rgba(mistura(f.papel, f.tinta, 0.4), f.tramaExist * (1 - f.tracejaDem) * aDem);
        tr.poligono(ret(r));
        ctx.fill();
        ctx.strokeStyle = f.cor(0.85 * aDem);
        ctx.lineWidth = f.px * 0.8;
        if (f.tracejaDem > 0) ctx.setLineDash([4, 3]);
        contornar(r, clamp(f.levant * M.demolicoes.length * 0.4 - i * 0.4 + 0.4), 500 + i);
        ctx.setLineDash([]);
      });
    }
    // paredes a manter: contorno traçado à mão no levantamento
    if (f.tramaExist < 1) {
      ctx.strokeStyle = f.T;
      ctx.lineWidth = f.px;
      M.cheias
        .filter((p) => p.estado === 'manter')
        .forEach((p, i, arr) => contornar(p.r, clamp(f.levant * arr.length * 0.4 - i * 0.4 + 0.4), 540 + i));
    }
    // marcas numeradas do levantamento, com a nota do lado da rua
    if (f.marcas > 0) {
      ctx.globalAlpha = f.marcas;
      ctx.strokeStyle = f.cor(0.8);
      ctx.lineWidth = f.px * 0.7;
      M.levantamento.forEach((lv) => {
        const p = P(lv.x, lv.y);
        const t = P(lv.tx, lv.ty ?? PROFUNDIDADE + 1.25);
        linha(p, [t[0], t[1] - 12]);
        ctx.fillStyle = f.T;
        ctx.beginPath();
        ctx.arc(p[0], p[1], 9, 0, Math.PI * 2);
        ctx.fill();
        tr.texto(String(lv.n), p[0], p[1] + 0.5, { tam: 10, mono: true, peso: 700, cor: rgba(f.papel) });
        tr.texto(`${lv.n} · ${lv.t}`, t[0], t[1], { tam: 12, italico: true, cor: f.T });
      });
      ctx.globalAlpha = 1;
    }
  }

  // Legenda das plantas de alterações: manter, demolir, construir
  function legenda() {
    const f = g.f;
    if (f.legenda <= 0) return;
    ctx.globalAlpha = f.legenda;
    const x = f.area.x0;
    const y = f.area.y1 - 54;
    [['a manter', 'manter'], ['a demolir', 'demolir'], ['a construir', 'construir']].forEach(([t, k], i) => {
      const yy = y + i * 18;
      if (k === 'manter') {
        ctx.fillStyle = rgba(mistura(f.papel, f.tinta, 0.4));
        ctx.fillRect(x, yy - 5, 22, 10);
      } else if (k === 'construir') {
        ctx.fillStyle = f.T;
        ctx.fillRect(x, yy - 5, 22, 10);
      } else {
        ctx.strokeStyle = f.T;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(x + 0.5, yy - 4.5, 21, 9);
        ctx.setLineDash([]);
      }
      tr.texto(t.toUpperCase(), x + 30, yy, { tam: 10, mono: true, alinha: 'left', cor: f.T });
    });
    ctx.globalAlpha = 1;
  }

  // ---------- Linhas de construção: os eixos, antes das paredes ----------
  function guias() {
    const f = g.f;
    if (f.guias <= 0) return;
    const xs = cotas.parciais;
    const ys = cotas.parciaisY || [0, PROFUNDIDADE];
    const todas = [
      ...xs.map((x) => [[x, -1.2], [x, PROFUNDIDADE + 1.2]]),
      ...ys.map((y) => [[-1.2, y], [LARGURA + 1.2, y]]),
    ];
    ctx.strokeStyle = f.cor(0.3 * Math.min(1, f.guias * 2));
    ctx.lineWidth = f.px * 0.6;
    todas.forEach(([a, b], i) => {
      const fr = seg(f.guias, i * 0.07, i * 0.07 + 0.4);
      tr.mao([P(a[0], a[1]), P(b[0], b[1])], { f: fr, s: 200 + i, sobra: 9, tremor: 0.9 * (1 - f.firme), passo: 16 });
    });
  }

  // ---------- Bolhas do programa e ligações ----------
  function bolhas() {
    const f = g.f;
    const aB = f.bolhasP * (1 - f.poche);
    if (aB <= 0) return;
    const s = cam.c.s;
    const centros = M.bolhas.map((bl) => {
      const dv = divisoes[bl.i];
      return [lerp(bl.x, dv.cx, f.morph), lerp(bl.y, dv.cy, f.morph)];
    });
    ctx.lineWidth = f.px * 0.9;
    ctx.strokeStyle = f.cor(0.55 * aB * (1 - f.morph));
    ctx.setLineDash([4, 5]);
    M.ligacoes.forEach(([i, j], k) => {
      const bi = M.bolhas.findIndex((b) => b.i === i);
      const bj = M.bolhas.findIndex((b) => b.i === j);
      if (bi < 0 || bj < 0) return;
      tr.mao([P(centros[bi][0], centros[bi][1]), P(centros[bj][0], centros[bj][1])], {
        f: seg(f.bolhasP, 0.4, 1),
        s: 70 + k,
        sobra: 0,
        tremor: 0.7,
        lapis: false,
      });
    });
    ctx.setLineDash([]);

    M.bolhas.forEach((bl, k) => {
      const dv = divisoes[bl.i];
      const rr = Math.sqrt(dv.area / Math.PI) * (dv.exterior ? 0.6 : 0.82);
      const w = lerp(2 * rr, dv.r[2] - dv.r[0], f.morph) * s;
      const h = lerp(2 * rr, dv.r[3] - dv.r[1], f.morph) * s;
      const raio = Math.min(lerp(rr * s, 0, f.morph), w / 2, h / 2);
      const [cx, cy] = P(centros[k][0], centros[k][1]);
      const pk = seg(f.bolhasP, k * 0.08, k * 0.08 + 0.45);
      // dois passes, como quem repassa o traço; o segundo some ao firmar
      for (let passe = 0; passe < 2; passe++) {
        const a = (passe ? 0.32 * (1 - f.firme) : 0.9) * aB;
        if (a <= 0.01) continue;
        const folga = passe ? 1 + 0.035 * (1 - f.morph * 0.6) : 1;
        ctx.strokeStyle = f.cor(a);
        ctx.lineWidth = f.px * (passe ? 0.7 : 1.1);
        tr.mao(arredondado(cx, cy, w * folga, h * folga, raio * folga, 1.06), {
          f: pk,
          s: 100 + k * 2 + passe,
          sobra: 0,
          suave: true,
          passo: 9,
          tremor: (1 + passe * 0.6) * lerp(1.9, 1.1, f.morph),
        });
      }
      const aRot = pk * (1 - seg(f.s, 1.55, 1.85));
      if (aRot > 0) {
        ctx.globalAlpha = aRot * aB;
        tr.texto(dv.nome.toLowerCase(), cx, cy, { tam: clamp(s * 0.42, 11, 16), italico: true, cor: f.T });
        ctx.globalAlpha = 1;
      }
    });
  }

  // ---------- Cotas e linha de corte ----------
  function cotagem() {
    const f = g.f;
    const c = f.cotasP;
    if (c <= 0) return;
    ctx.strokeStyle = f.cor(0.75);
    ctx.fillStyle = f.T;
    ctx.lineWidth = f.px * 0.7;
    const marca = (t) => linha([t[0] - 4, t[1] + 4], [t[0] + 4, t[1] - 4]);
    // afastamentos medidos em píxeis, para os números nunca se pisarem
    const dl = 9 / cam.c.s; // do número à sua linha
    const d2 = Math.max(0.4, (g.med.L > 900 ? 21 : 15) / cam.c.s); // entre a cadeia parcial e a total
    // cadeia de cima: parciais e total
    const yC = -0.9;
    tr.parcial([P(0, yC), P(LARGURA, yC)], c, true);
    cotas.parciais.forEach((x, i) => {
      const v = seg(c, i * 0.12, i * 0.12 + 0.3);
      if (v <= 0) return;
      linha(P(x, -0.2), P(x, yC - 0.18 * v));
      marca(P(x, yC));
      if (i > 0) {
        const xa = cotas.parciais[i - 1];
        const t = P((x + xa) / 2, yC - dl);
        tr.texto(num((x - xa) * v), t[0], t[1], { tam: 10, mono: true, cor: f.T });
      }
    });
    tr.parcial([P(0, yC - d2), P(LARGURA, yC - d2)], c);
    const t2 = P(LARGURA / 2, yC - d2 - dl);
    tr.texto(num(cotas.total * c), t2[0], t2[1], { tam: 11, mono: true, peso: 700, cor: f.T });
    // cadeia da esquerda
    const rodado = (t, x, y, op) => {
      const q = P(x, y);
      ctx.save();
      ctx.translate(q[0], q[1]);
      ctx.rotate(-Math.PI / 2);
      tr.texto(t, 0, 0, op);
      ctx.restore();
    };
    const xC = -0.9;
    const ys = cotas.parciaisY || [0, PROFUNDIDADE];
    tr.parcial([P(xC, 0), P(xC, PROFUNDIDADE)], c);
    ys.forEach((y, i) => {
      const v = seg(c, i * 0.12, i * 0.12 + 0.3);
      if (v <= 0) return;
      linha(P(-0.2, y), P(xC - 0.18 * v, y));
      marca(P(xC, y));
      if (i > 0 && ys.length > 2) rodado(num((y - ys[i - 1]) * v), xC - dl, (y + ys[i - 1]) / 2, { tam: 10, mono: true, cor: f.T });
    });
    if (ys.length > 2) {
      tr.parcial([P(xC - d2, 0), P(xC - d2, PROFUNDIDADE)], c);
      rodado(num(cotas.lateral * c), xC - d2 - dl, PROFUNDIDADE / 2, { tam: 11, mono: true, peso: 700, cor: f.T });
    } else {
      rodado(num(cotas.lateral * c), xC - Math.max(0.35, 11 / cam.c.s), PROFUNDIDADE / 2, { tam: 11, mono: true, peso: 700, cor: f.T });
    }
    // corte A-A'
    const yc = M.corteY ?? PROFUNDIDADE * 0.8;
    ctx.setLineDash([10, 4, 2, 4]);
    tr.parcial([P(-1.8, yc), P(LARGURA + 1.8, yc)], c);
    ctx.setLineDash([]);
    if (c > 0.6) {
      [[-2.1, 'A'], [LARGURA + 2.1, "A'"]].forEach(([x, l]) => {
        const p = P(x, yc);
        ctx.beginPath();
        ctx.arc(p[0], p[1], 9, 0, Math.PI * 2);
        ctx.stroke();
        tr.texto(l, p[0], p[1] + 0.5, { tam: 9, mono: true, peso: 700, cor: f.T });
      });
    }
  }

  // ---------- Mobiliário em planta (traço fino) ----------
  function mobiliaPlanta() {
    const f = g.f;
    const a = f.planoMob;
    if (a <= 0) return;
    ctx.strokeStyle = f.cor(0.5 * a);
    ctx.lineWidth = f.px * 0.5;
    M.mobiliario.forEach((mv, i) => {
      const v = seg(a, (i / M.mobiliario.length) * 0.5, (i / M.mobiliario.length) * 0.5 + 0.5);
      if (v <= 0) return;
      const q = ret(mv);
      ctx.globalAlpha = v;
      tr.poligono(q);
      ctx.stroke();
      // armários altos levam a diagonal
      if (mv[4] >= 1.8) linha(q[0], q[2]);
      ctx.globalAlpha = 1;
    });
  }

  // ---------- Rótulos das divisões ----------
  function rotulos() {
    const f = g.f;
    if (f.rotulos <= 0) return;
    divisoes.forEach((dv, i) => {
      const v = seg(f.rotulos, i * 0.05, i * 0.05 + 0.5);
      if (v <= 0) return;
      const [x, y] = P(dv.lx ?? dv.cx, dv.ly ?? dv.cy);
      ctx.globalAlpha = v;
      // corpo de letra que cabe na largura da divisão (mín. 7 px)
      const larguraSala = (dv.r[2] - dv.r[0]) * cam.c.s * 0.9;
      ctx.font = '700 12px ui-monospace, Menlo, Consolas, monospace';
      const caber = (larguraSala / ctx.measureText(dv.nome.toUpperCase()).width) * 12;
      const t = Math.max(7, Math.min(clamp(cam.c.s * 0.3, 9, 12), caber));
      // um fundo de papel por baixo, para o texto ler-se sobre o mobiliário
      if (!dv.semBolha && !dv.exterior) {
        const wt = (ctx.measureText(dv.nome.toUpperCase()).width * t) / 12 + 10;
        ctx.fillStyle = rgba(f.papel, 0.85);
        ctx.fillRect(x - wt / 2, y - t * 1.5, wt, t * 3);
      }
      if (dv.semBolha) {
        tr.texto(dv.nome.toUpperCase(), x, y, { tam: t * 0.85, mono: true, cor: f.cor(0.6) });
      } else {
        tr.texto(dv.nome.toUpperCase(), x, y - t * 0.7, { tam: t, mono: true, peso: 700, cor: f.T });
        tr.texto(`${num(dv.area)} m²`, x, y + t * 0.7, { tam: t * 0.9, mono: true, cor: f.cor(0.7) });
      }
      ctx.globalAlpha = 1;
    });
  }

  // ---------- Símbolos de planta: escada, janelas e portas ----------
  function simbolos() {
    const f = g.f;
    const a = f.simbolos * (1 - seg(f.camP, 0, 0.5));
    if (a <= 0) return;
    ctx.strokeStyle = f.cor(a);
    ctx.lineWidth = f.px * 0.8;
    const escada = M.escada;
    if (escada.length) {
      // degraus e seta no sentido da subida
      escada.forEach(([x0, y0, x1]) => linha(P(x0, y0), P(x1, y0)));
      const ex = (escada[0][0] + escada[0][2]) / 2;
      const ultimo = escada[escada.length - 1];
      const sobe = Math.sign(ultimo[1] - escada[0][1]) || 1;
      const yi = sobe > 0 ? escada[0][1] + 0.1 : escada[0][3] - 0.1;
      const yf = sobe > 0 ? ultimo[3] - 0.15 : ultimo[1] + 0.15;
      tr.parcial([P(ex, yi), P(ex, yf)], f.simbolos);
      const ponta = P(ex, yf);
      linha(ponta, P(ex - 0.15, yf - sobe * 0.25));
      linha(ponta, P(ex + 0.15, yf - sobe * 0.25));
    }
    M.vaos.forEach((v) => {
      const [x0, y0, x1, y1] = v.r;
      if (v.tipo === 'janela') {
        ctx.lineWidth = f.px * 0.7;
        tr.poligono(ret(v.r));
        ctx.stroke();
        if (v.h) linha(P(x0, (y0 + y1) / 2), P(x1, (y0 + y1) / 2));
        else linha(P((x0 + x1) / 2, y0), P((x0 + x1) / 2, y1));
      } else if (v.tipo === 'porta') {
        const l = v.l;
        const arco = [];
        let folha;
        if (v.h) {
          const yc = (y0 + y1) / 2;
          for (let k = 0; k <= 14; k++) {
            const ang = (k / 14) * (Math.PI / 2);
            arco.push(P(x0 + Math.cos(ang) * l, yc + v.lado * Math.sin(ang) * l));
          }
          folha = [P(x0, yc), P(x0, yc + v.lado * l)];
        } else {
          const xc = (x0 + x1) / 2;
          for (let k = 0; k <= 14; k++) {
            const ang = (k / 14) * (Math.PI / 2);
            arco.push(P(xc + v.lado * Math.sin(ang) * l, y0 + Math.cos(ang) * l));
          }
          folha = [P(xc, y0), P(xc + v.lado * l, y0)];
        }
        // folha a traço médio, arco de abertura a traço fino
        ctx.lineWidth = f.px * 1.1;
        linha(folha[0], folha[1]);
        ctx.lineWidth = f.px * 0.45;
        tr.parcial(arco, f.simbolos);
      }
    });
  }

  // ---------- Esboço das paredes: traçadas à mão, depois firmam ----------
  function esbocoParedes() {
    const f = g.f;
    if (!(f.contorno > 0 && f.poche < 1 && f.camP === 0)) return;
    const novas = M.cheias.filter((p) => p.estado !== 'manter');
    ctx.strokeStyle = f.T;
    novas.forEach((p, i) => {
      const fr = clamp(f.contorno * novas.length * 0.35 - i * 0.35 + 0.35);
      if (fr <= 0) return;
      const [x0, y0, x1, y1] = p.r;
      const esp = Math.min(x1 - x0, y1 - y0) * cam.c.s;
      const mole = 1 - f.firme;
      ctx.lineWidth = f.px * lerp(1, 1.15, mole);
      tr.mao(fechar(ret(p.r)), {
        f: fr,
        s: 300 + i,
        tremor: mole * clamp(esp / 7, 0.3, 1),
        sobra: mole * 5,
        passo: 12,
      });
    });
  }

  // ---------- Etiquetas dos pisos na axonometria explodida ----------
  function etiquetasPisos() {
    const f = g.f;
    const piso1 = M.piso1;
    if (!piso1 || f.camP <= 0) return;
    const a = Math.max(seg(f.camP, 0.7, 1) * (1 - f.m), seg(f.levanta, 0.5, 1));
    if (a <= 0) return;
    const ym = (piso1.laje[1] + piso1.laje[3]) / 2;
    const p0 = P(-0.4, ym, piso1.z + f.afasta + 0.6);
    ctx.globalAlpha = a;
    tr.texto('PISO 1 · SÓTÃO', p0[0] - 8, p0[1], { tam: 10, mono: true, peso: 700, alinha: 'right', cor: f.T });
    if (f.afasta > 0.5) {
      const p1 = P(-0.4, ym + 1.5, 0.6);
      tr.texto('RÉS-DO-CHÃO', p1[0] - 8, p1[1], { tam: 10, mono: true, peso: 700, alinha: 'right', cor: f.T });
    }
    ctx.globalAlpha = 1;
  }

  // ---------- O visitante dentro do projeto ----------
  // Percurso parametrizado pelo comprimento, para andar a passo certo
  const percurso = M.percurso;
  const acumulado = [0];
  for (let i = 1; i < percurso.length; i++) {
    acumulado.push(acumulado[i - 1] + Math.hypot(percurso[i][0] - percurso[i - 1][0], percurso[i][1] - percurso[i - 1][1]));
  }
  function noPercurso(t) {
    const alvo = t * acumulado[acumulado.length - 1];
    let k = 1;
    while (k < acumulado.length - 1 && acumulado[k] < alvo) k++;
    const troco = acumulado[k] - acumulado[k - 1] || 1;
    const u = clamp((alvo - acumulado[k - 1]) / troco);
    return [lerp(percurso[k - 1][0], percurso[k][0], u), lerp(percurso[k - 1][1], percurso[k][1], u)];
  }

  function visitante() {
    const f = g.f;
    const { s } = f;
    const aV1 = seg(s, 1.2, 1.5) * (1 - seg(s, 3.35, 3.45));
    const aV2 = seg(s, 3.5, 3.62) * (1 - seg(s, 4.45, 4.55));
    const aV3 = seg(s, 4.6, 4.8);
    let pos = null;
    let rotulo = '';
    let aV = 0;
    if (aV1 > 0) {
      pos = noPercurso(emInOut(seg(s, 2.0, 2.5)));
      rotulo = s < 2.0 ? 'Você está aqui' : f.nome || 'Você';
      aV = aV1;
    } else if (aV2 > 0) {
      pos = [LARGURA + 1.2, PROFUNDIDADE + 1.4];
      rotulo = 'Visita à obra';
      aV = aV2;
    } else if (aV3 > 0) {
      pos = M.emCasa || [LARGURA / 2, PROFUNDIDADE / 2];
      rotulo = R ? 'Em casa' : f.nome ? `${f.nome}, em casa` : 'Em casa';
      aV = aV3;
    }
    if (!pos) return;
    const chao = P(pos[0], pos[1], 0);
    const pulso = g.reduz ? 0.5 : (f.tempo / 1400) % 1;
    ctx.globalAlpha = aV;
    ctx.strokeStyle = f.cor(1 - pulso);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(chao[0], chao[1], 6 + pulso * 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = f.T;
    ctx.beginPath();
    ctx.arc(chao[0], chao[1], 4.5, 0, Math.PI * 2);
    ctx.fill();
    let topo = chao;
    if (cam.c.e > 0.05) {
      // figura à escala: 1,70 m
      const cabeca = P(pos[0], pos[1], 1.55);
      ctx.strokeStyle = f.T;
      ctx.lineWidth = 1.4;
      linha(chao, cabeca);
      ctx.beginPath();
      ctx.arc(cabeca[0], cabeca[1] - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      topo = [cabeca[0], cabeca[1] - 8];
    }
    ctx.font = '700 11px ui-monospace, Menlo, Consolas, monospace';
    const w = ctx.measureText(rotulo.toUpperCase()).width + 12;
    // a etiqueta vira para a esquerda quando não cabe à direita
    const esquerda = topo[0] + 12 + w > g.med.L - 10;
    const lx = esquerda ? topo[0] - 12 - w : topo[0] + 12;
    const ly = topo[1] - 14;
    ctx.strokeStyle = f.T;
    ctx.lineWidth = 0.8;
    linha([topo[0] + (esquerda ? -3 : 3), topo[1] - 3], [esquerda ? lx + w : lx, ly]);
    ctx.fillStyle = f.T;
    ctx.fillRect(lx, ly - 10, w, 20);
    tr.texto(rotulo.toUpperCase(), lx + 6, ly, { tam: 11, peso: 700, alinha: 'left', mono: true, cor: rgba(f.papel) });
    ctx.globalAlpha = 1;
  }

  // ---------- Norte e escala gráfica ----------
  function alfaFolha() {
    const f = g.f;
    return (R ? seg(f.r0, -0.3, 0.1) : seg(f.s, 1.6, 2.0)) * (1 - seg(f.s, 2.5, 2.8));
  }

  function norte() {
    const f = g.f;
    const a = alfaFolha();
    if (a <= 0) return;
    // em ecrãs estreitos a planta ocupa a largura toda: o norte vai para baixo
    const c = g.med.L > 900 ? [f.area.x1 - 34, f.area.y0 + 30] : [f.area.x1 - 44, f.area.y1 + 26];
    ctx.globalAlpha = a;
    ctx.strokeStyle = f.T;
    ctx.fillStyle = f.T;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(c[0], c[1], 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.save();
    ctx.translate(c[0], c[1]);
    ctx.rotate((M.norte ?? 0) + cam.c.a);
    tr.poligono([[0, -18], [6, 8], [0, 3], [-6, 8]]);
    ctx.fill();
    ctx.restore();
    tr.texto('N', c[0] + 26, c[1] + 0.5, { tam: 10, mono: true, peso: 700, cor: f.T });
    ctx.globalAlpha = 1;
  }

  // Escala gráfica 0, 1, 2 e 5 m (só em ecrãs largos, onde há margem)
  function escala() {
    const f = g.f;
    const a = alfaFolha() * (R ? seg(f.r0, 1.1, 1.4) : 1);
    if (a <= 0 || g.med.L <= 900) return;
    const u = cam.c.s;
    const x1 = f.area.x1 - 6;
    const x0 = x1 - 5 * u;
    const y = f.area.y1 + 24;
    ctx.globalAlpha = a;
    ctx.strokeStyle = f.T;
    ctx.fillStyle = f.T;
    ctx.lineWidth = 1;
    ctx.strokeRect(x0, y - 2.5, 5 * u, 5);
    ctx.fillRect(x0, y - 2.5, u, 5);
    ctx.fillRect(x0 + 2 * u, y - 2.5, 3 * u, 2.5);
    [0, 1, 2, 5].forEach((m) => tr.texto(m === 5 ? '5 m' : String(m), x0 + m * u, y - 11, { tam: 9, mono: true, cor: f.T }));
    ctx.globalAlpha = 1;
  }

  // ---------- O lápis acompanha a ponta do traço em curso ----------
  const lapisE = { x: 0, y: 0, a: 0 };
  function lapis() {
    const f = g.f;
    const p = f.camP === 0 ? tr.ponta : null;
    if (p) {
      const k = lapisE.a < 0.05 ? 1 : 0.45;
      lapisE.x += (p.x - lapisE.x) * k;
      lapisE.y += (p.y - lapisE.y) * k;
    }
    lapisE.a += ((p ? 1 : 0) - lapisE.a) * 0.22;
    if (lapisE.a < 0.02) return;
    ctx.save();
    ctx.globalAlpha = lapisE.a;
    ctx.translate(lapisE.x, lapisE.y);
    ctx.rotate(0.62);
    ctx.lineWidth = 1;
    ctx.strokeStyle = f.T;
    ctx.fillStyle = rgba(f.papel);
    tr.poligono([[0, 0], [3.6, -10], [3.6, -40], [-3.6, -40], [-3.6, -10]]);
    ctx.fill();
    ctx.stroke();
    linha([-3.6, -10], [3.6, -10]);
    linha([-3.6, -34], [3.6, -34]);
    ctx.fillStyle = f.T;
    tr.poligono([[0, 0], [1.5, -4.2], [-1.5, -4.2]]);
    ctx.fill();
    ctx.restore();
  }

  return {
    titulo,
    notas,
    levantamento,
    legenda,
    guias,
    bolhas,
    cotagem,
    mobiliaPlanta,
    rotulos,
    simbolos,
    esbocoParedes,
    etiquetasPisos,
    visitante,
    norte,
    escala,
    lapis,
  };
}
